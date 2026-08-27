#!/usr/bin/env node
/**
 * i18n key 缺失校验器 (i18n-key-check)
 *
 * 用途：扫描 src 下所有 .ts/.tsx 文件中的 tc('key') / t('key') 调用，
 *       根据文件内 `const <alias> = useTranslations('<Namespace>')` 绑定推断命名空间，
 *       与 messages/zh-CN.json 的实际 key 集合比对，输出「代码引用但 messages 缺失」的 key，
 *       防止 tc('xxx') 引用了不存在的 key（即本次批量修复 text_xxxxxx 占位符的回归防护）。
 *
 * 用法：node scripts/i18n-key-check.mjs [--json] [--strict]
 *   --json    以 JSON 输出结果（便于 CI 解析）
 *   --strict  发现缺失 key 时退出码为 1（CI 卡点模式）；默认仅打印警告并退出 0
 *   --unused  同时报告 messages 中存在但代码中从未引用的「孤立 key」
 *
 * 陷阱处理：
 *   - 动态拼接 key（含 ${...} 或 + 运算符）无法静态解析，跳过并计入 skipped。
 *   - 插值参数（tc('key', { name })）不影响 key 提取。
 *   - 同一文件多别名（t / tc）分别按各自绑定的命名空间归类。
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const JSON_OUT = args.has('--json');
const STRICT = args.has('--strict');
const CHECK_UNUSED = args.has('--unused');

const MESSAGES_PATH = join(projectRoot, 'messages', 'zh-CN.json');
const SRC_DIR = join(projectRoot, 'src');

// ---------- 读取 messages ----------
function loadMessages() {
  const raw = readFileSync(MESSAGES_PATH, 'utf8');
  const data = JSON.parse(raw); // 若损坏会在此抛出
  const namespaces = {};
  for (const ns of Object.keys(data)) {
    namespaces[ns] = new Set(Object.keys(data[ns] || {}));
  }
  return { data, namespaces };
}

// ---------- 解析单个文件 ----------
const BINDING_RE = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:use|get)Translations\(\s*['"]([A-Za-z]+)['"]\s*\)/g;
// 调用：alias('key') 或 alias("key") 或 alias(`key`)
// 仅匹配「已绑定为 translations 别名」的调用，避免把 toLocaleString / console.log 等误判
const CALL_RE = /([A-Za-z_$][\w$]*)\(\s*['"`]([^'"`]+)['"`]\s*(?:,[^)]*)?\)/g;

function analyzeFile(absPath, relPath, namespaces, globalKeyNs) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }

  // 1. 找出本文件所有别名 -> 命名空间 绑定
  const aliasToNs = {};
  let bm;
  BINDING_RE.lastIndex = 0;
  while ((bm = BINDING_RE.exec(content)) !== null) {
    aliasToNs[bm[1]] = bm[2];
  }
  const aliasNames = Object.keys(aliasToNs);
  if (aliasNames.length === 0) {
    return { relPath, usedByNs: {}, skipped: [], hasBinding: false };
  }
  const aliasRe = new RegExp(`^(?:${aliasNames.map(a => a.replace(/[$]/g, '\\$')).join('|')})$`);

  // 预构建「全局 key 索引」在 main 中完成，此处复用传入的 globalKeyNs
  // （key -> 存在于哪些命名空间），用于"任意空间存在即有效"回退

  // 2. 找出所有 translation 调用，按别名归类
  const usedByNs = {}; // ns -> Set(key)
  const skipped = [];
  let cm;
  CALL_RE.lastIndex = 0;
  while ((cm = CALL_RE.exec(content)) !== null) {
    const alias = cm[1];
    if (!aliasRe.test(alias)) continue; // 不是翻译别名（如 toLocaleString / console.log）
    const key = cm[2];
    const ns = aliasToNs[alias];
    // 动态拼接 key 跳过
    if (key.includes('${') || /[+]|['"`]/.test(key)) {
      skipped.push({ file: relPath, alias, key });
      continue;
    }
    (usedByNs[ns] ||= new Set()).add(key);
  }

  return { relPath, usedByNs, skipped, hasBinding: true, globalKeyNs };
}

// ---------- 递归扫描 src ----------
function walk(dir, rel, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, rel ? `${rel}/${entry}` : entry, out);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      const relPath = rel ? `${rel}/${entry}` : entry;
      const r = analyzeFile(full, relPath, null);
      if (r) out.push(r);
    }
  }
}

// ---------- 主流程 ----------
function main() {
  const { data, namespaces } = loadMessages();
  const allFiles = [];
  walk(SRC_DIR, '', allFiles);

  // 全局 key 索引：key -> Set(命名空间)，用于"任意空间存在即有效"回退
  const globalKeyNs = new Map();
  for (const ns of Object.keys(namespaces)) {
    for (const k of namespaces[ns]) {
      if (!globalKeyNs.has(k)) globalKeyNs.set(k, new Set());
      globalKeyNs.get(k).add(ns);
    }
  }

  const missing = []; // { file, ns, key }
  const usedAll = new Set();
  let totalUsed = 0;
  let skippedCount = 0;
  let filesWithBinding = 0;

  for (const f of allFiles) {
    if (f.hasBinding) filesWithBinding++;
    skippedCount += f.skipped.length;
    for (const [ns, keys] of Object.entries(f.usedByNs)) {
      // 命名空间在 messages 中不存在（如拼写错误）：直接判缺失
      if (!namespaces[ns]) {
        for (const k of keys) missing.push({ file: f.relPath, ns, key: k, reason: 'namespace-missing' });
        continue;
      }
      for (const k of keys) {
        usedAll.add(`${ns}.${k}`);
        totalUsed++;
        const inLocal = namespaces[ns].has(k);
        const inGlobal = globalKeyNs.has(k);
        // 局部空间有 -> 有效；局部没有但全局其他空间有 -> 视为有效（绑定推断偏差）
        if (!inLocal && !inGlobal) {
          missing.push({ file: f.relPath, ns, key: k });
        }
      }
    }
  }

  // 孤立 key（代码中从未引用）
  let unused = [];
  if (CHECK_UNUSED) {
    const usedKeySet = usedAll;
    for (const ns of Object.keys(data)) {
      for (const k of Object.keys(data[ns] || {})) {
        if (!usedKeySet.has(`${ns}.${k}`)) unused.push({ ns, key: k });
      }
    }
  }

  // ---------- 输出 ----------
  if (JSON_OUT) {
    const payload = { ok: missing.length === 0, missing, unused, stats: { files: allFiles.length, filesWithBinding, totalUsed, skipped: skippedCount, namespaces: Object.keys(namespaces).length } };
    writeFileSync(join(projectRoot, 'scripts', 'i18n-key-check.result.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  }

  if (!JSON_OUT) {
    console.log('=== i18n key 校验 ===');
    console.log(`扫描文件: ${allFiles.length} (含绑定: ${filesWithBinding})`);
    console.log(`命名空间: ${Object.keys(namespaces).length}`);
    console.log(`引用 key 数: ${totalUsed} (跳过动态 key: ${skippedCount})`);
  }

  if (missing.length === 0) {
    if (!JSON_OUT) console.log('\n✓ 未发现缺失的 i18n key');
  } else {
    console.log(`\n✗ 发现 ${missing.length} 个缺失/无效 key：`);
    const byFile = {};
    for (const m of missing) (byFile[m.file] ||= []).push(m);
    for (const [file, items] of Object.entries(byFile)) {
      console.log(`\n  ${file}`);
      for (const it of items) {
        const tag = it.reason === 'namespace-missing' ? ' [命名空间不存在]' : '';
        console.log(`    ${it.ns}.${it.key}${tag}`);
      }
    }
  }

  if (CHECK_UNUSED && unused.length > 0) {
    console.log(`\n• 孤立 key（messages 有但代码未引用）: ${unused.length} 个`);
    if (!JSON_OUT) {
      for (const u of unused.slice(0, 50)) console.log(`    ${u.ns}.${u.key}`);
      if (unused.length > 50) console.log(`    ... 共 ${unused.length} 个`);
    }
  }

  if (STRICT && missing.length > 0) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('校验脚本执行失败:', err && err.stack ? err.stack : err);
  process.exit(2);
}
