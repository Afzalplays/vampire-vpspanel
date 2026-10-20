import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(){
 const user=await getSessionUser();
 if(!user||user.role!=="USER")return NextResponse.json({error:"Unauthorized"},{status:401});
 const servers=db.prepare("SELECT id,name,status,details,created_at FROM records WHERE type='servers' AND owner_user_id=? ORDER BY id DESC").all(user.id);
 return NextResponse.json({servers,provisioningConfigured:false});
}