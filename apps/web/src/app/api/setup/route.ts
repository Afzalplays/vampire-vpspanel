import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, setupRequired, audit } from "@/lib/db";
import { createSession, setSessionCookie, isValidEmail, requestOriginOk } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
 if (!requestOriginOk(request)) return NextResponse.json({error:"Invalid request origin"},{status:403});
 if (!setupRequired()) return NextResponse.json({error:"Initial setup is already complete."},{status:409});
 let body; try { body=await request.json(); } catch { return NextResponse.json({error:"Invalid JSON"},{status:400}); }
 const name=String(body.name||"").trim(), email=String(body.email||"").trim().toLowerCase(), password=String(body.password||"");
 if(name.length<2||name.length>80||!isValidEmail(email)||password.length<12||password.length>128) return NextResponse.json({error:"Enter a valid name/email and a password of 12–128 characters."},{status:400});
 const hash=await bcrypt.hash(password,12);
 try {
  const result=db.prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'ADMIN')").run(name,email,hash);
  const user={id:Number(result.lastInsertRowid),name,email,role:"ADMIN" as const}; audit(email,"initial_admin_created");
  const response=NextResponse.json({user}); setSessionCookie(response,await createSession(user)); return response;
 } catch { return NextResponse.json({error:"Admin creation failed; the email may already exist."},{status:409}); }
}