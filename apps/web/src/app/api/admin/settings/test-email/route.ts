import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db, audit } from "@/lib/db";
import { requireAdmin, requestOriginOk, isValidEmail } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request:NextRequest) {
  const a = await requireAdmin();
  if (!a.user) return a.response!;
  if (!requestOriginOk(request)) return NextResponse.json({error:"Invalid request origin"},{status:403});
  let body:{to?:unknown}; try { body=await request.json(); } catch { return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  const to=String(body.to||"").trim().toLowerCase();
  if(!isValidEmail(to)) return NextResponse.json({error:"Enter a valid recipient email address."},{status:400});
  db.exec(`CREATE TABLE IF NOT EXISTS panel_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  const rows=db.prepare("SELECT key,value FROM panel_settings WHERE key IN ('smtp_host','smtp_port','smtp_username','smtp_password','smtp_from','smtp_secure')").all() as {key:string;value:string}[];
  const cfg=Object.fromEntries(rows.map(x=>[x.key,x.value])) as Record<string,string>;
  if(!cfg.smtp_host||!cfg.smtp_from) return NextResponse.json({error:"Save SMTP host and from address first."},{status:400});
  const port=Number(cfg.smtp_port||587);
  try {
    const transport=nodemailer.createTransport({host:cfg.smtp_host,port,secure:cfg.smtp_secure==="tls",auth:cfg.smtp_username?{user:cfg.smtp_username,pass:cfg.smtp_password||""}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
    await transport.sendMail({from:cfg.smtp_from,to,subject:"VampireVPSPanel SMTP test",text:"This is a test email from VampireVPSPanel. SMTP delivery is configured.",html:"<p>This is a test email from <strong>VampireVPSPanel</strong>.</p><p>SMTP delivery is configured.</p>"});
    audit(a.user.email,"smtp_test_email_sent",to);
    return NextResponse.json({ok:true});
  } catch(error) {
    audit(a.user.email,"smtp_test_email_failed",to);
    const message=error instanceof Error?error.message:"SMTP send failed";
    return NextResponse.json({error:"SMTP delivery failed: "+message.slice(0,240)},{status:502});
  }
}