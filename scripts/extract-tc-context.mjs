/**
 * Extract all tc('text_xxx') calls with surrounding context from the 19 files
 * with remaining TS2304 errors, to help reconstruct Chinese from context.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve('.');

// Get tsc errors
let tscOutput;
try {
  tscOutput = execSync('npx tsc --noEmit 2>&1', {
    cwd: projectRoot, encoding: 'utf8', timeout: 300000,
    maxBuffer: 20 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  tscOutput = err.stdout || err.stderr || '';
}

const errorRegex = /^(.+?)\((\d+),(\d+)\): error TS2304: Cannot find name 'tc'\./gm;
const fileErrors = new Map();
let match;
while ((match = errorRegex.exec(tscOutput)) !== null) {
  const file = match[1];
  const line = parseInt(match[2], 10);
  if (!fileErrors.has(file)) fileErrors.set(file, new Set());
  fileErrors.get(file).add(line);
}

const tcCallRegex = /\btc\(\s*['"]([^'"]+)['"]\s*\)/g;

const output = [];
for (const [relFile, errorLines] of fileErrors) {
  const fullPath = resolve(projectRoot, relFile);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch {
    output.push(`=== ${relFile} (NOT FOUND) ===`);
    continue;
  }
  output.push(`\n=== ${relFile} (${errorLines.size} error lines) ===`);
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    if (!errorLines.has(lineNum)) continue;
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    const keys = [];
    let m;
    const re = new RegExp(tcCallRegex.source, 'g');
    while ((m = re.exec(line)) !== null) {
      keys.push(m[1]);
    }
    output.push(`L${lineNum} [${keys.join(', ')}]`);
    output.push(`  PREV: ${prevLine.substring(0, 120)}`);
    output.push(`  LINE: ${line.trim().substring(0, 160)}`);
    output.push(`  NEXT: ${nextLine.substring(0, 120)}`);
  }
}

writeFileSync(resolve(projectRoot, 'scripts/tc-context-output.txt'), output.join('\n'), 'utf8');
console.log('Written to scripts/tc-context-output.txt');
