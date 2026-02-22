// ===============================
// BGU Companion — content script
// - Moodle: inline course search (uses storage courses)
// - Moodle/Gezer/Info: autofill username + 9-digit ID (no password)
// ===============================

const STORAGE_COURSES_KEY = "courses";
const STORAGE_PROFILE_KEY = "userProfile";

// Default seed database (courses) in case storage is empty
const DEFAULT_COURSES = {
  "גורמי אנוש": "https://moodle.bgu.ac.il/moodle/course/view.php?id=61297",
  "קבלת החלטות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=61296",
  "רגרסיה לינארית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62506",
  "ניתוח ועיצוב מערכות מידע": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62675",
  "סימולציה": "https://moodle.bgu.ac.il/moodle/course/view.php?id=60482",
  "הנדסת חשמל": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62514",
  "תכנון ופיקוח על ייצור 2": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59568",
  "הנדסת מכונות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59562",
  "בסיסי נתונים": "https://moodle.bgu.ac.il/moodle/course/view.php?id=57627",
  "חקר ביצועים": "https://moodle.bgu.ac.il/moodle/course/view.php?id=57107",
  "אלגברה לינארית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=49403",
  "חדוא 1": "https://moodle.bgu.ac.il/moodle/course/view.php?id=49406",
  "יסודות מערכות מידע": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54012",
  "פתמע": "https://moodle.bgu.ac.il/moodle/course/view.php?id=57105",
  "תכנון ופיקוח על ייצור 2 (תפי 2)": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59568",
  "חוויה מוזיקלית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62465",
  "סדנת מיומנויות בין אישית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62672",
  "כלכלה": "https://moodle.bgu.ac.il/moodle/course/view.php?id=60047",
  "פיזיקה 2ב": "https://moodle.bgu.ac.il/moodle/course/view.php?id=58569",
  "שיטות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59566",
  "פיזיקה 1ב": "https://moodle.bgu.ac.il/moodle/course/view.php?id=55048",
  "אלגוריתמים": "https://moodle.bgu.ac.il/moodle/course/view.php?id=55007",
  "תכנון ופיקוח על ייצור 1 (תפי 1)": "https://moodle.bgu.ac.il/moodle/course/view.php?id=57106",
  "משוואות דיפרנציאליות רגילות / מישדיפ": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54013",
  "מבוא לתכנות / תכנות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54082",
  "מבוא להסתברות / הסתברות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54009",
  "חדוא 2": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54008",
  "גרפיקה הנדסית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54010",
  "דיסקרטית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=51130",
  "מבוא לחשבונאות פיננסית וניהולית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=49107"
};

// ---------- storage helpers ----------
async function getCourses() {
  const data = await chrome.storage.local.get(STORAGE_COURSES_KEY);
  return data[STORAGE_COURSES_KEY] || {};
}

async function setCourses(courses) {
  await chrome.storage.local.set({ [STORAGE_COURSES_KEY]: courses });
}

async function getCoursesWithSeed() {
  let courses = await getCourses();
  if (Object.keys(courses).length === 0) {
    courses = { ...DEFAULT_COURSES };
    await setCourses(courses);
  }
  return courses;
}

async function getProfile() {
  const data = await chrome.storage.local.get(STORAGE_PROFILE_KEY);
  return data[STORAGE_PROFILE_KEY] || null;
}

// ---------- small utilities ----------
function fireInputEvents(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setIfEmpty(el, value) {
  if (!el) return false;
  const current = (el.value || "").trim();
  if (current.length > 0) return false;
  el.value = value;
  fireInputEvents(el);
  return true;
}

// ---------- AUTOFILL ----------
function findUsernameField() {
  const candidates = [
    'input[name="username"]',
    'input#username',
    'input[name="user"]',
    'input[type="email"]',
    'input[autocomplete="username"]',
    'input[name*="user" i]',
    'input[id*="user" i]'
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function normText(s) {
  return (s || "")
    .replace(/\s+/g, " ")
    .replace(/[״”“"]/g, '"')
    .trim()
    .toLowerCase();
}

function labelTextForInput(input) {
  // 1) <label for="...">
  const id = input.getAttribute("id");
  if (id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lbl) return normText(lbl.textContent);
  }

  // 2) <label> ... <input> ... </label>
  const parentLabel = input.closest("label");
  if (parentLabel) return normText(parentLabel.textContent);

  // 3) aria-label / aria-labelledby
  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel) return normText(ariaLabel);

  const ariaLabelledBy = input.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const el = document.getElementById(ariaLabelledBy);
    if (el) return normText(el.textContent);
  }

  return "";
}

function inputHintText(input) {
  const placeholder = input.getAttribute("placeholder");
  const name = input.getAttribute("name");
  const id = input.getAttribute("id");

  return normText(
    [placeholder, name, id, input.getAttribute("autocomplete"), input.getAttribute("inputmode")]
      .filter(Boolean)
      .join(" ")
  );
}

function looksLikeIdLabel(text) {
  // Add/adjust terms as you see in the HTML
  return (
    text.includes("ת.ז") ||
    text.includes("ת״ז") ||
    text.includes("תז") ||
    text.includes("תעודת זהות") ||
    text.includes("דרכון") ||
    text.includes("ת.ז/דרכון") ||
    text.includes("תז/דרכון") ||
    text.includes("passport") ||
    text.includes("id number") ||
    text.includes("identity")
  );
}

function isFillableInput(input) {
  if (!input) return false;
  if (input.disabled || input.readOnly) return false;
  const type = (input.getAttribute("type") || "").toLowerCase();
  // Ignore password fields obviously
  if (type === "password") return false;
  // Most ID fields are text/number/tel
  return type === "" || type === "text" || type === "tel" || type === "number" || type === "email";
}

function findIdField() {
  const inputs = Array.from(document.querySelectorAll("input")).filter(isFillableInput);

  // Pass 1: match by LABEL text (best signal)
  for (const input of inputs) {
    const lblText = labelTextForInput(input);
    if (looksLikeIdLabel(lblText)) return input;
  }

  // Pass 2: match by placeholder / name / id / aria-label hints
  for (const input of inputs) {
    const hint = inputHintText(input);
    if (looksLikeIdLabel(hint)) return input;
  }

  // Pass 3: fallback to maxlength=9 or pattern hint
  const byMaxLen = inputs.find((i) => {
    const ml = i.maxLength || Number(i.getAttribute("maxlength")) || 0;
    const pattern = normText(i.getAttribute("pattern"));
    return ml === 9 || pattern.includes("\\d{9}") || pattern.includes("[0-9]{9}");
  });
  if (byMaxLen) return byMaxLen;

  return null;
}


async function tryAutofill() {
  const profile = await getProfile();
  if (!profile || profile.autofillEnabled === false) return;

  const username = (profile.usernameShort || "").trim();
  const studentId = (profile.studentId || "").trim();
  if (!username && !studentId) return;

  const userEl = findUsernameField();
  const idEl = findIdField();

  if (username) setIfEmpty(userEl, username);
  if (studentId) setIfEmpty(idEl, studentId);
}


// Run autofill on load + after small delay (pages that render late)
function scheduleAutofill() {
  tryAutofill();
  setTimeout(tryAutofill, 600);
  setTimeout(tryAutofill, 1500);
}

// ---------- Moodle inline course search ----------
async function findCourse(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const courses = await getCoursesWithSeed();
  const entries = Object.entries(courses);

  const exact = entries.find(([name]) => name.toLowerCase() === normalized);
  if (exact) return exact;

  return entries.find(([name]) => name.toLowerCase().includes(normalized)) || null;
}

function getMoodleTargetElement() {
  const header = document.querySelector("#page-header .card-body");
  if (header) return header;

  const content = document.querySelector("#page-content");
  if (content) return content;

  return null;
}

function attachInlineSearch() {
  const target = getMoodleTargetElement();
  if (!target || target.dataset.quickSearchAttached) return;
  target.dataset.quickSearchAttached = "true";

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "8px";
  wrapper.style.flexWrap = "wrap";
  wrapper.style.marginTop = "8px";
  wrapper.dir = "rtl";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "חיפוש קורס";
  input.style.padding = "6px 10px";
  input.style.borderRadius = "6px";
  input.style.border = "1px solid #cbd5e1";
  input.style.minWidth = "220px";

  const button = document.createElement("button");
  button.textContent = "פתח קורס";
  button.style.padding = "6px 10px";
  button.style.border = "none";
  button.style.borderRadius = "6px";
  button.style.background = "#2563eb";
  button.style.color = "#fff";
  button.style.cursor = "pointer";

  const message = document.createElement("span");
  message.style.minHeight = "18px";
  message.style.fontSize = "13px";
  message.style.color = "#0f172a";

  function setMessage(text, color = "#0f172a") {
    message.textContent = text;
    message.style.color = color;
  }

  async function handleSearch() {
    const match = await findCourse(input.value);
    if (!match) {
      setMessage("לא נמצא קורס תואם.", "#b91c1c");
      return;
    }
    const [, url] = match;
    setMessage("פותח קורס...", "#15803d");
    window.location.href = url;
  }

  button.addEventListener("click", () => handleSearch());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(button);
  wrapper.appendChild(message);
  target.appendChild(wrapper);
}

// ---------- Main ----------
function run() {
  scheduleAutofill();

  // Moodle-only UI injection
  if (location.hostname === "moodle.bgu.ac.il") {
    attachInlineSearch();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
// ---------- End of content.js ----------