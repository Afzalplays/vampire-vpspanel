import { NextRequest,NextResponse } from "next/server";
import {db,audit} from "@/lib/db";
import {requireAdmin,requestOriginOk} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){const a=await requireAdmin();if(!a.user)return a.response!;const rows=db.prepare("SELECT key,value,updated_at FROM app_settings ORDER BY key").all();return NextResponse.json({settings:rows});}
export async function PATCH(req:NextRequest){
 const a=await requireAdmin();if(!a.user)return a.response!;
 if(!requestOriginOk(req))return NextResponse.json({error:"Invalid request origin"},{status:403});
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const allowed=new Set(["brand_name","brand_subtitle","logo_url","background_url","background_enabled","background_motion"]);
 const up=db.prepare("INSERT INTO app_settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')");
 for(const [key,raw] of Object.entries(body)){if(!allowed.has(key))continue;const value=String(raw??"");if(value.length>2048)return NextResponse.json({error:key+" is too long."},{status:400});if(key==="brand_name"&&(value.trim().length<2||value.length>80))return NextResponse.json({error:"Brand name must be 2–80 characters."},{status:400});if(key==="background_enabled"&&!["0","1"].includes(value))return NextResponse.json({error:"Invalid background toggle."},{status:400});if(key==="background_motion"&&!["aurora","minimal","none"].includes(value))return NextResponse.json({error:"Invalid animation style."},{status:400});up.run(key,value);}
 audit(a.user.email,"branding_settings_updated",Object.keys(body).filter(k=>allowed.has(k)).join(","));
 const rows=db.prepare("SELECT key,value FROM app_settings").all() as Array<{key:string;value:string}>;
 return NextResponse.json({ok:true,branding:Object.fromEntries(rows.map(row => [row.key,row.value] as const))});
}