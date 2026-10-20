import { NextRequest, NextResponse } from "next/server";
import { db, audit } from "@/lib/db";
import { requireAdmin, requestOriginOk } from "@/lib/auth";

export const runtime = "nodejs";
const defaults: Record<string, string> = {
  panel_name: "VampireVPSPanel",
  footer_powered_by: "Powered by VampireInfra Technology",
  footer_copyright: "© VampireHosting 2026 - 2027",
  background_preset: "thunderstorm-tornado",
  background_enabled: "true",
  background_intensity: "medium",
  smtp_host: "",
  smtp_port: "587",
  smtp_username: "",
  smtp_from: "",
  smtp_secure: "starttls",
  license_key: ""
};
const secretKeys = new Set(["smtp_password", "license_key"]);
function ensureTable() {
  db.exec(`CREATE TABLE IF NOT EXISTS panel_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}
export async function GET() {
  const a = await requireAdmin();
  if (!a.user) return a.response!;
  ensureTable();
  const rows = db.prepare("SELECT key,value FROM panel_settings").all() as {key:string;value:string}[];
  const values = { ...defaults, ...Object.fromEntries(rows.map(r => [r.key, r.value])) };
  // Never disclose stored secrets to the browser.
  for (const key of secretKeys) values[key] = values[key] ? "••••••••" : "";
  return NextResponse.json({ settings: values, configuredSecrets: Object.fromEntries([...secretKeys].map(k => [k, !!rows.find(r => r.key === k && r.value)])) });
}
export async function PUT(request: NextRequest) {
  const a = await requireAdmin();
  if (!a.user) return a.response!;
  if (!requestOriginOk(request)) return NextResponse.json({error:"Invalid request origin"}, {status:403});
  let body: {settings?: Record<string, unknown>};
  try { body = await request.json(); } catch { return NextResponse.json({error:"Invalid JSON"}, {status:400}); }
  if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) return NextResponse.json({error:"Settings object required"}, {status:400});
  const allowed = new Set(Object.keys(defaults).concat(["smtp_password"]));
  const entries = Object.entries(body.settings);
  if (entries.some(([k,v]) => !allowed.has(k) || typeof v !== "string" || v.length > 2000)) return NextResponse.json({error:"Unknown setting or invalid value"}, {status:400});
  const input = Object.fromEntries(entries) as Record<string,string>;
  if (input.panel_name !== undefined && (input.panel_name.trim().length < 2 || input.panel_name.trim().length > 80)) return NextResponse.json({error:"Panel name must be 2–80 characters"}, {status:400});
  if (input.background_preset !== undefined && !["thunderstorm-tornado","red-nebula","minimal","custom"].includes(input.background_preset)) return NextResponse.json({error:"Invalid background preset"}, {status:400});
  if (input.background_intensity !== undefined && !["low","medium","high"].includes(input.background_intensity)) return NextResponse.json({error:"Invalid background intensity"}, {status:400});
  if (input.smtp_port !== undefined && (!/^\d{1,5}$/.test(input.smtp_port) || Number(input.smtp_port) < 1 || Number(input.smtp_port) > 65535)) return NextResponse.json({error:"Invalid SMTP port"}, {status:400});
  ensureTable();
  const put = db.prepare("INSERT INTO panel_settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')");
  const tx = db.transaction(() => { for (const [k,v] of entries) { if (secretKeys.has(k) && (v === "••••••••" || (k === "smtp_password" && v === ""))) continue; put.run(k, v); } });
  tx();
  audit(a.user.email, "panel_settings_updated", entries.map(([k])=>k).join(","));
  return NextResponse.json({ok:true});
}