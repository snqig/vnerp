#!/usr/bin/env node
/**
 * 校验 src/app/api 下所有 Route Handler 内联 SQL 的可执行性。
 *
 * 背景：ERP 大量统计/列表接口把 SQL 直接写在 route.ts 里。一旦表名或列名与真实库不一致，
 * 这些接口不会在编译期报错，而是**运行期必然 500**（例如 `prod_work_order.updated_at`
 * 实际列名为 `update_time`）。本脚本把这些 SQL 抽出来逐条 EXPLAIN，在提交前拦住此类缺陷。
 *
 * 判定：
 *   - tables / columns 类错误 → 判定为缺陷，退出码 1
 *   - 语法错误                → 视为模板拼接产物，跳过（并计数），不计缺陷
 *
 * 用法：
 *   node scripts/validate-api-sql.mjs            # 校验
 *   node scripts/validate-api-sql.mjs --json     # 附带输出机器可读报告
 */

import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const ROOT = path.resolve(process.cwd());
const API_DIR = path.join(ROOT, 'src/app/api');
const OUT = path.join(ROOT, '.workbuddy/tmp/api-sql-report.json');

// 裸 node 不会像 Next.js 那样注入 .env，这里手动兜一层（已存在的环境变量优先，便于 CI 覆盖）
for (const file of ['.env.local', '.env']) {
  try {
    const raw = await fs.promises.readFile(path.join(ROOT, file), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      if (process.env[key] !== undefined) continue;
      process.env[key] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

// 连接信息优先走环境变量，便于 CI 里注入；缺省回落到本地开发库
const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
  charset: 'utf8mb4',
};

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/**
 * 从 route.ts 文本里抽取 SQL 片段。
 *
 * 只取反引号或单引号包裹、以 SELECT/WITH 开头且含 FROM 的片段；模板插值 `${...}` 去掉。
 *
 * 关键：会把 `'SELECT a FROM t' + ' WHERE x = 1'` 这类 **字符串拼接** 先合并成完整语句再校验。
 * 早期版本按单个引号区间切分，会把拼接式 SQL 断成半句（丢掉 FROM 子句），
 * 于是「列不存在」「表不存在」的错误其实是拼接产物 —— 产生大量误报。
 */
function extractSql(src) {
  const out = [];
  let work = src.replace(/\$\{[^}]*\}/g, '');

  // 收集所有引号区间（内容 + 起始下标），按出现顺序
  const spans = [];
  for (let i = 0; i < work.length; i++) {
    const q = work[i];
    if (q !== '`' && q !== "'") continue;
    let j = i + 1;
    while (j < work.length) {
      if (work[j] === '\\') { j += 2; continue; }
      if (work[j] === q) break;
      j++;
    }
    spans.push({ start: i, end: j, content: work.slice(i + 1, j) });
    i = j;
  }

  // 合并 `+` 连接的相邻引号区间
  const runs = [];
  for (const span of spans) {
    const prev = runs[runs.length - 1];
    const gap = work.slice(prev ? prev.end : 0, span.start);
    if (prev && /^\s*\+?\s*$/.test(gap)) prev.content += span.content;
    else runs.push({ content: span.content });
  }

  for (const run of runs) {
    let sql = run.content.trim();
    if (!/^(SELECT|WITH)\b/i.test(sql)) continue;
    if (sql.endsWith(';')) continue;
    if (!/\bFROM\b/i.test(sql)) continue; // 纯列片段 / 拼接残片，无法独立校验
    sql = sql.replace(/\?/g, "'x'");
    out.push(sql.trim());
  }
  return out;
}

let conn;
try {
  conn = await mysql.createConnection(cfg);
} catch (e) {
  console.error('[validate-api-sql] 无法连接数据库：' + (e.message || e));
  console.error('提示：本脚本直连 MySQL 做只读 EXPLAIN，请确认 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME。');
  process.exit(2);
}

const files = await walk(API_DIR);
const defects = [];
const skipped = [];
const ok = [];
const seen = new Set();

for (const f of files) {
  const src = await fs.promises.readFile(f, 'utf8');
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  for (const sql of extractSql(src)) {
    const key = rel + '||' + sql;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await conn.query('EXPLAIN ' + sql);
      ok.push({ file: rel, sql: sql.slice(0, 160) });
    } catch (e) {
      const msg = e.sqlMessage || e.message || '';
      if (/error in your SQL syntax/i.test(msg)) {
        skipped.push({ file: rel, reason: '模板/占位符产物，跳过', sql: sql.slice(0, 120) });
      } else if (/Unknown column/i.test(msg) || /Table '[^']+' doesn't exist/i.test(msg)) {
        defects.push({ file: rel, error: msg, sql: sql.slice(0, 200) });
      } else {
        skipped.push({ file: rel, reason: msg, sql: sql.slice(0, 120) });
      }
    }
  }
}

await conn.end();

console.log(`已校验 ${seen.size} 条内联 SQL（来自 ${files.length} 个 route 文件）`);
console.log(`  可执行  : ${ok.length}`);
console.log(`  跳过    : ${skipped.length}`);
console.log(`  缺陷    : ${defects.length}`);

if (defects.length) {
  console.log('\n=== 缺陷明细 ===');
  for (const d of defects) console.log(`  ${d.file}\n    ${d.error}\n    > ${d.sql}`);
}

if (process.argv.includes('--json')) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ok: ok.length, skipped: skipped.length, defects }, null, 2), 'utf8');
  console.log('\n报告已写入 ' + OUT);
}

process.exit(defects.length ? 1 : 0);
