// ===================================================================
// Shared courses store
// -------------------------------------------------------------------
// Single source of truth for reading/writing the saved-courses map.
// Used by the popup, the options page, and the Moodle content script
// (loaded as a classic script that attaches to globalThis, matching
// courses-data.js).
//
// Local chrome.storage.local is always the offline cache. When a backend
// is configured AND we are running inside an extension page (popup /
// options — never a content script, where cross-origin fetch to the
// backend is blocked by CORS), we best-effort sync with the per-user
// courses API. The user is identified by an opaque key generated once
// and stored locally.
// ===================================================================
(function initCoursesStore() {
  const STORAGE_COURSES_KEY = "courses";
  const USER_KEY_STORAGE = "bguUserKey";
  const BACKEND_URL_KEY = "jimaBackendUrl";
  const BACKEND_TOKEN_KEY = "jimaBackendAccessToken";
  const DEFAULT_BACKEND_URL = "http://localhost:3000";
  const SYNC_TIMEOUT_MS = 4000;

  // Remote sync is only safe from extension-origin pages.
  const remoteAllowed =
    typeof location !== "undefined" && location.protocol === "chrome-extension:";

  function hasStorage() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  }

  async function getLocalCourses() {
    if (!hasStorage()) return {};
    const data = await chrome.storage.local.get(STORAGE_COURSES_KEY);
    return data[STORAGE_COURSES_KEY] || {};
  }

  async function setLocalCourses(courses) {
    if (!hasStorage()) return;
    await chrome.storage.local.set({ [STORAGE_COURSES_KEY]: courses });
  }

  // Seed defaults on first run, otherwise migrate legacy URLs / merge new
  // defaults. Purely local — safe to call anywhere, including content scripts.
  async function getCoursesWithSeed() {
    let courses = await getLocalCourses();

    if (Object.keys(courses).length === 0) {
      courses = { ...(globalThis.DEFAULT_COURSES || {}) };
      await setLocalCourses(courses);
      return courses;
    }

    if (typeof globalThis.upgradeStoredCourses === "function") {
      const { courses: upgraded, changed } = globalThis.upgradeStoredCourses(courses);
      if (changed) await setLocalCourses(upgraded);
      return upgraded;
    }

    return courses;
  }

  async function getUserKey() {
    if (!hasStorage()) return "";
    const data = await chrome.storage.local.get(USER_KEY_STORAGE);
    let key = data[USER_KEY_STORAGE];
    if (!key) {
      key =
        (globalThis.crypto && typeof crypto.randomUUID === "function")
          ? crypto.randomUUID()
          : `u-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      await chrome.storage.local.set({ [USER_KEY_STORAGE]: key });
    }
    return key;
  }

  function normalizeBaseUrl(value) {
    const raw = String(value || "").trim().replace(/\/+$/, "");
    return raw || DEFAULT_BACKEND_URL;
  }

  async function getBackendConfig() {
    if (!hasStorage()) return { baseUrl: DEFAULT_BACKEND_URL, token: "" };
    const data = await chrome.storage.local.get([BACKEND_URL_KEY, BACKEND_TOKEN_KEY]);
    return {
      baseUrl: normalizeBaseUrl(data[BACKEND_URL_KEY]),
      token: String(data[BACKEND_TOKEN_KEY] || "").trim()
    };
  }

  async function backendFetch(pathSuffix, options = {}) {
    const config = await getBackendConfig();
    const userKey = await getUserKey();
    if (!userKey) throw new Error("No user key.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    try {
      const response = await fetch(`${config.baseUrl}/api/courses${pathSuffix}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-BGU-User": userKey,
          ...(config.token ? { "X-Jima-Access-Token": config.token } : {}),
          ...(options.headers || {})
        },
        signal: controller.signal
      });
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      return { ok: response.ok && body?.ok !== false, status: response.status, body };
    } finally {
      clearTimeout(timeout);
    }
  }

  // Pull remote, converge local <-> remote (union; remote wins on conflict),
  // and persist the merged set locally. Returns the merged map. Best-effort:
  // any failure resolves to the current local set.
  async function syncFromBackend() {
    const local = await getCoursesWithSeed();
    if (!remoteAllowed) return local;

    try {
      const res = await backendFetch("", { method: "GET" });
      if (!res.ok || !res.body || typeof res.body.courses !== "object") {
        return local;
      }

      const remote = res.body.courses || {};
      const remoteKeys = Object.keys(remote);

      // New user with nothing on the server yet: adopt local as their set.
      if (remoteKeys.length === 0) {
        if (Object.keys(local).length > 0) {
          await backendFetch("", {
            method: "PUT",
            body: JSON.stringify({ courses: local })
          });
        }
        return local;
      }

      // Union; remote value wins on name conflicts.
      const merged = { ...local, ...remote };
      await setLocalCourses(merged);

      // If local had entries the server lacked, push the union up.
      const mergedKeys = Object.keys(merged);
      if (mergedKeys.length !== remoteKeys.length) {
        await backendFetch("", {
          method: "PUT",
          body: JSON.stringify({ courses: merged })
        });
      }
      return merged;
    } catch {
      return local;
    }
  }

  // Add or update one course: write local immediately, push best-effort.
  async function saveCourse(name, url) {
    const courses = await getCoursesWithSeed();
    courses[name] = url;
    await setLocalCourses(courses);

    if (remoteAllowed) {
      try {
        await backendFetch("", { method: "POST", body: JSON.stringify({ name, url }) });
      } catch {}
    }
    return courses;
  }

  async function removeCourse(name) {
    const courses = await getCoursesWithSeed();
    delete courses[name];
    await setLocalCourses(courses);

    if (remoteAllowed) {
      try {
        await backendFetch(`?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      } catch {}
    }
    return courses;
  }

  // Replace the whole set both locally and remotely.
  async function replaceAll(courses) {
    await setLocalCourses(courses);
    if (remoteAllowed) {
      try {
        await backendFetch("", { method: "PUT", body: JSON.stringify({ courses }) });
      } catch {}
    }
    return courses;
  }

  globalThis.CoursesStore = {
    STORAGE_COURSES_KEY,
    remoteAllowed,
    getLocalCourses,
    setLocalCourses,
    getCoursesWithSeed,
    getUserKey,
    getBackendConfig,
    syncFromBackend,
    saveCourse,
    removeCourse,
    replaceAll
  };
})();
