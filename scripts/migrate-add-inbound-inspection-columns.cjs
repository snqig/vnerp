/**
 * 幂等迁移：给 inv_inbound_order 补齐「代码在写、但库里缺失」的列，并回填已完成单的初始值。
 *
 * 背景：代码/文档假设存在 inspection_status / finance_posted / inspection_id，
 * 但真实库原本只有 status(enum) 与 qc_status(enum)，导致：
 *   - MysqlInboundOrderRepository.updateInspectionAndFinance()  写不存在的列 -> 1054
 *   - /api/quality/incoming (229/240/311/325 行)                写 inspection_status/inspection_id -> 1054
 *
 * 本步骤：
 *   1) 仅 ADD COLUMN（不删、不改任何已有列），可重复执行
 *   2) 回填：status IN ('approved','completed') 且 inspection_status 仍为 0/NULL 的单，
 *      置为 inspection_status=3(已检验)、finance_posted=1(已记账)，与 approve() 的领域语义一致
 *   3) 只读巡检：报告已完成单里 qc_status 与 inspection_status 不一致的情况（不自动改）
 *
 * 用法： node scripts/migrate-add-inbound-inspection-columns.cjs
 */
const mysql = require('mysql2/promise');

const TABLE = 'inv_inbound_order';
const DB = 'vnerpdacahng';

// 类型与领域模型保持一致：inspectionStatus 是数字 0/1/2/3，financePosted 是布尔
const COLUMNS = [
  {
    name: 'inspection_status',
    ddl: "INT DEFAULT 0 COMMENT '质检状态:0未检验 1检验中 2不合格 3已检验'",
  },
  {
    name: 'finance_posted',
    ddl: "TINYINT DEFAULT 0 COMMENT '是否已记账:0否 1是'",
  },
  {
    name: 'inspection_id',
    ddl: "INT DEFAULT NULL COMMENT '关联质检单ID'",
  },
];

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Snqig521223',
    database: DB,
  });

  // ---------- 1) 加列 ----------
  const [before] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB, TABLE]
  );
  const have = new Set(before.map((r) => r.COLUMN_NAME));

  console.log('=== [1/3] 迁移前探测 ===');
  for (const c of COLUMNS) {
    console.log(`  ${c.name.padEnd(20)} : ${have.has(c.name) ? '已存在' : '缺失 -> 待添加'}`);
  }

  let added = 0;
  for (const c of COLUMNS) {
    if (have.has(c.name)) {
      console.log(`\n跳过 ${c.name}（已存在，不改动）`);
      continue;
    }
    const sql = `ALTER TABLE \`${TABLE}\` ADD COLUMN \`${c.name}\` ${c.ddl}`;
    console.log(`\n执行: ${sql}`);
    await conn.query(sql);
    added++;
    console.log(`  -> ${c.name} 添加成功`);
  }
  console.log(`\n本次新增 ${added} 列`);

  // ---------- 2) 回填 ----------
  console.log('\n=== [2/3] 回填已完成单（幂等：只改 inspection_status 仍为 0/NULL 的行）===');
  const [bf] = await conn.query(
    `UPDATE \`${TABLE}\`
        SET inspection_status = 3, finance_posted = 1
      WHERE deleted = 0
        AND status IN ('approved','completed')
        AND (inspection_status = 0 OR inspection_status IS NULL)`
  );
  console.log(`  回填影响行数: ${bf.affectedRows}`);

  // ---------- 3) 校验 + 巡检 ----------
  const [after] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       AND COLUMN_NAME IN (${COLUMNS.map(() => '?').join(',')})
     ORDER BY ORDINAL_POSITION`,
    [DB, TABLE, ...COLUMNS.map((c) => c.name)]
  );
  console.log('\n=== [3/3] 迁移后列校验 ===');
  console.table(after);
  console.log(`目标列存在情况: ${after.length}/${COLUMNS.length}`);

  const [dist] = await conn.query(
    `SELECT status, inspection_status, finance_posted, COUNT(*) AS cnt
       FROM \`${TABLE}\`
      WHERE deleted = 0
      GROUP BY status, inspection_status, finance_posted
      ORDER BY status, inspection_status`
  );
  console.log('\n=== 回填后数据分布 ===');
  console.table(dist);

  const [mismatch] = await conn.query(
    `SELECT qc_status, inspection_status, COUNT(*) AS cnt
       FROM \`${TABLE}\`
      WHERE deleted = 0 AND status IN ('approved','completed')
      GROUP BY qc_status, inspection_status`
  );
  console.log('=== 巡检：已完成单的 qc_status 与 inspection_status 对照（本脚本不自动改 qc_status）===');
  console.table(mismatch);

  await conn.end();
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
