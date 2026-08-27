// T1 路径B 安全预检（只读）
// 对 88 张 _bak*/_ghost_backup_ 备份表：
//   1) 行数（information_schema.TABLE_ROWS，近似值）
//   2) 反向 FK：是否有「核心表」以外键引用本备份表（DROP 风险阻断项）
//   3) 创建时间
// 产出风险评级：SAFE（无人引用+行数小）/ LOW（无人引用+行数大）/ CAUTION（被核心表引用）
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const db = env.DB_NAME;

// 复用发现脚本的备份表清单
const disc = require('./coverage_discovery.json');
const backupTables = disc.backupTables;
// 备份表集合，用于判断「引用方是否为核心表」
const backupSet = new Set(backupTables);

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: db,
  });

  const results = [];
  for (const t of backupTables) {
    const [rows] = await conn.query(
      `SELECT TABLE_ROWS, CREATE_TIME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
      [db, t]);
    const meta = rows[0] || { TABLE_ROWS: null, CREATE_TIME: null };

    // 反向 FK：谁引用了本备份表
    const [refs] = await conn.query(
      `SELECT k.TABLE_NAME AS referencing_table, k.COLUMN_NAME, k.CONSTRAINT_NAME
       FROM information_schema.KEY_COLUMN_USAGE k
       WHERE k.TABLE_SCHEMA=? AND k.REFERENCED_TABLE_NAME=?
       ORDER BY k.TABLE_NAME`,
      [db, t]);

    const coreRefs = refs.filter(r => !backupSet.has(r.referencing_table));
    let risk = 'SAFE';
    if (coreRefs.length > 0) risk = 'CAUTION';
    else if ((meta.TABLE_ROWS || 0) > 50000) risk = 'LOW';

    results.push({
      table: t,
      rows: meta.TABLE_ROWS,
      createTime: meta.CREATE_TIME ? String(meta.CREATE_TIME) : null,
      referencedByCore: coreRefs.map(r => r.referencing_table),
      referencedByBackup: refs.filter(r => backupSet.has(r.referencing_table)).map(r => r.referencing_table),
      risk,
    });
    if (refs.length) {
      console.log(`⚠️ ${t} 被引用: ${refs.map(r => r.referencing_table + '.' + r.COLUMN_NAME).join(', ')}`);
    }
  }
  await conn.end();

  const byRisk = { SAFE: 0, LOW: 0, CAUTION: 0 };
  for (const r of results) byRisk[r.risk]++;
  const cautionTables = results.filter(r => r.risk === 'CAUTION').map(r => r.table);

  const out = {
    db, generatedAt: new Date().toISOString(),
    total: results.length,
    byRisk,
    cautionTables,
    details: results.sort((a, b) => (a.risk > b.risk ? 1 : -1)),
  };
  const outPath = path.resolve(__dirname, 'backup_precheck.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  console.log(`\n备份表总数=${results.length} 风险评级: SAFE=${byRisk.SAFE} LOW=${byRisk.LOW} CAUTION=${byRisk.CAUTION}`);
  console.log(`CAUTION（被核心表引用，DROP 前必须人工复核）: ${cautionTables.length ? cautionTables.join(', ') : '(无)'}`);
  console.log(`→ 写出 ${outPath}`);
})().catch(e => { console.error(e); process.exit(1); });
