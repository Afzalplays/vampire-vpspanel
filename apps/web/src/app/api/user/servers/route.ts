import {NextResponse} from "next/server";
import fs from "node:fs";
import {getSessionUser} from "@/lib/auth";
import {db} from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function getToken(){if(process.env.LIBVIRT_AGENT_TOKEN)return process.env.LIBVIRT_AGENT_TOKEN;try{return fs.readFileSync("/etc/vampire-libvirt-agent.env","utf8").match(/^LIBVIRT_AGENT_TOKEN=(.*)$/m)?.[1]?.trim()||""}catch{return ""}}
export async function GET(){
 const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="USER")return NextResponse.json({error:"Customer account required."},{status:403});
 const servers=db.prepare("SELECT id,name,status,details,hypervisor_uuid,created_at FROM records WHERE type='servers' AND user_id=? ORDER BY id DESC").all(user.id) as Array<{id:number;name:string;status:string;details:string;hypervisor_uuid:string;created_at:string}>;
 const token=getToken();let vms:any[]=[];let hypervisor="Not configured";
 if(token){try{const r=await fetch("http://127.0.0.1:"+String(process.env.LIBVIRT_AGENT_PORT||"8765")+"/vms",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(3000)});if(r.ok){const d=await r.json();vms=Array.isArray(d.vms)?d.vms:[];hypervisor="Connected"}else hypervisor="Inventory unavailable"}catch{hypervisor="Disconnected"}}
 const enriched=servers.map(s=>{const vm=s.hypervisor_uuid?vms.find(v=>v.uuid===s.hypervisor_uuid):null;return {...s,live_state:vm?.state||null,vcpus:vm?.vcpus??null,memory_mib:vm?.memory_mib??null,status:vm?(String(vm.state||"").toLowerCase().includes("running")?"Running":"Stopped"):s.hypervisor_uuid?(hypervisor==="Connected"?"Unavailable":hypervisor):"Awaiting integration"}});
 return NextResponse.json({servers:enriched,hypervisor},{headers:{"Cache-Control":"no-store"}});
}