// 校验：解析生成的 _gen_warehouse_missing.ts，逐表比对 live 列，确认 missing/extra=0
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const file = path.resolve(__dirname, '..', '..', 'src', 'lib', 'db', 'schemas', '_gen_warehouse_missing.ts');
const src = fs.readFileSync(file, 'utf8');
const chunks = src.split(/export const (\w+) = mysqlTable\('/).slice(1); // [name, body, name, body, ...]

const parsed = {};
for (let i = 0; i < chunks.length; i += 2) {
  const name = chunks[i];
  const body = chunks[i + 1];
  const tname = (body.match(/^([^']+)'/)||[])[1];
  if (!tname) continue;
  const cols = [];
  const re = /:\s*(?:int|bigint|smallint|mediumint|tinyint|varchar|char|decimal|float|double|text|date|datetime|timestamp|time|json|mysqlEnum)\(\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(body))) cols.push(m[1]);
  parsed[tname] = cols;
}

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  let bad = 0;
  for (const [t, drizzleCols] of Object.entries(parsed)) {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
      [env.DB_NAME, t]);
    const live = rows.map(r => r.COLUMN_NAME);
    const d = new Set(drizzleCols);
    const missing = live.filter(c => !d.has(c));
    const extra = drizzleCols.filter(c => !live.includes(c));
    const ok = missing.length === 0 && extra.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? '[OK]' : '[DIFF]'} ${t} (drizzle=${drizzleCols.length} live=${live.length})` +
      (missing.length ? ` MISSING:${missing.join(',')}` : '') +
      (extra.length ? ` EXTRA:${extra.join(',')}` : ''));
  }
  await conn.end();
  console.log(bad === 0 ? '\n>>> ALL 28 TABLES ALIGNED (missing=0/extra=0)' : `\n>>> ${bad} TABLES HAVE DRIFT`);
  process.exit(bad === 0 ? 0 : 2);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
