import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

// libSQL / Turso client.
//
// Production: set TURSO_DATABASE_URL (libsql://...) and TURSO_AUTH_TOKEN.
// Local dev: if those are absent we fall back to a local SQLite file so the
// backend runs with no external services. The local file lives under
// backend/data/ which is gitignored.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_DIR = path.join(__dirname, "data");
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, "courses.db");

let client = null;

function buildClientConfig() {
  const url = String(process.env.TURSO_DATABASE_URL || "").trim();
  const authToken = String(process.env.TURSO_AUTH_TOKEN || "").trim();

  if (url) {
    return authToken ? { url, authToken } : { url };
  }

  // Local fallback file:// URL.
  fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  return { url: `file:${LOCAL_DB_FILE}` };
}

export function isRemoteDb() {
  return Boolean(String(process.env.TURSO_DATABASE_URL || "").trim());
}

export function getDb() {
  if (!client) {
    client = createClient(buildClientConfig());
  }
  return client;
}

// Allow tests to inject an isolated client (e.g. an in-memory or temp file db).
export function setDbForTesting(testClient) {
  client = testClient;
}

export async function initDb() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS courses (
      user_key   TEXT NOT NULL,
      name       TEXT NOT NULL,
      url        TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_key, name)
    )
  `);
  return db;
}
