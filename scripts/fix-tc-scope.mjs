#!/usr/bin/env node
/**
 * 修复 module-scope tc() 调用：
 * 1. 运行 tsc --noEmit 获取 "Cannot find name 'tc'" 错误行
 * 2. 对每个文件，用 git log -S 找到引入 tc() 的 commit
 * 3. 从 parent commit 提取原始中文字符串
 * 4. 用 simpleHash 匹配 text_xxx → 中文
 * 5. 仅替换 tsc 报错的行上的 tc() 调用
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Replicate the simpleHash from eslint-rules/no-chinese-hardcode.js
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

// Step 1: Run tsc and parse "Cannot find name 'tc'" errors
console.log('Running tsc --noEmit to find tc scope errors...');
let tscOutput;
try {
  tscOutput = execSync('npx tsc --noEmit 2>&1', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  // tsc exits with 1 when there are type errors — that's expected
  tscOutput = err.stdout || err.stderr || '';
}

const errorRegex = /^(.+?)\((\d+),\d+\): error TS2304: Cannot find name 'tc'/;
const fileErrors = new Map(); // file → Set of line numbers

for (const line of tscOutput.split('\n')) {
  const match = line.match(errorRegex);
  if (!match) continue;
  const [, file, lineStr] = match;
  const lineNum = parseInt(lineStr, 10);
  if (!fileErrors.has(file)) {
    fileErrors.set(file, new Set());
  }
  fileErrors.get(file).add(lineNum);
}

console.log(`Found ${fileErrors.size} files with tc scope errors`);

// Step 2: For each file, find the commit that introduced tc() calls
// and extract Chinese strings from the parent commit
const globalKeyMap = new Map(); // text_xxx → Chinese string
let filesProcessed = 0;
let keysFound = 0;

for (const [relFile, errorLines] of fileErrors) {
  const absFile = resolve(projectRoot, relFile);

  // Find the commit that introduced tc('text_ in this file
  let commit;
  try {
    const logOutput = execSync(
      `git log -S "tc('text_" --oneline --format="%H" -- "${relFile}"`,
      { cwd: projectRoot, encoding: 'utf8', timeout: 30000 }
    ).trim();
    commit = logOutput.split('\n')[0].trim();
  } catch {
    // Try with backtick syntax
    try {
      const logOutput = execSync(
        `git log -S "tc(\`text_" --oneline --format="%H" -- "${relFile}"`,
        { cwd: projectRoot, encoding: 'utf8', timeout: 30000 }
      ).trim();
      commit = logOutput.split('\n')[0].trim();
    } catch {
      console.warn(`  Could not find tc() commit for ${relFile}`);
      continue;
    }
  }

  if (!commit) {
    console.warn(`  No tc() commit found for ${relFile}`);
    continue;
  }

  // Get the parent version of the file
  let oldContent;
  try {
    oldContent = execSync(
      `git show ${commit}~1:${relFile}`,
      { cwd: projectRoot, encoding: 'utf8', timeout: 30000, maxBuffer: 5 * 1024 * 1024 }
    );
  } catch {
    // File might not exist in parent commit, try the commit itself
    try {
      oldContent = execSync(
        `git show ${commit}:${relFile}`,
        { cwd: projectRoot, encoding: 'utf8', timeout: 30000, maxBuffer: 5 * 1024 * 1024 }
      );
    } catch {
      console.warn(`  Could not get old version of ${relFile}`);
      continue;
    }
  }

  // If old content already has tc(), we need to go further back
  if (oldContent.includes("tc('text_") || oldContent.includes('tc(`text_')) {
    // Try to find an even older version without tc()
    try {
      const allCommits = execSync(
        `git log --oneline --format="%H" -- "${relFile}"`,
        { cwd: projectRoot, encoding: 'utf8', timeout: 30000 }
      ).trim().split('\n');

      for (const c of allCommits.reverse()) {
        try {
          const content = execSync(
            `git show ${c}:${relFile}`,
            { cwd: projectRoot, encoding: 'utf8', timeout: 30000, maxBuffer: 5 * 1024 * 1024 }
          );
          if (!content.includes("tc('text_") && !content.includes('tc(`text_')) {
            oldContent = content;
            break;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Use what we have
    }
  }

  // Extract Chinese strings from the old version
  // Match single-quoted, double-quoted strings containing Chinese
  const stringRegex = /['"]([^'"]*[\u4e00-\u9fa5]+[^'"]*)['"]/g;
  let match;
  while ((match = stringRegex.exec(oldContent)) !== null) {
    const chineseText = match[1];
    const key = `text_${simpleHash(chineseText)}`;
    if (!globalKeyMap.has(key)) {
      globalKeyMap.set(key, chineseText);
      keysFound++;
    }
  }

  // Also match JSX text (between > and <)
  const jsxRegex = />([^<]{1,200}[\u4e00-\u9fa5]+[^<]{0,200})</g;
  while ((match = jsxRegex.exec(oldContent)) !== null) {
    const chineseText = match[1].trim();
    if (chineseText && !chineseText.includes('{') && !chineseText.includes('}')) {
      const key = `text_${simpleHash(chineseText)}`;
      if (!globalKeyMap.has(key)) {
        globalKeyMap.set(key, chineseText);
        keysFound++;
      }
    }
  }

  // Also match template literals with Chinese
  const templateRegex = /`([^`]*[\u4e00-\u9fa5]+[^`]*)`/g;
  while ((match = templateRegex.exec(oldContent)) !== null) {
    const chineseText = match[1];
    const key = `text_${simpleHash(chineseText)}`;
    if (!globalKeyMap.has(key)) {
      globalKeyMap.set(key, chineseText);
      keysFound++;
    }
  }

  filesProcessed++;
}

console.log(`Processed ${filesProcessed} files, found ${keysFound} key→Chinese mappings`);

// Step 3: Replace tc('text_xxx') calls on error lines with Chinese strings
let stats = {
  filesModified: 0,
  tcReplaced: 0,
  jsxReplaced: 0,
  keysNotFound: new Set(),
};

for (const [relFile, errorLines] of fileErrors) {
  const absFile = resolve(projectRoot, relFile);
  let content;
  try {
    content = readFileSync(absFile, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    if (!errorLines.has(lineNum)) continue;

    let line = lines[i];

    // Pattern 1: {tc('text_xxx')} → Chinese (JSX expression)
    const jsxTcRegex = /\{tc\(['"`](text_[a-z0-9]+)['"`]\)\}/g;
    let jsxMatch;
    while ((jsxMatch = jsxTcRegex.exec(line)) !== null) {
      const key = jsxMatch[1];
      const chinese = globalKeyMap.get(key);
      if (chinese) {
        line = line.replace(jsxMatch[0], chinese);
        modified = true;
        stats.jsxReplaced++;
      } else {
        stats.keysNotFound.add(key);
      }
    }

    // Pattern 2: tc('text_xxx') → 'Chinese' (string literal)
    const tcRegex = /tc\(['"`](text_[a-z0-9]+)['"`]\)/g;
    let tcMatch;
    while ((tcMatch = tcRegex.exec(line)) !== null) {
      const key = tcMatch[1];
      const chinese = globalKeyMap.get(key);
      if (chinese) {
        // Check if the Chinese text contains single quotes
        if (chinese.includes("'")) {
          line = line.replace(tcMatch[0], `"${chinese}"`);
        } else {
          line = line.replace(tcMatch[0], `'${chinese}'`);
        }
        modified = true;
        stats.tcReplaced++;
      } else {
        stats.keysNotFound.add(key);
      }
    }

    // Reset regex lastIndex
    jsxTcRegex.lastIndex = 0;
    tcRegex.lastIndex = 0;

    lines[i] = line;
  }

  if (modified) {
    writeFileSync(absFile, lines.join('\n'));
    stats.filesModified++;
  }
}

console.log('\n=== tc scope fix results ===');
console.log(`Files modified:     ${stats.filesModified}`);
console.log(`tc() replaced:      ${stats.tcReplaced}`);
console.log(`{tc()} replaced:    ${stats.jsxReplaced}`);
console.log(`Keys not found:     ${stats.keysNotFound.size}`);
if (stats.keysNotFound.size > 0) {
  console.log(`Missing keys: ${[...stats.keysNotFound].slice(0, 20).join(', ')}`);
}
console.log(`Total fixed:        ${stats.tcReplaced + stats.jsxReplaced}`);
