import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(){const auth=await requireAdmin();if(!auth.user)return auth.response!;const count=(type:string)=> (db.prepare("SELECT COUNT(*) AS n FROM records WHERE type=?").get(type) as {n:number}).n;return NextResponse.json({users:(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='USER'").get() as {n:number}).n,servers:count("servers"),nodes:count("nodes"),plans:count("plans")});}