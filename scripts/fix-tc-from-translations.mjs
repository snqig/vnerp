/**
 * Fix remaining module-scope tc() errors by looking up keys in translation files.
 * tc = useTranslations('Common'), so tc('text_xxx') resolves to Common.text_xxx
 * in messages/zh-CN.json. At module scope, tc is undefined, so we replace with
 * the Chinese literal from the translation file.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve('.');
const messagesPath = resolve(projectRoot, 'messages/zh-CN.json');

// Load translations (Common namespace)
const messages = JSON.parse(readFileSync(messagesPath, 'utf8'));
const common = messages.Common || {};
console.log(`Loaded ${Object.keys(common).length} keys from Common namespace`);

// Build key -> chinese map
const keyToChinese = {};
for (const [key, value] of Object.entries(common)) {
  if (typeof value === 'string') {
    keyToChinese[key] = value;
  }
}

// Run tsc to get errors
let tscOutput;
try {
  tscOutput = execSync('npx tsc --noEmit 2>&1', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 20 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  tscOutput = err.stdout || err.stderr || '';
}

// Parse tsc errors for "Cannot find name 'tc'"
// Format: path(line,col): error TS2304: Cannot find name 'tc'.
const errorRegex = /^(.+?)\((\d+),(\d+)\): error TS2304: Cannot find name 'tc'\./gm;
const fileErrors = new Map(); // file -> Set of line numbers
let match;
while ((match = errorRegex.exec(tscOutput)) !== null) {
  const file = match[1];
  const line = parseInt(match[2], 10);
  if (!fileErrors.has(file)) {
    fileErrors.set(file, new Set());
  }
  fileErrors.get(file).add(line);
}

console.log(`Found tc errors in ${fileErrors.size} files`);

let totalReplaced = 0;
let totalNotFound = 0;
let totalAlreadyFixed = 0;
const notFoundKeys = [];

// tc() call patterns:
// Pattern 1: tc('text_xxx')  -> '中文字面量'
// Pattern 2: {tc('text_xxx')} -> 中文字面量  (JSX, but at module scope this is unusual)
const tcCallRegex = /\bt\s*c\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const [relFile, errorLines] of fileErrors) {
  const fullPath = resolve(projectRoot, relFile);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch {
    console.log(`SKIP (not found): ${relFile}`);
    continue;
  }

  const lines = content.split('\n');
  let fileReplaced = 0;
  let fileNotFound = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    if (!errorLines.has(lineNum)) continue;

    const line = lines[i];
    // Find all tc() calls on this line
    let lineModified = false;
    lines[i] = line.replace(tcCallRegex, (full, key) => {
      if (keyToChinese[key] !== undefined) {
        fileReplaced++;
        totalReplaced++;
        lineModified = true;
        const chinese = keyToChinese[key];
        // Escape single quotes
        return `'${chinese.replace(/'/g, "\\'")}'`;
      } else {
        fileNotFound++;
        totalNotFound++;
        if (!notFoundKeys.includes(key)) {
          notFoundKeys.push(key);
        }
        return full; // leave as-is
      }
    });
  }

  if (fileReplaced > 0) {
    writeFileSync(fullPath, lines.join('\n'), 'utf8');
    console.log(`FIXED ${relFile}: ${fileReplaced} replaced, ${fileNotFound} not found`);
  } else if (fileNotFound > 0) {
    console.log(`PARTIAL ${relFile}: 0 replaced, ${fileNotFound} not found`);
  } else {
    totalAlreadyFixed++;
  }
}

console.log('\n=== Summary ===');
console.log(`Total replaced: ${totalReplaced}`);
console.log(`Total not found: ${totalNotFound}`);
console.log(`Files with no change needed: ${totalAlreadyFixed}`);
console.log(`Unique keys not found: ${notFoundKeys.length}`);
if (notFoundKeys.length > 0 && notFoundKeys.length <= 50) {
  console.log('Not found keys:', notFoundKeys.join(', '));
}
