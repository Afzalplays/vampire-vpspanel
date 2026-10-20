import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {db} from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 let b:any;try{b=await req.json()}catch{return NextResponse.json({valid:false,error:"Invalid JSON"},{status:400})}
 const key=String(b.key||"").trim();if(key.length<20||key.length>100)return NextResponse.json({valid:false,error:"Invalid license key format."},{status:400});
 const hash=createHash("sha256").update(key).digest("hex");
 const license=db.prepare("SELECT name,status,expires_at FROM licenses WHERE key_hash=?").get(hash) as {name:string;status:string;expires_at:string|null}|undefined;
 if(!license)return NextResponse.json({valid:false,status:"invalid"});
 if(license.status!=="active")return NextResponse.json({valid:false,status:"revoked",name:license.name});
 if(license.expires_at&&(Date.parse(license.expires_at)<=Date.now()))return NextResponse.json({valid:false,status:"expired",name:license.name});
 return NextResponse.json({valid:true,status:"active",name:license.name,expiresAt:license.expires_at});
}