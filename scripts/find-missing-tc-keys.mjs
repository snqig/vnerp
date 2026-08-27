#!/usr/bin/env node
/**
 * Search the entire codebase for Chinese strings that hash to the missing tc keys.
 * Also check git history diffs for replaced Chinese → tc() conversions.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname, relative } from 'path';
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

// Step 1: Collect all missing keys from remaining tc() calls
console.log('Scanning for remaining tc() calls...');
const missingKeys = new Set();

function scanFile(absPath, relPath) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return;
  }

  // Find all tc('text_xxx') and {tc('text_xxx')} calls
  const tcRegex = /tc\(['"`](text_[a-z0-9]+)['"`]\)/g;
  let match;
  while ((match = tcRegex.exec(content)) !== null) {
    missingKeys.add(match[1]);
  }
}

// Recursively scan src/ directory
function scanDir(dir, relDir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relDir ? `${relDir}/${entry}` : entry;
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
        scanDir(fullPath, relPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        scanFile(fullPath, relPath);
      }
    } catch {
      continue;
    }
  }
}

scanDir(join(projectRoot, 'src'), '');
console.log(`Found ${missingKeys.size} unique tc() keys in codebase`);

// Step 2: Search ALL git history for these keys
// git log -p shows diffs. When tc('text_xxx') was ADDED, the Chinese was REMOVED.
// The diff will show: -'中文' and +tc('text_xxx')
console.log('Searching git history for original Chinese strings...');

const keyToChinese = new Map();
const allKeys = [...missingKeys].join('|');

// Search git history diffs for all keys at once
try {
  // Use git log -p to get all diffs, then search for the pattern
  // Pattern: a line with Chinese that was REMOVED (-'中文') followed by a line with tc('text_xxx') ADDED
  const diffOutput = execSync(
    `git log -p --all --no-merges --diff-filter=AM -S "tc('text_" -- "src/" | Select-String "^[+-].*(tc\\('text_|[\\u4e00-\\u9fa5])"`,
    { cwd: projectRoot, encoding: 'utf8', timeout: 120000, maxBuffer: 50 * 1024 * 1024, shell: 'powershell' }
  );

  // Parse the diff output to find -'中文' / +tc('text_xxx') pairs
  const lines = diffOutput.split('\n');
  let lastRemovedChinese = null;

  for (const line of lines) {
    // Check for removed Chinese string: -'中文' or -"中文" or -`中文`
    const removedMatch = line.match(/^-(?:.*?['"`])([^'"`]*[\u4e00-\u9fa5]+[^'"`]*)['"`]/);
    if (removedMatch) {
      lastRemovedChinese = removedMatch[1];
    }

    // Check for added tc('text_xxx'): +tc('text_xxx')
    const addedMatch = line.match(/^\+.*tc\(['"`](text_[a-z0-9]+)['"`]\)/);
    if (addedMatch && lastRemovedChinese) {
      const key = addedMatch[1];
      const expectedKey = `text_${simpleHash(lastRemovedChinese)}`;
      if (key === expectedKey) {
        if (!keyToChinese.has(key)) {
          keyToChinese.set(key, lastRemovedChinese);
        }
      }
    }

    // Also check for removed JSX text: ->中文< followed by +{tc('text_xxx')}
    const removedJsxMatch = line.match(/^-\s*(?:>)?\s*([^<\n]*[\u4e00-\u9fa5]+[^<\n]*)\s*<?/);
    if (removedJsxMatch) {
      const chineseText = removedJsxMatch[1].trim();
      if (chineseText && !chineseText.includes('//') && !chineseText.includes('tc(')) {
        lastRemovedChinese = chineseText;
      }
    }
  }
} catch (err) {
  console.warn('Git history search had an error:', err.message?.substring(0, 200));
}

console.log(`Found ${keyToChinese.size} key→Chinese mappings from git diffs`);

// Step 3: Also search current codebase for Chinese strings (in comments, etc.)
// that might match missing keys
const srcDir = join(projectRoot, 'src');
function searchChineseInDir(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        searchChineseInDir(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        const content = readFileSync(fullPath, 'utf8');
        // Search for Chinese strings in comments
        const commentRegex = /\/\/\s*(.+?[\u4e00-\u9fa5]+.*?)$/gm;
        let match;
        while ((match = commentRegex.exec(content)) !== null) {
          const text = match[1].trim();
          const key = `text_${simpleHash(text)}`;
          if (missingKeys.has(key) && !keyToChinese.has(key)) {
            keyToChinese.set(key, text);
          }
        }
      }
    } catch {
      continue;
    }
  }
}
searchChineseInDir(srcDir);
console.log(`After scanning comments: ${keyToChinese.size} mappings`);

// Step 4: Apply the mappings to fix remaining tc() calls
let stats = { filesModified: 0, tcReplaced: 0, jsxReplaced: 0, stillMissing: new Set() };

function fixFile(absPath, relPath) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return;
  }

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

function fixDir(dir, relDir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relDir ? `${relDir}/${entry}` : entry;
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
        fixDir(fullPath, relPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        fixFile(fullPath, relPath);
      }
    } catch {
      continue;
    }
  }
}

fixDir(join(projectRoot, 'src'), '');

console.log('\n=== Phase 2 fix results ===');
console.log(`Files modified:     ${stats.filesModified}`);
console.log(`tc() replaced:      ${stats.tcReplaced}`);
console.log(`{tc()} replaced:    ${stats.jsxReplaced}`);
console.log(`Still missing:      ${stats.stillMissing.size}`);
if (stats.stillMissing.size > 0) {
  console.log(`Missing keys: ${[...stats.stillMissing].slice(0, 30).join(', ')}`);
}
console.log(`Total fixed:        ${stats.tcReplaced + stats.jsxReplaced}`);
