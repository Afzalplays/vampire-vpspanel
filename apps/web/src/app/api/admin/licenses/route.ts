import {NextRequest,NextResponse} from "next/server";
import {createHash,randomBytes} from "node:crypto";
import {db,audit} from "@/lib/db";
import {requireAdmin,requestOriginOk} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){const a=await requireAdmin();if(!a.user)return a.response!;return NextResponse.json({licenses:db.prepare("SELECT id,name,key_prefix,status,expires_at,created_at FROM licenses ORDER BY id DESC").all()});}
export async function POST(req:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let b:any;try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const name=String(b.name||"").trim(),days=Number(b.days||365);if(name.length<2||name.length>80||!Number.isInteger(days)||days<1||days>3650)return NextResponse.json({error:"Enter a name and expiry of 1–3650 days."},{status:400});
 const key="VPL-"+randomBytes(4).toString("hex").toUpperCase()+"-"+randomBytes(8).toString("hex").toUpperCase(),prefix=key.slice(0,12),hash=createHash("sha256").update(key).digest("hex"),expires=new Date(Date.now()+days*86400000).toISOString();
 const r=db.prepare("INSERT INTO licenses(name,key_hash,key_prefix,status,expires_at,created_by) VALUES(?,?,?,'active',?,?)").run(name,hash,prefix,expires,a.user.id);audit(a.user.email,"license_issued",name);
 return NextResponse.json({id:Number(r.lastInsertRowid),name,key,status:"active",expires_at:expires,warning:"Copy this license key now. It cannot be displayed again."},{status:201});
}
export async function DELETE(req:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 const id=Number(new URL(req.url).searchParams.get("id"));if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"Invalid license id"},{status:400});
 const r=db.prepare("UPDATE licenses SET status='revoked' WHERE id=? AND status='active'").run(id);if(!r.changes)return NextResponse.json({error:"Active license not found."},{status:404});audit(a.user.email,"license_revoked",String(id));return NextResponse.json({ok:true});
}