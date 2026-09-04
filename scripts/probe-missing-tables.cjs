const fs=require('fs');
const mysql=require('mysql2/promise');
const env=fs.readFileSync('.env','utf8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_]+)=(.+)$/);if(m)a[m[1]]=m[2];return a;},{});
const missing=['sys_operate_log','ink_dispatch','ink_formula','delivery_vehicle','finance_expense','finance_invoice','prd_die_maintenance','qc_final_inspection','bom_material','prd_die_usage_log','wf_workflow_config','wf_approval_task','inv_batch_inventory','inv_stock_freeze','stock_movement','inventory_checks','stock','materials','material'];
(async()=>{
  const c=await mysql.createConnection({host:env.DB_HOST,port:+env.DB_PORT,user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME});
  const [all]=await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema=?`,[env.DB_NAME]);
  const names=all.map(r=>r.table_name||r.TABLE_NAME);
  for(const m of missing){
    const exists=names.includes(m);
    // token-based fuzzy match
    const toks=m.replace(/_/g,' ').split(' ').filter(t=>t.length>3);
    const cand=names.filter(n=>{const nl=n.toLowerCase();return toks.some(t=>nl.includes(t));});
    console.log(`\n## ${m}  exists=${exists}`);
    if(!exists) console.log('   fuzzy candidates:', cand.slice(0,8).join(', '));
  }
  await c.end();
})().catch(e=>{console.error(e);process.exit(1);});
