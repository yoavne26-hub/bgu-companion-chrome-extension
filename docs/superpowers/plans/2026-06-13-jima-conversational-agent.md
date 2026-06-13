# Jima Conversational Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Jima's regex-routed, schema-forced behavior with a real conversational AI agent that scrapes the current page and uses tools to help with student tasks.

**Architecture:** Client-driven agent loop (Approach A from the spec). The side panel orchestrates: each turn it sends the conversation to a stateless backend, which makes one OpenAI Chat Completions call with tools and free-form text. Tool calls execute client-side (DOM, `chrome.storage`, `chrome.downloads`), results are appended, and the loop repeats until the model returns a final answer. Conversations persist per browser tab in `chrome.storage.session`.

**Tech Stack:** Vanilla JS Chrome extension (MV3, `globalThis`-attached modules loaded via ordered `<script>` tags — no client-side ES imports). Node 20 + Express + OpenAI SDK backend (ESM). Tests use the built-in `node:test` runner (no new dependencies).

---

## Testing approach (read first)

This codebase has no test harness and is a browser extension; AGENTS.md mandates **manual** testing checklists. We add automated `node:test` coverage only where it is natural and high-value and needs no framework:

- **Backend pure logic** (ESM, runs from `backend/`): tool schema integrity, `validateChatPayload`, and `chatWithJima` message-mapping via an injected mock OpenAI client.
- **The agent loop** (the heart of the feature) is written as a pure, dependency-injected function in `src/shared/jima-agent-loop.js` with a dual CommonJS/`globalThis` export, tested from the repo root (CommonJS — the extension dir has no `package.json`).

Client code bound to `chrome.*`/DOM (executors, persistence wiring, UI) is verified via the manual checklist in Task 16 and a real end-to-end run against the local backend.

Run backend tests: `cd backend && node --test`
Run loop tests: from `bgu-companion-chrome-extension/`, run `node --test`

---

## File structure

**New — backend**
- `backend/jimaTools.js` — `JIMA_TOOL_SCHEMAS`: the OpenAI-facing tool definitions (single source of truth for tool names + argument shapes).
- `backend/jimaTools.test.js` — schema integrity tests.
- `backend/chatPayload.js` — `validateChatPayload(body)` pure validator + limits.
- `backend/chatPayload.test.js` — validator tests.
- `backend/openaiClient.test.js` — `chatWithJima` mapping tests with a mock client.

**New — extension shared**
- `src/shared/jima-agent-loop.js` — pure `runJimaAgentLoop(...)` (dual export).
- `src/shared/assistant-api.js` — `globalThis.JimaAssistantApi.sendChatTurn(messages)` transport.
- `src/shared/jima-conversation.js` — `globalThis.JimaConversation`: per-tab thread persistence.
- `src/shared/jima-tools.js` — `globalThis.JimaTools.create(ctx)`: client-side tool executors.

**New — repo-root test**
- `test/jima-agent-loop.test.js` — agent-loop unit tests (CommonJS).

**Modified**
- `backend/jimaSystemPrompt.js` — add `JIMA_CHAT_SYSTEM_PROMPT` (keep existing `JIMA_SYSTEM_PROMPT` for the file path).
- `backend/openaiClient.js` — add `chatWithJima(payload, { client })`.
- `backend/server.js` — add `POST /api/jima/chat`.
- `src/background/background.js` — add `JIMA_CHAT` relay + `tabs.onRemoved` thread cleanup.
- `src/sidepanel/sidepanel.html` — replace mode toggle with "Using this page" pill + "New chat"; add new `<script>` tags.
- `src/sidepanel/sidepanel.css` — style the page pill + tool-activity chips (light/dark).
- `src/sidepanel/sidepanel.js` — wire the orchestrator; remove regex routing; per-tab thread load; render markdown + activity chips.
- `src/sidepanel/jima-chat-v2.js` — remove `classifyIntent`/intent regex/`buildAiContextBundle`; keep `createMessage`/`createToolRegistry`.

**The tool contract** (names + arg shapes) is defined in `backend/jimaTools.js` and mirrored by executors in `src/shared/jima-tools.js`. A header comment in each file points to the other to prevent drift.

---

## Task 1: Backend tool schemas

**Files:**
- Create: `backend/jimaTools.js`
- Test: `backend/jimaTools.test.js`

- [ ] **Step 1: Write the failing test**

```js
// backend/jimaTools.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { JIMA_TOOL_SCHEMAS, JIMA_TOOL_NAMES } from "./jimaTools.js";

test("exposes exactly the eight agent tools", () => {
  assert.deepEqual(
    [...JIMA_TOOL_NAMES].sort(),
    ["download_files", "inspect_assignment", "list_files", "list_saved_courses",
     "list_tasks", "read_page", "save_task", "update_task"].sort()
  );
});

test("every schema is a valid OpenAI function tool", () => {
  for (const tool of JIMA_TOOL_SCHEMAS) {
    assert.equal(tool.type, "function");
    assert.equal(typeof tool.function.name, "string");
    assert.ok(tool.function.description.length > 0, `${tool.function.name} needs a description`);
    assert.equal(tool.function.parameters.type, "object");
    assert.ok(tool.function.parameters.properties, `${tool.function.name} needs properties`);
  }
});

test("save_task requires evidence and confidence (honesty contract)", () => {
  const saveTask = JIMA_TOOL_SCHEMAS.find((t) => t.function.name === "save_task");
  assert.ok(saveTask.function.parameters.required.includes("evidence"));
  assert.ok(saveTask.function.parameters.required.includes("confidence"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test jimaTools.test.js`
Expected: FAIL — `Cannot find module './jimaTools.js'`.

- [ ] **Step 3: Write minimal implementation**

```js
// backend/jimaTools.js
// Tool contract for the Jima agent. SINGLE SOURCE OF TRUTH for tool names and
// argument shapes. Executors live in ../src/shared/jima-tools.js and MUST match
// these names and argument keys. Keep the two files in sync.

export const JIMA_TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "read_page",
      description: "Read the student's current browser tab (BGU Moodle): page title, URL, visible text, headings, links, downloadable file links, and deterministic homework/deadline/file detections. Use this whenever the question is about 'this page', 'this course', what is shown, or to ground any answer in the page. Returns {disabled:true} if the student turned off page access.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "inspect_assignment",
      description: "Open a specific Moodle assignment or quiz detail page and extract its visible due date, instructions, and submission status. Use only with a real assignment/quiz URL found via read_page.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "HTTPS moodle.bgu.ac.il assignment or quiz view URL." },
          title: { type: "string", description: "Human-readable assignment title, if known." }
        },
        required: ["url"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List the downloadable files detected on the current page (names, types, URLs). Does NOT read file contents. Returns {disabled:true} if page access is off.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "download_files",
      description: "Propose downloading one or more files. This does NOT download immediately — it asks the student to confirm with a button. Only the student's click triggers the actual download. Pass the exact file objects from list_files/read_page.",
      parameters: {
        type: "object",
        properties: {
          files: {
            type: "array",
            description: "Files to propose for download.",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                url: { type: "string" }
              },
              required: ["name", "url"],
              additionalProperties: false
            }
          }
        },
        required: ["files"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_task",
      description: "Save a homework/assignment/deadline to the student's local task list. NEVER invent a deadline — only save evidence actually found on the page. Include the supporting evidence text and a confidence level.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          dueDate: { type: "string", description: "Raw due-date text as found, or empty if none." },
          evidence: { type: "string", description: "The exact text from the page that supports this task." },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          sourceUrl: { type: "string", description: "URL where the task was found, if known." }
        },
        required: ["title", "evidence", "confidence"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List the student's saved tasks. Optionally filter by status.",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["open", "done", "all"] } },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Mark a saved task done, or delete it.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          action: { type: "string", enum: ["done", "delete"] }
        },
        required: ["taskId", "action"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_saved_courses",
      description: "List the student's saved/known BGU course names and their Moodle links.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  }
];

export const JIMA_TOOL_NAMES = new Set(JIMA_TOOL_SCHEMAS.map((t) => t.function.name));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test jimaTools.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/jimaTools.js backend/jimaTools.test.js
git commit -m "feat(backend): add Jima agent tool schemas"
```

---

## Task 2: Conversational system prompt

**Files:**
- Modify: `backend/jimaSystemPrompt.js` (append a new export; keep `JIMA_SYSTEM_PROMPT`)

- [ ] **Step 1: Add the chat system prompt export**

Append to the end of `backend/jimaSystemPrompt.js`:

```js
export const JIMA_CHAT_SYSTEM_PROMPT = `You are Jima (ג'ימה), the BGU Companion student assistant. You help Ben-Gurion University students with their Moodle courses, assignments, deadlines, files, and study workflow.

You are a normal, friendly conversational assistant. Answer the student naturally in their language (Hebrew or English, matching them). Be concise and practical.

GROUNDING WITH TOOLS:
- You have tools that read the student's current page and act on their behalf. USE THEM proactively.
- When the student asks about "this page", "this course", homework, deadlines, files, or anything that depends on what is on screen, call read_page first. Do not guess what is on the page.
- A compact snapshot of the current page may be attached to the conversation as a system note. It is for quick awareness; call read_page when you need the full text, all links, or the file list.
- To act on a specific assignment, call inspect_assignment with its real URL (find it via read_page).
- To help the student keep track of work, you can save_task / list_tasks / update_task.
- To help downloads, propose files with download_files — the student must click to confirm; you can never download silently.

HONESTY RULES (mandatory):
- Never invent assignments, deadlines, files, grades, or course facts that were not actually returned by a tool.
- If a tool returns {disabled:true}, tell the student you cannot see their page because page access is off, and how to turn it on.
- Never claim to have read a file's CONTENTS. Your tools only see file names/links, not file text. If asked what's inside a file, say you can list and download it but cannot read its contents here.
- If a due date is unclear or ambiguous, say so plainly.
- If a tool returns an error, briefly tell the student what went wrong instead of pretending it worked.

STYLE:
- Lead with the direct answer. Add short next steps when useful.
- Do not dump a generic page summary unless asked.
- Use plain markdown (short lists, bold) — no headings larger than necessary.`;
```

- [ ] **Step 2: Verify the module still loads**

Run: `cd backend && node -e "import('./jimaSystemPrompt.js').then(m => { if(!m.JIMA_CHAT_SYSTEM_PROMPT || !m.JIMA_SYSTEM_PROMPT) throw new Error('missing export'); console.log('ok'); })"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add backend/jimaSystemPrompt.js
git commit -m "feat(backend): add conversational Jima chat system prompt"
```

---

## Task 3: `chatWithJima` in the OpenAI client

**Files:**
- Modify: `backend/openaiClient.js`
- Test: `backend/openaiClient.test.js`

- [ ] **Step 1: Write the failing test**

```js
// backend/openaiClient.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { chatWithJima } from "./openaiClient.js";

function mockClient(captured, reply) {
  return {
    chat: {
      completions: {
        create: async (params) => {
          captured.params = params;
          return { choices: [{ message: reply }] };
        }
      }
    }
  };
}

test("sends system prompt, tools, and history; returns the raw assistant message", async () => {
  const captured = {};
  const reply = { role: "assistant", content: "Hi!", tool_calls: undefined };
  const client = mockClient(captured, reply);

  const message = await chatWithJima(
    { messages: [{ role: "user", content: "hello" }] },
    { client }
  );

  assert.equal(captured.params.messages[0].role, "system");
  assert.match(captured.params.messages[0].content, /BGU Companion student assistant/);
  assert.equal(captured.params.messages[1].role, "user");
  assert.equal(captured.params.messages[1].content, "hello");
  assert.ok(Array.isArray(captured.params.tools) && captured.params.tools.length === 8);
  assert.equal(captured.params.tool_choice, "auto");
  assert.deepEqual(message, reply);
});

test("attaches an optional page snapshot as a system note before the call", async () => {
  const captured = {};
  const client = mockClient(captured, { role: "assistant", content: "ok" });
  await chatWithJima(
    { messages: [{ role: "user", content: "what's here?" }], pageSnapshot: "TITLE: Course X" },
    { client }
  );
  const systemNotes = captured.params.messages.filter((m) => m.role === "system");
  assert.equal(systemNotes.length, 2);
  assert.match(systemNotes[1].content, /TITLE: Course X/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test openaiClient.test.js`
Expected: FAIL — `chatWithJima` is not exported.

- [ ] **Step 3: Implement `chatWithJima`**

In `backend/openaiClient.js`, update the import on line 2 and add the new function. Change line 2 from:

```js
import { JIMA_SYSTEM_PROMPT } from "./jimaSystemPrompt.js";
```

to:

```js
import { JIMA_SYSTEM_PROMPT, JIMA_CHAT_SYSTEM_PROMPT } from "./jimaSystemPrompt.js";
import { JIMA_TOOL_SCHEMAS } from "./jimaTools.js";
```

Then append this function to the end of the file:

```js
const MAX_CHAT_OUTPUT_TOKENS = 900;

// Stateless conversational turn. The extension drives the agent loop and sends
// the full conversation each call; we make exactly one OpenAI call and return
// the raw assistant message (content + any tool_calls) for the client to act on.
export async function chatWithJima(payload, { client } = {}) {
  const openai = client || getOpenAIClient();
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const history = Array.isArray(payload.messages) ? payload.messages : [];
  const messages = [{ role: "system", content: JIMA_CHAT_SYSTEM_PROMPT }];

  if (payload.pageSnapshot) {
    messages.push({
      role: "system",
      content: `Current page snapshot (for awareness; call read_page for full detail):\n${payload.pageSnapshot}`
    });
  }

  for (const message of history) {
    messages.push(message);
  }

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: MAX_CHAT_OUTPUT_TOKENS,
    messages,
    tools: JIMA_TOOL_SCHEMAS,
    tool_choice: "auto"
  });

  return response.choices?.[0]?.message || { role: "assistant", content: "" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test openaiClient.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/openaiClient.js backend/openaiClient.test.js
git commit -m "feat(backend): add chatWithJima conversational tool-calling turn"
```

---

## Task 4: `validateChatPayload` + `/api/jima/chat` endpoint

**Files:**
- Create: `backend/chatPayload.js`
- Test: `backend/chatPayload.test.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write the failing test**

```js
// backend/chatPayload.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { validateChatPayload } from "./chatPayload.js";

test("accepts a minimal valid payload", () => {
  assert.equal(validateChatPayload({ messages: [{ role: "user", content: "hi" }] }), "");
});

test("rejects a missing messages array", () => {
  assert.match(validateChatPayload({}), /messages/);
});

test("rejects an empty conversation", () => {
  assert.match(validateChatPayload({ messages: [] }), /at least one message/);
});

test("rejects a message with a bad role", () => {
  assert.match(
    validateChatPayload({ messages: [{ role: "robot", content: "x" }] }),
    /role/
  );
});

test("rejects an oversized payload", () => {
  const big = "x".repeat(1024 * 1024 + 10);
  assert.match(validateChatPayload({ messages: [{ role: "user", content: big }] }), /too large/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test chatPayload.test.js`
Expected: FAIL — `Cannot find module './chatPayload.js'`.

- [ ] **Step 3: Implement the validator**

```js
// backend/chatPayload.js
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_MESSAGES = 60;
const VALID_ROLES = new Set(["system", "user", "assistant", "tool"]);

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function validateChatPayload(body) {
  if (!isPlainObject(body)) return "Request body is required.";
  if (!Array.isArray(body.messages)) return "messages must be an array.";
  if (body.messages.length === 0) return "messages must contain at least one message.";
  if (body.messages.length > MAX_MESSAGES) return "Conversation is too long.";

  for (const message of body.messages) {
    if (!isPlainObject(message)) return "Each message must be an object.";
    if (!VALID_ROLES.has(message.role)) return `Unsupported message role: ${message.role}.`;
  }

  if (body.pageSnapshot != null && typeof body.pageSnapshot !== "string") {
    return "pageSnapshot must be a string when provided.";
  }

  const serializedLength = Buffer.byteLength(JSON.stringify(body), "utf8");
  if (serializedLength > MAX_BODY_BYTES) return "Request payload is too large.";

  return "";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test chatPayload.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire the endpoint in `server.js`**

In `backend/server.js`, update the import on line 8 from:

```js
import { analyzeJimaContext, analyzeJimaFileText } from "./openaiClient.js";
```

to:

```js
import { analyzeJimaContext, analyzeJimaFileText, chatWithJima } from "./openaiClient.js";
import { validateChatPayload } from "./chatPayload.js";
```

Then add this route immediately after the `/api/jima/analyze-context` handler (after line 239, before the `/api/jima/analyze-file` route):

```js
app.post("/api/jima/chat", requireJimaAccessToken, async (req, res) => {
  const validationError = validateChatPayload(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  try {
    const message = await chatWithJima(req.body);
    return res.json({ ok: true, message });
  } catch (error) {
    if (error?.code === "MISSING_OPENAI_API_KEY") {
      return res.status(500).json({
        ok: false,
        error: "Backend configuration error: OPENAI_API_KEY is not set."
      });
    }

    console.error("Jima chat failed:", error?.message || error);
    return res.status(502).json({
      ok: false,
      error: getOpenAIErrorMessage(error, "Jima could not answer right now. Please try again.")
    });
  }
});
```

- [ ] **Step 6: Smoke-test the route boots**

Run: `cd backend && node -e "import('./chatPayload.js').then(()=>console.log('payload ok')); import('./openaiClient.js').then(m=>{ if(typeof m.chatWithJima!=='function') throw new Error('no chatWithJima'); console.log('client ok'); })"`
Expected: prints `payload ok` and `client ok`.

- [ ] **Step 7: Commit**

```bash
git add backend/chatPayload.js backend/chatPayload.test.js backend/server.js
git commit -m "feat(backend): add POST /api/jima/chat conversational endpoint"
```

---

## Task 5: The pure agent loop

**Files:**
- Create: `src/shared/jima-agent-loop.js`
- Test: `test/jima-agent-loop.test.js`

- [ ] **Step 1: Write the failing test**

```js
// test/jima-agent-loop.test.js  (CommonJS — repo root has no package.json)
const test = require("node:test");
const assert = require("node:assert/strict");
const { runJimaAgentLoop } = require("../src/shared/jima-agent-loop.js");

function assistant(content, toolCalls) {
  return { role: "assistant", content: content || "", tool_calls: toolCalls };
}
function toolCall(id, name, args) {
  return { id, type: "function", function: { name, arguments: JSON.stringify(args) } };
}

test("returns the final answer when no tools are called", async () => {
  const texts = [];
  const thread = [{ role: "user", content: "hi" }];
  const result = await runJimaAgentLoop({
    thread,
    sendTurn: async () => assistant("Hello there!"),
    executeTool: async () => { throw new Error("should not run"); },
    onAssistantText: (t) => texts.push(t)
  });
  assert.equal(result.stopped, false);
  assert.deepEqual(texts, ["Hello there!"]);
  assert.equal(thread.at(-1).role, "assistant");
});

test("executes a tool call, appends its result, then finishes", async () => {
  const calls = [];
  const texts = [];
  const thread = [{ role: "user", content: "what files?" }];
  let turn = 0;
  const result = await runJimaAgentLoop({
    thread,
    sendTurn: async () => {
      turn += 1;
      return turn === 1
        ? assistant("", [toolCall("c1", "list_files", {})])
        : assistant("You have 2 files.");
    },
    executeTool: async (name, args) => { calls.push([name, args]); return { files: ["a", "b"] }; },
    onAssistantText: (t) => texts.push(t)
  });
  assert.deepEqual(calls, [["list_files", {}]]);
  const toolMsg = thread.find((m) => m.role === "tool");
  assert.equal(toolMsg.tool_call_id, "c1");
  assert.match(toolMsg.content, /files/);
  assert.deepEqual(texts, ["You have 2 files."]);
  assert.equal(result.stopped, false);
});

test("a throwing tool is reported back to the model as an error result", async () => {
  const thread = [{ role: "user", content: "go" }];
  let turn = 0;
  await runJimaAgentLoop({
    thread,
    sendTurn: async () => (++turn === 1 ? assistant("", [toolCall("c1", "read_page", {})]) : assistant("done")),
    executeTool: async () => { throw new Error("tab gone"); },
    onAssistantText: () => {}
  });
  const toolMsg = thread.find((m) => m.role === "tool");
  assert.match(toolMsg.content, /tab gone/);
});

test("stops at the round cap and emits a stop message", async () => {
  const texts = [];
  const thread = [{ role: "user", content: "loop" }];
  const result = await runJimaAgentLoop({
    thread,
    maxRounds: 3,
    sendTurn: async () => assistant("", [toolCall("c", "read_page", {})]),
    executeTool: async () => ({ ok: true }),
    onAssistantText: (t) => texts.push(t)
  });
  assert.equal(result.stopped, true);
  assert.equal(texts.length, 1);
  assert.match(texts[0], /stopped/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: from `bgu-companion-chrome-extension/`, `node --test`
Expected: FAIL — `Cannot find module '../src/shared/jima-agent-loop.js'`.

- [ ] **Step 3: Implement the loop**

```js
// src/shared/jima-agent-loop.js
// Pure, dependency-injected agent loop. No chrome/DOM access here so it can be
// unit-tested. The browser wires real deps in sidepanel.js; node tests inject fakes.
//
// sendTurn(thread)            -> Promise<assistantMessage>  (raw OpenAI message)
// executeTool(name, args)     -> Promise<any>               (JSON-serializable result)
// onAssistantText(text)       -> void                       (render a Jima bubble)
// onToolActivity(name, args)  -> void                       (render a tool chip)
//
// assistantMessage shape: { role:"assistant", content:string, tool_calls?:[{id,function:{name,arguments}}] }

async function runJimaAgentLoop({
  thread,
  sendTurn,
  executeTool,
  onAssistantText = () => {},
  onToolActivity = () => {},
  maxRounds = 6
}) {
  let rounds = 0;

  while (rounds < maxRounds) {
    rounds += 1;
    const message = await sendTurn(thread);
    const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

    thread.push({
      role: "assistant",
      content: message?.content || "",
      ...(toolCalls.length ? { tool_calls: toolCalls } : {})
    });

    if (message?.content) onAssistantText(message.content);

    if (toolCalls.length === 0) {
      return { thread, stopped: false };
    }

    for (const call of toolCalls) {
      const name = call?.function?.name || "unknown_tool";
      let args = {};
      try {
        args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }

      onToolActivity(name, args);

      let result;
      try {
        result = await executeTool(name, args);
      } catch (error) {
        result = { error: String(error?.message || error) };
      }

      thread.push({
        role: "tool",
        tool_call_id: call?.id || name,
        content: JSON.stringify(result ?? null)
      });
    }
  }

  onAssistantText("I went through several steps but stopped to avoid looping. Here's what I have so far — tell me to continue if you'd like.");
  return { thread, stopped: true };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { runJimaAgentLoop };
}
if (typeof globalThis !== "undefined") {
  globalThis.JimaAgentLoop = Object.freeze({ runJimaAgentLoop });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: from `bgu-companion-chrome-extension/`, `node --test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/jima-agent-loop.js test/jima-agent-loop.test.js
git commit -m "feat: add pure dependency-injected Jima agent loop with tests"
```

---

## Task 6: Chat transport (`assistant-api.js`)

**Files:**
- Create: `src/shared/assistant-api.js`

- [ ] **Step 1: Implement the transport module**

```js
// src/shared/assistant-api.js
// Thin transport: send one conversational turn to the background relay, which
// forwards it to the backend POST /api/jima/chat. Returns the raw assistant
// message {role,content,tool_calls?} or throws with a user-facing message.

function sendChatTurn(messages, pageSnapshot = "") {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, value) => { if (!settled) { settled = true; fn(value); } };

    try {
      chrome.runtime.sendMessage(
        { type: "JIMA_CHAT", messages, pageSnapshot },
        (response) => {
          if (chrome.runtime.lastError) {
            done(reject, new Error("Jima could not reach the extension background."));
            return;
          }
          if (!response || response.ok === false || !response.message) {
            done(reject, new Error(response?.error || "Jima backend did not return a message."));
            return;
          }
          done(resolve, response.message);
        }
      );
    } catch (error) {
      done(reject, new Error(error?.message || "Jima chat transport failed."));
    }
  });
}

globalThis.JimaAssistantApi = Object.freeze({ sendChatTurn });
```

- [ ] **Step 2: Verify syntax**

Run: from `bgu-companion-chrome-extension/`, `node --check src/shared/assistant-api.js`
Expected: no output (valid).

- [ ] **Step 3: Commit**

```bash
git add src/shared/assistant-api.js
git commit -m "feat: add Jima chat transport (assistant-api)"
```

---

## Task 7: Per-tab conversation persistence

**Files:**
- Create: `src/shared/jima-conversation.js`
- Test: add cases to `test/jima-agent-loop.test.js`? No — create `test/jima-conversation.test.js`

- [ ] **Step 1: Write the failing test (pure helpers only)**

```js
// test/jima-conversation.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { threadStorageKey, trimThread } = require("../src/shared/jima-conversation.js");

test("threadStorageKey is namespaced per tab", () => {
  assert.equal(threadStorageKey(42), "jima_thread_42");
});

test("trimThread keeps the most recent messages under the cap", () => {
  const msgs = Array.from({ length: 50 }, (_, i) => ({ role: "user", content: String(i) }));
  const trimmed = trimThread(msgs, 40);
  assert.equal(trimmed.length, 40);
  assert.equal(trimmed[0].content, "10");
  assert.equal(trimmed.at(-1).content, "49");
});

test("trimThread returns the array unchanged when under the cap", () => {
  const msgs = [{ role: "user", content: "a" }];
  assert.deepEqual(trimThread(msgs, 40), msgs);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: from `bgu-companion-chrome-extension/`, `node --test`
Expected: FAIL — `Cannot find module '../src/shared/jima-conversation.js'`.

- [ ] **Step 3: Implement persistence (dual export so helpers are testable)**

```js
// src/shared/jima-conversation.js
// Per-tab conversation persistence in chrome.storage.session. Threads hold
// OpenAI-format messages ({role, content, tool_calls?, tool_call_id?}).

const JIMA_THREAD_PREFIX = "jima_thread_";
const JIMA_THREAD_MAX_MESSAGES = 40;

function threadStorageKey(tabId) {
  return `${JIMA_THREAD_PREFIX}${tabId}`;
}

function trimThread(messages, max = JIMA_THREAD_MAX_MESSAGES) {
  if (!Array.isArray(messages) || messages.length <= max) return messages;
  return messages.slice(messages.length - max);
}

async function loadThread(tabId) {
  if (tabId == null || !globalThis.chrome?.storage?.session) return [];
  const key = threadStorageKey(tabId);
  const data = await chrome.storage.session.get(key);
  const stored = data[key];
  return Array.isArray(stored) ? stored : [];
}

async function saveThread(tabId, messages) {
  if (tabId == null || !globalThis.chrome?.storage?.session) return;
  const key = threadStorageKey(tabId);
  await chrome.storage.session.set({ [key]: trimThread(messages) });
}

async function clearThread(tabId) {
  if (tabId == null || !globalThis.chrome?.storage?.session) return;
  await chrome.storage.session.remove(threadStorageKey(tabId));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { threadStorageKey, trimThread, loadThread, saveThread, clearThread };
}
if (typeof globalThis !== "undefined") {
  globalThis.JimaConversation = Object.freeze({
    threadStorageKey, trimThread, loadThread, saveThread, clearThread
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: from `bgu-companion-chrome-extension/`, `node --test`
Expected: PASS (existing loop tests + 3 new persistence tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/jima-conversation.js test/jima-conversation.test.js
git commit -m "feat: add per-tab Jima conversation persistence"
```

---

## Task 8: Client-side tool executors

**Files:**
- Create: `src/shared/jima-tools.js`

This module maps tool names (from `backend/jimaTools.js`) to client-side executors. It depends on `globalThis` helpers already present: `chrome.runtime.sendMessage`, `JimaTasks` (`src/shared/jima-tasks.js`), and the saved-courses list. It is verified via the manual checklist (Task 16).

- [ ] **Step 1: Confirm the saved-courses source**

Run: `grep -nE "globalThis\.(JimaCourses|BGU|COURSES)|getSavedCourses|window\.(BGU|COURSES)|^const COURSES|courses-data" /Users/yoavnesher/BGU-Companion/bgu-companion-chrome-extension/src/data/courses-data.js | head`
Expected: identifies the global the course data attaches to (e.g. `globalThis.BGU_COURSES` or similar). Use that exact name in Step 2's `list_saved_courses`. If saved courses are read from `chrome.storage.local`, use the same key the options page writes. (Inspect `src/options/options.js` for the storage key if unclear.)

- [ ] **Step 2: Implement executors**

```js
// src/shared/jima-tools.js
// Client-side executors for the Jima agent tools. Names + argument shapes MUST
// match backend/jimaTools.js (the OpenAI-facing contract). Each executor returns
// a JSON-serializable result that becomes a tool message in the conversation.

function sendBackgroundMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: "No response from background." });
      });
    } catch (error) {
      resolve({ ok: false, error: error?.message || "Background message failed." });
    }
  });
}

function compactPageResult(response) {
  const ctx = response.pageContext || {};
  const det = response.detections || {};
  return {
    pageTitle: ctx.pageTitle || ctx.documentTitle || "",
    url: ctx.currentUrl || ctx.url || "",
    headings: Array.isArray(ctx.headings) ? ctx.headings.slice(0, 20) : [],
    visibleTextPreview: String(ctx.visibleTextPreview || "").slice(0, 6000),
    fileLinks: Array.isArray(ctx.fileLinks) ? ctx.fileLinks.slice(0, 30) : [],
    homeworkCandidates: Array.isArray(det.homeworkCandidates) ? det.homeworkCandidates.slice(0, 20) : [],
    deadlineCandidates: Array.isArray(det.deadlineCandidates) ? det.deadlineCandidates.slice(0, 20) : [],
    fileCandidates: Array.isArray(det.fileCandidates) ? det.fileCandidates.slice(0, 30) : []
  };
}

// ctx.isUsingPage()  -> boolean (page access toggle)
// ctx.requestDownloadConfirm(files) -> renders confirm chip; returns nothing
// ctx.listSavedCourses() -> [{name,url}]
function createJimaTools(ctx = {}) {
  const isUsingPage = ctx.isUsingPage || (() => true);

  async function read_page() {
    if (!isUsingPage()) return { disabled: true, reason: "Page access is off. Turn on 'Using this page' to let Jima read the current tab." };
    const response = await sendBackgroundMessage({ type: "JIMA_ANALYZE_CURRENT_PAGE" });
    if (!response?.ok) return { error: response?.error || "Could not read the page." };
    return compactPageResult(response);
  }

  async function list_files() {
    const page = await read_page();
    if (page.disabled || page.error) return page;
    return { files: page.fileCandidates };
  }

  async function inspect_assignment(args = {}) {
    if (!isUsingPage()) return { disabled: true };
    const response = await sendBackgroundMessage({
      type: "JIMA_OPEN_AND_INSPECT_ASSIGNMENT",
      assignment: { url: args.url, title: args.title || "" }
    });
    if (!response?.ok) return { error: response?.error || "Could not inspect the assignment." };
    return { assignmentDetail: response.assignmentDetail || response.detail || response };
  }

  async function download_files(args = {}) {
    if (!isUsingPage()) return { disabled: true };
    const files = Array.isArray(args.files) ? args.files : [];
    if (files.length === 0) return { error: "No files were provided to download." };
    if (typeof ctx.requestDownloadConfirm === "function") ctx.requestDownloadConfirm(files);
    return {
      status: "awaiting_user_confirmation",
      message: `Proposed ${files.length} file(s) for download. The student must click the confirm button; nothing has downloaded yet.`,
      files: files.map((f) => ({ name: f.name, url: f.url }))
    };
  }

  async function save_task(args = {}) {
    if (!globalThis.JimaTasks?.saveJimaTask) return { error: "Task storage is unavailable." };
    const saved = await globalThis.JimaTasks.saveJimaTask({
      title: args.title,
      dueDate: args.dueDate || "",
      evidence: args.evidence || "",
      confidence: args.confidence || "low",
      sourceUrl: args.sourceUrl || ""
    });
    return { saved: true, task: saved };
  }

  async function list_tasks(args = {}) {
    if (!globalThis.JimaTasks?.getJimaSavedTasks) return { error: "Task storage is unavailable." };
    const tasks = await globalThis.JimaTasks.getJimaSavedTasks();
    const status = args.status || "all";
    const filtered = status === "all" ? tasks : tasks.filter((t) => (t.status || "open") === status);
    return { tasks: filtered };
  }

  async function update_task(args = {}) {
    if (!globalThis.JimaTasks) return { error: "Task storage is unavailable." };
    if (args.action === "delete") {
      await globalThis.JimaTasks.deleteJimaTask(args.taskId);
      return { updated: true, action: "delete" };
    }
    await globalThis.JimaTasks.updateJimaTaskStatus(args.taskId, "done");
    return { updated: true, action: "done" };
  }

  async function list_saved_courses() {
    const courses = typeof ctx.listSavedCourses === "function" ? ctx.listSavedCourses() : [];
    return { courses };
  }

  return {
    read_page, list_files, inspect_assignment, download_files,
    save_task, list_tasks, update_task, list_saved_courses
  };
}

globalThis.JimaTools = Object.freeze({ create: createJimaTools });
```

- [ ] **Step 3: Verify syntax + tool-name parity**

Run: from `bgu-companion-chrome-extension/`:
```bash
node --check src/shared/jima-tools.js && \
node -e "global.globalThis.chrome={}; require('./src/shared/jima-tools.js'); const t=globalThis.JimaTools.create(); const got=Object.keys(t).sort(); const want=['download_files','inspect_assignment','list_files','list_saved_courses','list_tasks','read_page','save_task','update_task']; if(JSON.stringify(got)!==JSON.stringify(want)) throw new Error('tool name mismatch: '+got); console.log('tool names match backend contract');"
```
Expected: prints `tool names match backend contract`. (If `saveJimaTask`'s accepted fields differ from `{title,dueDate,evidence,confidence,sourceUrl}`, adjust the `save_task` executor to match `src/shared/jima-tasks.js:198` `saveJimaTask` — read it and map fields exactly.)

- [ ] **Step 4: Commit**

```bash
git add src/shared/jima-tools.js
git commit -m "feat: add client-side Jima tool executors"
```

---

## Task 9: Background relay + tab cleanup

**Files:**
- Modify: `src/background/background.js`

- [ ] **Step 1: Add the chat backend caller**

In `src/background/background.js`, add this function immediately after `askJimaBackend` (after line 382):

```js
async function askJimaChatBackend(messages, pageSnapshot) {
  const config = await getJimaBackendConfig();
  if (!config.ok) {
    return { ok: false, error: config.error || "Configure the Jima backend URL in Options." };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JIMA_BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(buildJimaBackendUrl(config, "/api/jima/chat"), {
      method: "POST",
      headers: getJimaBackendHeaders(config, { "Content-Type": "application/json" }),
      body: JSON.stringify({ messages, pageSnapshot: pageSnapshot || "" }),
      signal: controller.signal
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: "Jima backend returned an invalid response." };
    }

    if (!response.ok || body?.ok === false) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: "Jima backend rejected the request. Check the backend access token in Options." };
      }
      return { ok: false, error: body?.error || "Jima backend could not answer." };
    }

    if (!body?.message) {
      return { ok: false, error: "Jima backend response did not include a message." };
    }

    return { ok: true, message: body.message };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, error: "Jima backend timed out. Check the backend URL or whether the service is running." };
    }
    return { ok: false, error: "Jima backend is unreachable. Check the backend URL or whether the service is running." };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 2: Add the `JIMA_CHAT` message handler**

In the `chrome.runtime.onMessage.addListener` callback, add this block immediately after the `ANALYZE_WITH_AI` handler (after line 582):

```js
  if (message?.type === "JIMA_CHAT") {
    askJimaChatBackend(message.messages || [], message.pageSnapshot || "")
      .then(sendResponse)
      .catch(() => {
        sendResponse({ ok: false, error: "Jima chat request failed." });
      });

    return true;
  }
```

- [ ] **Step 3: Add per-tab thread cleanup**

At the end of `src/background/background.js` (after the `onMessage` listener closes on line 625), add:

```js
// Clear a tab's persisted Jima conversation when the tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (!chrome.storage?.session) return;
  chrome.storage.session.remove(`jima_thread_${tabId}`);
});
```

- [ ] **Step 4: Verify syntax**

Run: from `bgu-companion-chrome-extension/`, `node --check src/background/background.js`
Expected: no output (valid).

- [ ] **Step 5: Commit**

```bash
git add src/background/background.js
git commit -m "feat(background): relay JIMA_CHAT and clear per-tab threads on tab close"
```

---

## Task 10: Side panel HTML — page pill, New chat, script tags

**Files:**
- Modify: `src/sidepanel/sidepanel.html`

- [ ] **Step 1: Replace the mode toggle with the page-access pill + New chat**

Replace lines 22–24 (the `chatModeToggle` block):

```html
          <div id="chatModeToggle" class="mode-toggle" role="group" aria-label="Jima mode">
            <button class="mode-option is-active" type="button" data-mode="local" aria-pressed="true">Local</button>
            <button class="mode-option" type="button" data-mode="ai" aria-pressed="false">AI</button>
```

with:

```html
          <div class="jima-controls">
            <button id="pageAccessToggle" class="page-pill is-on" type="button" aria-pressed="true" title="Toggle whether Jima can read the current tab">
              <span class="page-pill-dot" aria-hidden="true"></span>
              <span id="pageAccessLabel" class="page-pill-label">Using this page</span>
            </button>
            <button id="newChatBtn" class="quiet-action" type="button" title="Start a new conversation for this tab">New chat</button>
```

(The closing `</div>` that was on line 25 remains and now closes `.jima-controls`.)

- [ ] **Step 2: Add the new module script tags**

Replace lines 360–364:

```html
  <script src="../data/courses-data.js"></script>
  <script src="../shared/jima-tasks.js"></script>
  <script src="../shared/jima-course-resolver.js"></script>
  <script src="jima-chat-v2.js"></script>
  <script src="sidepanel.js"></script>
```

with (order matters — shared modules before `sidepanel.js`):

```html
  <script src="../data/courses-data.js"></script>
  <script src="../shared/jima-tasks.js"></script>
  <script src="../shared/jima-course-resolver.js"></script>
  <script src="../shared/jima-agent-loop.js"></script>
  <script src="../shared/jima-conversation.js"></script>
  <script src="../shared/assistant-api.js"></script>
  <script src="../shared/jima-tools.js"></script>
  <script src="jima-chat-v2.js"></script>
  <script src="sidepanel.js"></script>
```

- [ ] **Step 3: Verify the page-access status line element**

The old `chatModeStatus` element (`src/sidepanel/sidepanel.html`, referenced at `sidepanel.js:12`) may still exist below the toggle. Leave it in the DOM but it will be repurposed in Task 12 to describe page-access state. Confirm it exists:

Run: `grep -n "chatModeStatus" /Users/yoavnesher/BGU-Companion/bgu-companion-chrome-extension/src/sidepanel/sidepanel.html`
Expected: one match. If absent, add `<p id="chatModeStatus" class="mode-status"></p>` right after the `.jima-controls` block.

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/sidepanel.html
git commit -m "feat(sidepanel): replace mode toggle with page-access pill and New chat"
```

---

## Task 11: Side panel CSS — page pill + activity chips

**Files:**
- Modify: `src/sidepanel/sidepanel.css`

- [ ] **Step 1: Add styles**

Append to `src/sidepanel/sidepanel.css`:

```css
/* ===================================================================
   Conversational agent controls
   =================================================================== */
.jima-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.page-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.10);
  color: #15803d;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}
.page-pill:active { transform: scale(0.96); }
.page-pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}
.page-pill:not(.is-on) {
  border-color: var(--border, #dbe5f1);
  background: var(--surface-soft, #f1f5f9);
  color: var(--muted, #64748b);
}
.page-pill:not(.is-on) .page-pill-dot { background: #94a3b8; }

/* Tool-activity chips shown under a Jima turn */
.tool-activity {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 4px 0 2px;
}
.tool-activity-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--surface-soft, #f1f5f9);
  border: 1px solid var(--border, #dbe5f1);
  color: var(--muted-strong, #475569);
  font-size: 11px;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .page-pill.is-on { background: rgba(34, 197, 94, 0.12); color: #6ee7a8; border-color: rgba(34, 197, 94, 0.30); }
  .page-pill:not(.is-on) { background: var(--surface-soft); color: var(--muted); border-color: var(--border); }
  .tool-activity-chip { background: var(--surface-soft); border-color: var(--border); color: var(--muted-strong); }
}
```

- [ ] **Step 2: Verify brace balance**

Run: from `bgu-companion-chrome-extension/`:
```bash
node -e "const s=require('fs').readFileSync('src/sidepanel/sidepanel.css','utf8'); const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length; if(o!==c) throw new Error('unbalanced '+o+'/'+c); console.log('balanced',o);"
```
Expected: prints `balanced <n>`.

- [ ] **Step 3: Commit**

```bash
git add src/sidepanel/sidepanel.css
git commit -m "style(sidepanel): page-access pill and tool-activity chips (light/dark)"
```

---

## Task 12: Side panel orchestration — wire the loop

**Files:**
- Modify: `src/sidepanel/sidepanel.js`

This is the core wiring task. We add the orchestrator, page-access state, per-tab thread load, markdown + activity-chip rendering, and rewire the composer events.

- [ ] **Step 1: Add element refs + state near the existing chat element refs**

After `src/sidepanel/sidepanel.js:12` (`const chatModeStatus = ...`), add:

```js
const pageAccessToggle = document.getElementById("pageAccessToggle");
const pageAccessLabel = document.getElementById("pageAccessLabel");
const newChatBtn = document.getElementById("newChatBtn");
```

After `src/sidepanel/sidepanel.js:107` (`let chatMode = "local";`), add:

```js
let jimaUsingPage = true;
let jimaActiveTabId = null;
let jimaThread = [];          // OpenAI-format messages persisted per tab
let jimaTurnInFlight = false;
let jimaClientTools = null;
```

- [ ] **Step 2: Add active-tab + thread bootstrap**

Add these functions near `buildCurrentAiContextBundle` (anywhere in the top-level function area, e.g. after `src/sidepanel/sidepanel.js:449`):

```js
async function getJimaActiveTabId() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id ?? null;
  } catch {
    return null;
  }
}

function renderThreadToChat(thread) {
  if (chatMessages) chatMessages.innerHTML = "";
  jimaChatHistory.length = 0;
  for (const message of thread) {
    if (message.role === "user") addChatMessage("user", message.content || "");
    else if (message.role === "assistant" && message.content) addChatMessage("assistant", message.content || "");
    // tool + tool-call plumbing is intentionally not rendered as bubbles
  }
}

async function bootstrapJimaConversation() {
  jimaActiveTabId = await getJimaActiveTabId();
  jimaThread = await (globalThis.JimaConversation?.loadThread(jimaActiveTabId) || Promise.resolve([]));
  if (jimaThread.length) {
    renderThreadToChat(jimaThread);
  }
}

async function persistJimaThread() {
  if (globalThis.JimaConversation?.saveThread) {
    await globalThis.JimaConversation.saveThread(jimaActiveTabId, jimaThread);
  }
}
```

- [ ] **Step 3: Add the page snapshot + tool context builders**

Add after the functions from Step 2:

```js
function buildPageSnapshotText() {
  // Compact awareness note injected on the first round of a turn when page access is on.
  const ctx = latestPageContext || {};
  const title = ctx.pageTitle || ctx.documentTitle || "";
  const url = ctx.currentUrl || ctx.url || "";
  const headings = Array.isArray(ctx.headings) ? ctx.headings.slice(0, 8).join(" | ") : "";
  if (!title && !url && !headings) return "";
  return [`TITLE: ${title}`, `URL: ${url}`, headings ? `HEADINGS: ${headings}` : ""]
    .filter(Boolean)
    .join("\n");
}

function getJimaClientTools() {
  if (jimaClientTools) return jimaClientTools;
  jimaClientTools = globalThis.JimaTools.create({
    isUsingPage: () => jimaUsingPage,
    requestDownloadConfirm: (files) => showDownloadConfirmChip(files),
    listSavedCourses: () => collectSavedCoursesForChat()
  });
  return jimaClientTools;
}

function collectSavedCoursesForChat() {
  // Reuse whatever the popup/options use as the course source. If a resolver
  // exposes a list, prefer it; otherwise read the courses-data global.
  if (globalThis.JimaCourseResolver?.listCourses) {
    return globalThis.JimaCourseResolver.listCourses().map((c) => ({ name: c.name, url: c.url }));
  }
  const data = globalThis.BGU_COURSES || globalThis.COURSES || [];
  return (Array.isArray(data) ? data : []).map((c) => ({ name: c.name, url: c.url }));
}
```

> Implementation note for the engineer: confirm the course source from Task 8 Step 1 and make `collectSavedCoursesForChat` return `{name,url}` from the real source. If saved courses live in `chrome.storage.local`, make this function async and `await` it where called (adjust `list_saved_courses` in `jima-tools.js` to await `ctx.listSavedCourses()`).

- [ ] **Step 4: Add the download-confirm chip renderer**

Add near the chat rendering helpers (e.g. after `addChatMessage`, around `src/sidepanel/sidepanel.js:357`):

```js
function showDownloadConfirmChip(files) {
  const safe = (Array.isArray(files) ? files : []).slice(0, 30);
  if (safe.length === 0) return;
  const label = safe.length === 1 ? `Download "${safe[0].name}"?` : `Download ${safe.length} files?`;
  const messageEl = addChatMessage("assistant", label, [
    { label: "Confirm download", dataset: { chatAction: "confirmAgentDownload" } }
  ], "confirmation");
  if (messageEl) messageEl.dataset.downloadFiles = JSON.stringify(safe);
}

function renderToolActivity(messageEl, toolName) {
  if (!messageEl) return;
  let row = messageEl.querySelector(".tool-activity");
  if (!row) {
    row = document.createElement("div");
    row.className = "tool-activity";
    messageEl.querySelector(".chat-message-body")?.appendChild(row);
  }
  const labels = {
    read_page: "🔧 read the page",
    list_files: "📄 listed files",
    inspect_assignment: "🔎 inspected assignment",
    download_files: "⬇️ prepared download",
    save_task: "✅ saved task",
    list_tasks: "🗂️ checked tasks",
    update_task: "✏️ updated task",
    list_saved_courses: "🎓 checked saved courses"
  };
  const chip = document.createElement("span");
  chip.className = "tool-activity-chip";
  chip.textContent = labels[toolName] || `🔧 ${toolName}`;
  row.appendChild(chip);
}
```

- [ ] **Step 5: Add the turn runner (the orchestrator wiring)**

Add after the bootstrap functions:

```js
async function runJimaConversationTurn(userText) {
  const text = String(userText || "").trim();
  if (!text || jimaTurnInFlight) return;
  jimaTurnInFlight = true;

  addChatMessage("user", text);
  jimaThread.push({ role: "user", content: text });

  // If page access is on, refresh latestPageContext so the snapshot is current.
  if (jimaUsingPage) {
    try { await getJimaClientTools().read_page(); } catch { /* snapshot is best-effort */ }
  }

  const thinking = addChatMessage("assistant", "…", [], "text");
  let firstAssistantRendered = false;

  const sendTurn = async (thread) => {
    const lastIsUser = thread.at(-1)?.role === "user";
    const snapshot = jimaUsingPage && lastIsUser ? buildPageSnapshotText() : "";
    return globalThis.JimaAssistantApi.sendChatTurn(thread, snapshot);
  };

  const onAssistantText = (assistantText) => {
    if (!firstAssistantRendered && thinking) {
      const body = thinking.querySelector(".chat-message-body");
      if (body) body.firstChild ? (body.firstChild.textContent = assistantText) : (body.textContent = assistantText);
      firstAssistantRendered = true;
      lastAgentMessageEl = thinking;
    } else {
      lastAgentMessageEl = addChatMessage("assistant", assistantText);
    }
  };

  let lastAgentMessageEl = thinking;
  const onToolActivity = (toolName) => renderToolActivity(lastAgentMessageEl, toolName);

  try {
    await globalThis.JimaAgentLoop.runJimaAgentLoop({
      thread: jimaThread,
      sendTurn,
      executeTool: (name, args) => getJimaClientTools()[name]
        ? getJimaClientTools()[name](args)
        : Promise.resolve({ error: `Unknown tool: ${name}` }),
      onAssistantText,
      onToolActivity,
      maxRounds: 6
    });
  } catch (error) {
    if (!firstAssistantRendered && thinking) {
      const body = thinking.querySelector(".chat-message-body");
      if (body) body.textContent = "I couldn't reach my backend just now. Check that the Jima backend is running, then try again.";
    } else {
      addChatMessage("assistant", "I couldn't reach my backend just now. Check that the Jima backend is running, then try again.", [], "error");
    }
    console.warn("Jima turn failed:", error?.message || error);
  } finally {
    await persistJimaThread();
    jimaTurnInFlight = false;
  }
}
```

> Note: `lastAgentMessageEl` is declared with `let` before `onToolActivity` uses it; keep that order. The "…" placeholder is reused for the first assistant text so there is no empty bubble.

- [ ] **Step 6: Replace `handleChatSubmit` to call the orchestrator**

Replace the body of `handleChatSubmit` (`src/sidepanel/sidepanel.js:2198-2204`):

```js
function handleChatSubmit() {
  const query = chatInput?.value.trim() || "";
  if (chatInput) chatInput.value = "";
  routeChatQuery(query).catch(() => {
    addChatMessage("assistant", "I could not handle that request locally.");
  });
}
```

with:

```js
function handleChatSubmit() {
  const query = chatInput?.value.trim() || "";
  if (!query) return;
  if (chatInput) chatInput.value = "";
  runJimaConversationTurn(query).catch((error) => {
    console.warn("Jima submit failed:", error?.message || error);
    addChatMessage("assistant", "Something went wrong handling that. Please try again.", [], "error");
  });
}
```

- [ ] **Step 7: Rewire the mode-toggle listener to the page pill + add New chat**

Replace the `chatModeToggle` listener block (`src/sidepanel/sidepanel.js:3179-3191`):

```js
if (chatModeToggle) {
  chatModeToggle.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-mode]");
    if (!button) return;
    updateChatMode(button.dataset.mode);
    addChatMessage(
      "system",
      chatMode === "ai"
        ? "AI mode selected. I will still ask before sending any extracted Moodle context to the configured backend."
        : "Local mode selected. I will answer with extension-side evidence and rules only."
    );
  });
}
```

with:

```js
function setPageAccess(on) {
  jimaUsingPage = Boolean(on);
  if (pageAccessToggle) {
    pageAccessToggle.classList.toggle("is-on", jimaUsingPage);
    pageAccessToggle.setAttribute("aria-pressed", String(jimaUsingPage));
  }
  if (pageAccessLabel) pageAccessLabel.textContent = jimaUsingPage ? "Using this page" : "Page access off";
  if (chatModeStatus) {
    chatModeStatus.textContent = jimaUsingPage
      ? "Jima can read the current tab to answer about this page."
      : "Page access is off. Jima will chat but cannot read this tab.";
  }
}

if (pageAccessToggle) {
  pageAccessToggle.addEventListener("click", () => setPageAccess(!jimaUsingPage));
}

if (newChatBtn) {
  newChatBtn.addEventListener("click", async () => {
    jimaThread = [];
    if (globalThis.JimaConversation?.clearThread) await globalThis.JimaConversation.clearThread(jimaActiveTabId);
    if (chatMessages) chatMessages.innerHTML = "";
    jimaChatHistory.length = 0;
    addChatMessage("system", "Started a new conversation for this tab.");
  });
}
```

- [ ] **Step 8: Point the suggested-action + composer chips at the orchestrator**

In the `suggestedActions` listener (`src/sidepanel/sidepanel.js:3193-3211`), replace the final `routeChatQuery(...)` call with `runJimaConversationTurn(...)`:

Replace:
```js
    routeChatQuery(prompts[action] || button.textContent || "").catch(() => {
      addChatMessage("assistant", "I could not handle that request locally.");
    });
```
with:
```js
    runJimaConversationTurn(prompts[action] || button.textContent || "").catch(() => {
      addChatMessage("assistant", "Something went wrong handling that. Please try again.", [], "error");
    });
```

- [ ] **Step 9: Handle the agent download-confirm click**

In the `chatMessages` click listener (`src/sidepanel/sidepanel.js:3224+`), add this branch before the existing `confirmAi` branch:

```js
    if (action === "confirmAgentDownload") {
      const host = button.closest("[data-download-files]");
      let files = [];
      try { files = JSON.parse(host?.dataset.downloadFiles || "[]"); } catch { files = []; }
      chrome.runtime.sendMessage(
        { type: "JIMA_DOWNLOAD_SELECTED_FILES", files },
        (response) => {
          const started = response?.summary?.started || 0;
          addChatMessage(
            "assistant",
            started > 0 ? `Started ${started} download(s).` : (response?.error || "No downloads were started."),
            [],
            started > 0 ? "result" : "error"
          );
        }
      );
      button.disabled = true;
      return;
    }
```

- [ ] **Step 10: Call bootstrap on load**

Find the existing initialization near `initializeJimaToolRegistry();` (`src/sidepanel/sidepanel.js:3160`) and add immediately after it:

```js
setPageAccess(true);
bootstrapJimaConversation().catch((error) => console.warn("Jima bootstrap failed:", error?.message || error));
```

- [ ] **Step 11: Verify syntax**

Run: from `bgu-companion-chrome-extension/`, `node --check src/sidepanel/sidepanel.js`
Expected: no output (valid). If it errors on a missing reference (e.g. `latestPageContext`, `composerDock`, `suggestedActions`), confirm those identifiers exist (they do per the current file) and that new functions are at top level, not nested.

- [ ] **Step 12: Commit**

```bash
git add src/sidepanel/sidepanel.js
git commit -m "feat(sidepanel): wire conversational agent loop, page access, per-tab threads"
```

---

## Task 13: Remove dead regex routing

**Files:**
- Modify: `src/sidepanel/sidepanel.js`
- Modify: `src/sidepanel/jima-chat-v2.js`

Now that the orchestrator handles every message, the regex intent router is dead. Remove it carefully (some helpers like `createMessage`/`createToolRegistry` are still used).

- [ ] **Step 1: Delete `getChatIntent` and `routeChatQuery` from `sidepanel.js`**

Remove `getChatIntent` (`src/sidepanel/sidepanel.js:2087-2104`) and `routeChatQuery` (`src/sidepanel/sidepanel.js:2106-2196`) entirely.

- [ ] **Step 2: Find and remove now-unused intent regex constants**

Run: from `bgu-companion-chrome-extension/`:
```bash
grep -nE "JIMA_FOLLOWUP_DOWNLOAD_PATTERN|JIMA_OPEN_FILE_PATTERN|JIMA_FOLLOWUP_SHOW_FILES_PATTERN|JIMA_FILE_REFERENCE_PATTERN|JIMA_CHAT_HOMEWORK_PATTERN|JIMA_ASSIGNMENT_DETAIL_FOLLOWUP_PATTERN|JIMA_CHAT_ANALYZE_PATTERN|JIMA_CHAT_AI_PATTERN|hasNamedCourseLookupIntent|isCurrentHomeworkRequest" src/sidepanel/sidepanel.js
```
For each constant/function that is ONLY referenced from the deleted `getChatIntent`/`routeChatQuery` (no other references in the output), delete its definition. For any still referenced elsewhere (e.g. `JIMA_FILE_REFERENCE_PATTERN` may be used by file-analysis code), leave it. Delete only the ones whose sole remaining references were the two removed functions.

- [ ] **Step 3: Verify no dangling references**

Run: from `bgu-companion-chrome-extension/`:
```bash
node --check src/sidepanel/sidepanel.js && grep -n "routeChatQuery\|getChatIntent" src/sidepanel/sidepanel.js
```
Expected: `node --check` passes and `grep` returns nothing (no remaining references).

- [ ] **Step 4: Trim `jima-chat-v2.js` to the still-used helpers**

In `src/sidepanel/jima-chat-v2.js`, remove `classifyJimaChatIntent` and all its helper functions and regex constants (`normalizeJimaChatQuery`, `JIMA_INTENT_PATTERNS`, the `JIMA_*_CLEAN_PATTERN` consts, `hasHomeworkIntent`, `isGenericCurrentCourseTail`, `hasNamedCourseLookup`, `isCurrentHomeworkRequest`), and `buildJimaAiContextBundle` with its helpers (`capJimaBundleText`, `capJimaBundleObject`, `capJimaChatMessages`). Keep `createJimaChatId`, `createJimaChatMessage`, `createJimaToolRegistry`, and `JIMA_CHAT_MESSAGE_TYPES`.

Replace the export block at the end (`src/sidepanel/jima-chat-v2.js:220-237`) with:

```js
globalThis.JimaChatV2 = Object.freeze({
  createMessage: createJimaChatMessage,
  createToolRegistry: createJimaToolRegistry
});
```

- [ ] **Step 5: Verify `buildCurrentAiContextBundle` no longer depends on removed code**

`buildCurrentAiContextBundle` (`sidepanel.js:417`) calls `globalThis.JimaChatV2.buildAiContextBundle`, which we removed. Check whether `buildCurrentAiContextBundle` and `askJimaWithAi`/`confirmAi`/`askAiWithContext` tools are still reachable. They are only invoked from the deleted router and the old AI-confirm UI. Since the new orchestrator supersedes them:

Run: `grep -nE "buildCurrentAiContextBundle|askJimaWithAi|showAiConfirmationInChat" /Users/yoavnesher/BGU-Companion/bgu-companion-chrome-extension/src/sidepanel/sidepanel.js`

If their only remaining callers are the `confirmAi`/`askAiWithContext` registry entries and the `chatMessages` `confirmAi`/`ai` click branches, leave those legacy paths intact (they are harmless and unreferenced by the new flow) OR delete them for cleanliness. Minimum requirement: `buildCurrentAiContextBundle` must not call a now-undefined function at load time. Since it's only called on click (not at load), the page still loads; but to avoid a runtime error if a stale button is clicked, change its fallback to not reference the removed API. Verify with `node --check` and a manual smoke test that no console error appears on load.

- [ ] **Step 6: Verify syntax of both files**

Run: from `bgu-companion-chrome-extension/`:
```bash
node --check src/sidepanel/sidepanel.js && node --check src/sidepanel/jima-chat-v2.js && echo "both ok"
```
Expected: prints `both ok`.

- [ ] **Step 7: Commit**

```bash
git add src/sidepanel/sidepanel.js src/sidepanel/jima-chat-v2.js
git commit -m "refactor(sidepanel): remove dead regex intent router"
```

---

## Task 14: Confirm `saveJimaTask` field mapping

**Files:**
- Read: `src/shared/jima-tasks.js`
- Possibly modify: `src/shared/jima-tools.js`

- [ ] **Step 1: Read the real `saveJimaTask` signature**

Run: `sed -n '198,230p' /Users/yoavnesher/BGU-Companion/bgu-companion-chrome-extension/src/shared/jima-tasks.js`
Inspect exactly which fields `saveJimaTask(taskInput)` reads (e.g. `title`, `dueDate`, `evidence`, `confidence`, `status`, `sourceUrl`/`courseUrl`/`link`).

- [ ] **Step 2: Align the `save_task` executor**

If field names differ from the executor in Task 8 (e.g. the task store expects `link` not `sourceUrl`, or `due` not `dueDate`), edit `src/shared/jima-tools.js` `save_task` to pass exactly the fields `saveJimaTask` reads. Also confirm `getJimaOpenTaskCount`/status defaults so saved tasks appear in the popup task count.

- [ ] **Step 3: Verify syntax**

Run: from `bgu-companion-chrome-extension/`, `node --check src/shared/jima-tools.js`
Expected: no output.

- [ ] **Step 4: Commit (if changed)**

```bash
git add src/shared/jima-tools.js
git commit -m "fix: align save_task executor with jima-tasks field names"
```

---

## Task 15: Full automated test run

- [ ] **Step 1: Run backend tests**

Run: `cd backend && node --test`
Expected: all tests in `jimaTools.test.js`, `openaiClient.test.js`, `chatPayload.test.js` PASS.

- [ ] **Step 2: Run extension-root tests**

Run: from `bgu-companion-chrome-extension/`, `node --test`
Expected: all tests in `test/jima-agent-loop.test.js` and `test/jima-conversation.test.js` PASS.

- [ ] **Step 3: Syntax-check all changed JS**

Run: from `bgu-companion-chrome-extension/`:
```bash
for f in src/shared/jima-agent-loop.js src/shared/assistant-api.js src/shared/jima-conversation.js src/shared/jima-tools.js src/sidepanel/sidepanel.js src/sidepanel/jima-chat-v2.js src/background/background.js; do node --check "$f" && echo "ok $f"; done
```
Expected: `ok` for every file.

---

## Task 16: Manual end-to-end verification

Requires the local backend running with a real `OPENAI_API_KEY`.

- [ ] **Step 1: Start the backend**

Run: `cd backend && cp -n .env.example .env` (then ensure `OPENAI_API_KEY=...` is set in `backend/.env`), then `npm start`.
Expected: `Jima backend listening on http://localhost:3000`.

- [ ] **Step 2: Smoke-test the chat endpoint directly**

Run:
```bash
curl -s http://localhost:3000/api/jima/chat -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"In one sentence, who are you?"}]}' | head -c 600
```
Expected: JSON `{"ok":true,"message":{"role":"assistant","content":"...Jima..."}}`.

- [ ] **Step 3: Load the extension in Chrome**

Open `chrome://extensions`, enable Developer Mode, "Load unpacked" → select `bgu-companion-chrome-extension/`. Confirm: no manifest errors; popup opens; options page opens; saved courses still listed.

- [ ] **Step 4: Conversational checklist** (open the side panel on a BGU Moodle course page)

Verify each:
1. Ask "what's on this page?" → Jima replies conversationally and shows a `🔧 read the page` chip.
2. Ask a general question ("explain what a Moodle assignment is") → Jima answers normally (no canned "unsupported").
3. Toggle "Using this page" OFF, ask "what's on this page?" → Jima says it can't see the tab.
4. Ask "save the homework you found as a task" → a task is saved (`✅ saved task` chip); confirm it appears in the popup task count.
5. Ask "show me the files here" then "download the first one" → a "Download …?" confirm chip appears; clicking it starts the download; no download happens without the click.
6. Close and reopen the side panel on the same tab → the conversation is restored. Open a different tab → it has its own (empty/different) thread.
7. Stop the backend, send a message → a clean "couldn't reach my backend" error; reopen panel → thread intact.
8. Click "New chat" → conversation clears for that tab.

- [ ] **Step 5: Privacy/security audit**

Run: from `bgu-companion-chrome-extension/`:
```bash
grep -rniE "sk-[a-zA-Z0-9]{20}|OPENAI_API_KEY\s*=" src manifest.json || echo "no keys in extension"
git diff main --stat -- manifest.json || true
```
Expected: `no keys in extension`; `manifest.json` unchanged (no new permissions).

- [ ] **Step 6: Screenshot light + dark**

Use the Puppeteer approach from the earlier UI session to capture `sidepanel.html` light and dark with the new page pill, and attach to the PR/notes.

- [ ] **Step 7: Final commit (docs/notes if any)**

```bash
git add -A
git commit -m "test: manual e2e verification notes for Jima conversational agent" || echo "nothing to commit"
```

---

## Self-review notes

- **Spec coverage:** agent loop (Task 5, 12), stateless backend `/api/jima/chat` (Task 3, 4), 8-tool set (Task 1 schemas, Task 8 executors), download human-in-the-loop gate (Task 8 + Task 12 Step 9), "Using this page" consent (Task 10, 12), per-tab persistence + tab cleanup (Task 7, 9, 12), free-form responses / removed forced schema (Task 3 uses no `response_format`; Task 13 removes the router), honesty rules in prompt (Task 2), error handling (Task 5 round cap + Task 12 backend-down + Task 8 tool-error results), no new permissions / no keys (Task 16 Step 5), manual checklist (Task 16). All spec sections map to tasks.
- **Type/name consistency:** tool names are identical across `backend/jimaTools.js`, `src/shared/jima-tools.js`, and the Task 8 Step 3 parity check. Thread message shape (`role`/`content`/`tool_calls`/`tool_call_id`) is consistent across the loop (Task 5), transport (Task 6), backend (Task 3), and persistence (Task 7). `JIMA_CHAT` message type matches between `assistant-api.js` (Task 6) and `background.js` (Task 9).
- **Known assumptions flagged for the engineer:** the saved-courses global name (Task 8 Step 1 / Task 12 Step 3 / Task 14) and the exact `saveJimaTask` field names (Task 14) must be confirmed against the real files and adjusted — these are the only spots the plan cannot pin down without reading those specific lines at implementation time.
