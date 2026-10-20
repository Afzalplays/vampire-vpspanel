import { db } from "@/lib/db";

export type ProxmoxConfig = { url: string; tokenId: string; node: string };
function readSetting(key: string) {
  db.exec(`CREATE TABLE IF NOT EXISTS panel_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  return (db.prepare("SELECT value FROM panel_settings WHERE key=?").get(key) as {value:string}|undefined)?.value ?? "";
}
export function getProxmoxConfig(): ProxmoxConfig {
  const url = readSetting("proxmox_url").trim().replace(/\/$/, "");
  const tokenId = readSetting("proxmox_token_id").trim();
  const node = readSetting("proxmox_node").trim();
  if (!url || !tokenId || !node || !process.env.PROXMOX_TOKEN_SECRET) throw new Error("Proxmox is not configured. Set URL, token ID, node, and PROXMOX_TOKEN_SECRET.");
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Proxmox URL is invalid."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Proxmox URL must be HTTPS and must not contain credentials.");
  return { url, tokenId, node };
}
export async function proxmoxRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getProxmoxConfig();
  if (!path.startsWith("/api2/json/") || path.includes("..")) throw new Error("Invalid Proxmox API path.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(config.url + path, {
      ...init, signal: controller.signal, cache: "no-store",
      headers: { Authorization: `PVEAPIToken=${config.tokenId}=${process.env.PROXMOX_TOKEN_SECRET}`, Accept: "application/json", ...(init?.headers ?? {}) }
    });
    const payload = await response.json().catch(() => null) as { data?: T; message?: string } | null;
    if (!response.ok) throw new Error(`Proxmox API returned HTTP ${response.status}${payload?.message ? ": " + payload.message : ""}`);
    if (!payload || !("data" in payload)) throw new Error("Proxmox returned an unexpected response.");
    return payload.data as T;
  } finally { clearTimeout(timeout); }
}
