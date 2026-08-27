// fetch_err.cjs — capture 500 error messages for broken endpoints
const fs = require('fs');
const crypto = require('crypto');
const SECRET = fs.readFileSync('D:/dcprint/erp-project/.env', 'utf8').match(/JWT_SECRET=(.*)/)[1].trim();
function b64u(o){return Buffer.from(JSON.stringify(o)).toString('base64url');}
function sign(p){const h=b64u({alg:'HS256',typ:'JWT'});const pp=b64u(p);return h+'.'+pp+'.'+crypto.createHmac('sha256',SECRET).update(h+'.'+pp).digest('base64url');}
const now=Math.floor(Date.now()/1000);
const token=sign({userId:1,username:'admin',realName:'超级管理员',roles:['super_admin'],iat:now,exp:now+86400*30});
const cookie='access_token='+token;
const eps=['quality/complaint','quality/lab-test','quality/supplier-audit','system/announcement','trace/label','system/oper-log','system/scheduler','hr/reports/turnover','ink-usages','purchase/suppliers','qrcode','reports/dashboard','dcprint/tool'];
(async()=>{
  for(const ep of eps){
    try{
      const res=await fetch('http://127.0.0.1:5000/api/'+ep+'?pageSize=3',{headers:{Cookie:cookie}});
      const j=await res.json();
      console.log('\n=== '+ep+' ('+res.status+') ===');
      console.log('msg:',j.message);
      if(j.data&&typeof j.data==='string') console.log('data:',j.data.slice(0,300));
    }catch(e){console.log(ep,'ERR',e.message);}
  }
})();
