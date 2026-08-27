// fetch_all.cjs — runtime-fetch every endpoint referenced by remaining-module pages
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const SECRET = fs.readFileSync('D:/dcprint/erp-project/.env', 'utf8').match(/JWT_SECRET=(.*)/)[1].trim();
function b64u(o){return Buffer.from(JSON.stringify(o)).toString('base64url');}
function sign(p){const h=b64u({alg:'HS256',typ:'JWT'});const pp=b64u(p);return h+'.'+pp+'.'+crypto.createHmac('sha256',SECRET).update(h+'.'+pp).digest('base64url');}
const now=Math.floor(Date.now()/1000);
const token=sign({userId:1,username:'admin',realName:'超级管理员',roles:['super_admin'],iat:now,exp:now+86400*30});
const cookie='access_token='+token;

// reuse scan5 endpoint enumeration
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const en of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,en.name);if(en.isDirectory())walk(p,out);else if(en.name==='page.tsx')out.push(p);}return out;}
const LOCALE=path.join('src/app/[locale]');
const MODULES=['finance','quality','base-data','settings','hr','organization','dcprint','engineering','system','dashboard','reports','equipment','qrcode'];
const epRe=/authFetch\(\s*[`'"](\/api\/[^`'"]+)/g;
const eps=new Set();
for(const m of MODULES)for(const page of walk(path.join(LOCALE,m))){const src=fs.readFileSync(page,'utf8');let mm;while((mm=epRe.exec(src))){let ep=mm[1].replace(/\?.*$/,'').replace(/\$\{[^}]*\}.*$/,'').replace(/^\/api/,'');if(!ep.includes('['))eps.add(ep);}}

(async()=>{
  const map={};
  for(const ep of eps){
    const url='http://127.0.0.1:5000/api/'+ep.replace(/^\//,'')+'?pageSize=3';
    try{
      const res=await fetch(url,{headers:{Cookie:cookie}});
      const txt=await res.text();
      let json;try{json=JSON.parse(txt);}catch{map[ep]={status:res.status,note:'non-json'};continue;}
      let list=null;const d=json.data;
      if(d&&Array.isArray(d.list))list=d.list;else if(d&&Array.isArray(d.records))list=d.records;else if(d&&Array.isArray(d.items))list=d.items;else if(Array.isArray(d))list=d;else if(Array.isArray(json))list=json;
      if(!list||!list.length){map[ep]={status:res.status,success:json.success,total:d&&d.total,keys:d?Object.keys(d):Object.keys(json)};continue;}
      map[ep]={status:res.status,count:list.length,keys:Object.keys(list[0]),sample:list[0]};
    }catch(e){map[ep]={status:'ERR',msg:e.message};}
  }
  fs.writeFileSync('scripts/_audit/runtime_be.json',JSON.stringify(map,null,2));
  const ok=Object.entries(map).filter(([k,v])=>v.status===200).length;
  const err=Object.entries(map).filter(([k,v])=>v.status&&v.status!==200);
  console.log('Endpoints fetched:',eps.size,'| 200:',ok,'| non-200:',err.length);
  err.forEach(([k,v])=>console.log('  ',v.status,k));
})();
