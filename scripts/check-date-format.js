const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });
  const [cols] = await c.execute("DESCRIBE sys_config");
  console.log('sys_config columns:', cols.map(r => r.Field));
  const [rows] = await c.execute("SELECT * FROM sys_config LIMIT 5");
  console.log('sys_config data:', JSON.stringify(rows));
  const [dict] = await c.execute("SELECT d.* FROM sys_dict_data d JOIN sys_dict_type t ON d.dict_type_id = t.id WHERE t.dict_code = 'date_format'");
  console.log('date_format dict:', JSON.stringify(dict));
  await c.end();
}
main().catch(console.error);
