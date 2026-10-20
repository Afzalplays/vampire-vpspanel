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
