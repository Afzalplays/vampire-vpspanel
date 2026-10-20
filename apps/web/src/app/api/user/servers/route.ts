import {NextResponse} from "next/server";
import {getSessionUser} from "@/lib/auth";
import {db} from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="USER")return NextResponse.json({error:"Customer account required."},{status:403});
 const servers=db.prepare("SELECT id,name,status,details,hypervisor_uuid,created_at FROM records WHERE type='servers' AND user_id=? ORDER BY id DESC").all(user.id);
 return NextResponse.json({servers},{headers:{"Cache-Control":"no-store"}});
}