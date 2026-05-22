const JIMA_COURSES_STORAGE_KEY = "courses";

const JIMA_COURSE_STOP_WORDS = new Set([
  "do",
  "i",
  "have",
  "homework",
  "assignment",
  "assignments",
  "task",
  "tasks",
  "in",
  "for",
  "the",
  "course",
  "check",
  "about",
  "please",
  "is",
  "are",
  "יש",
  "לי",
  "שיעורי",
  "שיעורים",
  "בית",
  "מטלה",
  "מטלות",
  "תרגיל",
  "תרגילים",
  "ב",
  "בקורס",
  "של",
  "על",
  "האם",
  "בדוק",
  "תבדוק"
]);

function normalizeJimaCourseText(value) {
  return String(value || "")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[׳'`"״]/g, "")
    .replace(/[()[\]{}.,!?;:|/\\<>_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getJimaCourseTokens(value) {
  return normalizeJimaCourseText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !JIMA_COURSE_STOP_WORDS.has(token));
}

function isJimaMoodleUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "moodle.bgu.ac.il";
  } catch {
    return false;
  }
}

function scoreJimaCourseMatch(query, courseName) {
  const normalizedQuery = normalizeJimaCourseText(query);
  const normalizedName = normalizeJimaCourseText(courseName);
  if (!normalizedQuery || !normalizedName) return 0;

  if (normalizedQuery === normalizedName) return 120;
  if (normalizedQuery.includes(normalizedName)) return 100;
  if (normalizedName.includes(normalizedQuery)) return 85;

  const queryTokens = getJimaCourseTokens(query);
  const nameTokens = getJimaCourseTokens(courseName);
  if (queryTokens.length === 0 || nameTokens.length === 0) return 0;

  let score = 0;
  for (const nameToken of nameTokens) {
    if (queryTokens.includes(nameToken)) {
      score += 45;
      continue;
    }

    if (queryTokens.some((queryToken) => queryToken.includes(nameToken) || nameToken.includes(queryToken))) {
      score += 24;
    }
  }

  if (score > 0 && nameTokens.length > 1) {
    score += Math.round((score / nameTokens.length) * 0.4);
  }

  return score;
}

async function getJimaCourseSources() {
  const data = await chrome.storage.local.get(JIMA_COURSES_STORAGE_KEY);
  const savedCourses = data[JIMA_COURSES_STORAGE_KEY] || {};
  const defaultCourses = globalThis.DEFAULT_COURSES || {};
  const seen = new Set();
  const courses = [];

  for (const [name, url] of Object.entries(savedCourses)) {
    const key = `${normalizeJimaCourseText(name)}|${url}`;
    seen.add(key);
    courses.push({ name, url, source: "saved" });
  }

  for (const [name, url] of Object.entries(defaultCourses)) {
    const key = `${normalizeJimaCourseText(name)}|${url}`;
    if (seen.has(key)) continue;
    courses.push({ name, url, source: "default" });
  }

  return courses;
}

async function resolveJimaCourses(query, limit = 5) {
  const courses = await getJimaCourseSources();
  const matches = courses
    .map((course) => ({
      ...course,
      score: scoreJimaCourseMatch(query, course.name),
      isMoodle: isJimaMoodleUrl(course.url)
    }))
    .filter((course) => course.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "he"))
    .slice(0, limit);

  return {
    query,
    matches
  };
}

globalThis.JimaCourseResolver = Object.freeze({
  resolveCourses: resolveJimaCourses,
  isMoodleUrl: isJimaMoodleUrl,
  normalizeText: normalizeJimaCourseText
});
