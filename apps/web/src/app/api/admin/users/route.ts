import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, audit } from "@/lib/db";
import { requireAdmin, isValidEmail, requestOriginOk } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(){const a=await requireAdmin();if(!a.user)return a.response!;const users=db.prepare("SELECT id,name,email,role,status,last_login,failed_attempts,created_at FROM users ORDER BY id DESC").all();return NextResponse.json({users});}
export async function POST(request:NextRequest){const a=await requireAdmin();if(!a.user)return a.response!;if(!requestOriginOk(request))return NextResponse.json({error:"Invalid request origin"},{status:403});let b;try{b=await request.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}const name=String(b.name||"").trim(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");if(name.length<2||name.length>80||!isValidEmail(email)||password.length<12||password.length>128)return NextResponse.json({error:"Valid name/email and a 12–128 character password are required."},{status:400});try{const hash=await bcrypt.hash(password,12);const r=db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'USER')").run(name,email,hash);audit(a.user.email,"customer_created",email);return NextResponse.json({id:Number(r.lastInsertRowid),name,email,role:"USER"},{status:201})}catch{return NextResponse.json({error:"User creation failed; email may already exist."},{status:409})}}
export async function DELETE(request:NextRequest){const a=await requireAdmin();if(!a.user)return a.response!;if(!requestOriginOk(request))return NextResponse.json({error:"Invalid request origin"},{status:403});const id=Number(new URL(request.url).searchParams.get("id"));if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"Invalid user id"},{status:400});const target=db.prepare("SELECT id,email,role FROM users WHERE id=?").get(id) as {id:number;email:string;role:string}|undefined;if(!target)return NextResponse.json({error:"User not found"},{status:404});if(target.role==="ADMIN")return NextResponse.json({error:"Admin accounts cannot be deleted here."},{status:403});db.prepare("DELETE FROM users WHERE id=?").run(id);audit(a.user.email,"customer_deleted",target.email);return NextResponse.json({ok:true})}
export async function PATCH(request:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;
 if(!requestOriginOk(request))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let b:Record<string,unknown>;try{b=await request.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const id=Number(b.id);if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"Invalid user id"},{status:400});
 const target=db.prepare("SELECT id,name,email,role,status FROM users WHERE id=?").get(id) as {id:number;name:string;email:string;role:string;status:string}|undefined;
 if(!target)return NextResponse.json({error:"User not found"},{status:404});
 if(target.role==="ADMIN")return NextResponse.json({error:"Admin accounts cannot be modified from customer management."},{status:403});
 if(b.status!==undefined && !["ACTIVE","SUSPENDED"].includes(String(b.status)))return NextResponse.json({error:"Status must be ACTIVE or SUSPENDED"},{status:400});
 const name=b.name===undefined?target.name:String(b.name).trim();
 const email=b.email===undefined?target.email:String(b.email).trim().toLowerCase();
 if(name.length<2||name.length>80||!isValidEmail(email))return NextResponse.json({error:"Valid name and email are required"},{status:400});
 const password=b.password===undefined?"":String(b.password);
 if(password && (password.length<12||password.length>128))return NextResponse.json({error:"Password must be 12–128 characters"},{status:400});
 try{
   const hash=password?await bcrypt.hash(password,12):null;
   db.prepare("UPDATE users SET name=?,email=?,status=?,password_hash=COALESCE(?,password_hash),failed_attempts=CASE WHEN ? IS NOT NULL THEN 0 ELSE failed_attempts END WHERE id=?").run(name,email,String(b.status??target.status),hash,hash,id);
   audit(a.user.email,"customer_updated",JSON.stringify({email,id,status:String(b.status??target.status),passwordReset:!!password}));
   const updated=db.prepare("SELECT id,name,email,role,status,last_login,failed_attempts,created_at FROM users WHERE id=?").get(id);
   return NextResponse.json({user:updated});
 }catch{return NextResponse.json({error:"Update failed; email may already exist."},{status:409})}
}
