import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, requestOriginOk } from "@/lib/auth";
export async function POST(request:NextRequest) { if(!requestOriginOk(request))return NextResponse.json({error:"Invalid request origin"},{status:403});const response=NextResponse.json({ok:true});clearSessionCookie(response);return response; }