import {NextRequest,NextResponse} from "next/server";
import {createHash,randomBytes} from "node:crypto";
import {db,audit} from "@/lib/db";
import {requireAdmin,requestOriginOk} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){const a=await requireAdmin();if(!a.user)return a.response!;return NextResponse.json({keys:db.prepare("SELECT id,name,prefix,created_at,last_used_at,revoked_at FROM api_keys ORDER BY id DESC").all()});}
export async function POST(req:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let b:any;try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const name=String(b.name||"").trim();if(name.length<2||name.length>80)return NextResponse.json({error:"Key name must be 2–80 characters."},{status:400});
 const key="vps_"+randomBytes(32).toString("hex"),prefix=key.slice(0,12),hash=createHash("sha256").update(key).digest("hex");
 const r=db.prepare("INSERT INTO api_keys(name,prefix,key_hash,created_by) VALUES(?,?,?,?)").run(name,prefix,hash,a.user.id);audit(a.user.email,"api_key_created",name);
 return NextResponse.json({id:Number(r.lastInsertRowid),name,key,prefix,createdAt:new Date().toISOString(),warning:"Copy this key now. It cannot be displayed again."},{status:201});
}
export async function DELETE(req:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 const id=Number(new URL(req.url).searchParams.get("id"));if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"Invalid key id"},{status:400});
 const r=db.prepare("UPDATE api_keys SET revoked_at=datetime('now') WHERE id=? AND revoked_at IS NULL").run(id);if(!r.changes)return NextResponse.json({error:"Active API key not found."},{status:404});audit(a.user.email,"api_key_revoked",String(id));return NextResponse.json({ok:true});
}