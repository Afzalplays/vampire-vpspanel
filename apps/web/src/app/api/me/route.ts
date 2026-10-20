import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setupRequired } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ user: await getSessionUser(), setupRequired: setupRequired() }); }