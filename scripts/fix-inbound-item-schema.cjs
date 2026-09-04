/**
 * 修复 inv_inbound_item 与代码/Drizzle schema 的列缺口。
 * 现象：MysqlInboundOrderRepository 的 SELECT(ITEM_COLUMNS) 与 INSERT 引用了
 *   batch_id / original_inbound_date / location_id / qr_code，
 * 但 live 表缺少这些列 → GET /api/warehouse/inbound 报
 *   "Unknown column 'batch_id' in 'field list'" (500)。
 * 说明：inbound 列表在为空时短路不查明细，所以此前列表为空也不报错；
 *   一旦有入库明细（如 regen 生成），列表查询即触发该缺失列 → 500。
 *
 * 本脚本幂等：先 information_schema 探测列是否存在，仅缺失时 ALTER ADD COLUMN。
 * 类型对齐 Drizzle 规范（warehouse.ts: invInboundItems）。
 */
const fs = require('fs');
const mysql = require('mysql2/promise');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((a, l) => { const m = l.match(/^([A-Z_]+)=(.+)$/); if (m) a[m[1]] = m[2]; return a; }, {});

const TARGET = 'inv_inbound_item';
// 列定义（对齐 Drizzle 规范，均为可空，避免影响既有写入）
const COL_DEFS = [
  { name: 'batch_id', def: 'BIGINT UNSIGNED NULL' },
  { name: 'original_inbound_date', def: 'DATE NULL' },
  { name: 'location_id', def: 'BIGINT UNSIGNED NULL' },
];

(async () => {
  const c = await mysql.createConnection({ host: env.DB_HOST, port: +env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME });

  // 1) 探测 qr_code 现有类型（库内其它表）以便对齐；默认 VARCHAR(255)
  let qrType = 'VARCHAR(255) NULL';
  try {
    const [qc] = await c.query(
      `SELECT column_type FROM information_schema.columns WHERE table_schema=? AND column_name='qr_code' LIMIT 1`,
      [env.DB_NAME]
    );
    if (qc.length) qrType = (qc[0].column_type || qc[0].COLUMN_TYPE || 'VARCHAR(255)') + ' NULL';
  } catch (e) { /* ignore */ }
  COL_DEFS.push({ name: 'qr_code', def: qrType });

  // 2) 获取现有列
  const [cols] = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema=? AND table_name=?`,
    [env.DB_NAME, TARGET]
  );
  const existing = new Set(cols.map(r => r.column_name || r.COLUMN_NAME));

  // 3) 逐列幂等补齐
  for (const col of COL_DEFS) {
    if (existing.has(col.name)) {
      console.log(`SKIP  ${col.name} (已存在)`);
      continue;
    }
    console.log(`ADD   ${col.name} (${col.def})`);
    await c.query(`ALTER TABLE \`${TARGET}\` ADD COLUMN \`${col.name}\` ${col.def}`);
  }

  // 4) 补充 idx_batch_id 索引（对齐 Drizzle batchIdIdx），若不存在
  const [idx] = await c.query(
    `SELECT index_name FROM information_schema.statistics WHERE table_schema=? AND table_name=? AND index_name='idx_batch_id'`,
    [env.DB_NAME, TARGET]
  );
  if (idx.length === 0) {
    console.log('ADD   idx_batch_id');
    await c.query(`ALTER TABLE \`${TARGET}\` ADD INDEX idx_batch_id (\`batch_id\`)`);
  } else {
    console.log('SKIP  idx_batch_id (已存在)');
  }

  // 5) 验证
  const [after] = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema=? AND table_name=? ORDER BY ordinal_position`,
    [env.DB_NAME, TARGET]
  );
  const haveBatch = after.some(r => (r.column_name || r.COLUMN_NAME) === 'batch_id');
  console.log('\nVERIFY batch_id present:', haveBatch);
  console.log('total columns now:', after.length);

  await c.end();
  console.log('\nDONE');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
