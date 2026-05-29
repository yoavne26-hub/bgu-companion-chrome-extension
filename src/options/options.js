const STORAGE_COURSES_KEY = "courses";
const STORAGE_PROFILE_KEY = "userProfile";
const STORAGE_JIMA_BACKEND_URL_KEY = "jimaBackendUrl";
const STORAGE_JIMA_BACKEND_ACCESS_TOKEN_KEY = "jimaBackendAccessToken";
const JIMA_DEFAULT_BACKEND_URL = "http://localhost:3000";
const JIMA_BACKEND_TEST_TIMEOUT_MS = 20000;
const DEFAULT_PROFILE = Object.freeze({
  usernameShort: "",
  studentId: "",
  autofillEnabled: true
});

const courseName = document.getElementById("courseName");
const courseUrl = document.getElementById("courseUrl");
const addCourseBtn = document.getElementById("addCourseBtn");
const statusEl = document.getElementById("status");
const courseTableBody = document.getElementById("courseTableBody");

const usernameShortEl = document.getElementById("usernameShort");
const studentIdEl = document.getElementById("studentId");
const autofillEnabledEl = document.getElementById("autofillEnabled");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileStatusEl = document.getElementById("profileStatus");
const jimaBackendUrlEl = document.getElementById("jimaBackendUrl");
const jimaBackendAccessTokenEl = document.getElementById("jimaBackendAccessToken");
const saveJimaBackendBtn = document.getElementById("saveJimaBackendBtn");
const testJimaBackendBtn = document.getElementById("testJimaBackendBtn");
const resetJimaBackendBtn = document.getElementById("resetJimaBackendBtn");
const jimaBackendStatusEl = document.getElementById("jimaBackendStatus");

function setStatus(el, msg, type = "") {
  el.textContent = msg;
  el.className = `message${type ? " " + type : ""}`;
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeUsernameShort(s) {
  return (s || "").trim().replace(/^@+/, "").replace(/\s+/g, "");
}

function normalizeId(s) {
  return (s || "").replace(/\D/g, "").slice(0, 9);
}

function isValidStudentId(id) {
  return /^\d{9}$/.test(id);
}

async function getCourses() {
  const data = await chrome.storage.local.get(STORAGE_COURSES_KEY);
  return data[STORAGE_COURSES_KEY] || {};
}

async function setCourses(courses) {
  await chrome.storage.local.set({ [STORAGE_COURSES_KEY]: courses });
}

async function getProfile() {
  const data = await chrome.storage.local.get(STORAGE_PROFILE_KEY);
  return { ...DEFAULT_PROFILE, ...(data[STORAGE_PROFILE_KEY] || {}) };
}

async function setProfile(profile) {
  await chrome.storage.local.set({ [STORAGE_PROFILE_KEY]: profile });
}

function normalizeJimaBackendUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) {
    return {
      ok: false,
      error: "Enter a Jima backend URL."
    };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      ok: false,
      error: "Enter a valid backend URL."
    };
  }

  if (/^(javascript|data|blob):$/i.test(parsed.protocol)) {
    return {
      ok: false,
      error: "This backend URL type is not allowed."
    };
  }

  if (parsed.search || parsed.hash) {
    return {
      ok: false,
      error: "Use the backend base URL without query strings or fragments."
    };
  }

  if (parsed.protocol === "http:") {
    const isLocalDefault = parsed.hostname === "localhost" &&
      parsed.port === "3000" &&
      (parsed.pathname === "" || parsed.pathname === "/");

    return isLocalDefault
      ? { ok: true, url: JIMA_DEFAULT_BACKEND_URL, isLocal: true }
      : {
        ok: false,
        error: "HTTP is allowed only for local development at http://localhost:3000."
      };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      error: "Use http://localhost:3000 for local development or an HTTPS backend URL."
    };
  }

  const normalizedPath = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return {
    ok: true,
    url: `${parsed.origin}${normalizedPath}`,
    isLocal: false
  };
}

function buildJimaBackendUrl(baseUrl, path) {
  return `${String(baseUrl || JIMA_DEFAULT_BACKEND_URL).replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function getJimaBackendInputs() {
  const urlResult = normalizeJimaBackendUrl(jimaBackendUrlEl?.value || JIMA_DEFAULT_BACKEND_URL);
  if (!urlResult.ok) return urlResult;

  const accessToken = String(jimaBackendAccessTokenEl?.value || "").trim();
  if (!urlResult.isLocal && !accessToken) {
    return {
      ok: false,
      error: "Hosted Jima backends require an access token."
    };
  }

  return {
    ok: true,
    backendUrl: urlResult.url,
    accessToken,
    isLocal: urlResult.isLocal
  };
}

async function getJimaBackendSettings() {
  const data = await chrome.storage.local.get([
    STORAGE_JIMA_BACKEND_URL_KEY,
    STORAGE_JIMA_BACKEND_ACCESS_TOKEN_KEY
  ]);

  const urlResult = normalizeJimaBackendUrl(data[STORAGE_JIMA_BACKEND_URL_KEY] || JIMA_DEFAULT_BACKEND_URL);
  return {
    backendUrl: urlResult.ok ? urlResult.url : JIMA_DEFAULT_BACKEND_URL,
    accessToken: String(data[STORAGE_JIMA_BACKEND_ACCESS_TOKEN_KEY] || "")
  };
}

async function saveJimaBackendSettings(settings) {
  await chrome.storage.local.set({
    [STORAGE_JIMA_BACKEND_URL_KEY]: settings.backendUrl,
    [STORAGE_JIMA_BACKEND_ACCESS_TOKEN_KEY]: settings.accessToken
  });
}

function getJimaBackendHeaders(accessToken) {
  return accessToken
    ? { "X-Jima-Access-Token": accessToken }
    : {};
}

function getJimaBackendNetworkErrorMessage(error) {
  if (error?.name === "AbortError") {
    return "Backend did not respond in time. Render may be waking up; try again in a few seconds.";
  }

  return "Could not reach the backend. Check the URL, Render service status, or extension host permission.";
}

async function testJimaBackendConnection() {
  const config = getJimaBackendInputs();
  if (!config.ok) {
    setStatus(jimaBackendStatusEl, config.error, "error");
    return;
  }

  setStatus(jimaBackendStatusEl, "Testing Jima backend connection...", "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JIMA_BACKEND_TEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildJimaBackendUrl(config.backendUrl, "/health"), {
      method: "GET",
      headers: getJimaBackendHeaders(config.accessToken),
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);

    if (response.status === 401 || response.status === 403) {
      setStatus(jimaBackendStatusEl, "Backend reached, but the access token is invalid. Check the token in Options.", "error");
      return;
    }

    if (!body || typeof body !== "object") {
      setStatus(jimaBackendStatusEl, "Backend reached, but it returned a non-JSON health response. Check the backend URL.", "error");
      return;
    }

    if (!response.ok || body?.ok !== true) {
      setStatus(jimaBackendStatusEl, "Backend reached, but the health check failed. Check the backend service logs.", "error");
      return;
    }

    const authNote = body.authRequired
      ? " Access token protection is enabled."
      : " No backend access token is required by this backend.";
    setStatus(jimaBackendStatusEl, `Connected to Jima backend.${authNote}`, "success");
  } catch (error) {
    setStatus(jimaBackendStatusEl, getJimaBackendNetworkErrorMessage(error), "error");
  } finally {
    clearTimeout(timeoutId);
  }
}

function renderCourses(courses) {
  courseTableBody.innerHTML = "";
  const entries = Object.entries(courses).sort(([a], [b]) => a.localeCompare(b, "he"));

  if (entries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" style="opacity:.75;">No courses saved yet.</td>`;
    courseTableBody.appendChild(tr);
    return;
  }

  for (const [name, url] of entries) {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = name;

    const linkTd = document.createElement("td");
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.className = "course-link";
    a.textContent = url;
    linkTd.appendChild(a);

    const actionsTd = document.createElement("td");
    const del = document.createElement("button");
    del.className = "small-btn";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      const updated = await getCourses();
      delete updated[name];
      await setCourses(updated);
      renderCourses(updated);
      setStatus(statusEl, `Deleted "${name}"`, "success");
    });
    actionsTd.appendChild(del);

    tr.appendChild(nameTd);
    tr.appendChild(linkTd);
    tr.appendChild(actionsTd);

    courseTableBody.appendChild(tr);
  }
}

addCourseBtn.addEventListener("click", async () => {
  const name = courseName.value.trim();
  const url = courseUrl.value.trim();

  if (!name) return setStatus(statusEl, "Please enter a course name.", "error");
  if (!isValidUrl(url)) return setStatus(statusEl, "Please enter a valid URL.", "error");

  const courses = await getCourses();
  courses[name] = url;
  await setCourses(courses);

  courseName.value = "";
  courseUrl.value = "";
  renderCourses(courses);
  setStatus(statusEl, `Saved "${name}"`, "success");
});

studentIdEl.addEventListener("input", () => {
  studentIdEl.value = normalizeId(studentIdEl.value);
});

saveProfileBtn.addEventListener("click", async () => {
  const usernameShort = normalizeUsernameShort(usernameShortEl.value);
  const studentId = normalizeId(studentIdEl.value);
  const autofillEnabled = !!autofillEnabledEl.checked;

  if (!usernameShort) return setStatus(profileStatusEl, "Enter your username (before @).", "error");
  if (!isValidStudentId(studentId)) return setStatus(profileStatusEl, "Student ID must be 9 digits.", "error");

  await setProfile({ usernameShort, studentId, autofillEnabled });
  setStatus(profileStatusEl, "Profile saved!", "success");
});

saveJimaBackendBtn.addEventListener("click", async () => {
  const config = getJimaBackendInputs();
  if (!config.ok) {
    setStatus(jimaBackendStatusEl, config.error, "error");
    return;
  }

  await saveJimaBackendSettings(config);
  jimaBackendUrlEl.value = config.backendUrl;
  setStatus(jimaBackendStatusEl, "Jima backend settings saved.", "success");
});

testJimaBackendBtn.addEventListener("click", () => {
  testJimaBackendConnection();
});

resetJimaBackendBtn.addEventListener("click", async () => {
  const settings = {
    backendUrl: JIMA_DEFAULT_BACKEND_URL,
    accessToken: ""
  };
  await saveJimaBackendSettings(settings);
  jimaBackendUrlEl.value = settings.backendUrl;
  jimaBackendAccessTokenEl.value = "";
  setStatus(jimaBackendStatusEl, "Jima backend reset to local default.", "success");
});

(async function init() {
  let courses = await getCourses();
  if (Object.keys(courses).length === 0) {
    courses = { ...globalThis.DEFAULT_COURSES };
    await setCourses(courses);
  }
  renderCourses(courses);

  const profile = await getProfile();
  usernameShortEl.value = profile.usernameShort || "";
  studentIdEl.value = profile.studentId || "";
  autofillEnabledEl.checked = profile.autofillEnabled !== false;

  const backendSettings = await getJimaBackendSettings();
  jimaBackendUrlEl.value = backendSettings.backendUrl;
  jimaBackendAccessTokenEl.value = backendSettings.accessToken;
})();
