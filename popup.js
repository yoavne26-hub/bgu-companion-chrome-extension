const GEZER_URL = "https://gezer1.bgu.ac.il/meser/hlogin.php";
const INFO_URL =
  "https://bgu4u22.bgu.ac.il/apex/10g/r/f_login1004/login_desktop?p_lang=he";

// Storage key used by options.js
const STORAGE_KEY = "courses";

// Initial database (seed) of course links
const courseLinks = {
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
  "תכנון ופיקוח על ייצור 2 (תפי 2)":
    "https://moodle.bgu.ac.il/moodle/course/view.php?id=59568",
  "חוויה מוזיקלית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62465",
  "סדנת מיומנויות בין אישית":
    "https://moodle.bgu.ac.il/moodle/course/view.php?id=62672",
  "כלכלה": "https://moodle.bgu.ac.il/moodle/course/view.php?id=60047",
  "פיזיקה 2ב": "https://moodle.bgu.ac.il/moodle/course/view.php?id=58569",
  "שיטות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59566",
  "פיזיקה 1ב": "https://moodle.bgu.ac.il/moodle/course/view.php?id=55048",
  "אלגוריתמים": "https://moodle.bgu.ac.il/moodle/course/view.php?id=55007",
  "תכנון ופיקוח על ייצור 1 (תפי 1)":
    "https://moodle.bgu.ac.il/moodle/course/view.php?id=57106",
  "משוואות דיפרנציאליות רגילות / מישדיפ":
    "https://moodle.bgu.ac.il/moodle/course/view.php?id=54013",
  "מבוא לתכנות / תכנות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54082",
  "מבוא להסתברות / הסתברות":
    "https://moodle.bgu.ac.il/moodle/course/view.php?id=54009",
  "חדוא 2": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54008",
  "גרפיקה הנדסית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54010",
  "דיסקרטית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=51130",
  "מבוא לחשבונאות פיננסית וניהולית":
    "https://moodle.bgu.ac.il/moodle/course/view.php?id=49107"
};

// Seed snapshot (don’t mutate this)
const DEFAULT_COURSES = { ...courseLinks };

// ---------- Elements ----------
const btnBack = document.getElementById("btnBack");
const btnCourses = document.getElementById("btnCourses");
const btnGezer = document.getElementById("btnGezer");
const btnInfo = document.getElementById("btnInfo");
const titleText = document.getElementById("titleText");
const viewMain = document.getElementById("view-main");
const viewCourses = document.getElementById("view-courses");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const messageEl = document.getElementById("message");
const btnSettings = document.getElementById("btnSettings");

// ---------- UI helpers ----------
function setMessage(text, type = "") {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `message${type ? ` ${type}` : ""}`;
}

function setView(viewName) {
  const isMain = viewName === "main";
  if (viewMain) viewMain.hidden = !isMain;
  if (viewCourses) viewCourses.hidden = isMain;
  if (btnBack) btnBack.hidden = isMain;

  if (titleText) {
    titleText.textContent = isMain ? "BGU Companion" : "BGU Companion — Courses";
  }

  if (!isMain && searchInput) searchInput.focus();
}

function openExternal(url) {
  chrome.tabs.create({ url });
}

function openCourse(url, name) {
  chrome.tabs.update({ url }, () => {
    if (chrome.runtime.lastError) {
      setMessage("Could not open the course.", "error");
      return;
    }
    setMessage(`Opening ${name}...`, "success");
  });
}

// ---------- Storage helpers ----------
async function getCourses() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || {};
}

async function setCourses(courses) {
  await chrome.storage.local.set({ [STORAGE_KEY]: courses });
}

async function getCoursesWithSeed() {
  let courses = await getCourses();

  // Seed defaults if empty
  if (Object.keys(courses).length === 0) {
    courses = { ...DEFAULT_COURSES };
    await setCourses(courses);
  }

  return courses;
}

// ---------- Search logic ----------
async function findCourse(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const courses = await getCoursesWithSeed();
  const entries = Object.entries(courses);

  const exact = entries.find(([name]) => name.toLowerCase() === normalized);
  if (exact) return exact;

  return entries.find(([name]) => name.toLowerCase().includes(normalized)) || null;
}

async function handleSearch() {
  const query = searchInput?.value || "";
  const match = await findCourse(query);

  if (!match) {
    setMessage("No matching course found.", "error");
    return;
  }

  const [name, url] = match;
  openCourse(url, name);
}

// ---------- Events ----------
if (btnSettings) {
  btnSettings.addEventListener("click", () => {
    const url = chrome.runtime.getURL("options.html");
    chrome.tabs.create({ url });
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", () => handleSearch());
}

if (searchInput) {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  });
}

if (btnCourses) {
  btnCourses.addEventListener("click", () => {
    setMessage(""); // clear previous message
    setView("courses");
  });
}

if (btnBack) {
  btnBack.addEventListener("click", () => {
    setMessage(""); // clear previous message
    setView("main");
  });
}

if (btnGezer) {
  btnGezer.addEventListener("click", () => openExternal(GEZER_URL));
}

if (btnInfo) {
  btnInfo.addEventListener("click", () => openExternal(INFO_URL));
}

// ---------- Init ----------
setView("main");

// Optional: seed early so popup is instantly ready
getCoursesWithSeed().catch(() => {
  // if storage permission missing, this will fail; message helps debug
  setMessage("Storage permission missing. Add 'storage' to manifest.", "error");
});
