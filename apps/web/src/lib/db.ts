import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });
const globalForDb = globalThis as unknown as { vampireDb?: Database.Database };
export const db = globalForDb.vampireDb ?? new Database(path.join(dir, "vampirevpspanel.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('ADMIN','USER')),
 status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED')),
 last_login TEXT,
 failed_attempts INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS records (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 type TEXT NOT NULL,
 name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'Pending',
 details TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_email TEXT NOT NULL,
 action TEXT NOT NULL,
 details TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
// Safe additive migrations for databases created by earlier panel versions.
for (const sql of [
  "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED'))",
  "ALTER TABLE users ADD COLUMN last_login TEXT",
  "ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0"
]) { try { db.exec(sql); } catch (error) { if (!(error instanceof Error) || !error.message.includes("duplicate column name")) throw error; } }
if (process.env.NODE_ENV !== "production") globalForDb.vampireDb = db;

export function audit(actor: string, action: string, details = "") {
 db.prepare("INSERT INTO audit_logs (actor_email, action, details) VALUES (?, ?, ?)").run(actor, action, details);
}
export function setupRequired() {
 return (db.prepare("SELECT COUNT(*) AS count FROM users").get() as {count:number}).count === 0;
}