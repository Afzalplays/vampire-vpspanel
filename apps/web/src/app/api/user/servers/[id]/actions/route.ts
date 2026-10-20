import {NextRequest,NextResponse} from "next/server";
import fs from "node:fs";
import {getSessionUser,requestOriginOk} from "@/lib/auth";
import {db,audit} from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function getToken(){if(process.env.LIBVIRT_AGENT_TOKEN)return process.env.LIBVIRT_AGENT_TOKEN;try{return fs.readFileSync("/etc/vampire-libvirt-agent.env","utf8").match(/^LIBVIRT_AGENT_TOKEN=(.*)$/m)?.[1]?.trim()||""}catch{return ""}}
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}){
 const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(user.role!=="USER")return NextResponse.json({error:"Customer account required."},{status:403});if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 const {id:raw}=await ctx.params,id=Number(raw);if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"Invalid VPS id"},{status:400});
 const row=db.prepare("SELECT id,name,hypervisor_uuid FROM records WHERE id=? AND type='servers' AND user_id=?").get(id,user.id) as {id:number;name:string;hypervisor_uuid:string}|undefined;
 if(!row)return NextResponse.json({error:"VPS not found for this customer."},{status:404});
 if(!row.hypervisor_uuid)return NextResponse.json({error:"This VPS has no linked hypervisor UUID. Ask the administrator to finish node integration."},{status:409});
 const token=getToken();if(!token)return NextResponse.json({error:"Hypervisor agent is not configured."},{status:503});
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const action=String(body.action||"");if(!["start","shutdown","reboot"].includes(action))return NextResponse.json({error:"Allowed actions: start, shutdown, reboot."},{status:400});
 try{const base="http://127.0.0.1:"+String(process.env.LIBVIRT_AGENT_PORT||"8765");const r=await fetch(base+"/vms/"+encodeURIComponent(row.hypervisor_uuid)+"/actions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({action}),cache:"no-store",signal:AbortSignal.timeout(10000)});const data=await r.json().catch(()=>({}));if(!r.ok)return NextResponse.json({error:String(data.error||"Hypervisor rejected the action.")},{status:r.status===401?503:502});audit(user.email,"customer_vps_action",row.name+":"+action);return NextResponse.json({ok:true,action,result:data})}catch{return NextResponse.json({error:"Hypervisor agent is unreachable."},{status:503})}
}