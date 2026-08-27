const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng',
  });

  const desc = async (t) => {
    const [rows] = await conn.query(`DESCRIBE ${t}`);
    return rows.map((r) => `${r.Field}:${r.Type}${r.Null === 'YES' ? '' : ' NOT NULL'}`);
  };
  const show = async (label, rows) => {
    console.log(`\n=== ${label} ===`);
    rows.forEach((r) => console.log('  ' + r));
  };

  for (const t of ['pur_purchase_return', 'sal_return', 'prd_product_label']) {
    try {
      show(`DESCRIBE ${t}`, await desc(t));
    } catch (e) {
      console.log(`\n=== ${t} === ERROR: ${e.message}`);
    }
  }

  // distinct status values actually stored
  try {
    const [s1] = await conn.query('SELECT status, COUNT(*) c FROM pur_purchase_return GROUP BY status');
    show('pur_purchase_return.status values', s1.map((r) => `status=${r.status} (${r.c})`));
  } catch (e) { console.log('pur_purchase_return status err', e.message); }
  try {
    const [s2] = await conn.query('SELECT status, COUNT(*) c FROM sal_return GROUP BY status');
    show('sal_return.status values', s2.map((r) => `status=${r.status} (${r.c})`));
  } catch (e) { console.log('sal_return status err', e.message); }
  try {
    const [s3] = await conn.query('SELECT status, COUNT(*) c FROM prd_product_label GROUP BY status');
    show('prd_product_label.status values', s3.map((r) => `status=${r.status} (${r.c})`));
  } catch (e) { console.log('prd_product_label status err', e.message); }

  // sample one row each to see which expected columns exist
  try {
    const [r1] = await conn.query('SELECT * FROM pur_purchase_return LIMIT 1');
    show('pur_purchase_return sample keys', r1[0] ? Object.keys(r1[0]) : ['(no rows)']);
  } catch (e) { console.log('r1 err', e.message); }
  try {
    const [r2] = await conn.query('SELECT * FROM sal_return LIMIT 1');
    show('sal_return sample keys', r2[0] ? Object.keys(r2[0]) : ['(no rows)']);
  } catch (e) { console.log('r2 err', e.message); }
  try {
    const [r3] = await conn.query('SELECT * FROM prd_product_label LIMIT 1');
    show('prd_product_label sample keys', r3[0] ? Object.keys(r3[0]) : ['(no rows)']);
  } catch (e) { console.log('r3 err', e.message); }

  await conn.end();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
