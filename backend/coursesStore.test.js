import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { setDbForTesting, initDb } from "./db.js";
import {
  normalizeUserKey,
  validateCourseUrl,
  listCourses,
  upsertCourse,
  deleteCourse,
  replaceAllCourses
} from "./coursesStore.js";

const tmpFile = path.join(os.tmpdir(), `bgu-courses-test-${Date.now()}.db`);

test.before(async () => {
  setDbForTesting(createClient({ url: `file:${tmpFile}` }));
  await initDb();
});

test.after(() => {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(tmpFile + suffix);
    } catch {}
  }
});

test("normalizeUserKey accepts valid keys and rejects bad ones", () => {
  assert.equal(normalizeUserKey("abc12345"), "abc12345");
  assert.equal(normalizeUserKey("with-dash_and_underscore-123"), "with-dash_and_underscore-123");
  assert.equal(normalizeUserKey("short"), "");
  assert.equal(normalizeUserKey("has spaces!!"), "");
  assert.equal(normalizeUserKey(""), "");
});

test("validateCourseUrl enforces https + bgu.ac.il", () => {
  assert.equal(validateCourseUrl("https://moodle.bgu.ac.il/moodle/course/view.php?id=1").ok, true);
  assert.equal(validateCourseUrl("http://moodle.bgu.ac.il/x").ok, false);
  assert.equal(validateCourseUrl("https://evil.com/x").ok, false);
  assert.equal(validateCourseUrl("not a url").ok, false);
});

test("upsert, list, update, delete round-trip per user", async () => {
  const u = "user-aaaaaaaa";
  const url1 = "https://moodle.bgu.ac.il/moodle/course/view.php?id=64661";
  const url2 = "https://moodle.bgu.ac.il/moodle/course/view.php?id=99999";

  assert.equal((await upsertCourse(u, "iot", url1)).ok, true);
  let courses = await listCourses(u);
  assert.equal(courses["iot"], url1);

  // Update existing name.
  assert.equal((await upsertCourse(u, "iot", url2)).ok, true);
  courses = await listCourses(u);
  assert.equal(courses["iot"], url2);

  // Reject bad url.
  assert.equal((await upsertCourse(u, "bad", "https://evil.com")).ok, false);

  // Delete.
  const del = await deleteCourse(u, "iot");
  assert.equal(del.ok, true);
  assert.equal(del.removed, 1);
  courses = await listCourses(u);
  assert.equal(Object.keys(courses).length, 0);
});

test("per-user isolation", async () => {
  const a = "user-bbbbbbbb";
  const b = "user-cccccccc";
  await upsertCourse(a, "alpha", "https://moodle.bgu.ac.il/moodle/course/view.php?id=1");
  await upsertCourse(b, "beta", "https://moodle.bgu.ac.il/moodle/course/view.php?id=2");

  const aCourses = await listCourses(a);
  const bCourses = await listCourses(b);
  assert.deepEqual(Object.keys(aCourses), ["alpha"]);
  assert.deepEqual(Object.keys(bCourses), ["beta"]);
});

test("replaceAllCourses swaps the full set", async () => {
  const u = "user-dddddddd";
  await upsertCourse(u, "old", "https://moodle.bgu.ac.il/moodle/course/view.php?id=1");
  const res = await replaceAllCourses(u, {
    one: "https://moodle.bgu.ac.il/moodle/course/view.php?id=10",
    two: "https://moodle.bgu.ac.il/moodle/course/view.php?id=20"
  });
  assert.equal(res.ok, true);
  assert.equal(res.count, 2);

  const courses = await listCourses(u);
  assert.deepEqual(Object.keys(courses).sort(), ["one", "two"]);
  assert.equal(courses["old"], undefined);
});
