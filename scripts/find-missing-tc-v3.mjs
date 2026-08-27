#!/usr/bin/env node
/**
 * Phase 3: Search ALL Chinese strings in the current codebase (string literals,
 * not just comments) and compute hashes to match missing tc() keys.
 * Also search git history more aggressively.
 */
import { execSync } from 'child_process';
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

// Step 1: Collect ALL tc() keys still in the codebase
const allTcKeys = new Set();
const fileHasKey = new Map(); // file → Set of keys

function scanForTcKeys(dir, relDir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relDir ? `${relDir}/${entry}` : entry;
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
        scanForTcKeys(fullPath, relPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        const content = readFileSync(fullPath, 'utf8');
        const tcRegex = /tc\(['"`](text_[a-z0-9]+)['"`]\)/g;
        let match;
        const keys = new Set();
        while ((match = tcRegex.exec(content)) !== null) {
          allTcKeys.add(match[1]);
          keys.add(match[1]);
        }
        if (keys.size > 0) {
          fileHasKey.set(relPath, keys);
        }
      }
    } catch { continue; }
  }
}

scanForTcKeys(join(projectRoot, 'src'), '');
console.log(`Found ${allTcKeys.size} unique tc() keys remaining`);

// Step 2: Search ALL Chinese strings in the current codebase
const keyToChinese = new Map();

function searchChineseStrings(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
        searchChineseStrings(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js') || entry.endsWith('.mjs')) {
        const content = readFileSync(fullPath, 'utf8');

        // Match single-quoted strings: '中文'
        const singleQuoteRegex = /'([^']*[\u4e00-\u9fa5]+[^']*)'/g;
        let m;
        while ((m = singleQuoteRegex.exec(content)) !== null) {
          const text = m[1];
          const key = `text_${simpleHash(text)}`;
          if (allTcKeys.has(key) && !keyToChinese.has(key)) {
            keyToChinese.set(key, text);
          }
        }

        // Match double-quoted strings: "中文"
        const doubleQuoteRegex = /"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g;
        while ((m = doubleQuoteRegex.exec(content)) !== null) {
          const text = m[1];
          const key = `text_${simpleHash(text)}`;
          if (allTcKeys.has(key) && !keyToChinese.has(key)) {
            keyToChinese.set(key, text);
          }
        }

        // Match template literals: `中文`
        const templateRegex = /`([^`]*[\u4e00-\u9fa5]+[^`]*)`/g;
        while ((m = templateRegex.exec(content)) !== null) {
          const text = m[1];
          const key = `text_${simpleHash(text)}`;
          if (allTcKeys.has(key) && !keyToChinese.has(key)) {
            keyToChinese.set(key, text);
          }
        }

        // Match Chinese in JSX text: >中文<
        const jsxRegex = />([^<]*[\u4e00-\u9fa5]+[^<]*)</g;
        while ((m = jsxRegex.exec(content)) !== null) {
          const text = m[1].trim();
          if (text && !text.includes('{') && !text.includes('}')) {
            const key = `text_${simpleHash(text)}`;
            if (allTcKeys.has(key) && !keyToChinese.has(key)) {
              keyToChinese.set(key, text);
            }
          }
        }

        // Match Chinese in comments
        const commentRegex = /\/\/\s*(.+?[\u4e00-\u9fa5]+.*?)$/gm;
        while ((m = commentRegex.exec(content)) !== null) {
          const text = m[1].trim();
          const key = `text_${simpleHash(text)}`;
          if (allTcKeys.has(key) && !keyToChinese.has(key)) {
            keyToChinese.set(key, text);
          }
        }
      }
    } catch { continue; }
  }
}

searchChineseStrings(join(projectRoot, 'src'));
searchChineseStrings(join(projectRoot, 'scripts'));
console.log(`Found ${keyToChinese.size} mappings from current codebase`);

// Step 3: Search git history more aggressively
// Get ALL unique Chinese strings from ALL commits
console.log('Searching git history (all commits)...');
try {
  // Get all commits
  const allCommits = execSync('git rev-list --all --no-merges', {
    cwd: projectRoot, encoding: 'utf8', timeout: 60000
  }).trim().split('\n');

  console.log(`Scanning ${allCommits.length} commits...`);

  for (let i = 0; i < allCommits.length; i++) {
    const commit = allCommits[i];
    if (!commit) continue;

    try {
      // Get all .ts/.tsx files in this commit
      const files = execSync(`git ls-tree -r --name-only ${commit} -- src/`, {
        cwd: projectRoot, encoding: 'utf8', timeout: 10000
      }).trim().split('\n');

      for (const file of files) {
        if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;

        let content;
        try {
          content = execSync(`git show ${commit}:${file}`, {
            cwd: projectRoot, encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024
          });
        } catch { continue; }

        // Extract Chinese strings
        const stringRegex = /['"`]([^'"`]*[\u4e00-\u9fa5]+[^'"`]*)['"`]/g;
        let m;
        while ((m = stringRegex.exec(content)) !== null) {
          const text = m[1];
          const key = `text_${simpleHash(text)}`;
          if (allTcKeys.has(key) && !keyToChinese.has(key)) {
            keyToChinese.set(key, text);
          }
        }

        // Also check JSX text
        const jsxRegex = />([^<]*[\u4e00-\u9fa5]+[^<]*)</g;
        while ((m = jsxRegex.exec(content)) !== null) {
          const text = m[1].trim();
          if (text && !text.includes('{') && !text.includes('}')) {
            const key = `text_${simpleHash(text)}`;
            if (allTcKeys.has(key) && !keyToChinese.has(key)) {
              keyToChinese.set(key, text);
            }
          }
        }
      }
    } catch { continue; }

    if ((i + 1) % 50 === 0) {
      console.log(`  Processed ${i + 1}/${allCommits.length} commits, ${keyToChinese.size} mappings found`);
    }
  }
} catch (err) {
  console.warn('Git history search error:', err.message?.substring(0, 200));
}

console.log(`Total mappings found: ${keyToChinese.size}`);

// Step 4: Apply mappings to fix tc() calls
let stats = { filesModified: 0, tcReplaced: 0, jsxReplaced: 0, stillMissing: new Set() };

for (const [relPath, keys] of fileHasKey) {
  const absPath = resolve(projectRoot, relPath);
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch { continue; }

  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Pattern 1: {tc('text_xxx')} → Chinese (JSX expression)
    const jsxTcRegex = /\{tc\(['"`](text_[a-z0-9]+)['"`]\)\}/g;
    let m;
    while ((m = jsxTcRegex.exec(line)) !== null) {
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
    jsxTcRegex.lastIndex = 0;

    // Pattern 2: tc('text_xxx') → 'Chinese' (string literal)
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

console.log('\n=== Phase 3 fix results ===');
console.log(`Files modified:     ${stats.filesModified}`);
console.log(`tc() replaced:      ${stats.tcReplaced}`);
console.log(`{tc()} replaced:    ${stats.jsxReplaced}`);
console.log(`Still missing:      ${stats.stillMissing.size}`);
if (stats.stillMissing.size > 0 && stats.stillMissing.size <= 50) {
  console.log(`Missing keys: ${[...stats.stillMissing].join(', ')}`);
}
console.log(`Total fixed:        ${stats.tcReplaced + stats.jsxReplaced}`);
