#!/usr/bin/env node
/**
 * codemod 一致性校验器 (verify-codemod-consistency)
 *
 * 用途（P0-2 防护）：i18n-codemod-p2.cjs 对单个文件做「两次独立写」——
 *   ① 改写 .tsx（中文 → ts('k_xxx')）；
 *   ② 把 k_xxx: '中文' 写入全部 4 个 locale 文件（messages/{zh-CN,en,vi,zh-TW}.json）。
 * 两步「非原子、非共校验」。若 messages 被回退而 .tsx 保留，调用点会引用 messages 中
 * 不存在的键 → 中文丢失（zh-CN 作为 fallback 基被回退时全语言裸 key）。
 *
 * 本脚本扫描 src 下所有 t()/tc()/ts('key') 调用，扁平化 messages/zh-CN.json，
 * 断言「每个被代码引用的键都存在于 zh-CN」；缺失即视为 messages 被回退的信号 → 退出码 1。
 *
 * 复用 i18n-key-check.mjs 的 BINDING_RE / CALL_RE / flatten 逻辑（此处直接复制三个符号，
 * 不 import 主脚本，避免其副作用 / 额外输出 / 依赖 argv 解析）。
 *
 * 用法：node scripts/verify-codemod-consistency.mjs [messagesPath]
 *   messagesPath  可选，默认 messages/zh-CN.json；破坏性自检时可传临时副本路径。
 *
 * 退出码：0 = 一致（代码引用的键均存在于 zh-CN）；1 = 存在缺失（疑似 messages 被回退）。
 * 纯扫描 + 断言，不写任何文件。
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const MESSAGES_PATH = process.argv[2] || join(projectRoot, 'messages', 'zh-CN.json');
const SRC_DIR = join(projectRoot, 'src');

// ---------- 复用的正则（同 i18n-key-check.mjs） ----------
// 绑定：const <alias> = useTranslations('<Namespace>') | getTranslations('<Namespace>')
const BINDING_RE = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:use|get)Translations\(\s*['"]([A-Za-z]+)['"]\s*\)/g;
// 调用：alias('key') / alias("key") / alias(`key`)，仅匹配已绑定别名（避免误判 toLocaleString / console.log）
const CALL_RE = /([A-Za-z_$][\w$]*)\(\s*['"`]([^'"`]+)['"`]\s*(?:,[^)]*)?\)/g;

// 扁平化对象为点键集合（不含命名空间前缀，与调用点相对键一致）
function flatten(obj, prefix, out = new Set()) {
  if (obj === null || typeof obj !== 'object') { if (prefix) out.add(prefix); return out; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : `${i}`, out)); return out; }
  for (const k of Object.keys(obj)) flatten(obj[k], prefix ? `${prefix}.${k}` : k, out);
  return out;
}

// ---------- 读取 zh-CN 并扁平化 ----------
function loadZhCN() {
  const raw = readFileSync(MESSAGES_PATH, 'utf8');
  const data = JSON.parse(raw); // 损坏会在此抛出
  const namespaces = {};
  for (const ns of Object.keys(data)) {
    // 扁平化为点键（支持嵌套），如 'consistency.typeLabels.workorder_completion'
    namespaces[ns] = new Set(flatten(data[ns] || {}, ''));
  }
  return { data, namespaces };
}

// ---------- 解析单个文件 ----------
function analyzeFile(absPath, relPath) {
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
    return { relPath, usedByNs: {}, skipped: 0, hasBinding: false };
  }
  const aliasRe = new RegExp(`^(?:${aliasNames.map(a => a.replace(/[$]/g, '\\$')).join('|')})$`);

  // 2. 找出所有 translation 调用，按别名归类
  const usedByNs = {}; // ns -> Set(key)
  let skipped = 0;
  let cm;
  CALL_RE.lastIndex = 0;
  while ((cm = CALL_RE.exec(content)) !== null) {
    const alias = cm[1];
    if (!aliasRe.test(alias)) continue; // 不是翻译别名
    const key = cm[2];
    const ns = aliasToNs[alias];
    // 动态拼接 key 跳过
    if (key.includes('${') || /[+]|['"`]/.test(key)) { skipped++; continue; }
    (usedByNs[ns] ||= new Set()).add(key);
  }

  return { relPath, usedByNs, skipped, hasBinding: true };
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
      const r = analyzeFile(full, relPath);
      if (r) out.push(r);
    }
  }
}

// ---------- 主流程 ----------
function main() {
  const { data, namespaces } = loadZhCN();
  const allFiles = [];
  walk(SRC_DIR, '', allFiles);

  // 全局 key 索引：key -> Set(命名空间)，用于"任意空间存在即有效"回退（与 i18n-key-check 一致）
  const globalKeyNs = new Map();
  for (const ns of Object.keys(namespaces)) {
    for (const k of namespaces[ns]) { // 已是扁平点键
      if (!globalKeyNs.has(k)) globalKeyNs.set(k, new Set());
      globalKeyNs.get(k).add(ns);
    }
  }

  const missing = []; // { file, ns, key, reason? }
  let totalUsed = 0;
  let skippedCount = 0;
  let filesWithBinding = 0;

  for (const f of allFiles) {
    if (f.hasBinding) filesWithBinding++;
    skippedCount += f.skipped;
    for (const [ns, keys] of Object.entries(f.usedByNs)) {
      // 命名空间在 messages 中不存在（如拼写错误 / 整个命名空间被回退）：直接判缺失
      if (!namespaces[ns]) {
        for (const k of keys) missing.push({ file: f.relPath, ns, key: k, reason: 'namespace-missing' });
        continue;
      }
      for (const k of keys) {
        totalUsed++;
        const inLocal = namespaces[ns].has(k);
        const inGlobal = globalKeyNs.has(k); // 任意空间存在即视为有效（绑定推断偏差兜底）
        // 局部空间有 -> 有效；局部没有但全局其他空间有 -> 视为有效
        if (!inLocal && !inGlobal) {
          missing.push({ file: f.relPath, ns, key: k });
        }
      }
    }
  }

  console.log('=== codemod 一致性校验（代码引用键 vs zh-CN） ===');
  console.log(`扫描文件: ${allFiles.length} (含绑定: ${filesWithBinding})`);
  console.log(`命名空间: ${Object.keys(namespaces).length} (messages: ${MESSAGES_PATH})`);
  console.log(`引用 key 数: ${totalUsed} (跳过动态 key: ${skippedCount})`);

  if (missing.length === 0) {
    console.log('\n✓ 一致性校验通过：所有代码引用的 i18n key 均存在于 zh-CN（无 messages 被回退迹象）');
    process.exit(0);
  }

  console.log(`\n✗ 发现 ${missing.length} 个「代码引用但 zh-CN 缺失」的 key（疑似 messages 被回退）：`);
  const byFile = {};
  for (const m of missing) (byFile[m.file] ||= []).push(m);
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`\n  ${file}`);
    for (const it of items) {
      const tag = it.reason === 'namespace-missing' ? ' [命名空间不存在]' : '';
      console.log(`    ${it.ns}.${it.key}${tag}`);
    }
  }
  process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('一致性校验执行失败:', err && err.stack ? err.stack : err);
  process.exit(2);
}
