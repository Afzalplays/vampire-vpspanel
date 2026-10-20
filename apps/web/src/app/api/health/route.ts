import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  let database = false;
  try { db.prepare("SELECT 1").get(); database = true; } catch {}
  const operational = database;
  return NextResponse.json({status:operational?"operational":"degraded",checks:{application:true,database}}, {status:operational?200:503,headers:{"Cache-Control":"no-store"}});
}