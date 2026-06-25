const GEZER_URL = "https://gezer1.bgu.ac.il/meser/hlogin.php";
const INFO_URL =
  "https://bgu4u22.bgu.ac.il/apex/10g/r/f_login1004/login_desktop?p_lang=he";
const PORTAL_URL = "https://portal.bgu.ac.il/public/login";

const STORAGE_KEY = "courses";

const btnBack = document.getElementById("btnBack");
const btnCourses = document.getElementById("btnCourses");
const btnGezer = document.getElementById("btnGezer");
const btnInfo = document.getElementById("btnInfo");
const btnPortal = document.getElementById("btnPortal");
const btnJima = document.getElementById("btnJima");
const btnJimaTasks = document.getElementById("btnJimaTasks");
const jimaTasksSummary = document.getElementById("jimaTasksSummary");
const titleText = document.getElementById("titleText");
const viewMain = document.getElementById("view-main");
const viewCourses = document.getElementById("view-courses");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const messageEl = document.getElementById("message");
const btnSettings = document.getElementById("btnSettings");

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
    titleText.textContent = isMain ? "BGU Companion" : "BGU Companion Courses";
  }

  if (!isMain && searchInput) searchInput.focus();
}

function openExternal(url) {
  chrome.tabs.create({ url });
}

function openCourse(url, name) {
  const target =
    typeof globalThis.migrateCourseUrl === "function"
      ? globalThis.migrateCourseUrl(url)
      : url;

  // Remember the intended course so the content script can resume to it if
  // Moodle bounces us to the login / landing page (e.g. an expired session
  // after the Moodle upgrade).
  try {
    chrome.storage.local.set({
      pendingCourseTarget: { url: target, name, ts: Date.now(), attempts: 0 }
    });
  } catch {}

  chrome.tabs.update({ url: target }, () => {
    if (chrome.runtime.lastError) {
      setMessage("Could not open the course.", "error");
      return;
    }
    setMessage(`Opening ${name}...`, "success");
  });
}

function openJimaSidePanel() {
  chrome.windows.getCurrent((currentWindow) => {
    const windowId = currentWindow?.id;

    chrome.runtime.sendMessage({ type: "OPEN_JIMA_SIDE_PANEL", windowId }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        console.warn(
          "Could not open Jima side panel.",
          chrome.runtime.lastError?.message || response?.error || ""
        );
        return;
      }

      window.close();
    });
  });
}

async function updateJimaTasksSummary() {
  if (!jimaTasksSummary || !globalThis.JimaTasks) return;

  const tasks = await globalThis.JimaTasks.getTasks();
  const openCount = globalThis.JimaTasks.getOpenTaskCount(tasks);
  const doneCount = tasks.length - openCount;

  if (tasks.length === 0) {
    jimaTasksSummary.textContent = "No open saved tasks";
    return;
  }

  jimaTasksSummary.textContent = doneCount > 0
    ? `${openCount} open, ${doneCount} done`
    : `${openCount} open`;
}

const resultsEl = document.getElementById("results");

let coursesCache = {};
let resultItems = [];
let activeIndex = -1;

async function getCoursesWithSeed() {
  if (globalThis.CoursesStore) return globalThis.CoursesStore.getCoursesWithSeed();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || {};
}

// Rank matches: exact first, then prefix, then substring. Empty query lists all.
function matchEntries(query) {
  const entries = Object.entries(coursesCache).sort(([a], [b]) => a.localeCompare(b, "he"));
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  const exact = [];
  const prefix = [];
  const includes = [];
  for (const entry of entries) {
    const name = entry[0].toLowerCase();
    if (name === q) exact.push(entry);
    else if (name.startsWith(q)) prefix.push(entry);
    else if (name.includes(q)) includes.push(entry);
  }
  return [...exact, ...prefix, ...includes];
}

function setActive(index) {
  if (resultItems.length === 0) {
    activeIndex = -1;
    return;
  }
  activeIndex = (index + resultItems.length) % resultItems.length;
  resultItems.forEach((item, i) => {
    const isActive = i === activeIndex;
    item.li.classList.toggle("active", isActive);
    if (isActive) item.li.scrollIntoView({ block: "nearest" });
  });
}

function renderResults(query) {
  if (!resultsEl) return;
  const matches = matchEntries(query);
  resultsEl.innerHTML = "";
  resultItems = [];

  if (matches.length === 0) {
    setMessage("No matching course found.", "error");
    return;
  }
  setMessage("");

  for (const [name, url] of matches) {
    const li = document.createElement("li");

    const nameEl = document.createElement("span");
    nameEl.className = "course-name";
    nameEl.textContent = name;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "פתח";
    btn.addEventListener("click", () => openCourse(url, name));

    li.appendChild(nameEl);
    li.appendChild(btn);
    li.addEventListener("mouseenter", () => {
      const idx = resultItems.findIndex((item) => item.li === li);
      if (idx >= 0) setActive(idx);
    });

    resultsEl.appendChild(li);
    resultItems.push({ name, url, li });
  }

  setActive(0);
}

function openActiveOrFirst() {
  const target = resultItems[activeIndex] || resultItems[0];
  if (!target) {
    setMessage("No matching course found.", "error");
    return;
  }
  openCourse(target.url, target.name);
}

async function loadCourses() {
  try {
    coursesCache = await getCoursesWithSeed();
  } catch {
    setMessage("Storage permission missing. Add 'storage' to manifest.", "error");
    return;
  }
  if (viewCourses && !viewCourses.hidden) renderResults(searchInput?.value || "");

  // Best-effort backend sync; refresh the list if the set changed.
  if (globalThis.CoursesStore?.syncFromBackend) {
    globalThis.CoursesStore
      .syncFromBackend()
      .then((synced) => {
        if (synced && typeof synced === "object") {
          coursesCache = synced;
          if (viewCourses && !viewCourses.hidden) renderResults(searchInput?.value || "");
        }
      })
      .catch(() => {});
  }
}

if (btnSettings) {
  btnSettings.addEventListener("click", () => {
    const url = chrome.runtime.getURL("src/options/options.html");
    chrome.tabs.create({ url });
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", () => openActiveOrFirst());
}

if (searchInput) {
  searchInput.addEventListener("input", () => renderResults(searchInput.value || ""));
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      openActiveOrFirst();
    }
  });
}

if (btnCourses) {
  btnCourses.addEventListener("click", () => {
    setMessage("");
    setView("courses");
    renderResults(searchInput?.value || "");
  });
}

if (btnJima) {
  btnJima.addEventListener("click", openJimaSidePanel);
}

if (btnJimaTasks) {
  btnJimaTasks.addEventListener("click", openJimaSidePanel);
}

if (btnBack) {
  btnBack.addEventListener("click", () => {
    setMessage("");
    setView("main");
  });
}

if (btnGezer) {
  btnGezer.addEventListener("click", () => openExternal(GEZER_URL));
}

if (btnInfo) {
  btnInfo.addEventListener("click", () => openExternal(INFO_URL));
}

if (btnPortal) {
  btnPortal.addEventListener("click", () => openExternal(PORTAL_URL));
}

setView("main");

loadCourses();

updateJimaTasksSummary().catch(() => {
  if (jimaTasksSummary) {
    jimaTasksSummary.textContent = "Tasks unavailable";
  }
});

if (chrome.storage?.onChanged && globalThis.JimaTasks) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[globalThis.JimaTasks.storageKey]) return;
    updateJimaTasksSummary().catch(() => {
      if (jimaTasksSummary) {
        jimaTasksSummary.textContent = "Tasks unavailable";
      }
    });
  });
}
