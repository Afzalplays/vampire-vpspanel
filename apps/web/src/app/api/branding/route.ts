import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const rows=db.prepare("SELECT key,value FROM app_settings").all() as Array<{key:string;value:string}>;
 const branding=Object.fromEntries(rows.map(row => [row.key,row.value] as const));
 return NextResponse.json({branding},{headers:{"Cache-Control":"no-store"}});
}