const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });
  const [r1] = await c.execute('SELECT id, material_code, material_name FROM inv_material WHERE deleted=0 AND material_type IN (1,2) ORDER BY id LIMIT 20');
  console.log('=== inv_material type1/2 ===');
  r1.forEach(r => console.log(r.id, r.material_code, r.material_name));

  const [r2] = await c.execute('SELECT id, real_name FROM sys_user WHERE deleted=0 AND real_name IS NOT NULL AND real_name != "" ORDER BY id LIMIT 10');
  console.log('=== sys_user ===');
  r2.forEach(r => console.log(r.id, r.real_name));
  await c.end();
})();
