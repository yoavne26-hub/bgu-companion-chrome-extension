# AGENTS.md

This file defines how AI coding agents should work inside the BGU Companion Chrome Extension project.

BGU Companion is a Manifest V3 Chrome Extension for Ben-Gurion University students. The current product helps students quickly access Moodle, Gezer, Student Info, the student portal, saved course pages, useful university links, and safe autofill for repetitive non-password fields.

The next product goal is to add an integrated student assistant named Jima / ג'ימה. Jima should use the ChatGPT/OpenAI API through a secure backend and help students understand Moodle pages, assignments, announcements, deadlines, files, and course context.

## Core Product Mission

Build BGU Companion into a practical academic assistant while keeping it lightweight, private, reliable, and focused on real student workflows.

Jima should help the student answer questions such as:

- What homework or assignments are visible on this Moodle page?
- Are there any due dates or deadline clues?
- What files are available on this page?
- What should I do next for this course page or assignment?
- Can this assignment or announcement be summarized clearly?

Jima must never invent tasks, deadlines, file contents, or Moodle information that was not actually extracted or provided.

## Current Project Shape

Expected main files:

- manifest.json - Chrome Extension manifest, permissions, host permissions, popup, options, content scripts.
- src/popup/popup.html / src/popup/popup.js - main popup, quick navigation, saved courses/pages, Jima entry points.
- src/options/options.html / src/options/options.js - settings, autofill profile, saved pages management.
- src/sidepanel/sidepanel.html / src/sidepanel/sidepanel.css / src/sidepanel/sidepanel.js - Jima side panel UI.
- src/content/content.js - DOM interaction, autofill behavior, Moodle/page behavior, floating save widget, local Moodle extraction.
- src/background/background.js - MV3 service worker message routing and privileged extension actions.
- src/shared/ - shared Jima browser helpers such as saved tasks and course resolution.
- src/data/courses-data.js - default course/link data.
- src/styles/app.css - shared visual styling for popup and options UI.
- assets/icons/ - extension icons.
- docs/screenshots/ - README and product screenshots.
- backend/ - local backend proxy for future/explicit OpenAI calls.

Do not rename or reorganize existing files unless explicitly requested.

## Technical Principles

- Use vanilla JavaScript, HTML, and CSS by default.
- Do not add frameworks unless there is a clear and approved reason.
- Keep the extension lightweight and fast.
- Keep files modular. Do not turn popup.js or content.js into giant files.
- Use chrome.storage.local for safe local extension state unless there is a strong reason not to.
- Preserve the existing BGU Companion identity, visual style, and UX unless a redesign is explicitly requested.

As Jima grows, prefer small purpose-specific files such as:

- src/sidepanel/sidepanel.html
- src/sidepanel/sidepanel.css
- src/sidepanel/sidepanel.js
- src/background/background.js
- src/content/moodle-extractor.js
- src/shared/assistant-context.js
- src/shared/assistant-api.js
- src/shared/downloads.js

## Chrome Extension Rules

This is a Manifest V3 extension.

When modifying Chrome extension behavior:

- Keep manifest_version: 3.
- Add permissions only when needed.
- Explain any new permission in the implementation summary.
- Prefer narrow host permissions.
- Use extension messaging between popup, side panel, service worker, and content scripts.
- Use a service worker/background file only when coordination is needed.
- Do not rely on permanent in-memory state inside the service worker because MV3 service workers can stop between events.

Recommended assistant architecture:

Moodle page
-> content script extracts visible academic context
-> extension messaging sends context to background/service worker
-> side panel displays Jima UI
-> backend proxy calls OpenAI securely
-> structured response returns to Jima

## Jima Assistant Direction

Build Jima in stages.

### Stage 1 - UI Foundation

Add a simple Jima entry point in the popup and/or side panel.

The first UI should communicate:

- Jima is a student assistant.
- Jima can help analyze Moodle pages.
- AI analysis only happens after the user requests it.
- Page context may be used only with clear user action.

A side panel is preferred for the long-term assistant experience because it can stay open beside Moodle pages.

### Stage 2 - Moodle Context Extraction

Use content scripts to extract only relevant visible information from the current Moodle page.

Allowed context examples:

- page title
- current URL
- course name if visible
- headings
- assignment/activity titles
- visible due dates
- announcements
- file links
- selected text
- visible instructions

Do not extract:

- passwords
- hidden inputs
- cookies
- session tokens
- localStorage or sessionStorage data
- full private pages unless the user explicitly asks for AI analysis
- unnecessary personal data

### Stage 3 - Structured Homework Detection

Do not rely only on GPT to detect homework.

First, implement deterministic extraction where possible:

- assignment-like Moodle activities
- quiz links
- due date patterns
- file/resource links
- announcement blocks
- Hebrew and English task keywords when relevant

Then use GPT to classify, summarize, and explain the extracted evidence.

Required output fields for detected homework/task candidates:

- task name
- source page or course
- due date if found
- evidence text
- confidence level
- link/action
- uncertainty note if needed

If the deadline is unclear, say it is unclear.

### Stage 4 - OpenAI API Integration

Never expose API keys in client-side extension code.

All OpenAI calls must go through a backend/proxy. The extension must not contain:

- OpenAI API keys
- hardcoded secrets
- private backend credentials

The backend should:

- read API keys from environment variables
- validate request payloads
- limit request size
- send only minimum needed context
- return structured JSON where possible
- handle OpenAI/API errors clearly

The extension should clearly indicate when Moodle page context is being sent for AI analysis.

### Stage 5 - File Detection and Downloads

First detect and list Moodle files.

Ask before downloading anything.

Use Chrome downloads APIs only after explicit user action and only after adding the required permission intentionally.

Jima may show file actions such as:

- list files on page
- download selected file
- download selected files
- summarize file later, after explicit user consent and backend support

Do not download files automatically.

Do not claim file contents were read unless the file was actually parsed or its text was provided.

## Security and Privacy Rules

These rules are mandatory.

Never store or handle:

- Moodle passwords
- portal passwords
- OpenAI API keys in extension code
- full private Moodle pages without clear user action
- unnecessary personal data
- cookies or session tokens

Before implementing any Jima feature, check:

- What permissions are added?
- What data leaves the browser?
- Is the user aware that page context is being used?
- Is the minimum necessary context being sent?
- Is there a local-only alternative?
- Are errors handled honestly?

Existing safe autofill behavior must remain limited to non-password fields such as username and student ID.

Do not replace Chrome Password Manager.

## Output Honesty Rules

Jima must be clear about evidence.

Good behavior:

- I found 3 possible homework items on this Moodle page.
- I found a date, but I am not sure it is the final deadline.
- I can see these files. Choose which ones to download.
- I do not see any assignment deadline in the visible page text.

Bad behavior:

- guessing deadlines
- claiming to read files that were not parsed
- sending full page content silently
- downloading without permission
- adding broad permissions without need
- rewriting unrelated parts of the project

## Coding Standards

When making changes:

- Keep changes focused on the requested task.
- Avoid unrelated refactors.
- Preserve existing storage keys and data structures unless migration is requested.
- Preserve existing popup/options/autofill behavior.
- Use readable function names.
- Add comments only where they clarify non-obvious behavior.
- Keep CSS consistent with the existing blue/orange BGU Companion style.
- Avoid duplicated logic where a small helper would be cleaner.

Preferred assistant module responsibilities:

- src/sidepanel/sidepanel.js - Jima UI logic and user interactions.
- src/shared/assistant-context.js - extension-side context request orchestration.
- src/content/moodle-extractor.js - DOM extraction from Moodle pages.
- src/shared/assistant-api.js - calls to the backend proxy, not directly to OpenAI.
- src/shared/downloads.js - safe file download handling.
- src/background/background.js - MV3 service worker message routing and privileged extension actions.

## Testing Expectations

For every meaningful implementation, provide a manual testing checklist.

At minimum, test:

- extension loads in Chrome without manifest errors
- popup still opens
- saved courses/pages still work
- options page still works
- autofill behavior is not broken
- content script still runs on supported BGU pages
- Jima UI opens where expected
- Moodle context extraction handles pages with and without assignments
- AI/backend errors are shown clearly
- no API key appears in extension files
- no new permissions were added without explanation

If downloads are added, test:

- files are listed before download
- user must explicitly choose/download
- download errors are visible
- no silent downloads occur

## Implementation Summary Required

After every coding task, provide:

- files changed
- what was added or modified
- any manifest permission changes
- privacy/security impact
- how to test manually
- known limitations or follow-up tasks

## Preferred Development Order for Jima

1. Add Jima UI shell.
2. Add side panel foundation.
3. Add extension messaging.
4. Add Moodle context extractor.
5. Show extracted context locally.
6. Add backend proxy.
7. Add OpenAI structured page analysis.
8. Add homework detector.
9. Add file detection.
10. Add safe selected-file downloads.
11. Add chat follow-up flow.
12. Add local task dashboard.
13. Add optional file summarization.
14. Add optional calendar integration.

Do not jump ahead to advanced features before the earlier layers are stable.

## Definition of Done for Jima MVP

The first complete Jima MVP should allow a student to:

1. Open a Moodle page.
2. Open Jima in the extension.
3. Click "Analyze current Moodle page".
4. Review what context will be used or know that page context is being used.
5. Receive a structured response with:
   - page summary
   - homework/assignments found
   - due dates found
   - files found
   - recommended next actions
   - uncertainties
6. Save or act on the result without Jima guessing unsupported facts.

## Agent Behavior

When working in this repository:

- Be conservative with permissions.
- Be strict about privacy.
- Prefer small, working increments.
- Keep the student workflow practical.
- Make Jima useful before making her flashy.
- Ask for clarification only when truly blocked.
- If uncertain, implement the safest minimal version and document the limitation.
