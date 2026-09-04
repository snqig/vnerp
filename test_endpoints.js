const fs = require('fs');
const env = fs.readFileSync('.env','utf8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_]+)=(.+)$/);if(m)a[m[1]]=m[2].trim();return a;},{});
const BASE = 'http://127.0.0.1:5000';

async function login(){
  const r = await fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})});
  const c = r.headers.get('set-cookie')||'';
  const cookie = c.split(',').map(x=>x.split(';')[0]).join('; ');
  const csrf = (c.match(/csrf_token=([^;]+)/)||[])[1]||'';
  const d = await r.json().catch(()=>({}));
  const token = (d.data&&d.data.token)||d.token||'';
  return {token,cookie,csrf};
}

async function call(method, ep, h){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), 60000);
  try{
    const r = await fetch(BASE+ep, {method, headers:h, signal:ctrl.signal});
    const txt = await r.text();
    let body; try{ body = JSON.parse(txt); }catch(e){ body = txt.slice(0,500); }
    return {status:r.status, body};
  }catch(e){
    return {status:'ERR', body:String(e)};
  }finally{ clearTimeout(t); }
}

(async()=>{
  const {cookie,csrf} = await login();
  const h = {'Cookie':cookie,'x-csrf-token':csrf,'Content-Type':'application/json'};
  const eps = [
    ['GET','/api/init/bom-tables'],
    ['GET','/api/init/three-layer-tables'],
    ['POST','/api/init/die-template-seed'],
    ['POST','/api/init/quality-final-seed'],
    ['GET','/api/migrations/foreign-keys'],
    ['GET','/api/migrations/readmd-fixes'],
  ];
  for(const [m,e] of eps){
    let res = await call(m,e,h);
    if(res.status===500 || res.status==='ERR'){
      // retry once (cold compile)
      await new Promise(r=>setTimeout(r,2000));
      res = await call(m,e,h);
    }
    console.log(`\n### ${m} ${e} -> ${res.status}`);
    if(res.status!==200){
      console.log(JSON.stringify(res.body,null,2).slice(0,1200));
    } else {
      const msg = res.body && (res.body.message || res.body.msg || '');
      console.log('OK '+(typeof msg==='string'?msg.slice(0,200):''));
    }
  }
})();
