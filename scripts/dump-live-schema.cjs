#!/usr/bin/env node
/**
 * Read-only schema fact-base dumper.
 * 输出三份事实文件，供三层（DDL / 后端 / 前端）字段一致性审计使用：
 *   database/_live_columns.txt   table|column|type|nullable|default|key|extra|comment
 *   database/_live_fks.txt       table|column|ref_table|ref_column|constraint
 *   database/_live_fk_health.txt fk列空值/孤儿统计（外键引用空值问题专项）
 *
 * 只读，不改库。用法：node scripts/dump-live-schema.cjs
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const out = {};
  for (const f of ['.env', '.env.local']) {
    const p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'vnerpdacahng',
    charset: 'utf8mb4',
  });

  const outDir = path.resolve(process.cwd(), 'database');

  // 1) 所有表的所有列
  const [cols] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
            COLUMN_KEY, EXTRA, COLUMN_COMMENT, ORDINAL_POSITION
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [env.DB_NAME || 'vnerpdacahng']
  );
  const colLines = cols.map((c) =>
    [
      c.TABLE_NAME,
      c.COLUMN_NAME,
      c.COLUMN_TYPE,
      c.IS_NULLABLE,
      c.COLUMN_DEFAULT === null ? 'NULL' : String(c.COLUMN_DEFAULT),
      c.COLUMN_KEY || '',
      c.EXTRA || '',
      (c.COLUMN_COMMENT || '').replace(/[\r\n|]/g, ' '),
    ].join('|')
  );
  fs.writeFileSync(path.join(outDir, '_live_columns.txt'), colLines.join('\n'), 'utf8');

  // 2) 所有外键
  const [fks] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY TABLE_NAME, COLUMN_NAME`,
    [env.DB_NAME || 'vnerpdacahng']
  );
  const fkLines = fks.map((f) =>
    [f.TABLE_NAME, f.COLUMN_NAME, f.REFERENCED_TABLE_NAME, f.REFERENCED_COLUMN_NAME, f.CONSTRAINT_NAME].join('|')
  );
  fs.writeFileSync(path.join(outDir, '_live_fks.txt'), fkLines.join('\n'), 'utf8');

  // 3) 外键列健康度（空值 / 孤儿）
  const health = [];
  for (const fk of fks) {
    try {
      const [rows] = await conn.query(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN \`${fk.COLUMN_NAME}\` IS NULL THEN 1 ELSE 0 END) AS null_cnt,
           SUM(CASE WHEN \`${fk.COLUMN_NAME}\` = '' THEN 1 ELSE 0 END) AS empty_cnt,
           SUM(CASE WHEN \`${fk.COLUMN_NAME}\` = 0 THEN 1 ELSE 0 END) AS zero_cnt
         FROM \`${fk.TABLE_NAME}\``
      );
      const r = rows[0] || {};
      let orphan = 'n/a';
      try {
        const [o] = await conn.query(
          `SELECT COUNT(*) AS c FROM \`${fk.TABLE_NAME}\` t
           WHERE t.\`${fk.COLUMN_NAME}\` IS NOT NULL
             AND t.\`${fk.COLUMN_NAME}\` <> ''
             AND t.\`${fk.COLUMN_NAME}\` <> 0
             AND NOT EXISTS (SELECT 1 FROM \`${fk.REFERENCED_TABLE_NAME}\` p
                             WHERE p.\`${fk.REFERENCED_COLUMN_NAME}\` = t.\`${fk.COLUMN_NAME}\`)`
        );
        orphan = o[0] ? String(o[0].c) : '0';
      } catch (e) {
        orphan = 'err:' + (e.code || e.message).toString().slice(0, 30);
      }
      health.push(
        [
          fk.TABLE_NAME,
          fk.COLUMN_NAME,
          '->' + fk.REFERENCED_TABLE_NAME + '.' + fk.REFERENCED_COLUMN_NAME,
          'total=' + (r.total ?? '?'),
          'null=' + (r.null_cnt ?? 0),
          "empty='" + (r.empty_cnt ?? 0),
          'zero=0:' + (r.zero_cnt ?? 0),
          'orphan=' + orphan,
        ].join(' ')
      );
    } catch (e) {
      health.push([fk.TABLE_NAME, fk.COLUMN_NAME, '->' + fk.REFERENCED_TABLE_NAME, 'ERR', (e.code || e.message).toString().slice(0, 40)].join(' '));
    }
  }
  fs.writeFileSync(path.join(outDir, '_live_fk_health.txt'), health.join('\n'), 'utf8');

  await conn.end();
  console.log('tables/columns:', cols.length);
  console.log('fks:', fks.length);
  console.log('health rows:', health.length);
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
