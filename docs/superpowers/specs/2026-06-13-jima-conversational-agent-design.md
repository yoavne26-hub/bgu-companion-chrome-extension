# Jima Conversational Agent — Design Spec

**Date:** 2026-06-13
**Status:** Approved for planning
**Scope:** Rebuild Jima from a keyword-triggered task engine into a real conversational AI assistant that scrapes the current page and uses tools to help students with their tasks.

---

## 1. Problem

Today Jima does not converse. Concretely:

- **Regex router intercepts everything.** Every message is classified by `getChatIntent()` against hardcoded regex patterns. Anything off-pattern is routed to `"unsupported"` and answered with a canned line ("I can help with page scans, homework, files…").
- **AI is gated and rare.** AI mode is off by default, requires a manual toggle, and asks for confirmation on every message. Only the last 6 messages are sent.
- **Forced JSON schema.** When the AI is called, the response is forced into a strict schema (`summary/assignments/dates/files/nextActions/uncertainties`). The model literally cannot answer a free-form question — everything is shoehorned into that shape.
- **Context is lost.** Conversation history is in-memory only and resets when the side panel closes or the tab refreshes.
- **No real agency.** File/task operations are driven by regex intents, not by the model reasoning about what the user wants.

Net effect: Jima is a keyword-triggered task engine, not an assistant.

## 2. Goals

- Jima answers free-form messages conversationally by default (AI-first).
- The current page's HTML is scraped and used to ground answers automatically, with visible, toggleable consent.
- Jima can *act* via an agentic toolset: read the page, inspect assignments, list/download files, save/list/update tasks, look up saved courses.
- Conversations persist per browser tab across side-panel open/close.
- All AGENTS.md privacy and honesty rules are preserved: never invent deadlines/files/contents; never download silently; no API keys in the extension; no new permissions without need.

## 3. Non-goals

- No change of AI provider — stays OpenAI.
- No new browser permissions (all required permissions already exist in the manifest).
- No parsing of file *contents* in the chat path (the existing file-upload analysis feature is untouched).
- No backend-side session state (MV3 worker must stay stateless).
- No framework — vanilla JS, per AGENTS.md.

## 4. Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Default interaction | **AI-first**, current page auto-attached, visible "Using this page" indicator, **no** per-message confirmation. |
| Capabilities | **Full agentic toolset** via OpenAI tool-calling. |
| Architecture | **Approach A** — client-driven agent loop, stateless backend proxy; tools execute client-side. |
| Backend (dev) | **Local** Node backend in `backend/` with a real `OPENAI_API_KEY`; test against `localhost:3000`. |
| Persistence | **Per-tab** threads in `chrome.storage.session`. |

## 5. Architecture

### 5.1 The agent loop (one user turn)

```
User types  →  jima-chat-v2 (orchestrator)
  1. append {role:"user", content} to the tab's thread
  2. if "Using this page" ON → attach a COMPACT page snapshot to the turn
     (title, URL, headings, detection summary — small, for immediate awareness).
     The model can still call read_page to pull the FULLER payload (visible text,
     all links, file links) on demand. Snapshot ≠ full read; it avoids a forced
     round-trip when the question is simple.
  3. loop (max 6 rounds):
       POST {messages, tools} → background relay → backend POST /api/jima/chat
       backend → exactly one OpenAI Chat Completions call (tools, tool_choice:"auto",
                 free-form text, temperature ~0.3, no response schema)
       ← assistant message
       if message.tool_calls present:
          for each tool_call: execute via jima-tools registry
          append {role:"tool", tool_call_id, content: <result JSON>} per call
          render subtle activity chip(s); continue loop
       else:
          render assistant.content as markdown; break
  4. persist thread to chrome.storage.session[`jima_thread_<tabId>`]
```

### 5.2 Properties

- **Backend is stateless.** It receives the whole conversation each call, makes one OpenAI call, returns the raw assistant message. No state in the MV3 worker. Reuses the existing background→backend fetch relay.
- **Tools execute client-side** — the only place that can touch the DOM, `chrome.storage`, and `chrome.downloads`.
- **Round cap = 6.** On hitting it, Jima returns what it has and says it stopped.
- **Free-form responses.** No forced JSON schema. Structured extraction (assignments/dates) is a *tool result*, not the shape of every reply.

### 5.3 Message format

Threads store OpenAI-style messages:

- `{role:"user", content}`
- `{role:"assistant", content?, tool_calls?}`
- `{role:"tool", tool_call_id, content}` (stringified JSON result)

The render layer maps `user`/`assistant` text to chat bubbles and renders `tool` plumbing as subtle activity chips (it is not shown as bubbles).

## 6. Toolset

Each tool has an OpenAI-facing **schema** (defined in the backend — single source of truth for what the model sees) and a client-side **executor** (in `src/shared/jima-tools.js`, keyed by tool name).

| Tool | Purpose | Executor uses | Safety |
|---|---|---|---|
| `read_page` | Scrape current tab: title, URL, visible text, headings, links, file links, deterministic detections (homework/dates/files) | `JIMA_GET_MOODLE_CONTEXT` → `content.js` | Read-only; gated by "Using this page" |
| `inspect_assignment` | Open a specific assignment/activity link, extract detail (due date, instructions, submission status) | `JIMA_INSPECT_ASSIGNMENT_DETAIL` | Read-only |
| `list_files` | List downloadable files found on the page | last `read_page` (or triggers one) | Read-only |
| `download_files` | Download chosen file(s) **after a user confirm-click** | `chrome.downloads` | **Never silent** — renders confirm chip; model can only propose |
| `save_task` | Save a homework/deadline to the local task list | `saveJimaTask` / `saveOrUpdateJimaTaskFromDetail` | Local write; requires `evidence`+`confidence` |
| `list_tasks` | Read saved tasks (open/done) | `getJimaSavedTasks` | Local read |
| `update_task` | Mark a task done / delete | `updateJimaTaskStatus`, `deleteJimaTask` | Local write |
| `list_saved_courses` | Look up student's saved courses + links | `courses-data.js` / storage | Local read |

### 6.1 Honesty & safety baked into the contract

- `read_page`/`list_files` return only what was actually extracted. The system prompt forbids claiming a file's *contents* were read (chat path never parses file bodies).
- `save_task` requires `evidence` text + `confidence`; the prompt forbids inventing deadlines.
- `download_files` has a **hard human-in-the-loop gate**: the executor does not download on the model's say-so — it renders a confirm chip and calls `chrome.downloads` only after the user clicks.
- **"Using this page" OFF** → `read_page`/`inspect_assignment`/`list_files`/`download_files` short-circuit and return `{disabled:true}` so the model tells the user it cannot see the page instead of guessing.

## 7. Modules

### New
- `src/shared/jima-tools.js` — executor registry. Each entry `async (args) → result`. Wraps existing content-script messages and `jima-tasks.js`. Enforces the "Using this page" gate and the download confirm gate.
- `src/shared/assistant-api.js` — `sendChatTurn(messages, tools) → assistantMessage`. Posts to backend `/api/jima/chat` via the background relay. Transport only.
- `src/shared/jima-conversation.js` — per-tab persistence in `chrome.storage.session`, key `jima_thread_<tabId>`: `loadThread(tabId)`, `saveThread(tabId, messages)`, `clearThread(tabId)`.

### Rewritten
- `src/sidepanel/jima-chat-v2.js` — the agent-loop orchestrator (§5.1): owns the round loop, tool dispatch via `jima-tools`, the round cap, and activity chips. Existing intent-classification/context-bundling code here is removed.

### Trimmed
- `src/sidepanel/sidepanel.js` — remove `getChatIntent`, `routeChatQuery`, the regex intent constants, the per-message AI confirmation, and the forced-schema render path. `handleChatSubmit` now just calls the orchestrator. This shrinks the file (currently ~3k lines), aligning with AGENTS.md modularity.

### Untouched
- `src/content/content.js` extraction logic (reused via existing messages).
- `src/shared/jima-tasks.js` (wrapped by tools).
- The file-upload analysis path and its `/api/jima/analyze-context` endpoint (kept as its own feature).
- popup / options / autofill / saved courses behavior.

## 8. UI changes (`sidepanel.html` / `sidepanel.css`)

- The **Local/AI toggle** is replaced by a **"Using this page" pill** — on by default, shows the current page title, click to toggle off. This is the persistent, visible consent indicator (replacing per-message confirmation).
- **Tool activity chips** render under Jima's turn: e.g. `🔧 read the page`, `📄 listed 4 files`, `✅ saved task`. Keeps conversation readable while showing what Jima did.
- **"New chat"** action clears the current tab's thread.
- **`download_files` confirm chip** ("Download 2 files?") gates any download.
- Styling stays within the existing blue/orange BGU language and the light/dark system added previously.

## 9. Persistence

- Thread keyed by `tabId` in `chrome.storage.session`.
- On panel open / tab switch → load and render that tab's history (active tab via `chrome.tabs.query`).
- A `chrome.tabs.onRemoved` listener in `background.js` deletes `jima_thread_<tabId>` when the tab closes, so threads don't leak.

## 10. Backend (`backend/`)

- **New endpoint `POST /api/jima/chat`**: accepts `{ messages, tools, pageSnapshot? }`. Makes **one** OpenAI **Chat Completions** call with `tools`, `tool_choice:"auto"`, free-form text (no `response_format` schema), `temperature ~0.3`. Returns the raw assistant message (`content` + `tool_calls`). Stateless. Keeps existing size/validation guards (payload ≤ 1MB, visible text cap, array caps).
- **System prompt rewrite** (`jimaSystemPrompt.js`): conversational, Hebrew/English, proactively uses tools to ground answers, retains all honesty rules (never invent deadlines/files/contents; say when unsure; never claim to have read a file's contents unless tool text was returned; never download silently).
- **Model**: `OPENAI_MODEL` env, default `gpt-4.1-mini` (tool-capable, low cost).
- **Tool schemas** live here (the OpenAI-facing contract). Executors in the extension must match these names/params; a short shared comment block in both files documents the contract to avoid drift.
- The old `/api/jima/analyze-context` endpoint stays for the file-analysis path.

## 11. Error handling

| Failure | Behavior |
|---|---|
| Backend down / network error | Friendly "I can't reach my brain right now" message; thread preserved. |
| OpenAI 401 / 429 | Existing clear messages surfaced into chat. |
| Tool executor throws | Caught; returned to the model as a `tool` result `{error:"..."}` so it can recover/explain — turn does not crash. |
| Round cap (6) hit | Jima returns a partial answer and states it stopped. |
| "Using this page" off but page tool called | Tool returns `{disabled:true}`; model explains it cannot see the page. |

## 12. Privacy & security checklist (AGENTS.md)

- No new permissions: `tabs`, `storage`, `sidePanel`, `downloads` already present; host permissions cover BGU domains + `localhost:3000` + hosted backend.
- No API keys in extension code — all OpenAI calls go through the backend proxy.
- Page context leaves the browser only when "Using this page" is on; the pill makes this visible at all times.
- Downloads require an explicit user click.
- Only minimum needed context is sent; existing size caps retained.
- The model is instructed never to fabricate academic facts.

## 13. Manual testing checklist

1. Extension loads in Chrome with no manifest errors.
2. Popup opens; saved courses/pages work; options page works; autofill not broken.
3. Content script still runs on supported BGU pages.
4. On a Moodle page, Jima answers a free-form question and visibly reads the page (`🔧 read the page` chip).
5. "Using this page" OFF → Jima says it cannot see the page rather than guessing.
6. `save_task` adds an item to the task dashboard; appears in the popup task count.
7. `download_files` downloads only after the confirm click; no silent downloads.
8. Conversation survives closing and reopening the side panel on the same tab; a different tab has its own thread; closing a tab clears its thread.
9. Backend down → clean error message; thread intact.
10. No API key in any extension file; no new permissions added.
11. New UI verified light + dark (screenshot).

## 14. Open follow-ups (out of scope here)

- Streaming responses (tokens as they arrive).
- File-content parsing inside the chat path (currently a separate upload feature).
- Calendar integration for saved deadlines.
