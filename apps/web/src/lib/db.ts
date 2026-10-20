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
CREATE TABLE IF NOT EXISTS app_settings (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS user_settings (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 avatar_url TEXT NOT NULL DEFAULT '',
 background_url TEXT NOT NULL DEFAULT '',
 background_enabled INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS api_keys (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 prefix TEXT NOT NULL,
 key_hash TEXT NOT NULL UNIQUE,
 created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
 last_used_at TEXT,
 revoked_at TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS licenses (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 key_hash TEXT NOT NULL UNIQUE,
 key_prefix TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 expires_at TEXT,
 created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function ensureColumn(table: string, column: string, definition: string) {
 const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
 if (!columns.some(c => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
ensureColumn("records", "user_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL");
ensureColumn("records", "hypervisor_uuid", "TEXT NOT NULL DEFAULT ''");

if (!db.prepare("SELECT key FROM app_settings WHERE key='brand_name'").get()) {
 const seed = db.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES(?,?)");
 seed.run("brand_name", "VampireVPSPanel");
 seed.run("brand_subtitle", "VampireInfra Technologies");
 seed.run("logo_url", "");
 seed.run("background_url", "");
 seed.run("background_enabled", "1");
 seed.run("background_motion", "aurora");
}

if (process.env.NODE_ENV !== "production") globalForDb.vampireDb = db;

export function audit(actor: string, action: string, details = "") {
 db.prepare("INSERT INTO audit_logs (actor_email, action, details) VALUES (?, ?, ?)").run(actor, action, details);
}
export function setupRequired() {
 return (db.prepare("SELECT COUNT(*) AS count FROM users").get() as {count:number}).count === 0;
}