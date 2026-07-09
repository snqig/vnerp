#!/usr/bin/env node
/**
 * Quick fix: search current codebase for ALL Chinese strings,
 * compute hashes, match against tc() keys, and apply.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

// Collect all tc() keys and their locations
const allTcKeys = new Set();
const fileKeys = new Map();

function walkDir(dir, fn) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry)) continue;
        walkDir(fullPath, fn);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        fn(fullPath);
      }
    } catch { continue; }
  }
}

// Step 1: Find all tc() keys
walkDir(join(projectRoot, 'src'), (absPath) => {
  const content = readFileSync(absPath, 'utf8');
  const tcRegex = /tc\(['"`](text_[a-z0-9]+)['"`]\)/g;
  let match;
  const keys = new Set();
  while ((match = tcRegex.exec(content)) !== null) {
    allTcKeys.add(match[1]);
    keys.add(match[1]);
  }
  if (keys.size > 0) {
    fileKeys.set(absPath, keys);
  }
});
console.log(`Found ${allTcKeys.size} unique tc() keys`);

// Step 2: Search ALL Chinese strings in codebase (including .js, .mjs, .json)
const keyToChinese = new Map();

function extractChinese(content) {
  const results = [];
  // Single-quoted strings
  let m;
  const sq = /'([^']*[\u4e00-\u9fa5]+[^']*)'/g;
  while ((m = sq.exec(content)) !== null) results.push(m[1]);
  // Double-quoted strings
  const dq = /"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g;
  while ((m = dq.exec(content)) !== null) results.push(m[1]);
  // Template literals
  const tl = /`([^`]*[\u4e00-\u9fa5]+[^`]*)`/g;
  while ((m = tl.exec(content)) !== null) results.push(m[1]);
  // JSX text
  const jsx = />([^<]*[\u4e00-\u9fa5]+[^<]*)</g;
  while ((m = jsx.exec(content)) !== null) {
    const text = m[1].trim();
    if (text && !text.includes('{') && !text.includes('}')) results.push(text);
  }
  // Comments
  const cmt = /\/\/\s*(.+?[\u4e00-\u9fa5]+.*?)$/gm;
  while ((m = cmt.exec(content)) !== null) results.push(m[1].trim());
  // Block comments
  const bc = /\/\*([^]*?[\u4e00-\u9fa5]+[^]*?)\*\//g;
  while ((m = bc.exec(content)) !== null) {
    // Extract individual Chinese phrases from block comments
    const phrases = m[1].match(/[\u4e00-\u9fa5]+[^*]*?/g);
    if (phrases) {
      for (const p of phrases) {
        results.push(p.trim());
      }
    }
  }
  return results;
}

function searchAllFiles(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry)) continue;
        searchAllFiles(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js') || entry.endsWith('.mjs')) {
        const content = readFileSync(fullPath, 'utf8');
        const chineseStrings = extractChinese(content);
        for (const text of chineseStrings) {
          const key = `text_${simpleHash(text)}`;
          if (allTcKeys.has(key) && !keyToChinese.has(key)) {
            keyToChinese.set(key, text);
          }
        }
      }
    } catch { continue; }
  }
}

searchAllFiles(join(projectRoot, 'src'));
searchAllFiles(join(projectRoot, 'scripts'));
// Also search messages directory
try {
  searchAllFiles(join(projectRoot, 'messages'));
} catch {}
// Also search docs
try {
  searchAllFiles(join(projectRoot, 'docs'));
} catch {}

console.log(`Found ${keyToChinese.size} key→Chinese mappings`);

// Step 3: Apply mappings
let stats = { filesModified: 0, tcReplaced: 0, jsxReplaced: 0, stillMissing: new Set() };

for (const [absPath, keys] of fileKeys) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch { continue; }

  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // {tc('text_xxx')} → Chinese
    const jsxRegex = /\{tc\(['"`](text_[a-z0-9]+)['"`]\)\}/g;
    let m;
    while ((m = jsxRegex.exec(line)) !== null) {
      const key = m[1];
      const chinese = keyToChinese.get(key);
      if (chinese) {
        line = line.replace(m[0], chinese);
        modified = true;
        stats.jsxReplaced++;
      } else {
        stats.stillMissing.add(key);
      }
    }
    jsxRegex.lastIndex = 0;

    // tc('text_xxx') → 'Chinese'
    const tcRegex = /tc\(['"`](text_[a-z0-9]+)['"`]\)/g;
    while ((m = tcRegex.exec(line)) !== null) {
      const key = m[1];
      const chinese = keyToChinese.get(key);
      if (chinese) {
        if (chinese.includes("'")) {
          line = line.replace(m[0], `"${chinese}"`);
        } else {
          line = line.replace(m[0], `'${chinese}'`);
        }
        modified = true;
        stats.tcReplaced++;
      } else {
        stats.stillMissing.add(key);
      }
    }
    tcRegex.lastIndex = 0;

    lines[i] = line;
  }

  if (modified) {
    writeFileSync(absPath, lines.join('\n'));
    stats.filesModified++;
  }
}

console.log('\n=== Quick fix results ===');
console.log(`Files modified:     ${stats.filesModified}`);
console.log(`tc() replaced:      ${stats.tcReplaced}`);
console.log(`{tc()} replaced:    ${stats.jsxReplaced}`);
console.log(`Still missing:      ${stats.stillMissing.size}`);
if (stats.stillMissing.size > 0 && stats.stillMissing.size <= 100) {
  console.log(`Missing keys: ${[...stats.stillMissing].join(', ')}`);
}
console.log(`Total fixed:        ${stats.tcReplaced + stats.jsxReplaced}`);
