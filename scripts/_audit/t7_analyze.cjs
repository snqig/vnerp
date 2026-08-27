// T7 分析器：比对 live 全部 FK 与 Drizzle 已声明 FK，求缺口（待补的跨域/自引用 FK）
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

// 解析反向 camel：customerId -> customer_id
const uncamel = (s) => s.replace(/([A-Z])/g, (_, c) => '_' + c.toLowerCase()).replace(/^_/, '');

function parseSchemas() {
  const reg = { tableNameToExport: {}, exportNameToTable: {} };
  const files = fs.readdirSync(SCHEMAS_DIR).filter(f => f.endsWith('.ts'));
  const declared = []; // { childTable, childCols:[], parentTable, parentCols:[] }
  for (const f of files) {
    const src = fs.readFileSync(path.join(SCHEMAS_DIR, f), 'utf8');
    // 表注册
    const tblRe = /export\s+const\s+(\w+)\s*=\s*mysqlTable\(\s*'([\w]+)'/g;
    const tblMap = {}; // exportName -> actualTable (本文件内)
    let m;
    while ((m = tblRe.exec(src))) { tblMap[m[1]] = m[2]; reg.tableNameToExport[m[2]] = m[1]; reg.exportNameToTable[m[1]] = m[2]; }
    // 逐表解析列定义与 FK（简化：按 mysqlTable 块切分）
    const blocks = src.split(/export\s+const\s+\w+\s*=\s*mysqlTable\(/);
    for (const blk of blocks.slice(1)) {
      const tblNameMatch = blk.match(/^\s*'([\w]+)'/);
      if (!tblNameMatch) continue;
      const tbl = tblNameMatch[1];
      // 列定义：  name: type('actual_col', ...)   -> 记录 name->actual
      const colMap = {};
      const colRe = /\n\s{2}([\w$]+)\s*:\s*\w+\(\s*'([\w]+)'/g;
      let cm;
      while ((cm = colRe.exec(blk))) colMap[cm[1]] = cm[2];
      // FK：foreignKey({ columns: [t.x, ...], foreignColumns: [exp.y, ...] })
      const fkRe = /foreignKey\(\{\s*columns:\s*\[([^\]]*)\]\s*,\s*foreignColumns:\s*\[([^\]]*)\]\s*\}/g;
      let fm;
      while ((fm = fkRe.exec(blk))) {
        const childCols = fm[1].split(',').map(s => s.trim().replace(/^t\./, '')).filter(Boolean).map(n => colMap[n] || uncamel(n));
        const refParts = fm[2].split(',').map(s => s.trim());
        // 取最后一个 . 之前为 export，之后为 col
        const parentExport = refParts[0].split('.').slice(0, -1).join('.');
        const parentColName = refParts[0].split('.').pop();
        const parentTable = reg.exportNameToTable[parentExport] || parentExport;
        // 父列属于父表，不能用本表 colMap 解析；标准 snake_case 用 uncamel 还原即可
        const parentCol = uncamel(parentColName);
        declared.push({ childTable: tbl, childCols, parentTable, parentCols: [parentCol] });
      }
    }
  }
  return { reg, declared };
}

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  const db = env.DB_NAME;
  const [fks] = await conn.query(
    `SELECT k.CONSTRAINT_NAME AS cname, k.TABLE_NAME AS child, k.COLUMN_NAME AS childCol,
            k.REFERENCED_TABLE_NAME AS parent, k.REFERENCED_COLUMN_NAME AS parentCol,
            r.DELETE_RULE AS onDel, r.UPDATE_RULE AS onUpd
     FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS r
       ON k.CONSTRAINT_NAME=r.CONSTRAINT_NAME AND k.TABLE_SCHEMA=r.CONSTRAINT_SCHEMA
     WHERE k.TABLE_SCHEMA=? AND k.REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`, [db]);
  await conn.end();

  const { reg, declared } = parseSchemas();

  // 建 declared 索引：child|childCols|parent|parentCols
  const key = (d) => `${d.child}|${d.childCols.join(',')}|${d.parentTable}|${d.parentCols.join(',')}`;
  const declaredSet = new Set(declared.map(key));

  const missing = [];
  const seenLive = new Set();
  for (const fk of fks) {
    const d = { cname: fk.cname, childTable: fk.child, childCols: [fk.childCol], parentTable: fk.parent, parentCols: [fk.parentCol], onDel: fk.onDel, onUpd: fk.onUpd };
    const kk = key(d);
    if (seenLive.has(kk)) continue;
    seenLive.add(kk);
    if (!declaredSet.has(kk)) missing.push(d);
  }

  // 统计 parent/child 是否都在 Drizzle 建模（应都在，因 100%）
  const notModeled = missing.filter(d => !reg.tableNameToExport[d.childTable] || !reg.tableNameToExport[d.parentTable]);

  console.log('live FK 总数(去重约束):', seenLive.size);
  console.log('Drizzle 已声明 FK 数:', declared.length);
  console.log('缺失(待补) FK 数:', missing.length);
  console.log('其中 parent/child 未建模(应 0):', notModeled.length);
  if (missing.length) {
    console.log('--- 缺失清单 ---');
    for (const d of missing) console.log(`  ${d.childTable}.${d.childCols.join(',')} -> ${d.parentTable}.${d.parentCols.join(',')} [${d.onDel}/${d.onUpd}]`);
  }
  // 写 json 供生成器使用
  fs.writeFileSync(path.join(__dirname, 't7_missing_fks.json'), JSON.stringify(missing, null, 2), 'utf8');
  console.log('已写出 t7_missing_fks.json');
})().catch(e => { console.error(e); process.exit(1); });
