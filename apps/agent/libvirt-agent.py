#!/usr/bin/env python3
"""Restricted VampireVPSPanel bridge to libvirt. Bind to a private/VPN address only."""
import hmac,json,os,re,subprocess
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
TOKEN=os.environ.get("LIBVIRT_AGENT_TOKEN","")
HOST=os.environ.get("LIBVIRT_AGENT_HOST","127.0.0.1")
PORT=int(os.environ.get("LIBVIRT_AGENT_PORT","8765"))
URI=os.environ.get("LIBVIRT_URI","qemu:///system")
UUID_RE=re.compile(r"^[0-9a-fA-F-]{36}$")
ACTIONS={"start":"start","shutdown":"shutdown","reboot":"reboot","force-stop":"destroy"}
def virsh(*args):
 p=subprocess.run(["virsh","-c",URI,*args],capture_output=True,text=True,timeout=12)
 if p.returncode: raise RuntimeError((p.stderr or p.stdout or "virsh failed").strip()[:300])
 return p.stdout
def inventory():
 ids=[s.strip() for s in virsh("list","--all","--uuid").splitlines() if UUID_RE.fullmatch(s.strip())]
 out=[]
 for uid in ids:
  name=virsh("domname",uid).strip(); info={}
  for line in virsh("dominfo",uid).splitlines():
   if ":" in line:
    k,v=line.split(":",1);info[k.strip().lower()]=v.strip()
  try:
   import xml.etree.ElementTree as ET
   root=ET.fromstring(virsh("dumpxml",uid));vcpu=root.findtext("vcpu","1")
   m=root.find("currentMemory") or root.find("memory")
   mib=round(int(m.text or "0")/1024) if m is not None else 0
   disks=[]
   for d in root.findall("./devices/disk"):
    if d.get("device")=="disk":
     src=d.find("source");t=d.find("target")
     if src is not None: disks.append({"source":next(iter(src.attrib.values()),""),"target":t.get("dev","") if t is not None else ""})
  except Exception: vcpu,mib,disks="1",0,[]
  out.append({"uuid":uid,"name":name,"state":info.get("state","unknown"),"vcpus":int(vcpu) if str(vcpu).isdigit() else 1,"memory_mib":mib,"disks":disks})
 return out
class H(BaseHTTPRequestHandler):
 def sendj(self,status,data):
  b=json.dumps(data).encode();self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Cache-Control","no-store");self.send_header("Content-Length",str(len(b)));self.end_headers();self.wfile.write(b)
 def auth(self): return bool(TOKEN) and hmac.compare_digest(self.headers.get("Authorization",""),"Bearer "+TOKEN)
 def do_GET(self):
  if not self.auth(): return self.sendj(401,{"error":"Unauthorized"})
  try:
   if self.path=="/health": return self.sendj(200,{"ok":True})
   if self.path=="/vms": return self.sendj(200,{"vms":inventory()})
   return self.sendj(404,{"error":"Not found"})
  except Exception as e: return self.sendj(502,{"error":str(e)[:300]})
 def do_POST(self):
  if not self.auth(): return self.sendj(401,{"error":"Unauthorized"})
  m=re.fullmatch(r"/vms/([0-9a-fA-F-]{36})/actions",self.path)
  if not m: return self.sendj(404,{"error":"Not found"})
  try:
   n=min(int(self.headers.get("Content-Length","0")),2048);body=json.loads(self.rfile.read(n) or b"{}");a=body.get("action");uid=m.group(1)
   if a not in ACTIONS:return self.sendj(400,{"error":"Unsupported action"})
   if uid not in {x["uuid"] for x in inventory()}:return self.sendj(404,{"error":"VM UUID not found"})
   virsh(ACTIONS[a],uid);return self.sendj(200,{"ok":True,"uuid":uid,"action":a})
  except Exception as e:return self.sendj(502,{"error":str(e)[:300]})
 def log_message(self,fmt,*args): print(self.client_address[0],fmt%args,flush=True)
if __name__=="__main__":
 if len(TOKEN)<32:raise SystemExit("Set LIBVIRT_AGENT_TOKEN to a random secret of at least 32 characters")
 if HOST in ("0.0.0.0","::"):raise SystemExit("Refusing wildcard/public bind; use localhost or a private/VPN IP")
 ThreadingHTTPServer((HOST,PORT),H).serve_forever()
