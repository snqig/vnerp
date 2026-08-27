import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:'Snqig521223',database:'vnerpdacahng'});
  
  // 检查 fin_period
  const [fpCols] = await conn.execute('DESCRIBE fin_period');
  console.log('fin_period columns:', fpCols.map(c => c.Field));
  
  // 检查 hr_salary_standard
  const [hsCols] = await conn.execute('DESCRIBE hr_salary_standard');
  console.log('hr_salary_standard columns:', hsCols.map(c => c.Field));
  
  // 检查 prd_bom
  const [pbCols] = await conn.execute('DESCRIBE prd_bom');
  console.log('prd_bom columns:', pbCols.map(c => c.Field));
  
  // 检查 pur_purchase_return
  const [pprCols] = await conn.execute('DESCRIBE pur_purchase_return');
  console.log('pur_purchase_return columns:', pprCols.map(c => c.Field));
  
  // 检查 outsource_issue
  const [oiCols] = await conn.execute('DESCRIBE outsource_issue');
  console.log('outsource_issue columns:', oiCols.map(c => c.Field));
  
  // 检查 outsource_receive
  const [orCols] = await conn.execute('DESCRIBE outsource_receive');
  console.log('outsource_receive columns:', orCols.map(c => c.Field));
  
  // 检查 outsource_settlement
  const [osCols] = await conn.execute('DESCRIBE outsource_settlement');
  console.log('outsource_settlement columns:', osCols.map(c => c.Field));
  
  // 检查 qc_unqualified
  const [quCols] = await conn.execute('DESCRIBE qc_unqualified');
  console.log('qc_unqualified columns:', quCols.map(c => c.Field));
  
  await conn.end();
}

main().catch(e => console.error(e));
