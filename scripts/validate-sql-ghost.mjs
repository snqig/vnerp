#!/usr/bin/env node
/**
 * 幽灵引用门禁：扫描 src/ 下**全部手写 SQL**（含 INSERT/UPDATE/DELETE），
 * 连库做只读 EXPLAIN，把「引用了库里不存在的表 / 列」的语句找出来。
 *
 * 与既有 validate-api-sql.mjs 的分工
 * ----------------------------------
 * 后者只扫 `src/app/api`、且只抽 `^(SELECT|WITH)` 开头片段 ——
 * 等于**完全不覆盖 INSERT/UPDATE**，也不覆盖 repositories / services / lib 里的手写 SQL。
 * 三个真实缺陷（MysqlWorkReportRepository / MysqlSalesOrderRepository /
 * MysqlReconciliationRepository 的 INSERT）正是从这里漏过去的：它们在
 * src/infrastructure/repositories，且都是 INSERT。
 * 本脚本补齐这两块，扫描范围是全 src。
 *
 * 为什么用 EXPLAIN 而不是正则匹配列名
 * ------------------------------------
 * 文本普查（早期探针）的误报率极高：`SELECT COUNT(*) AS total_orders FROM t` 里的
 * `total_orders` 是别名不是列；`row.fooBar` 这种经映射层取字段的写法也扫不到。
 * EXPLAIN 由 MySQL 自己做解析，不存在的列必然报 ER_BAD_FIELD_ERROR，误报为零。
 * 代价是要连库，所以 CI 里要注入 DB_* 环境变量。
 *
 * 前置条件（重要）：连的库必须是**结构完整**的，否则误报会把人淹没。
 * CI 里对应的是 `pnpm setup:db --schema=database/ci_schema.sql`
 * （默认那份 vnerpdacahng_schema.sql 只有 162 张表，库的 45%，
 *  实测会把引用缺失表的语句全部判成缺陷：2000+ 条误报）。
 *
 * 基线机制
 * --------
 * 存量缺陷有 140+ 条（幽灵表、早年种子脚本、未跑通的路径），一次性卡死所有人没意义。
 * 故把当前集合落基线，只拦**新增**：
 *   - 当前 ⊆ 基线        → 通过（修掉的会自动从基线子集中消失，不计为「新增」）
 *   - 当前 ⊄ 基线        → 失败，列出新增项
 * 修完一批想重新划线，跑 `--update-baseline` 显式刷新。
 *
 * 用法：
 *   node scripts/validate-sql-ghost.mjs                 # 检查
 *   node scripts/validate-sql-ghost.mjs --update-baseline   # 刷新基线（仅在缺陷确实修完后才跑）
 *   node scripts/validate-sql-ghost.mjs --json          # 机器可读报告
 *
 * 退出码：
 *   0 无新增缺陷
 *   1 有新增缺陷
 *   2 脚本自身跑不起来（连不上库 / 基线文件损坏），一律失败关闭
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(process.cwd());
const BASELINE = path.join(ROOT, 'scripts', 'baselines', 'sql-ghost-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');
const AS_JSON = process.argv.includes('--json');

for (const file of ['.env.local', '.env']) {
  try {
    const raw = await fs.promises.readFile(path.join(ROOT, file), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (process.env[m[1]] !== undefined) continue; // CI 注入优先
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

let conn;
try {
  const mysql = (await import('mysql2/promise')).default;
  conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
    charset: 'utf8mb4',
  });
} catch (e) {
  console.error('[validate-sql-ghost] 无法连接数据库：' + (e.message || e));
  console.error('提示：本脚本直连 MySQL 做只读 EXPLAIN，请确认 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME。');
  process.exit(2);
}

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
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/**
 * 抽取 SQL 片段，返回 { sql, line }。
 *
 * 与 validate-api-sql.mjs 相同的两处关键处理：
 *   ① 按引号区间切分，并合并 `+` 连接的相邻区间 —— 否则
 *      `'SELECT a FROM t' + ' WHERE x = 1'` 这种拼接式 SQL 会被断成半句，产生大量误报；
 *   ② 去掉模板插值 `${...}`，因为插值内容运行时才确定，静态 EXPLAIN 无意义。
 * 本脚本额外放宽开头关键字到 INSERT/UPDATE/DELETE（后者原本不覆盖）。
 */
function extractSql(src) {
  const out = [];
  const work = src.replace(/\$\{[^}]*\}/g, '');
  const lineAt = (idx) => work.slice(0, idx).split('\n').length;

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

  const runs = [];
  for (const span of spans) {
    const prev = runs[runs.length - 1];
    const gap = work.slice(prev ? prev.end : 0, span.start);
    if (prev && /^\s*\+?\s*$/.test(gap)) prev.content += span.content;
    else runs.push({ content: span.content, line: lineAt(span.start) });
  }

  for (const run of runs) {
    let sql = run.content.trim();
    if (!/^(SELECT|WITH|INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql)) continue;
    if (sql.endsWith(';')) continue;
    if (!/\b(FROM|VALUES|SET)\b/i.test(sql)) continue; // 拼接残片，无法独立校验
    sql = sql.replace(/\?/g, "'x'");
    out.push({ sql, line: run.line });
  }
  return out;
}

const files = await walk(path.join(ROOT, 'src'));

/** MySQL 自己报的「引用不存在」类错误；语法错误属于模板拼接产物，跳过不计缺陷 */
const REAL_BAD = /Unknown column|Unknown table|doesn't exist|no such table|ER_BAD_FIELD_ERROR|ER_NO_SUCH_TABLE/i;

const defects = [];
const skipped = [];
const seen = new Set();

for (const f of files) {
  const src = await fs.promises.readFile(f, 'utf8');
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  for (const { sql, line } of extractSql(src)) {
    const key = rel + '||' + sql;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await conn.query(`EXPLAIN ${sql}`);
    } catch (e) {
      const msg = String((e && e.message) || '');
      if (/syntax/i.test(msg)) { skipped.push({ file: rel, line, why: '语法错误（模板拼接产物，跳过）' }); continue; }
      if (!REAL_BAD.test(msg)) { skipped.push({ file: rel, line, why: msg.slice(0, 90) }); continue; }
      defects.push({
        file: rel,
        line,
        sql: sql.replace(/\s+/g, ' ').slice(0, 160),
        err: msg.slice(0, 160),
        hash: crypto.createHash('sha1').update(rel + '||' + sql).digest('hex').slice(0, 12),
      });
    }
  }
}

const currentHashes = new Set(defects.map((d) => d.hash));

if (UPDATE) {
  await fs.promises.mkdir(path.dirname(BASELINE), { recursive: true });
  await fs.promises.writeFile(
    BASELINE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        count: defects.length,
        // 只存 hash 不够定位，附带一行摘要供人 review；校验时只用 hash 集合
        items: defects.map((d) => ({ hash: d.hash, file: d.file, line: d.line, err: d.err })),
      },
      null,
      2
    )
  );
  console.log(`[validate-sql-ghost] 基线已刷新：${defects.length} 条 → ${path.relative(ROOT, BASELINE)}`);
  await conn.end();
  process.exit(0);
}

let baseline = { items: [] };
try {
  baseline = JSON.parse(await fs.promises.readFile(BASELINE, 'utf8'));
} catch {
  console.error(`[validate-sql-ghost] 基线文件缺失或损坏：${BASELINE}`);
  console.error('先跑一次 `node scripts/validate-sql-ghost.mjs --update-baseline` 建立基线。');
  await conn.end();
  process.exit(2);
}
const baselineHashes = new Set((baseline.items || []).map((i) => i.hash));

const added = defects.filter((d) => !baselineHashes.has(d.hash));
const fixed = (baseline.items || []).filter((i) => !currentHashes.has(i.hash));

const report = {
  scanned: files.length,
  current: defects.length,
  baseline: baselineHashes.size,
  added: added.length,
  fixed: fixed.length,
  addedItems: added,
  skipped: skipped.length,
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`[validate-sql-ghost] 扫描 ${files.length} 个 .ts/.tsx，SQL 片段 ${seen.size} 条`);
  console.log(`  当前缺陷 ${defects.length} 条 / 基线 ${baselineHashes.size} 条 / 修复 ${fixed.length} 条 / 跳过 ${skipped.length} 条`);
  if (added.length) {
    console.log(`\n【新增缺陷 ${added.length} 条】基线外的新增项，修掉或显式刷新基线:`);
    for (const d of added) {
      console.log(`  ${d.file}:${d.line}`);
      console.log(`      ${d.sql}`);
      console.log(`      → ${d.err}`);
    }
  }
  if (fixed.length) {
    console.log(`\n【已修好 ${fixed.length} 条】（不在新增之列；若确认全部修完，跑 --update-baseline 收窄基线）`);
    for (const i of fixed.slice(0, 20)) console.log(`  · ${i.file}:${i.line}  ${i.err}`);
    if (fixed.length > 20) console.log(`  …另有 ${fixed.length - 20} 条`);
  }
}

await conn.end();
if (added.length > 0) process.exit(1);
process.exit(0);
