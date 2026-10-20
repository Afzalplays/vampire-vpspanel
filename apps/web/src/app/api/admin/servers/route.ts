import {NextRequest,NextResponse} from "next/server";
import fs from "node:fs";
import {db,audit} from "@/lib/db";
import {requireAdmin,requestOriginOk} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function getToken(){if(process.env.LIBVIRT_AGENT_TOKEN)return process.env.LIBVIRT_AGENT_TOKEN;try{return fs.readFileSync("/etc/vampire-libvirt-agent.env","utf8").match(/^LIBVIRT_AGENT_TOKEN=(.*)$/m)?.[1]?.trim()||""}catch{return ""}}
export async function GET(){
 const a=await requireAdmin();if(!a.user)return a.response!;
 const customers=db.prepare("SELECT id,name,email FROM users WHERE role='USER' ORDER BY name").all();
 const assigned=db.prepare("SELECT r.id,r.name,r.status,r.details,r.user_id,r.hypervisor_uuid,r.created_at,u.name AS customer_name,u.email AS customer_email FROM records r LEFT JOIN users u ON u.id=r.user_id WHERE r.type='servers' ORDER BY r.id DESC").all();
 const token=getToken();let hypervisor="Not configured",vms:any[]=[];
 if(token){try{const r=await fetch("http://127.0.0.1:"+String(process.env.LIBVIRT_AGENT_PORT||"8765")+"/vms",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(3500)});if(r.ok){const d=await r.json();vms=Array.isArray(d.vms)?d.vms:[];hypervisor="Connected"}else hypervisor=r.status===401?"Authentication failed":"Inventory unavailable"}catch{hypervisor="Disconnected"}}
 return NextResponse.json({customers,servers:assigned,vms,hypervisor},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let b:any;try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const uuid=String(b.hypervisor_uuid||"").trim(),userId=Number(b.user_id),details=String(b.details||"").trim();
 if(!uuid||uuid.length>100||!Number.isSafeInteger(userId)||userId<1||details.length>500)return NextResponse.json({error:"Select a real VM and a valid customer."},{status:400});
 const customer=db.prepare("SELECT id FROM users WHERE id=? AND role='USER'").get(userId);if(!customer)return NextResponse.json({error:"Customer not found."},{status:404});
 const token=getToken();if(!token)return NextResponse.json({error:"Hypervisor agent is not configured."},{status:503});
 let vm:any;try{const r=await fetch("http://127.0.0.1:"+String(process.env.LIBVIRT_AGENT_PORT||"8765")+"/vms",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(3500)});if(!r.ok)return NextResponse.json({error:"Hypervisor inventory unavailable."},{status:503});const d=await r.json();vm=(d.vms||[]).find((x:any)=>x.uuid===uuid)}catch{return NextResponse.json({error:"Hypervisor agent is unreachable."},{status:503})}
 if(!vm)return NextResponse.json({error:"Selected VM was not found on the hypervisor."},{status:404});
 const existing=db.prepare("SELECT id FROM records WHERE type='servers' AND hypervisor_uuid=?").get(uuid);if(existing)return NextResponse.json({error:"This VM is already assigned. Edit its assignment instead of creating a duplicate."},{status:409});
 const state=String(vm.state||"").toLowerCase(),status=state.includes("running")?"Active":"Pending",name=String(vm.name||"VPS");
 const r=db.prepare("INSERT INTO records(type,name,status,details,user_id,hypervisor_uuid) VALUES('servers',?,?,?,?,?)").run(name,status,details,userId,uuid);
 audit(a.user.email,"vps_assigned",name+" -> customer "+userId);
 return NextResponse.json({ok:true,id:Number(r.lastInsertRowid),name,status,user_id:userId,hypervisor_uuid:uuid},{status:201});
}