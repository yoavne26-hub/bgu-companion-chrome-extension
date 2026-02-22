# BGU Companion – Chrome Extension

A productivity-focused Chrome extension designed for BGU students.

BGU Companion centralizes course access, student systems, and login autofill into a single lightweight browser extension.

---

## Core Features

### 1. Quick Access Hub (Popup UI)
- Courses search with intelligent matching
- Direct links to:
  - Moodle
  - Gezer (Exams)
  - Student Info system
- Clean multi-view interface

---

### 2. Persistent Course Management
- Local storage of custom course links
- Add / update / delete courses
- Automatic seeding of default BGU courses
- Sorted rendering

---

### 3. Secure Autofill (No Password Storage)
- Autofills:
  - Username (before @)
  - 9-digit student ID
- Works on:
  - Moodle
  - Gezer
  - Student Info portal
- Password handled only by Chrome Password Manager

---

### 4. Inline Moodle Enhancement

Injects a course search bar directly into Moodle pages, allowing instant navigation without leaving the page.

---

## Architecture

- manifest.json – Extension configuration (Manifest V3)
- popup.html / popup.js – Main hub interface
- options.html / options.js – Settings + profile management
- content.js – Autofill logic + Moodle UI injection
- popup.css – UI styling

---

## Technical Highlights

- Chrome Extension Manifest V3
- chrome.storage.local persistence
- Content script DOM analysis
- Heuristic-based input detection for autofill
- Dynamic UI injection into third-party pages
- Event-driven UI state switching

---

## Permissions Used

- tabs
- storage

Used strictly for:
- Opening external systems
- Storing user preferences

---

## Installation (Developer Mode)

1. Open Chrome → Extensions
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the project folder

---

## What This Project Demonstrates

- Product-oriented thinking
- Frontend UI development
- Browser API integration
- Secure data handling practices
- DOM inspection and automation logic
- Practical system design for real users

---

## Future Improvements

- Cross-device sync
- Theme customization
- Course grouping
- Analytics dashboard for usage tracking
