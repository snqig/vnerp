const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'vnerpdacahng'
  });

  console.log('=== Saga Log Table Status ===');
  try {
    const [tableInfo] = await conn.execute('DESCRIBE saga_log');
    console.log('Table Structure:');
    tableInfo.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default || ''}`);
    });

    const [count] = await conn.execute('SELECT COUNT(*) as count FROM saga_log');
    console.log('\nTotal records:', count[0].count);

    const [recent] = await conn.execute('SELECT * FROM saga_log ORDER BY id DESC LIMIT 5');
    console.log('\nRecent records:');
    recent.forEach(row => {
      console.log(`  ID: ${row.id}, SagaID: ${row.saga_id}, Type: ${row.saga_type}, Status: ${row.status}, Steps: ${row.steps ? JSON.parse(row.steps).length : 0}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n=== HR Payroll Snapshot Table Status ===');
  try {
    const [tableInfo] = await conn.execute('DESCRIBE hr_payroll_snapshot');
    console.log('Table Structure:');
    tableInfo.forEach(col => {
      console.log(`  ${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default || ''}`);
    });

    const [count] = await conn.execute('SELECT COUNT(*) as count FROM hr_payroll_snapshot');
    console.log('\nTotal records:', count[0].count);
  } catch (error) {
    console.error('Error:', error.message);
  }

  await conn.end();
}

main();
