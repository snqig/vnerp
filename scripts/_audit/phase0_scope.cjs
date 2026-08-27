// Phase 0 范围核查：列出全部 inv_* 表，识别缺失表与 FK 内外引用分布
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

// 已在 warehouse.ts 建模的表（10 张 inv_* + 2 张 split，共 12）
const MODELED = new Set([
  'inv_material','inv_inventory_batch','inv_inbound_order','inv_inbound_item',
  'inv_warehouse','inv_inventory','inv_outbound_order','inv_outbound_item',
  'inv_transfer_order','inv_stocktaking','split_order','split_order_detail',
]);

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  const db = env.DB_NAME;

  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME LIKE 'inv_%' ORDER BY TABLE_NAME`,
    [db]
  );
  const invTables = tables.map(r => r.TABLE_NAME);
  const missing = invTables.filter(t => !MODELED.has(t));
  console.log(`总 inv_* 表 = ${invTables.length}`);
  console.log(`已建模 = ${invTables.filter(t=>MODELED.has(t)).length}`);
  console.log(`缺失(待生成) = ${missing.length}`);
  console.log('缺失表清单:\n  ' + missing.join('\n  '));

  // FK 分布
  const [fks] = await conn.query(
    `SELECT k.TABLE_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS r
       ON k.CONSTRAINT_NAME=r.CONSTRAINT_NAME AND k.TABLE_SCHEMA=r.CONSTRAINT_SCHEMA
     WHERE k.TABLE_SCHEMA=? AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    [db]
  );
  const invSet = new Set(invTables);
  let internalCount = 0, externalCount = 0;
  const extTargets = new Set();
  const perTable = {};
  for (const f of fks) {
    const internal = invSet.has(f.REFERENCED_TABLE_NAME);
    if (internal) internalCount++; else { externalCount++; extTargets.add(f.REFERENCED_TABLE_NAME); }
    perTable[f.TABLE_NAME] = perTable[f.TABLE_NAME] || { internal:0, external:0 };
    if (internal) perTable[f.TABLE_NAME].internal++; else perTable[f.TABLE_NAME].external++;
  }
  console.log(`\n全库 FK 总数 = ${fks.length}`);
  console.log(`  → inv_* 内部引用(可自包含生成) = ${internalCount}`);
  console.log(`  → 跨域引用(需外部表建模，本阶段跳过并注释) = ${externalCount}`);
  console.log('跨域 FK 目标表: ' + [...extTargets].sort().join(', '));
  console.log('\n缺失表上的 FK 分布 (internal/external):');
  for (const t of missing) {
    const p = perTable[t];
    if (p) console.log(`  ${t}: int=${p.internal} ext=${p.external}`);
  }

  await conn.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
