import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  db.exec(`CREATE TABLE IF NOT EXISTS panel_settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const rows = db.prepare("SELECT key,value FROM panel_settings WHERE key IN ('panel_name','footer_powered_by','footer_copyright','background_preset','background_enabled','background_intensity')").all() as {key:string;value:string}[];
  const settings = Object.fromEntries(rows.map(r => [r.key,r.value]));
  return NextResponse.json({settings}, {headers:{"Cache-Control":"no-store"}});
}