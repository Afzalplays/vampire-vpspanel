import {NextRequest,NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {db,audit} from "@/lib/db";
import {getSessionUser,isValidEmail,requestOriginOk,createSession,setSessionCookie,clearSessionCookie} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const settings=db.prepare("SELECT avatar_url,background_url,background_enabled FROM user_settings WHERE user_id=?").get(user.id)||{avatar_url:"",background_url:"",background_enabled:1};return NextResponse.json({user,settings});}
export async function PATCH(req:NextRequest){
 const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let b:any;try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const action=String(b.action||"");
 if(action==="profile"){
  const name=String(b.name||"").trim(),email=String(b.email||"").trim().toLowerCase();
  if(name.length<2||name.length>80||!isValidEmail(email))return NextResponse.json({error:"Enter a valid name and email."},{status:400});
  try{db.prepare("UPDATE users SET name=?,email=? WHERE id=?").run(name,email,user.id)}catch{return NextResponse.json({error:"Email is already in use."},{status:409})}
  audit(user.email,"profile_updated",email);
  const next={...user,name,email};const res=NextResponse.json({ok:true,user:next});setSessionCookie(res,await createSession(next));return res;
 }
 if(action==="background"){
  if(!["0","1"].includes(String(b.enabled)))return NextResponse.json({error:"Invalid background setting."},{status:400});
  db.prepare("INSERT INTO user_settings(user_id,background_enabled) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET background_enabled=excluded.background_enabled,updated_at=datetime('now')").run(user.id,Number(b.enabled));
  audit(user.email,"personal_background_toggled",String(b.enabled));return NextResponse.json({ok:true});
 }
 if(action==="password"){
  const current=String(b.currentPassword||""),next=String(b.newPassword||"");const row=db.prepare("SELECT password_hash FROM users WHERE id=?").get(user.id) as {password_hash:string}|undefined;
  if(!row||!(await bcrypt.compare(current,row.password_hash)))return NextResponse.json({error:"Current password is incorrect."},{status:400});
  if(next.length<12||next.length>128)return NextResponse.json({error:"New password must be 12–128 characters."},{status:400});
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(await bcrypt.hash(next,12),user.id);audit(user.email,"password_changed");
  const res=NextResponse.json({ok:true,reauthenticate:true});clearSessionCookie(res);return res;
 }
 return NextResponse.json({error:"Unknown profile action."},{status:400});
}