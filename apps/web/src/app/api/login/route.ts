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
 const user=db.prepare("SELECT id,name,email,password_hash,role FROM users WHERE email=?").get(email) as {id:number;name:string;email:string;password_hash:string;role:"ADMIN"|"USER"}|undefined;
 if(!user||!(await bcrypt.compare(password,user.password_hash))) return NextResponse.json({error:"Invalid email or password."},{status:401});
 const safe={id:user.id,name:user.name,email:user.email,role:user.role};
 const response=NextResponse.json({user:safe,redirect:user.role==="ADMIN"?"/admin":"/user"});
 setSessionCookie(response,await createSession(safe));return response;
}