"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Home() {
 const router = useRouter();
 useEffect(() => {
  let live = true;
  fetch("/api/me", { cache: "no-store" }).then(r => r.json()).then(data => {
   if (!live) return;
   router.replace(data.setupRequired ? "/setup" : data.user ? "/admin" : "/login");
  }).catch(() => { if (live) router.replace("/login"); });
  return () => { live = false; };
 }, [router]);
 return <div className="relative flex min-h-screen items-center justify-center overflow-hidden"><Ambient /><div className="relative z-10 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-2xl font-black shadow-lg shadow-rose-950/60">V</div><p className="text-sm text-zinc-400">Starting VampireVPSPanel…</p></div></div>;
}
export function Ambient() { return <div className="ambient"><div className="orb one"/><div className="orb two"/><div className="orb three"/></div>; }