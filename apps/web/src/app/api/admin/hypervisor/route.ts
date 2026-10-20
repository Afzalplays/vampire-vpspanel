import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requestOriginOk } from "@/lib/auth";
import { db, audit } from "@/lib/db";
import { getProxmoxConfig, proxmoxRequest } from "@/lib/proxmox";

export const runtime = "nodejs";
function ensureSettings() {
  db.exec(`CREATE TABLE IF NOT EXISTS panel_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
}
function configured() {
  ensureSettings();
  const rows = db.prepare("SELECT key,value FROM panel_settings WHERE key IN ('proxmox_url','proxmox_token_id','proxmox_node')").all() as {key:string;value:string}[];
  const values = Object.fromEntries(rows.map(row => [row.key,row.value]));
  return { url: values.proxmox_url || "", tokenId: values.proxmox_token_id || "", node: values.proxmox_node || "", secretPresent: !!process.env.PROXMOX_TOKEN_SECRET };
}
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(); if (!auth.user) return auth.response!;
  const mode = new URL(request.url).searchParams.get("mode") || "config";
  if (mode === "config") return NextResponse.json({ config: configured() });
  try {
    if (mode === "nodes") {
      const nodes = await proxmoxRequest<Array<{node:string;status:string;cpu:number;maxcpu:number;mem:number;maxmem:number;disk:number;maxdisk:number}>>("/api2/json/nodes");
      return NextResponse.json({ nodes });
    }
    if (mode === "vms") {
      const { node } = getProxmoxConfig();
      const vms = await proxmoxRequest<Array<{vmid:number;name:string;status:string;cpu:number;maxcpu:number;mem:number;maxmem:number;disk:number;maxdisk:number}>>("/api2/json/nodes/" + encodeURIComponent(node) + "/qemu");
      return NextResponse.json({ vms });
    }
    return NextResponse.json({error:"Unknown mode"},{status:400});
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : "Proxmox request failed"},{status:502});
  }
}
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(); if (!auth.user) return auth.response!;
  if (!requestOriginOk(request)) return NextResponse.json({error:"Invalid request origin"},{status:403});
  let body: {url?:unknown;tokenId?:unknown;node?:unknown};
  try { body = await request.json(); } catch { return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  if ([body.url,body.tokenId,body.node].some(v => typeof v !== "string") ||
      String(body.url).length > 500 || String(body.tokenId).length > 250 || String(body.node).length > 100) {
    return NextResponse.json({error:"URL, token ID and node are required and must be valid strings."},{status:400});
  }
  let url: URL;
  try { url = new URL(String(body.url).trim()); } catch { return NextResponse.json({error:"Invalid Proxmox URL."},{status:400}); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return NextResponse.json({error:"Use a clean HTTPS Proxmox URL without embedded credentials."},{status:400});
  const tokenId=String(body.tokenId).trim(), node=String(body.node).trim();
  if (!tokenId.includes("!") || !/^[A-Za-z0-9._-]+$/.test(node) || !tokenId || !node) return NextResponse.json({error:"Token ID must use user@realm!token-name format and node must be a valid node name."},{status:400});
  ensureSettings();
  const put=db.prepare("INSERT INTO panel_settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')");
  const tx=db.transaction(()=>{put.run("proxmox_url",url.toString().replace(/\/$/,""));put.run("proxmox_token_id",tokenId);put.run("proxmox_node",node);});
  tx(); audit(auth.user.email,"proxmox_config_updated","url and token ID saved; secret remains in environment");
  return NextResponse.json({ok:true,config:configured(),message:"Connection settings saved. Set PROXMOX_TOKEN_SECRET in the service environment, then test the connection."});
}
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(); if (!auth.user) return auth.response!;
  if (!requestOriginOk(request)) return NextResponse.json({error:"Invalid request origin"},{status:403});
  try {
    const version = await proxmoxRequest<{version:string;release:string;repoid:string}>("/api2/json/version");
    const nodes = await proxmoxRequest<Array<{node:string;status:string}>>("/api2/json/nodes");
    const config=getProxmoxConfig();
    const nodeFound=nodes.some(n=>n.node===config.node);
    audit(auth.user.email,"proxmox_connection_tested",`version=${version.version};nodes=${nodes.length};configured_node_found=${nodeFound}`);
    return NextResponse.json({ok:true,version:version.version,release:version.release,nodes: nodes.map(n=>({node:n.node,status:n.status})),configuredNodeFound:nodeFound});
  } catch(error) {
    audit(auth.user.email,"proxmox_connection_test_failed",error instanceof Error ? error.message.slice(0,250) : "unknown error");
    return NextResponse.json({ok:false,error:error instanceof Error ? error.message : "Connection failed"},{status:502});
  }
}
