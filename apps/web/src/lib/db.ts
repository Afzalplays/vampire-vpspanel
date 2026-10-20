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
if (process.env.NODE_ENV !== "production") globalForDb.vampireDb = db;

export function audit(actor: string, action: string, details = "") {
 db.prepare("INSERT INTO audit_logs (actor_email, action, details) VALUES (?, ?, ?)").run(actor, action, details);
}
export function setupRequired() {
 return (db.prepare("SELECT COUNT(*) AS count FROM users").get() as {count:number}).count === 0;
}