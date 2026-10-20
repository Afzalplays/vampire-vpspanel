"use client";
import { useEffect, useState } from "react";

type Branding = { brand_name:string; brand_subtitle:string; logo_url:string; background_url:string; background_enabled:string; background_motion:string };
const defaults: Branding = { brand_name:"VampireVPSPanel", brand_subtitle:"VampireInfra Technologies", logo_url:"", background_url:"", background_enabled:"1", background_motion:"aurora" };

function useBranding() {
 const [branding,setBranding]=useState<Branding>(defaults);
 useEffect(()=>{let live=true;const load=()=>fetch("/api/branding",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(live&&d?.branding)setBranding({...defaults,...d.branding});}).catch(()=>{});const changed=()=>{void load()};void load();window.addEventListener("vampire-branding-updated",changed);return()=>{live=false;window.removeEventListener("vampire-branding-updated",changed)}},[]);
 return branding;
}
export function Ambient({personal=false}:{personal?:boolean}) {
 const b=useBranding();
 const [personalAsset,setPersonalAsset]=useState("");
 const [personalEnabled,setPersonalEnabled]=useState(true);
 useEffect(()=>{if(!personal)return;let live=true;fetch("/api/profile",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(live&&d?.settings){setPersonalAsset(d.settings.background_url||"");setPersonalEnabled(d.settings.background_enabled!==0)}}).catch(()=>{});return()=>{live=false}},[personal]);
 const custom=personal&&personalEnabled&&personalAsset?personalAsset:b.background_url;
 const enabled=personal&&personalAsset?personalEnabled:b.background_enabled!=="0";
 const video=Boolean(custom&&/\.(mp4|webm)(\?|$)/i.test(custom));
 return <div className={"ambient "+(!enabled?"ambient-disabled":"")+" motion-"+(b.background_motion||"aurora")} aria-hidden="true">
   {enabled&&custom&&(video?<video className="ambient-media" src={custom} autoPlay muted loop playsInline/>:<img className="ambient-media" src={custom} alt=""/>)}
   {enabled&&<><div className="orb one"/><div className="orb two"/><div className="orb three"/></>}
 </div>;
}
export function Brand(){
 const b=useBranding();
 return <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-rose-600 font-black">{b.logo_url?<img src={b.logo_url} alt="" className="h-full w-full object-cover"/>:"V"}</div><div><div className="font-bold">{b.brand_name}</div><div className="muted text-xs">{b.brand_subtitle}</div></div></div>;
}