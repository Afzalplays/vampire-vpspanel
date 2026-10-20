"use client";
import { useEffect, useState } from "react";

type Branding = { panel_name?: string; background_preset?: string; background_enabled?: string; background_intensity?: string };
function useBranding() {
  const [branding, setBranding] = useState<Branding>({panel_name:"VampireVPSPanel",background_preset:"thunderstorm-tornado",background_enabled:"true",background_intensity:"medium"});
  useEffect(() => { let live = true; fetch("/api/branding",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(live&&d?.settings)setBranding(old=>({...old,...d.settings}));}).catch(()=>{}); return ()=>{live=false;}; }, []);
  return branding;
}
export function Ambient() {
  const b = useBranding();
  const preset = b.background_enabled === "false" ? "minimal" : (b.background_preset || "thunderstorm-tornado");
  return <div className={"ambient ambient-"+preset+" intensity-"+(b.background_intensity||"medium")} aria-hidden="true">
    <div className="orb one"/><div className="orb two"/><div className="orb three"/>
    {preset==="thunderstorm-tornado"&&<><div className="storm-clouds"/><div className="lightning-flash"/><div className="tornado-funnel"/></>}
    {preset==="red-nebula"&&<div className="nebula-clouds"/>}
  </div>;
}
export function Brand(){ const b=useBranding(); return <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 font-black">V</div><div><div className="font-bold">{b.panel_name||"VampireVPSPanel"}</div><div className="muted text-xs">VampireInfra Technologies</div></div></div>; }

export function SiteFooter(){const [status,setStatus]=useState<"checking"|"operational"|"degraded">("checking");useEffect(()=>{let live=true;fetch("/api/health",{cache:"no-store"}).then(r=>{if(live)setStatus(r.ok?"operational":"degraded");}).catch(()=>{if(live)setStatus("degraded");});return()=>{live=false;};},[]);return <footer className="relative z-10 mt-8 border-t border-white/10 px-4 py-5 text-center text-xs"><p>Powered by VampireInfra Technology</p><p className="muted mt-1">© VampireHosting 2026 - 2027</p><p className={"mt-2 "+(status==="operational"?"text-emerald-300":status==="degraded"?"text-rose-300":"muted")}><span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{background:status==="operational"?"#34d399":status==="degraded"?"#fb7185":"#a1a1aa"}}/> {status==="operational"?"SYSTEM OPERATIONAL":status==="degraded"?"SYSTEM DEGRADED":"CHECKING SYSTEM"} · Vampire-VPSPanel</p></footer>}
