import mysql from 'mysql2/promise';
const c = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:'Snqig521223',database:'vnerpdacahng',multipleStatements:true});
const tables = ['prd_material_issue_item','prd_material_issue','prd_schedule','prd_work_order','inv_inventory_batch','inv_inventory','inv_inventory_transaction','inv_inbound_item','inv_inbound_order','pur_purchase_order_line','pur_purchase_order','sal_order_detail','sal_order','hr_piece_work_detail','hr_piece_rate','hr_salary_standard','hr_salary_profile','hr_salary_calculation','sys_exchange_rate'];
const suffix = '_bak_20260816_gen';
let ok=0, fail=0;
for (const t of tables) {
  try {
    await c.execute(`DROP TABLE IF EXISTS \`${t}${suffix}\``);
    await c.execute(`CREATE TABLE \`${t}${suffix}\` AS SELECT * FROM \`${t}\``);
    const [r] = await c.execute(`SELECT COUNT(*) cnt FROM \`${t}${suffix}\``);
    console.log(`[ok] ${t}${suffix} (${r[0].cnt} 行)`);
    ok++;
  } catch(e) {
    console.log(`[FAIL] ${t}: ${e.message}`);
    fail++;
  }
}
console.log(`\n备份完成: ${ok} 成功, ${fail} 失败`);
await c.end();
