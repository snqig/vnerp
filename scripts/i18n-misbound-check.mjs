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

const misbound = [];

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

    // Find which namespace actually has this key
    const candidates = [];
    for (const [cns, keyset] of Object.entries(namespaces)) {
      if (keyset.has(key)) candidates.push(cns);
    }
    if (candidates.length > 0) {
      const offset = content.substring(0, cm.index).split('\n').length;
      results.push({
        file: relPath,
        line: offset,
        key,
        boundNs: ns,
        actualNs: candidates.join(', '),
        snippet: content.substring(Math.max(0, cm.index - 30), cm.index + key.length + 10).replace(/\n/g, '\\n'),
      });
    }
  }
  return results.length > 0 ? results : null;
}

const allFiles = [];
walk(SRC_DIR, '', allFiles);

let total = 0;
const byFile = {};
for (const results of allFiles) {
  if (!results) continue;
  for (const r of results) {
    total++;
    (byFile[r.file] ||= []).push(r);
  }
}

console.log(`发现 ${total} 个 misbound key:\n`);
for (const [file, items] of Object.entries(byFile).sort()) {
  console.log(`  ${file}`);
  for (const it of items) {
    console.log(`    L${it.line}: ${it.boundNs}.${it.key} → 实际在 ${it.actualNs}`);
  }
}
console.log(`\n总计: ${total} 个 misbound key`);
