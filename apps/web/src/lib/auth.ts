import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secretText = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === "production" && (!secretText || secretText.length < 32)) {
  throw new Error("SESSION_SECRET must be at least 32 characters in production.");
}
const key = new TextEncoder().encode(secretText || "local-development-secret-change-before-deployment-123456");
const cookieName = "vampire_session";

export type SessionUser = { id: number; name: string; email: string; role: "ADMIN" | "USER" };
export async function createSession(user: SessionUser) {
 return new SignJWT({ name: user.name, email: user.email, role: user.role })
  .setProtectedHeader({ alg: "HS256" }).setSubject(String(user.id))
  .setIssuedAt().setExpirationTime("8h").sign(key);
}
export async function getSessionUser(): Promise<SessionUser | null> {
 const store = await cookies();
 const token = store.get(cookieName)?.value;
 if (!token) return null;
 try {
  const { payload } = await jwtVerify(token, key);
  if (!payload.sub || !payload.email || !payload.name || (payload.role !== "ADMIN" && payload.role !== "USER")) return null;
  return { id: Number(payload.sub), name: String(payload.name), email: String(payload.email), role: payload.role };
 } catch { return null; }
}
export async function requireAdmin() {
 const user = await getSessionUser();
 if (!user || user.role !== "ADMIN") return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
 return { user, response: null };
}
export function setSessionCookie(response: NextResponse, token: string) {
 response.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8 * 60 * 60 });
}
export function clearSessionCookie(response: NextResponse) {
 response.cookies.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}
export function badRequest(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export function isValidEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function requestOriginOk(request: NextRequest) {
 const origin = request.headers.get("origin");
 if (!origin) return true;
 try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}