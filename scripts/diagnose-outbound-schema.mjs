import mysql from 'mysql2/promise';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const c = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

console.log('=== inv_outbound_order 表结构 ===');
const [cols1] = await c.query(`SHOW COLUMNS FROM inv_outbound_order`);
console.table(cols1.map((r) => ({ Field: r.Field, Type: r.Type, Null: r.Null, Default: r.Default })));

console.log('\n=== inv_outbound_item 表结构 ===');
const [cols2] = await c.query(`SHOW COLUMNS FROM inv_outbound_item`);
console.table(cols2.map((r) => ({ Field: r.Field, Type: r.Type, Null: r.Null, Default: r.Default })));

console.log('\n=== generateDocumentNo 依赖：查 sys_document_sequence ===');
try {
  const [seq] = await c.query(`SELECT * FROM sys_document_sequence WHERE doc_type = 'outbound' LIMIT 5`);
  console.table(seq);
} catch (e) {
  console.log('查询失败:', e.message);
}

// 尝试找其他可能的 doc sequence 表
console.log('\n=== 所有含 sequence/document/no 的表 ===');
const [tables] = await c.query(
  `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME LIKE '%sequence%' OR TABLE_NAME LIKE '%document%' OR TABLE_NAME LIKE '%doc_no%')`
);
console.table(tables);

await c.end();
