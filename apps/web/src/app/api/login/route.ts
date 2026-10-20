import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, setSessionCookie, isValidEmail, requestOriginOk } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
 if (!requestOriginOk(request)) return NextResponse.json({error:"Invalid request origin"},{status:403});
 let body; try { body=await request.json(); } catch { return NextResponse.json({error:"Invalid JSON"},{status:400}); }
 const email=String(body.email||"").trim().toLowerCase(), password=String(body.password||"");
 if(!isValidEmail(email)||!password||password.length>128) return NextResponse.json({error:"Invalid email or password."},{status:400});
 const user=db.prepare("SELECT id,name,email,password_hash,role,status FROM users WHERE email=?").get(email) as {id:number;name:string;email:string;password_hash:string;role:"ADMIN"|"USER";status:"ACTIVE"|"SUSPENDED"}|undefined;
 if(!user||!(await bcrypt.compare(password,user.password_hash))){if(user)db.prepare("UPDATE users SET failed_attempts=failed_attempts+1 WHERE id=?").run(user.id);return NextResponse.json({error:"Invalid email or password."},{status:401});}
 if(user.status==="SUSPENDED")return NextResponse.json({error:"This account is suspended. Contact the panel administrator."},{status:403});
 db.prepare("UPDATE users SET last_login=datetime('now'),failed_attempts=0 WHERE id=?").run(user.id);
 const safe={id:user.id,name:user.name,email:user.email,role:user.role};const response=NextResponse.json({user:safe});setSessionCookie(response,await createSession(safe));return response;
}