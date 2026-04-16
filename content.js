const STORAGE_COURSES_KEY = "courses";
const STORAGE_PROFILE_KEY = "userProfile";
const DEFAULT_PROFILE = Object.freeze({
  usernameShort: "",
  studentId: "",
  autofillEnabled: true
});
const UI_COLORS = Object.freeze({
  text: "#0f172a",
  textMuted: "#64748b",
  textSoft: "#475569",
  border: "#cbd5e1",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  accent: "#f97316",
  accentDark: "#ea580c",
  success: "#15803d",
  successDark: "#166534",
  error: "#b91c1c",
  panelShadow: "rgba(15, 23, 42, 0.18)",
  accentShadow: "rgba(249, 115, 22, 0.28)",
  successShadow: "rgba(21, 128, 61, 0.24)"
});


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
    courses = { ...globalThis.DEFAULT_COURSES };
    await setCourses(courses);
  }
  return courses;
}

async function getProfile() {
  const data = await chrome.storage.local.get(STORAGE_PROFILE_KEY);
  return { ...DEFAULT_PROFILE, ...(data[STORAGE_PROFILE_KEY] || {}) };
}

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

function findUsernameField(root = document) {
  const exactMatch = root.querySelector('#login_username, input[name="username"], input[autocomplete="username"]');
  if (exactMatch) return exactMatch;

  const candidates = [
    'input#username',
    'input[type="email"]',
    'input[name="user"]',
    'input[name*="user" i]',
    'input[id*="user" i]'
  ];
  for (const sel of candidates) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function normText(s) {
  return (s || "")
    .replace(/\s+/g, " ")
    .replace(/[\u05F4"""]/g, '"')
    .trim()
    .toLowerCase();
}

function labelTextForInput(input) {
  const id = input.getAttribute("id");
  if (id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lbl) return normText(lbl.textContent);
  }

  const parentLabel = input.closest("label");
  if (parentLabel) return normText(parentLabel.textContent);

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
  return (
    text.includes("\u05EA.\u05D6") ||
    text.includes("\u05EA\u05F4\u05D6") ||
    text.includes("\u05EA\u05D6") ||
    text.includes("\u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D4\u05D5\u05EA") ||
    text.includes("\u05D3\u05E8\u05DB\u05D5\u05DF") ||
    text.includes("\u05EA.\u05D6/\u05D3\u05E8\u05DB\u05D5\u05DF") ||
    text.includes("\u05EA\u05D6/\u05D3\u05E8\u05DB\u05D5\u05DF") ||
    text.includes("passport") ||
    text.includes("id number") ||
    text.includes("identity")
  );
}

function isFillableInput(input) {
  if (!input) return false;
  if (input.disabled || input.readOnly) return false;
  const type = (input.getAttribute("type") || "").toLowerCase();
  if (type === "password") return false;
  return type === "" || type === "text" || type === "tel" || type === "number" || type === "email";
}

function findIdField() {
  const inputs = Array.from(document.querySelectorAll("input")).filter(isFillableInput);

  for (const input of inputs) {
    const lblText = labelTextForInput(input);
    if (looksLikeIdLabel(lblText)) return input;
  }

  for (const input of inputs) {
    const hint = inputHintText(input);
    if (looksLikeIdLabel(hint)) return input;
  }

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
  if (profile.autofillEnabled === false) return;

  const username = (profile.usernameShort || "").trim();
  const studentId = (profile.studentId || "").trim();
  if (!username && !studentId) return;

  const userEl = findUsernameField();
  const idEl = findIdField();

  if (username) setIfEmpty(userEl, username);
  if (studentId) setIfEmpty(idEl, studentId);
}

function scheduleAutofill() {
  tryAutofill();
  setTimeout(tryAutofill, 600);
  setTimeout(tryAutofill, 1500);
}

async function findCourse(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const courses = await getCoursesWithSeed();
  const entries = Object.entries(courses);

  const exact = entries.find(([name]) => name.toLowerCase() === normalized);
  if (exact) return exact;

  return entries.find(([name]) => name.toLowerCase().includes(normalized)) || null;
}

function sanitizeCourseName(name) {
  return (name || "")
    .replace(/\s+/g, " ")
    .replace(/\s*[|>-]\s*$/g, "")
    .trim();
}

function isWeakSuggestedName(name) {
  const normalized = normText(name);
  if (!normalized || normalized.length < 2) return true;

  return (
    normalized === "\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA" ||
    normalized === "\u05D4\u05EA\u05E8\u05D0\u05D4" ||
    normalized === "home" ||
    normalized === "alert" ||
    normalized === "moodle"
  );
}

function getCourseIdFromUrl(url) {
  try {
    const parsed = new URL(url, location.origin);
    if (parsed.pathname.endsWith("/course/view.php")) {
      return parsed.searchParams.get("id");
    }
  } catch {}

  return null;
}

function getCourseIdFromPage() {
  try {
    const configuredId = Number(globalThis.M?.cfg?.courseId);
    if (configuredId > 1) return String(configuredId);
  } catch {}

  const bodyMatch = document.body?.className.match(/\bcourse-(\d+)\b/);
  if (bodyMatch && bodyMatch[1] !== "1") return bodyMatch[1];

  return null;
}

function normalizeSaveUrl(url) {
  try {
    const parsed = new URL(url, location.origin);
    parsed.hash = "";

    const courseId = getCourseIdFromUrl(parsed.toString());
    if (courseId) {
      return `${parsed.origin}${parsed.pathname}?id=${encodeURIComponent(courseId)}`;
    }

    return parsed.toString();
  } catch {
    return location.href.split("#")[0];
  }
}

function getCandidateCourseLinks() {
  return Array.from(
    document.querySelectorAll(
      [
        "#page-navbar a[href*='/course/view.php?id=']",
        ".breadcrumb a[href*='/course/view.php?id=']",
        "#page-header a[href*='/course/view.php?id=']",
        "a[href*='/course/view.php?id=']"
      ].join(", ")
    )
  ).filter((link) => link instanceof HTMLAnchorElement && !!link.href);
}

function getBestCourseLink() {
  const pageCourseId = getCourseIdFromPage();
  const links = getCandidateCourseLinks();

  if (pageCourseId) {
    const matchingLink = links.find((link) => getCourseIdFromUrl(link.href) === pageCourseId);
    if (matchingLink) return matchingLink;
  }

  return links[0] || null;
}

function getCurrentRelevantUrl() {
  const isMoodleHost = location.hostname === "moodle.bgu.ac.il";
  if (!isMoodleHost) {
    return normalizeSaveUrl(location.href);
  }

  const currentCourseId = getCourseIdFromUrl(location.href);
  if (currentCourseId) {
    return normalizeSaveUrl(location.href);
  }

  const courseLink = getBestCourseLink();
  if (courseLink) {
    return normalizeSaveUrl(courseLink.href);
  }

  const pageCourseId = getCourseIdFromPage();
  if (pageCourseId) {
    return `${location.origin}/moodle/course/view.php?id=${encodeURIComponent(pageCourseId)}`;
  }

  return normalizeSaveUrl(location.href);
}

function getSuggestedCourseName() {
  const courseLink = getBestCourseLink();
  const candidates = [
    courseLink?.textContent,
    document.querySelector(".page-context-header h1")?.textContent,
    document.querySelector("#page-header h1")?.textContent,
    document.querySelector("h1")?.textContent,
    document.querySelector(".breadcrumb li:last-child")?.textContent,
    document.title.split("|")[0]
  ];

  for (const candidate of candidates) {
    const sanitized = sanitizeCourseName(candidate);
    if (!isWeakSuggestedName(sanitized)) {
      return sanitized;
    }
  }

  const pageCourseId = getCourseIdFromPage();
  if (pageCourseId) {
    return `Course ${pageCourseId}`;
  }

  return sanitizeCourseName(document.title) || "";
}

function findSavedCourseByUrl(courses, url) {
  return Object.entries(courses).find(([, savedUrl]) => normalizeSaveUrl(savedUrl) === url) || null;
}

function isCurrentUrlSaved(courses, url) {
  return !!findSavedCourseByUrl(courses, url);
}

async function saveCurrentPage(name, url) {
  const courseName = sanitizeCourseName(name);
  if (!courseName) {
    return { type: "error", text: "Please enter a name." };
  }

  const courses = await getCoursesWithSeed();
  const existingByUrl = findSavedCourseByUrl(courses, url);
  if (existingByUrl) {
    const [savedName] = existingByUrl;
    return { type: "error", text: `This page is already saved as "${savedName}".`, savedName };
  }

  const existingUrlByName = courses[courseName];
  if (existingUrlByName && normalizeSaveUrl(existingUrlByName) !== url) {
    return {
      type: "error",
      text: `The name "${courseName}" is already used. Please choose another name.`
    };
  }

  courses[courseName] = url;
  await setCourses(courses);

  return {
    type: "success",
    text: `Saved "${courseName}".`,
    savedName: courseName,
    savedUrl: url
  };
}

function setInlineMessage(el, text, type = "") {
  if (!el) return;

  const colors = {
    success: UI_COLORS.success,
    error: UI_COLORS.error,
    muted: UI_COLORS.textSoft
  };

  el.textContent = text;
  el.style.color = colors[type] || UI_COLORS.text;
}

function updateSaveWidgetState(button, isSaved) {
  button.disabled = isSaved;
  button.textContent = isSaved ? "Saved" : "Save";
  button.style.background = isSaved ? UI_COLORS.success : UI_COLORS.accent;
  button.style.boxShadow = isSaved
    ? `0 10px 28px ${UI_COLORS.successShadow}`
    : `0 10px 28px ${UI_COLORS.accentShadow}`;
  button.style.cursor = isSaved ? "not-allowed" : "pointer";
  button.style.opacity = isSaved ? "0.92" : "1";
  button.setAttribute("aria-disabled", isSaved ? "true" : "false");
}

async function refreshSaveWidgetState(button, input, messageEl) {
  const courses = await getCoursesWithSeed();
  const currentUrl = getCurrentRelevantUrl();
  const existingEntry = isCurrentUrlSaved(courses, currentUrl)
    ? findSavedCourseByUrl(courses, currentUrl)
    : null;

  if (existingEntry) {
    const [savedName] = existingEntry;
    updateSaveWidgetState(button, true);
    button.dataset.savedName = savedName;
    if (messageEl) {
      setInlineMessage(messageEl, `Already saved as "${savedName}".`, "muted");
    }
    if (input && !input.value.trim()) {
      input.value = savedName;
    }
    return existingEntry;
  }

  updateSaveWidgetState(button, false);
  delete button.dataset.savedName;
  if (messageEl && !messageEl.textContent) {
    setInlineMessage(messageEl, "", "");
  }
  return null;
}

function attachSaveWidget() {
  if (document.getElementById("bgu-companion-save-widget")) return;

  const root = document.createElement("div");
  root.id = "bgu-companion-save-widget";
  root.dir = "rtl";
  root.style.position = "fixed";
  root.style.left = "20px";
  root.style.bottom = "20px";
  root.style.zIndex = "9999";
  root.style.fontFamily = "system-ui, sans-serif";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Save";
  button.style.border = "none";
  button.style.borderRadius = "999px";
  button.style.padding = "10px 14px";
  button.style.background = UI_COLORS.accent;
  button.style.color = "#ffffff";
  button.style.boxShadow = `0 10px 28px ${UI_COLORS.accentShadow}`;
  button.style.cursor = "pointer";
  button.style.fontSize = "14px";
  button.style.fontWeight = "600";

  const panel = document.createElement("div");
  panel.hidden = true;
  panel.style.position = "absolute";
  panel.style.left = "0";
  panel.style.bottom = "52px";
  panel.style.width = "280px";
  panel.style.padding = "14px";
  panel.style.borderRadius = "14px";
  panel.style.background = "#ffffff";
  panel.style.boxShadow = `0 18px 40px ${UI_COLORS.panelShadow}`;
  panel.style.border = `1px solid ${UI_COLORS.border}`;

  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.justifyContent = "space-between";
  titleRow.style.gap = "8px";
  titleRow.style.marginBottom = "10px";

  const title = document.createElement("div");
  title.textContent = "Save to BGU Companion";
  title.style.fontSize = "14px";
  title.style.fontWeight = "700";
  title.style.color = UI_COLORS.text;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "x";
  closeBtn.style.border = "none";
  closeBtn.style.background = "transparent";
  closeBtn.style.color = UI_COLORS.textMuted;
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.lineHeight = "1";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Course name";
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
  input.style.padding = "10px 12px";
  input.style.borderRadius = "10px";
  input.style.border = `1px solid ${UI_COLORS.border}`;
  input.style.marginBottom = "10px";
  input.style.fontSize = "14px";
  input.style.outline = "none";

  const urlHint = document.createElement("div");
  urlHint.style.fontSize = "12px";
  urlHint.style.color = UI_COLORS.textMuted;
  urlHint.style.marginBottom = "10px";
  urlHint.style.lineHeight = "1.4";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-start";
  actions.style.gap = "8px";
  actions.style.marginBottom = "8px";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  saveBtn.style.border = "none";
  saveBtn.style.borderRadius = "10px";
  saveBtn.style.padding = "9px 12px";
  saveBtn.style.background = UI_COLORS.accent;
  saveBtn.style.color = "#ffffff";
  saveBtn.style.cursor = "pointer";
  saveBtn.style.fontWeight = "600";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.border = `1px solid ${UI_COLORS.border}`;
  cancelBtn.style.borderRadius = "10px";
  cancelBtn.style.padding = "9px 12px";
  cancelBtn.style.background = "#ffffff";
  cancelBtn.style.color = UI_COLORS.text;
  cancelBtn.style.cursor = "pointer";

  const messageEl = document.createElement("div");
  messageEl.style.minHeight = "18px";
  messageEl.style.fontSize = "12px";
  messageEl.style.lineHeight = "1.4";
  let closeTimer = 0;

  input.addEventListener("focus", () => {
    input.style.borderColor = UI_COLORS.accent;
    input.style.boxShadow = "0 0 0 3px rgba(249, 115, 22, 0.14)";
  });

  input.addEventListener("blur", () => {
    input.style.borderColor = UI_COLORS.border;
    input.style.boxShadow = "none";
  });

  function closePanel() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = 0;
    }
    panel.hidden = true;
  }

  async function openSaveDialog() {
    panel.hidden = false;
    const savedEntry = await refreshSaveWidgetState(button, input, messageEl);
    if (!savedEntry) {
      input.value = getSuggestedCourseName();
      setInlineMessage(messageEl, "", "");
    }
    urlHint.textContent = getCurrentRelevantUrl();
    input.focus();
    input.select();
  }

  async function handleSave() {
    const currentUrl = getCurrentRelevantUrl();
    const result = await saveCurrentPage(input.value, currentUrl);
    setInlineMessage(messageEl, result.text, result.type);

    if (result.savedName) {
      input.value = result.savedName;
    }

    const savedEntry = await refreshSaveWidgetState(button, input, messageEl);
    if (savedEntry && result.type === "success") {
      closeTimer = setTimeout(() => {
        closePanel();
      }, 1200);
    }
  }

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    if (panel.hidden) {
      await openSaveDialog();
      return;
    }

    closePanel();
  });

  closeBtn.addEventListener("click", closePanel);
  cancelBtn.addEventListener("click", closePanel);
  saveBtn.addEventListener("click", () => handleSave());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !root.contains(event.target)) {
      closePanel();
    }
  });

  titleRow.appendChild(title);
  titleRow.appendChild(closeBtn);
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  panel.appendChild(titleRow);
  panel.appendChild(input);
  panel.appendChild(urlHint);
  panel.appendChild(actions);
  panel.appendChild(messageEl);
  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);

  refreshSaveWidgetState(button, input, messageEl);

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_COURSES_KEY]) return;
      refreshSaveWidgetState(button, input, messageEl);
    });
  }
}

function run() {
  scheduleAutofill();

  if (
    location.hostname === "moodle.bgu.ac.il" ||
    location.hostname === "gezer1.bgu.ac.il" ||
    location.hostname === "bgu4u22.bgu.ac.il" ||
    location.hostname === "bgu4u.bgu.ac.il"
  ) {
    attachSaveWidget();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
