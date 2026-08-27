import mysql from 'mysql2/promise';
const c = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:'Snqig521223',database:'vnerpdacahng'});
const checks = {
  '丝印油墨-黑色': await c.execute("SELECT id FROM inv_material WHERE material_name='丝印油墨-黑色' AND deleted=0"),
  '丝印油墨-白色': await c.execute("SELECT id FROM inv_material WHERE material_name='丝印油墨-白色' AND deleted=0"),
  '网版': await c.execute("SELECT id FROM inv_material WHERE material_name='网版' AND deleted=0"),
  '空调控制面板标签': await c.execute("SELECT id FROM inv_material WHERE material_name='空调控制面板标签' AND deleted=0"),
  'WH001': await c.execute("SELECT id FROM inv_warehouse WHERE warehouse_code='WH001' AND deleted=0"),
  '深圳油墨公司': await c.execute("SELECT id FROM pur_supplier WHERE supplier_name='深圳油墨公司' AND deleted=0"),
  'C001': await c.execute("SELECT id FROM crm_customer WHERE customer_code='C001' AND deleted=0"),
  '员工1001': await c.execute("SELECT id FROM sys_employee WHERE id=1001"),
};
for (const [k,[r]] of Object.entries(checks)) console.log(k, '=>', r.length? ('id='+r[0].id):'缺失');
await c.end();
