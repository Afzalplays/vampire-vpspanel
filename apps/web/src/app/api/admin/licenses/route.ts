import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { db, audit } from "@/lib/db";
import { requireAdmin, requestOriginOk } from "@/lib/auth";
export const runtime = "nodejs";
function ensure(){db.exec(`CREATE TABLE IF NOT EXISTS licenses(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 label TEXT NOT NULL,
 key_hash TEXT NOT NULL UNIQUE,
 key_prefix TEXT NOT NULL,
 plan TEXT NOT NULL,
 max_nodes INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','REVOKED')),
 expires_at TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 created_by TEXT NOT NULL
)`);}
export async function GET(){
 const a=await requireAdmin();if(!a.user)return a.response!;ensure();
 const licenses=db.prepare("SELECT id,label,key_prefix,plan,max_nodes,status,expires_at,created_at,created_by FROM licenses ORDER BY id DESC").all();
 return NextResponse.json({licenses});
}
export async function POST(request:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;
 if(!requestOriginOk(request))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let b:Record<string,unknown>;try{b=await request.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const label=String(b.label||"").trim(),plan=String(b.plan||"").trim(),maxNodes=Number(b.max_nodes),expiresAt=b.expires_at?String(b.expires_at):null;
 if(label.length<2||label.length>100||plan.length<2||plan.length>80||!Number.isSafeInteger(maxNodes)||maxNodes<1||maxNodes>10000)return NextResponse.json({error:"Enter a valid label, plan and node limit."},{status:400});
 if(expiresAt&&(!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)||Number.isNaN(Date.parse(expiresAt))))return NextResponse.json({error:"Expiry must be a valid YYYY-MM-DD date."},{status:400});
 ensure();
 const key="VVP-"+randomBytes(24).toString("base64url").toUpperCase();
 const hash=createHash("sha256").update(key).digest("hex");
 const r=db.prepare("INSERT INTO licenses(label,key_hash,key_prefix,plan,max_nodes,expires_at,created_by) VALUES(?,?,?,?,?,?,?)").run(label,hash,key.slice(0,8),plan,maxNodes,expiresAt,a.user.email);
 audit(a.user.email,"license_created",JSON.stringify({id:Number(r.lastInsertRowid),label,plan,maxNodes,expiresAt}));
 return NextResponse.json({license:{id:Number(r.lastInsertRowid),label,key,plan,max_nodes:maxNodes,status:"ACTIVE",expires_at:expiresAt}}, {status:201});
}
export async function PATCH(request:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;
 if(!requestOriginOk(request))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let b:Record<string,unknown>;try{b=await request.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const id=Number(b.id),status=String(b.status||"");
 if(!Number.isSafeInteger(id)||id<1||!["ACTIVE","REVOKED"].includes(status))return NextResponse.json({error:"Valid license id and status are required."},{status:400});
 ensure();const r=db.prepare("UPDATE licenses SET status=? WHERE id=?").run(status,id);
 if(!r.changes)return NextResponse.json({error:"License not found"},{status:404});
 audit(a.user.email,"license_status_changed",JSON.stringify({id,status}));
 return NextResponse.json({ok:true});
}