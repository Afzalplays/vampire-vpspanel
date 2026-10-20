import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(request:NextRequest){
 let b:Record<string,unknown>;try{b=await request.json()}catch{return NextResponse.json({valid:false,error:"Invalid request"},{status:400})}
 const key=String(b.key||"").trim();
 if(key.length<12||key.length>200)return NextResponse.json({valid:false});
 db.exec(`CREATE TABLE IF NOT EXISTS licenses(
 id INTEGER PRIMARY KEY AUTOINCREMENT,label TEXT NOT NULL,key_hash TEXT NOT NULL UNIQUE,key_prefix TEXT NOT NULL,
 plan TEXT NOT NULL,max_nodes INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'ACTIVE',
 expires_at TEXT,created_at TEXT NOT NULL DEFAULT (datetime('now')),created_by TEXT NOT NULL)`);
 const hash=createHash("sha256").update(key).digest("hex");
 const lic=db.prepare("SELECT plan,max_nodes,status,expires_at FROM licenses WHERE key_hash=?").get(hash) as {plan:string;max_nodes:number;status:string;expires_at:string|null}|undefined;
 if(!lic||lic.status!=="ACTIVE")return NextResponse.json({valid:false});
 const expired=!!lic.expires_at&&lic.expires_at<new Date().toISOString().slice(0,10);
 if(expired)return NextResponse.json({valid:false,reason:"expired"});
 return NextResponse.json({valid:true,plan:lic.plan,max_nodes:lic.max_nodes,expires_at:lic.expires_at});
}