// 解析编辑后的 warehouse.ts，与 live 复核对齐结果
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const src = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src/lib/db/schemas/warehouse.ts'), 'utf8');

// 提取每个 mysqlTable 的 表名 + 列名(第一个字符串参数)
const tables = {};
const re = /mysqlTable\(\s*['"]?([a-zA-Z_]+)['"]?\s*,\s*\{([\s\S]*?)\}\s*(?:,|\n\s*\))/g;
let m;
while ((m = re.exec(src))) {
  const tname = m[1];
  const body = m[2];
  const cols = [];
  const cre = /:\s*(?:bigint|int|tinyint|smallint|varchar|char|text|date|datetime|timestamp|decimal|double|float|boolean|json)\(\s*['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/g;
  let cm;
  while ((cm = cre.exec(body))) cols.push(cm[1]);
  tables[tname] = cols;
}

const modeled = Object.keys(tables);
(async () => {
  const conn = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME });
  let totalMissing = 0, totalExtra = 0, checked = 0;
  for (const t of modeled) {
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
      [env.DB_NAME, t]
    );
    const liveCols = rows.map(r => r.COLUMN_NAME);
    const d = new Set(tables[t]);
    const missing = liveCols.filter(c => !d.has(c));
    const extra = tables[t].filter(c => !liveCols.includes(c));
    totalMissing += missing.length; totalExtra += extra.length; checked++;
    const status = (missing.length || extra.length) ? 'DIFF' : 'OK';
    console.log(`  [${status}] ${t}: live=${liveCols.length} drizzle=${tables[t].length}`);
    if (missing.length) console.log('      MISSING in Drizzle: ' + missing.join(', '));
    if (extra.length)   console.log('      EXTRA in Drizzle:   ' + extra.join(', '));
  }
  console.log(`\n>>> checked=${checked} tables | TOTAL missing=${totalMissing} extra=${totalExtra}`);
  await conn.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
