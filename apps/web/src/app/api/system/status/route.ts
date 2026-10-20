import {NextResponse} from "next/server";
import fs from "node:fs";
import {db} from "@/lib/db";
import {requireAdmin} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function agentToken(){if(process.env.LIBVIRT_AGENT_TOKEN)return process.env.LIBVIRT_AGENT_TOKEN;try{return fs.readFileSync("/etc/vampire-libvirt-agent.env","utf8").match(/^LIBVIRT_AGENT_TOKEN=(.*)$/m)?.[1]?.trim()||""}catch{return ""}}
export async function GET(){
 const a=await requireAdmin();if(!a.user)return a.response!;
 let database="Connected";try{db.prepare("SELECT 1").get()}catch{database="Disconnected"}
 const token=agentToken();let hypervisor="Not configured",vmCount:number|null=null;
 if(token){try{const base="http://127.0.0.1:"+String(process.env.LIBVIRT_AGENT_PORT||"8765");const h=await fetch(base+"/health",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(2500)});if(h.ok){const r=await fetch(base+"/vms",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(3500)});if(r.ok){const data=await r.json();hypervisor="Connected";vmCount=Array.isArray(data.vms)?data.vms.length:0}else hypervisor=r.status===401?"Authentication failed":"Inventory unavailable"}else hypervisor=h.status===401?"Authentication failed":"Disconnected"}catch{hypervisor="Disconnected"}}
 const activeLicenses=(db.prepare("SELECT COUNT(*) AS n FROM licenses WHERE status='active' AND (expires_at IS NULL OR datetime(expires_at)>datetime('now'))").get() as {n:number}).n;
 const license=activeLicenses>0?"Configured":"No active license";
 return NextResponse.json({checkedAt:new Date().toISOString(),web:"Running",authentication:"Enabled",database,hypervisor,vmCount,license});
}