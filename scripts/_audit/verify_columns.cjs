// 列级校验：逐表比对 生成文件中的列数 与 live information_schema 列数
// 用法: node scripts/_audit/verify_columns.cjs
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const SCHEMAS_DIR = path.resolve(__dirname, '..', '..', 'src', 'lib', 'db', 'schemas');

function countFileCols(src) {
  // 返回 { tableName: colCount }
  const out = {};
  const tblRe = /export\s+const\s+\w+\s*=\s*mysqlTable\(\s*'([\w]+)'\s*,\s*(?:\(t\)\s*=>\s*)?\{([\s\S]*?)\n\}\s*(?:,|\n)/g;
  let m;
  while ((m = tblRe.exec(src))) {
    const block = m[2];
    const lines = block.split('\n');
    let n = 0;
    for (const ln of lines) {
      if (/^\s{2}[\w$]+\s*:\s*[\w]+\(/.test(ln)) n++;
    }
    out[m[1]] = n;
  }
  return out;
}

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  const db = env.DB_NAME;

  // live 列数
  const [liveCols] = await conn.query(
    `SELECT TABLE_NAME, COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? GROUP BY TABLE_NAME`,
    [db]);
  const live = {};
  for (const r of liveCols) live[r.TABLE_NAME] = r.cnt;

  await conn.end();

  const files = fs.readdirSync(SCHEMAS_DIR).filter(f => f.startsWith('_gen_') && f.endsWith('.ts'));
  const mismatch = [];
  let total = 0;
  const fileCols = {};
  for (const f of files) {
    const src = fs.readFileSync(path.join(SCHEMAS_DIR, f), 'utf8');
    const cols = countFileCols(src);
    for (const [t, c] of Object.entries(cols)) {
      total++;
      fileCols[t] = c;
      const lv = live[t];
      if (lv === undefined) {
        mismatch.push({ file: f, table: t, fileCols: c, liveCols: 'MISSING_IN_LIVE' });
      } else if (c !== lv) {
        mismatch.push({ file: f, table: t, fileCols: c, liveCols: lv });
      }
    }
  }

  console.log('校验文件数:', files.length);
  console.log('校验表总数:', total);
  console.log('live 不在生成文件中的表数(忽略，非 _gen):', Object.keys(live).length - total);
  if (mismatch.length === 0) {
    console.log('✅ 所有生成表列数与 live 100% 一致');
  } else {
    console.log('❌ 不一致数:', mismatch.length);
    for (const x of mismatch) {
      console.log(`  ${x.file} :: ${x.table}  file=${x.fileCols} live=${x.liveCols}`);
    }
    process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(2); });
