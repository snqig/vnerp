#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const MESSAGES_PATH = join(projectRoot, 'messages', 'zh-CN.json');
const SRC_DIR = join(projectRoot, 'src');

const raw = readFileSync(MESSAGES_PATH, 'utf8');
const data = JSON.parse(raw);
const namespaces = {};
for (const ns of Object.keys(data)) {
  namespaces[ns] = new Set(Object.keys(data[ns] || {}));
}

const BINDING_RE = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:use|get)Translations\(\s*['"]([A-Za-z]+)['"]\s*\)/g;
const CALL_RE = /([A-Za-z_$][\w$]*)\(\s*['"`]([^'"`]+)['"`]\s*(?:,[^)]*)?\)/g;

function walk(dir, rel, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      walk(full, rel ? `${rel}/${entry}` : entry, out);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      const relPath = rel ? `${rel}/${entry}` : entry;
      const r = analyzeFile(full, relPath);
      if (r) out.push(r);
    }
  }
}

function analyzeFile(absPath, relPath) {
  let content;
  try { content = readFileSync(absPath, 'utf8'); } catch { return null; }

  const aliasToNs = {};
  let bm;
  BINDING_RE.lastIndex = 0;
  while ((bm = BINDING_RE.exec(content)) !== null) {
    aliasToNs[bm[1]] = bm[2];
  }
  const aliasNames = Object.keys(aliasToNs);
  if (aliasNames.length === 0) return null;
  const aliasRe = new RegExp(`^(?:${aliasNames.map(a => a.replace(/[$]/g, '\\$')).join('|')})$`);

  let cm;
  CALL_RE.lastIndex = 0;
  const results = [];
  while ((cm = CALL_RE.exec(content)) !== null) {
    const alias = cm[1];
    if (!aliasRe.test(alias)) continue;
    const key = cm[2];
    if (key.includes('${') || /[+]|['"`]/.test(key)) continue;
    const ns = aliasToNs[alias];
    const inLocal = namespaces[ns]?.has(key) ?? false;
    if (inLocal) continue;

    const candidates = [];
    for (const [cns, keyset] of Object.entries(namespaces)) {
      if (keyset.has(key)) candidates.push(cns);
    }
    if (candidates.length > 0) {
      const offset = content.substring(0, cm.index).split('\n').length;
      results.push({
        relPath, line: offset, key, boundNs: ns, actualNs: candidates,
      });
    }
  }
  return results.length > 0 ? results : null;
}

const allFiles = [];
walk(SRC_DIR, '', allFiles);

// Collect data
const typeA = new Map(); // key -> { files: set, actualNs: set }
const typeB = new Map(); // file -> [entries]
const sampleCommon = new Map(); // key -> files (for sample/orders using tc but key in SampleManagement)

for (const results of allFiles) {
  if (!results) continue;
  for (const r of results) {
    if (r.boundNs === 'Common') {
      // Type A: Common bound but key elsewhere
      if (!typeA.has(r.key)) typeA.set(r.key, { files: new Set(), actualNs: new Set() });
      typeA.get(r.key).files.add(r.relPath);
      r.actualNs.forEach(ns => typeA.get(r.key).actualNs.add(ns));

      // Special: sample orders using Common but should use SampleManagement
      if (r.relPath.startsWith('app/[locale]/sample/')) {
        if (!sampleCommon.has(r.key)) sampleCommon.set(r.key, new Set());
        sampleCommon.get(r.key).add(r.relPath);
      }
    } else {
      // Type B: Module bound but key elsewhere
      if (!typeB.has(r.relPath)) typeB.set(r.relPath, []);
      typeB.get(r.relPath).push(r);
    }
  }
}

// Output Type A summary
console.log('=== A类: Common 绑定但 key 在其他命名空间 ===');
console.log(`总计 ${typeA.size} 个唯一 key 需要添加到 Common:\n`);
const sortedA = [...typeA.entries()].sort((a, b) => b[1].files.size - a[1].files.size);
for (const [key, info] of sortedA) {
  console.log(`  ${key} (出现 ${info.files.size} 个文件, 实际在: ${[...info.actualNs].join(', ')})`);
  for (const f of info.files) console.log(`    - ${f}`);
}

// Output Type B summary
console.log(`\n\n=== B类: 模块绑定但 key 在其他命名空间 ===`);
let totalB = 0;
for (const [file, entries] of [...typeB.entries()].sort()) {
  console.log(`\n  ${file}`);
  for (const e of entries) {
    totalB++;
    console.log(`    L${e.line}: ${e.boundNs}.${e.key} → ${e.actualNs.join(', ')}`);
  }
}
console.log(`\n总计: TypeA=${typeA.size} 唯一key, TypeB=${totalB} 实例`);
