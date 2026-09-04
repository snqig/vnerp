#!/usr/bin/env node
/**
 * F-011 / R4 类扫描：识别「SELECT 后 INSERT」的非原子写模式
 *
 * 风险：先 SELECT ... WHERE deleted=0 判断存在性，再 INSERT。
 *      在「软删行仍占唯一键」或并发场景下，会撞 Duplicate entry，导致整事务回滚。
 *      正确写法：INSERT ... ON DUPLICATE KEY UPDATE（原子处理 新建/累加/软删行复活）
 *
 * 只读扫描，不改任何数据。用法：node scripts/scan-select-then-insert.cjs [--verbose]
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SCAN_DIRS = ['src/app/api', 'src/application', 'src/infrastructure', 'src/lib', 'src/domain'];
const VERBOSE = process.argv.includes('--verbose');

/** 递归收集所有 .ts 文件 */
function walk(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(rel);
  }
  return out;
}

/** 提取 INSERT 的目标表名 */
function extractInsertTables(sql) {
  const tables = [];
  const re = /INSERT\s+(?:IGNORE\s+)?INTO\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi;
  let m;
  while ((m = re.exec(sql))) tables.push(m[1]);
  return tables;
}

/** 判断文件是否含「先 SELECT 再 INSERT 同一张表」的模式 */
function analyzeFile(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const lines = src.split('\n');

  // 收集所有 SELECT 与 INSERT 的位置及表名
  const events = [];
  lines.forEach((line, i) => {
    const up = line.toUpperCase();
    const selM = up.match(/\bSELECT\b[\s\S]*?\bFROM\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/);
    const insM = up.match(/\bINSERT\b/);
    if (selM) events.push({ kind: 'SELECT', table: selM[1], line: i + 1 });
    if (insM) {
      for (const t of extractInsertTables(line)) {
        events.push({ kind: 'INSERT', table: t, line: i + 1 });
      }
    }
  });

  // 已用 ON DUPLICATE KEY 的行号集合（视为已修复）
  const guarded = new Set();
  lines.forEach((line, i) => {
    if (/ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(line)) {
      // 向上回溯 6 行内的 INSERT 视为受保护
      for (let k = Math.max(0, i - 6); k <= i; k++) {
        if (/\bINSERT\b/i.test(lines[k])) guarded.add(k + 1);
      }
    }
  });

  // 找 SELECT(t) ... 之后紧跟 INSERT(t) 且未受保护
  const findings = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind !== 'INSERT' || guarded.has(e.line)) continue;
    const prior = events.slice(0, i).reverse().find((p) => p.kind === 'SELECT' && p.table === e.table);
    if (prior && e.line - prior.line <= 30) {
      findings.push({ table: e.table, selectLine: prior.line, insertLine: e.line });
    }
  }
  return findings;
}

function main() {
  const files = SCAN_DIRS.flatMap((d) => walk(d));
  const results = [];

  for (const f of files) {
    try {
      const found = analyzeFile(f);
      if (found.length) results.push({ file: f, findings: found });
    } catch (_) {
      /* 跳过读取失败 */
    }
  }

  console.log('===== R4 类「SELECT 后 INSERT」扫描 =====');
  console.log(`扫描文件: ${files.length} 个\n`);

  if (!results.length) {
    console.log('✅ 未发现「SELECT 后 INSERT」的非原子写模式。');
    return;
  }

  // 按表聚合，突出高频风险
  const byTable = new Map();
  for (const r of results) {
    for (const f of r.findings) {
      if (!byTable.has(f.table)) byTable.set(f.table, []);
      byTable.get(f.table).push(`${r.file}:${f.insertLine}`);
    }
  }

  console.log(`⚠️ 发现 ${results.length} 个文件存在风险模式，涉及 ${byTable.size} 张表：\n`);
  console.log('----- 按表聚合（高频优先） -----');
  [...byTable.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([t, locs]) => {
      console.log(`  ${t.padEnd(32)} ${String(locs.length).padStart(3)} 处`);
      if (VERBOSE) locs.forEach((l) => console.log(`      ${l}`));
    });

  console.log('\n----- 按文件明细 -----');
  for (const r of results) {
    console.log(`\n${r.file}`);
    r.findings.forEach((f) =>
      console.log(`   表 ${f.table}  SELECT@${f.selectLine} -> INSERT@${f.insertLine}`)
    );
  }

  console.log('\n----- 修复建议 -----');
  console.log('将「SELECT 判断存在 -> INSERT」改为原子 UPSERT：');
  console.log('  INSERT INTO t (k, v) VALUES (?, ?)');
  console.log('  ON DUPLICATE KEY UPDATE v = v + VALUES(v), deleted = 0, version = version + 1');
  console.log('\n注：本扫描为静态文本分析，存在误报。修复前请人工确认是否真的存在唯一键冲突风险。');
}

main();
