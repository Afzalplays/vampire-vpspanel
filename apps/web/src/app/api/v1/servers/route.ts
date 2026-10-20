import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {db} from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const header=req.headers.get("authorization")||"";const match=header.match(/^Bearer (vps_[a-f0-9]{64})$/);
 if(!match)return NextResponse.json({error:"A valid API bearer key is required."},{status:401});
 const hash=createHash("sha256").update(match[1]).digest("hex");
 const row=db.prepare("SELECT id FROM api_keys WHERE key_hash=? AND revoked_at IS NULL").get(hash) as {id:number}|undefined;
 if(!row)return NextResponse.json({error:"Invalid or revoked API key."},{status:401});
 db.prepare("UPDATE api_keys SET last_used_at=datetime('now') WHERE id=?").run(row.id);
 const records=db.prepare("SELECT id,name,status,details,hypervisor_uuid,user_id,created_at FROM records WHERE type='servers' ORDER BY id DESC").all();
 return NextResponse.json({data:records,meta:{count:records.length,version:"v1"}},{headers:{"Cache-Control":"no-store"}});
}