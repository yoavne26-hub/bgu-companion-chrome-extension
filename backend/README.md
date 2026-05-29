# Jima Backend

This folder contains the backend proxy foundation for the future Jima assistant.

The Chrome Extension can call this backend from the Jima side panel only after the user explicitly clicks "Ask Jima with AI". Do not place API keys in extension code.

## Jima Personality

Jima's backend personality and response rules live in `jimaSystemPrompt.js`.

Jima is designed to be clear, practical, friendly, slightly witty when appropriate, and evidence-based. She should feel like a focused academic companion for BGU students, not a generic chatbot.

The prompt emphasizes:

- using only supplied Moodle context and detections
- separating confirmed findings from possible findings
- being honest about uncertainty
- never inventing deadlines, homework, file contents, or course facts
- never requesting passwords or relying on hidden browser data
- keeping responses concise and action-oriented

The Chrome Extension sends Moodle page context to this backend only after explicit user action. Local detection still works without the backend.

For end-to-end release checks, use the Jima QA checklist at `../docs/JIMA_QA_CHECKLIST.md`.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
OPENAI_API_KEY=your_real_key
```

`backend/.env` is ignored by git. Keep API keys server-side only.

## Run

```bash
npm start
```

The server defaults to:

```text
http://localhost:3000
```

Start this backend before using "Ask Jima with AI" or explicit selected-file analysis in the extension. The local Moodle preview and rule-based detection still work when the backend is offline.

Detected Moodle file downloads are handled by the Chrome Extension, not this backend. Downloads only start after the user selects files in the Jima side panel and clicks "Download selected files". Moodle file links are not fetched or read automatically.

Explicit selected-file analysis is separate: the user must manually choose or drop a local `.txt`, `.md`, `.pdf`, `.docx`, or `.doc` file in Jima and click "Analyze file". Only then is that selected file sent to this local backend for text extraction and AI analysis. Uploaded files are held in memory for the request and are not permanently stored.

Saved Jima academic tasks are stored locally by the Chrome Extension in `chrome.storage.local` under `jimaSavedTasks`. They are not sent to this backend or to OpenAI.

Saved-course lookup and single-course Moodle checks are also handled locally by the Chrome Extension. The extension only opens and analyzes a matched course page after the user confirms the specific course to check.

Assignment detail inspection is also local and user-triggered. After local homework candidates appear, the extension can open one selected Moodle assignment/detail link and inspect visible status, date, instruction, and file evidence. This does not call the backend, does not read hidden browser data, and does not send detail-page context to OpenAI unless a future explicit AI action is added for that purpose.

Local follow-up routing in the side panel is also handled entirely by the Chrome Extension. It can recognize simple file-related requests, such as showing or downloading files from the latest checked page, without using AI. Downloads still require explicit user confirmation and continue to use the extension's safe selected-file download flow.

Assignment detail evidence can be saved back into local Jima tasks in `chrome.storage.local`. The saved detail fields include visible submission/date evidence, a short instruction preview, and detail-page file metadata only. Moodle file contents are not read, uploaded, summarized, or sent to this backend automatically.

The side panel also shows local answer summaries after page checks and assignment detail inspections. These summaries are rule-based, generated inside the extension from already visible extracted context and detections, and do not call this backend or OpenAI.

The Jima side panel now uses a chat-first UX. Local chat routing is deterministic inside the extension: it can trigger current-page analysis, controlled saved-course checks, file display/download confirmation, and explicit AI confirmation. Chat routing does not call this backend or OpenAI unless the user confirms "Ask Jima with AI".

Assignment deadline follow-ups are also local. When the user asks Jima to enter/check a recently detected homework item, the extension can open one selected Moodle assignment or quiz detail page and extract visible date labels such as open, due, closing, cut-off, and time remaining fields. This does not call this backend or OpenAI automatically.

Jima Chat V2 keeps the first side-panel experience as one chat/search surface with Local and AI modes:

- Local mode uses only extension-side extraction, deterministic routing, saved-course lookup, assignment detail inspection, saved tasks, and explicit selected-file downloads.
- AI mode still requires confirmation before the extension sends the latest minimal extracted Moodle context and detections to this backend.
- AI chat uses the student's exact confirmed question, recent small chat context, local evidence, and metadata such as the last referenced file. It does not replace the question with a generic page-summary prompt.
- AI mode does not override local tools. File download/show/open requests, current-page scans, saved-course checks, and assignment deadline follow-ups stay local first.
- The extension can suggest tools/actions in chat, but sensitive actions such as AI requests and downloads still require a separate user click.
- File links can be listed, opened by the browser, or downloaded after confirmation. Moodle files are not read or uploaded automatically.
- When a student asks what a Moodle file is about, the extension first explains that Jima has only seen the file title/link. It then offers download/open actions and opens a compact chat-native file analysis card when requested.
- After a download starts, the extension guides the student to manually attach the downloaded file if they want a content summary.
- Precise file references such as "lecture 5", "הרצאה 5", or "5 הרצאה" are matched locally against visible file/resource titles. Jima remembers the last referenced file during the side-panel session for follow-ups like "download it" or "can you read it".
- File-content analysis is explicit only: the user manually selects a local TXT, MD, PDF, DOCX, or DOC file, then the backend extracts text and supplies that text to the model. PPTX is not supported yet.

## Endpoints

### GET /health

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "ok": true,
  "service": "jima-backend"
}
```

### POST /api/jima/analyze-context

This endpoint accepts extracted Moodle context, deterministic detections, recent compact chat context, and the exact confirmed `userQuestion`, then calls OpenAI server-side.

Example:

```bash
curl -X POST http://localhost:3000/api/jima/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "pageContext": {
      "pageTitle": "Example Moodle Page",
      "url": "https://moodle.bgu.ac.il/moodle/course/view.php?id=123",
      "visibleTextPreview": "Assignment 1 due 12/06/2026. File: instructions.pdf",
      "headings": [],
      "fileLinks": []
    },
    "detections": {
      "homeworkCandidates": [],
      "deadlineCandidates": [],
      "fileCandidates": []
    },
    "userQuestion": "What homework do I have?"
  }'
```

If `OPENAI_API_KEY` is missing, the endpoint returns a clear configuration error.

### POST /api/jima/analyze-file

This endpoint accepts one manually selected local file through `multipart/form-data`, extracts text in memory, and calls OpenAI server-side.

Supported file types:

- TXT
- MD
- PDF
- DOCX
- DOC

Limits:

- maximum file size: 10MB
- extracted text sent to OpenAI is capped at 20,000 characters
- uploaded files are not permanently stored
- DOC support uses `word-extractor` for legacy Word text extraction and may fail for encrypted, corrupted, scanned/image-based, or unsupported old files
- browser MIME values for DOC uploads can vary (`application/msword`, `application/x-msword`, empty, or `application/octet-stream`); the backend keeps a strict extension allowlist and lets the extractor validate supported files
- PPTX is not supported yet

Example:

```bash
curl -X POST http://localhost:3000/api/jima/analyze-file \
  -F "file=@./example.txt" \
  -F "userQuestion=Summarize this file and list study actions."
```

Successful responses include:

```json
{
  "ok": true,
  "analysis": {
    "summary": "...",
    "keyPoints": [],
    "possibleHomework": [],
    "actionItems": [],
    "uncertainties": [],
    "source": {
      "fileName": "example.txt",
      "fileType": "txt",
      "extractedCharacters": 1234
    }
  }
}
```

## Security Notes

- API keys must never be placed in Chrome Extension files.
- Moodle context is sent only after explicit user action from the side panel.
- This backend does not store Moodle content.
- Local rule-based detection still works without this backend.
- Selected-file downloads happen in the Chrome Extension after explicit user action; downloaded Moodle files are not sent to the backend automatically.
- Selected-file analysis sends only the file manually chosen or dropped through the side panel chat card, after the user clicks "Analyze file".
- Saved Jima tasks stay local in browser storage and are not synced through this backend.
- Saved-course matching and single-course scans are local extension actions and do not call this backend.
- Assignment detail checks are local extension actions and do not call this backend.
- Local follow-up action routing is local and does not call this backend or OpenAI.
- Saved assignment detail evidence stays local in browser storage; detail file entries are metadata only.
- Local answer summaries are generated in the extension and do not call this backend or OpenAI.
- Chat-first routing is local and deterministic; Moodle file links are still not read, parsed, uploaded, or sent here automatically.
- Conversational file state is session-only in the side panel and is not persisted or sent to the backend.
- Assignment detail deadline extraction is local and based only on visible Moodle detail-page evidence.
- File contents extracted from explicit user-selected files are not saved to `chrome.storage.local` and are not stored permanently by this backend.
- Page-context AI receives only compact metadata/summaries and recent chat text after confirmation. Previous extracted file contents are not included in page-context AI requests.
- CORS is not enabled. The extension uses the existing narrow localhost host permission for backend calls; page-context AI is routed through the background service worker, while explicit file analysis posts the user-selected file from the side panel.
