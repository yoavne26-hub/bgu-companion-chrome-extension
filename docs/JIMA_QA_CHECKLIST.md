# Jima QA Checklist

Use this checklist before tagging a Jima build or after changing Moodle extraction, chat routing, downloads, saved tasks, or backend analysis.

## Extension Basics

- [ ] Load the extension in `chrome://extensions` without manifest errors.
- [ ] Open the popup successfully.
- [ ] Confirm popup quick links open Moodle, Gezer, Student Info, portal, and settings.
- [ ] Confirm saved courses/pages still appear and open from the popup.
- [ ] Confirm the options page opens.
- [ ] Add, edit, and delete a saved course/page from options.
- [ ] Confirm username/student ID autofill behavior is unchanged on supported BGU pages.
- [ ] Confirm password fields are not filled or stored by the extension.

## Jima Side Panel

- [ ] Open Jima from the popup.
- [ ] Confirm the Jima avatar appears from `assets/icons/jima-avatar.png`.
- [ ] Confirm the default greeting says `Ready when you are, Boss.`
- [ ] Confirm the chat-first side panel is the first visible experience.
- [ ] Confirm Local mode is selected by default.
- [ ] Toggle AI mode and confirm local tool actions still remain local.
- [ ] Confirm chat input supports Enter to send and Shift+Enter for a newline.
- [ ] Confirm the main chat input, mode buttons, and action buttons are keyboard accessible.
- [ ] Confirm the README references the same avatar path and does not contain broken source-placeholder text.

## Local Moodle Scan

- [ ] Open a BGU Moodle course page.
- [ ] Ask Jima: `נתחי את הקורס`.
- [ ] Confirm Jima runs a local scan and does not call the backend.
- [ ] Ask: `האם יש לי עבודת בית?`
- [ ] Confirm Jima scans the current Moodle page and does not search saved courses.
- [ ] Ask: `Do I have homework in this course?`
- [ ] Confirm Jima scans the current Moodle page and does not search saved courses.
- [ ] Ask: `יש לי מטלה בקורס הזה?`
- [ ] Confirm Jima scans the current Moodle page.
- [ ] Confirm local answer summarizes possible homework, date clues, and file resources.
- [ ] Confirm evidence/details remain collapsed or secondary by default.
- [ ] Test a non-Moodle page and confirm Jima says to open a BGU Moodle page first.
- [ ] Reload the Moodle page and confirm scan still works.

## Saved Course Lookup

- [ ] Ask Jima about a saved course by name.
- [ ] Ask: `Do I have homework in מימון?`
- [ ] Confirm Jima searches saved/default courses and asks before opening a matched course.
- [ ] Confirm matching saved/default course results appear before opening anything.
- [ ] Confirm Jima asks for user confirmation before opening/checking a course.
- [ ] Confirm Jima checks only the selected course page.
- [ ] Confirm no all-course scan occurs.

## Homework And Assignment Details

- [ ] On a course page with homework cards, ask: `Do I have homework in this course?`
- [ ] Confirm assignment-like Moodle activity links are detected.
- [ ] Confirm lecture/resource-only files are not offered as tasks.
- [ ] If duplicate titles exist, such as assignment and forum with the same name, confirm assignment URLs are preferred.
- [ ] Ask: `what is the deadline?`
- [ ] Confirm Jima opens/focuses one assignment detail page only after the user action.
- [ ] Confirm Hebrew Moodle date labels are extracted when visible:
  - [ ] `נפתח`
  - [ ] `מסתיים`
  - [ ] `מועד הגשה`
  - [ ] `תאריך הגשה`
  - [ ] `זמן שנותר`
- [ ] Confirm `מסתיים` / closing date is described cautiously as the likely relevant deadline.
- [ ] Confirm `נפתח` / opening date is never treated as a deadline.
- [ ] Confirm submission status is shown only when visible evidence supports it.

## File Matching And Downloads

- [ ] Run a local Moodle scan on a page with lecture/resource files.
- [ ] Ask: `הרצאה 5`.
- [ ] Confirm Jima matches only the specific lecture/resource file when the title contains lecture 5.
- [ ] Ask: `lecture 5`.
- [ ] Ask: `5 הרצאה`.
- [ ] Confirm URL IDs alone do not cause false matches.
- [ ] Ask: `download הרצאה 5`.
- [ ] Confirm Jima shows download confirmation and does not download automatically.
- [ ] Click the download confirmation.
- [ ] Confirm Chrome starts the download.
- [ ] Ask: `summarize it`.
- [ ] Confirm Jima remembers the last referenced file but says it has not read file contents yet.
- [ ] Toggle AI mode and ask: `download הרצאה 5`.
- [ ] Confirm local download flow still wins over AI mode.

## Explicit File Analysis

- [ ] Ask: `what is הרצאה 5 about?`
- [ ] Confirm Jima says it found the file/resource but has not read contents.
- [ ] Confirm actions include download/open/attach file for analysis.
- [ ] Click `Attach file for analysis`.
- [ ] Confirm the chat-native file analysis card appears.
- [ ] Choose a TXT file and confirm no upload happens before clicking `Analyze file`.
- [ ] Click `Analyze file` and confirm backend analysis result appears in chat.
- [ ] Repeat with an MD file.
- [ ] Repeat with a text-based PDF.
- [ ] Repeat with a DOCX.
- [ ] Repeat with a DOC file if a sample is available.
- [ ] Upload a DOC reported by the browser as `application/msword` and confirm it is not rejected as unsupported.
- [ ] Upload a DOC reported as empty MIME or `application/octet-stream` with a `.doc` extension and confirm it reaches extraction.
- [ ] Try an invalid fake `.doc` and confirm the error says DOC extraction failed, not unsupported file type.
- [ ] Click `Analyze file` repeatedly while one analysis is running and confirm only one backend request/message is created.
- [ ] Try an unsupported file type and confirm a friendly error appears.
- [ ] Try a file larger than 10MB and confirm a friendly size error appears.
- [ ] Try a scanned/image-only PDF and confirm empty extraction is explained honestly.
- [ ] Confirm extracted file contents are not saved to `chrome.storage.local`.
- [ ] Confirm uploaded files are not permanently stored by the backend.

## AI Backend Flow

- [ ] Start backend with `cd backend && npm start`.
- [ ] Confirm `GET http://localhost:3000/health` returns `{ "ok": true, "service": "jima-backend" }`.
- [ ] Run a local Moodle scan.
- [ ] Ask: `summarize this page with AI`.
- [ ] Confirm Jima shows an AI confirmation before sending context.
- [ ] While the AI confirmation is pending, ask: `האם יש לי עבודת בית?`
- [ ] Confirm the local current-page scan still runs.
- [ ] While an AI confirmation is pending, ask: `download הרצאה 5`.
- [ ] Confirm the local file download flow still runs.
- [ ] Ask another AI request while one is already pending.
- [ ] Confirm Jima dedupes the repeated AI request and says confirmation is already pending.
- [ ] Toggle AI mode and ask: `analyze עבודת בית 2`.
- [ ] Confirm Jima either routes to matching local file/homework actions first, or shows AI confirmation with the exact question text.
- [ ] Confirm backend request is sent only after clicking continue.
- [ ] Stop the backend and retry AI analysis.
- [ ] Confirm Jima says: `The local Jima backend is not running. Start it with cd backend && npm start.`
- [ ] Remove or unset `OPENAI_API_KEY` and retry.
- [ ] Confirm Jima says the backend is running but `OPENAI_API_KEY` is not configured.
- [ ] Confirm no API key appears in extension files, UI, or console output.

## Privacy And Non-Automation

- [ ] Confirm no backend/OpenAI request occurs during local scan.
- [ ] Confirm no backend/OpenAI request occurs during course lookup.
- [ ] Confirm no backend/OpenAI request occurs during assignment detail inspection.
- [ ] Toggle AI mode and ask `download הרצאה 5`; confirm the local download confirmation flow still wins.
- [ ] Confirm no file download starts before explicit confirmation.
- [ ] Confirm no Moodle file content is fetched silently.
- [ ] Confirm no downloaded local file is read by filename or path.
- [ ] Confirm file content upload happens only after manual file selection/drop and `Analyze file`.
- [ ] Confirm Jima does not access cookies, session tokens, `localStorage`, `sessionStorage`, hidden inputs, password fields, or input values.

## Developer Checks

Run these before handing off a release candidate:

```bash
node --check src/sidepanel/jima-chat-v2.js
node --check src/sidepanel/sidepanel.js
node --check src/background/background.js
node --check src/content/content.js
node --check src/shared/jima-tasks.js
node --check src/shared/jima-course-resolver.js
node --check backend/server.js
node --check backend/openaiClient.js
node --check backend/fileTextExtractor.js
node --check backend/jimaSystemPrompt.js
git diff --check
```
