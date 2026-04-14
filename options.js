const STORAGE_COURSES_KEY = "courses";
const STORAGE_PROFILE_KEY = "userProfile";

// ---- Elements (Courses) ----
const courseName = document.getElementById("courseName");
const courseUrl = document.getElementById("courseUrl");
const addCourseBtn = document.getElementById("addCourseBtn");
const statusEl = document.getElementById("status");
const courseTableBody = document.getElementById("courseTableBody");

// ---- Elements (Profile) ----
const usernameShortEl = document.getElementById("usernameShort");
const studentIdEl = document.getElementById("studentId");
const autofillEnabledEl = document.getElementById("autofillEnabled");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileStatusEl = document.getElementById("profileStatus");

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

// ---- Storage: Courses ----
async function getCourses() {
  const data = await chrome.storage.local.get(STORAGE_COURSES_KEY);
  return data[STORAGE_COURSES_KEY] || {};
}

async function setCourses(courses) {
  await chrome.storage.local.set({ [STORAGE_COURSES_KEY]: courses });
}

// ---- Storage: Profile ----
async function getProfile() {
  const data = await chrome.storage.local.get(STORAGE_PROFILE_KEY);
  return data[STORAGE_PROFILE_KEY] || {
    usernameShort: "",
    studentId: "",
    autofillEnabled: true
  };
}

async function setProfile(profile) {
  await chrome.storage.local.set({ [STORAGE_PROFILE_KEY]: profile });
}

// ---- Render Courses Table ----
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

// ---- Events: Add/Update Course ----
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

// ---- Events: Save Profile ----
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
  setStatus(profileStatusEl, "Profile saved ✅", "success");
});

// ---- Init ----
(async function init() {
  // Seed courses if empty
  let courses = await getCourses();
  if (Object.keys(courses).length === 0) {
    courses = { ...DEFAULT_COURSES };
    await setCourses(courses);
  }
  renderCourses(courses);

  // Load profile
  const profile = await getProfile();
  usernameShortEl.value = profile.usernameShort || "";
  studentIdEl.value = profile.studentId || "";
  autofillEnabledEl.checked = profile.autofillEnabled !== false;
})();
