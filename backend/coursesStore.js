import { getDb } from "./db.js";

export const MAX_COURSE_NAME_LENGTH = 120;
export const MAX_COURSE_URL_LENGTH = 600;
export const MAX_COURSES_PER_USER = 300;

export function normalizeUserKey(value) {
  const key = String(value || "").trim();
  // Opaque client-generated id; keep it simple and safe for a primary key.
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) return "";
  return key;
}

export function validateCourseName(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, error: "Course name is required." };
  if (name.length > MAX_COURSE_NAME_LENGTH) {
    return { ok: false, error: "Course name is too long." };
  }
  return { ok: true, value: name };
}

export function validateCourseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return { ok: false, error: "Course URL is required." };
  if (raw.length > MAX_COURSE_URL_LENGTH) {
    return { ok: false, error: "Course URL is too long." };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Course URL is not a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Course URL must use HTTPS." };
  }
  if (!/(^|\.)bgu\.ac\.il$/i.test(parsed.hostname)) {
    return { ok: false, error: "Course URL must be a bgu.ac.il address." };
  }

  return { ok: true, value: parsed.href };
}

export async function listCourses(userKey) {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT name, url FROM courses WHERE user_key = ? ORDER BY name",
    args: [userKey]
  });

  const courses = {};
  for (const row of result.rows) {
    courses[row.name] = row.url;
  }
  return courses;
}

export async function countCourses(userKey) {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM courses WHERE user_key = ?",
    args: [userKey]
  });
  return Number(result.rows[0]?.n || 0);
}

export async function upsertCourse(userKey, name, url) {
  const nameCheck = validateCourseName(name);
  if (!nameCheck.ok) return nameCheck;
  const urlCheck = validateCourseUrl(url);
  if (!urlCheck.ok) return urlCheck;

  const db = getDb();
  // Enforce a per-user cap, but allow updates to existing names.
  const existing = await db.execute({
    sql: "SELECT 1 FROM courses WHERE user_key = ? AND name = ?",
    args: [userKey, nameCheck.value]
  });
  if (existing.rows.length === 0 && (await countCourses(userKey)) >= MAX_COURSES_PER_USER) {
    return { ok: false, error: "You have reached the maximum number of saved courses." };
  }

  await db.execute({
    sql: `INSERT INTO courses (user_key, name, url, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_key, name) DO UPDATE SET url = excluded.url, updated_at = excluded.updated_at`,
    args: [userKey, nameCheck.value, urlCheck.value, Date.now()]
  });

  return { ok: true, value: { name: nameCheck.value, url: urlCheck.value } };
}

export async function deleteCourse(userKey, name) {
  const nameCheck = validateCourseName(name);
  if (!nameCheck.ok) return nameCheck;

  const db = getDb();
  const result = await db.execute({
    sql: "DELETE FROM courses WHERE user_key = ? AND name = ?",
    args: [userKey, nameCheck.value]
  });

  return { ok: true, removed: result.rowsAffected || 0 };
}

// Replace the whole set for a user (used for initial sync / bulk merge).
export async function replaceAllCourses(userKey, courses) {
  if (!courses || typeof courses !== "object" || Array.isArray(courses)) {
    return { ok: false, error: "courses must be an object of name -> url." };
  }

  const entries = Object.entries(courses);
  if (entries.length > MAX_COURSES_PER_USER) {
    return { ok: false, error: "Too many courses in one request." };
  }

  const clean = [];
  for (const [name, url] of entries) {
    const nameCheck = validateCourseName(name);
    if (!nameCheck.ok) return nameCheck;
    const urlCheck = validateCourseUrl(url);
    if (!urlCheck.ok) return urlCheck;
    clean.push([nameCheck.value, urlCheck.value]);
  }

  const db = getDb();
  const now = Date.now();
  const tx = await db.transaction("write");
  try {
    await tx.execute({ sql: "DELETE FROM courses WHERE user_key = ?", args: [userKey] });
    for (const [name, url] of clean) {
      await tx.execute({
        sql: "INSERT INTO courses (user_key, name, url, updated_at) VALUES (?, ?, ?, ?)",
        args: [userKey, name, url, now]
      });
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }

  return { ok: true, count: clean.length };
}
