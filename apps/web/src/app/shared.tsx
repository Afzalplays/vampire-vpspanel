"use client";
import { useEffect, useState } from "react";

type Branding = { brand_name:string; brand_subtitle:string; logo_url:string; background_url:string; background_enabled:string; background_motion:string };
const defaults: Branding = { brand_name:"VampireVPSPanel", brand_subtitle:"VampireInfra Technologies", logo_url:"", background_url:"", background_enabled:"1", background_motion:"aurora" };

function useBranding() {
 const [branding,setBranding]=useState<Branding>(defaults);
 useEffect(()=>{let live=true;fetch("/api/branding",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(live&&d?.branding)setBranding({...defaults,...d.branding});}).catch(()=>{});return()=>{live=false}},[]);
 return branding;
}
export function Ambient() {
 const b=useBranding();
 const video=b.background_url && /\.(mp4|webm)(\?|$)/i.test(b.background_url);
 return <div className={"ambient "+(b.background_enabled==="0"?"ambient-disabled":"")} aria-hidden="true">
   {b.background_enabled!=="0" && b.background_url && (video
     ? <video className="ambient-media" src={b.background_url} autoPlay muted loop playsInline />
     : <img className="ambient-media" src={b.background_url} alt="" />)}
   {b.background_enabled!=="0" && <><div className="orb one"/><div className="orb two"/><div className="orb three"/></>}
 </div>;
}
export function Brand(){
 const b=useBranding();
 return <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-rose-600 font-black">{b.logo_url?<img src={b.logo_url} alt="" className="h-full w-full object-cover"/>:"V"}</div><div><div className="font-bold">{b.brand_name}</div><div className="muted text-xs">{b.brand_subtitle}</div></div></div>;
}