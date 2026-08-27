// 全库 Drizzle 覆盖率发现（只读，不写库）
// 1) 枚举真实库全部表（information_schema）
// 2) 按域前缀分类，标记 _bak / _ghost_backup_ / backup 残留表
// 3) 从 src/lib/db/schemas/*.ts 提取 Drizzle 已建模表名
// 4) 输出覆盖率矩阵 + 候选清理清单
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SCHEMAS_DIR = path.resolve(__dirname, '..', '..', 'src/lib/db/schemas');
const db = env.DB_NAME;

function domainOf(t) {
  const i = t.indexOf('_');
  if (i === -1) return '(no_prefix)';
  return t.slice(0, i);
}
function isBackup(t) {
  // 捕获 inv_xxx_bak_20260817 / _bak_chain_ / _bak_inv_ 等日期戳备份，
  // 以及 _ghost_backup_ 系列；注意 "backup" 不含 "bak" 子串，需分别匹配
  return /_bak/i.test(t) || /_ghost_backup_/i.test(t) || /backup/i.test(t);
}

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: db,
  });

  const [rows] = await conn.query(
    `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME`, [db]);
  await conn.end();

  // 提取 Drizzle 已建模表名
  const modeled = new Set();
  for (const f of fs.readdirSync(SCHEMAS_DIR)) {
    if (!/\.(ts|tsx)$/.test(f)) continue;
    const src = fs.readFileSync(path.join(SCHEMAS_DIR, f), 'utf8');
    const re = /mysqlTable\(\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) modeled.add(m[1]);
  }

  const all = rows.map(r => r.TABLE_NAME);
  const byDomain = {};
  let backupTables = [];
  for (const t of all) {
    const d = domainOf(t);
    byDomain[d] = byDomain[d] || { total: 0, modeled: 0, tables: [] };
    byDomain[d].total++;
    const isM = modeled.has(t);
    if (isM) byDomain[d].modeled++;
    byDomain[d].tables.push({ name: t, modeled: isM, backup: isBackup(t) });
    if (isBackup(t)) backupTables.push(t);
  }

  const total = all.length;
  const totalModeled = all.filter(t => modeled.has(t)).length;
  const unmodeled = all.filter(t => !modeled.has(t));
  const unmodeledCore = unmodeled.filter(t => !isBackup(t));

  // 域级矩阵（按 total 降序）
  const matrix = Object.entries(byDomain)
    .map(([d, v]) => ({
      domain: d, total: v.total, modeled: v.modeled,
      coverage: v.total ? Math.round((v.modeled / v.total) * 100) : 0,
      unmodeled_core: v.tables.filter(t => !t.modeled && !t.backup).length,
      backups: v.tables.filter(t => t.backup).length,
    }))
    .sort((a, b) => b.total - a.total);

  const out = {
    db,
    generatedAt: new Date().toISOString(),
    totalTables: total,
    totalModeled,
    overallCoverage: Math.round((totalModeled / total) * 100),
    backupTables: backupTables.sort(),
    backupCount: backupTables.length,
    unmodeledCoreCount: unmodeledCore.length,
    unmodeledCoreTables: unmodeledCore.sort(),
    matrix,
  };

  const outPath = path.resolve(__dirname, 'coverage_discovery.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  console.log(`库=${db} 总表=${total} 已建模=${totalModeled} 覆盖率=${out.overallCoverage}%`);
  console.log(`残留备份表=${backupTables.length} 未建模核心表=${unmodeledCore.length}`);
  console.log('\n域矩阵:');
  console.log('domain'.padEnd(14), 'total'.padStart(6), 'modeled'.padStart(8), 'cov%'.padStart(6), 'unmdCore'.padStart(9), 'bak'.padStart(5));
  for (const r of matrix) {
    console.log(
      r.domain.padEnd(14),
      String(r.total).padStart(6),
      String(r.modeled).padStart(8),
      String(r.coverage).padStart(6),
      String(r.unmodeled_core).padStart(9),
      String(r.backups).padStart(5)
    );
  }
  console.log(`\n→ 写出 ${outPath}`);
})().catch(e => { console.error(e); process.exit(1); });
