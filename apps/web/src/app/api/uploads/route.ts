import {NextRequest,NextResponse} from "next/server";
import {getSessionUser,requestOriginOk} from "@/lib/auth";
import {db,audit} from "@/lib/db";
import fs from "node:fs/promises";
import path from "node:path";
import {randomUUID} from "node:crypto";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const mimeExt:Record<string,string>={"image/png":".png","image/jpeg":".jpg","image/webp":".webp","image/gif":".gif","image/avif":".avif","video/mp4":".mp4","video/webm":".webm"};
export async function POST(req:NextRequest){
 const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let form:FormData;try{form=await req.formData()}catch{return NextResponse.json({error:"Invalid upload form"},{status:400})}
 const file=form.get("file"),kind=String(form.get("kind")||"avatar");
 if(!(file instanceof File))return NextResponse.json({error:"Choose a file to upload."},{status:400});
 if(!["avatar","logo","background"].includes(kind))return NextResponse.json({error:"Invalid upload type."},{status:400});
 if(kind==="logo"&&user.role!=="ADMIN")return NextResponse.json({error:"Only administrators can upload the panel logo."},{status:403});
 const isVideo=file.type==="video/mp4"||file.type==="video/webm";
 const allowed=kind==="background"?Boolean(mimeExt[file.type]):Boolean(mimeExt[file.type]&&file.type.startsWith("image/"));
 if(!allowed)return NextResponse.json({error:kind==="background"?"Use PNG, JPG, WebP, GIF, AVIF, MP4 or WebM.":"Use PNG, JPG, WebP, GIF or AVIF."},{status:400});
 const max=kind==="background"?40*1024*1024:5*1024*1024;
 if(file.size<1||file.size>max)return NextResponse.json({error:kind==="background"?"Background maximum size is 40 MB.":"Image maximum size is 5 MB."},{status:413});
 const bytes=Buffer.from(await file.arrayBuffer());
 const ext=mimeExt[file.type];const dir=path.join(process.cwd(),"public","uploads");
 await fs.mkdir(dir,{recursive:true});
 const filename=randomUUID()+ext;await fs.writeFile(path.join(dir,filename),bytes,{flag:"wx",mode:0o644});
 const url="/uploads/"+filename;
 if(kind==="logo"&&user.role==="ADMIN"){
  db.prepare("INSERT INTO app_settings(key,value,updated_at) VALUES('logo_url',?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')").run(url);
 }else if(kind==="background"&&user.role==="ADMIN"){
  db.prepare("INSERT INTO app_settings(key,value,updated_at) VALUES('background_url',?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')").run(url);
 }else{
  db.prepare("INSERT INTO user_settings(user_id,avatar_url,background_url,background_enabled) VALUES(?,?,?,1) ON CONFLICT(user_id) DO UPDATE SET "+(kind==="avatar"?"avatar_url=excluded.avatar_url":"background_url=excluded.background_url")+",updated_at=datetime('now')").run(user.id,kind==="avatar"?url:"",kind==="background"?url:"");
 }
 audit(user.email,"asset_uploaded",kind);
 return NextResponse.json({ok:true,url,kind});
}