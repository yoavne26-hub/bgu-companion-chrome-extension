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

Start this backend before using "Ask Jima with AI" in the extension. The local Moodle preview and rule-based detection still work when the backend is offline.

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

This endpoint accepts extracted Moodle context and deterministic detections, then calls OpenAI server-side.

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

## Security Notes

- API keys must never be placed in Chrome Extension files.
- Moodle context is sent only after explicit user action from the side panel.
- This backend does not store Moodle content.
- Local rule-based detection still works without this backend.
- CORS is not enabled because the extension routes local backend calls through its background service worker with a narrow localhost host permission.
