import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = 'd:\\dcprint\\erp-project';

console.log('Running eslint to get all no-explicit-any warnings...');
let eslintJson;
try {
  eslintJson = execSync('npx eslint src/ -f json', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 600000,
    maxBuffer: 100 * 1024 * 1024,
  });
} catch (err) {
  eslintJson = err.stdout || '';
}

const data = JSON.parse(eslintJson);

const patterns = {
  'catch (X: any)': [],
  'as any': [],
  ': any (var/param/return)': [],
  'any[] (array type)': [],
  '<any> (generic)': [],
  'other': [],
};

const fileWarnings = {};

for (const file of data) {
  const filePath = file.filePath.replace(projectRoot + '\\', '').replace(/\\/g, '/');
  for (const msg of file.messages || []) {
    if (msg.ruleId !== '@typescript-eslint/no-explicit-any') continue;

    const line = msg.line;
    const col = msg.column;
    const source = msg.source || file.source || '';

    fileWarnings[filePath] = (fileWarnings[filePath] || 0) + 1;

    // Categorize by reading the source line
    const lines = source.split('\n');
    const sourceLine = (lines[line - 1] || '').trim();

    if (/catch\s*\(\s*\w+\s*:\s*any\s*\)/.test(sourceLine) ||
        /catch\s*\(\s*_?\w+\s*:\s*any\b/.test(sourceLine)) {
      patterns['catch (X: any)'].push({ file: filePath, line, col, source: sourceLine });
    } else if (/\bas\s+any\b/.test(sourceLine)) {
      patterns['as any'].push({ file: filePath, line, col, source: sourceLine });
    } else if (/:\s*any\s*\[/.test(sourceLine) || /:\s*Array<any>/.test(sourceLine)) {
      patterns['any[] (array type)'].push({ file: filePath, line, col, source: sourceLine });
    } else if (/<any>/.test(sourceLine) || /:\s*any\s*>/.test(sourceLine)) {
      patterns['<any> (generic)'].push({ file: filePath, line, col, source: sourceLine });
    } else if (/:\s*any\b/.test(sourceLine)) {
      patterns[': any (var/param/return)'].push({ file: filePath, line, col, source: sourceLine });
    } else {
      patterns['other'].push({ file: filePath, line, col, source: sourceLine });
    }
  }
}

console.log('\n=== Pattern Breakdown ===');
const total = Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Total no-explicit-any warnings: ${total}\n`);
for (const [pattern, items] of Object.entries(patterns)) {
  console.log(`${items.length}  ${pattern}`);
}

console.log('\n=== Top 20 files by warning count ===');
const sortedFiles = Object.entries(fileWarnings).sort((a, b) => b[1] - a[1]).slice(0, 20);
for (const [file, count] of sortedFiles) {
  console.log(`${count}  ${file}`);
}

// Save detailed output for each pattern
import { writeFileSync } from 'fs';
for (const [pattern, items] of Object.entries(patterns)) {
  if (items.length === 0) continue;
  const safeName = pattern.replace(/[^a-zA-Z0-9]/g, '_');
  const output = items.map(i => `${i.file}:${i.line}  ${i.source}`).join('\n');
  writeFileSync(resolve(projectRoot, `scripts/any-pattern-${safeName}.txt`), output, 'utf8');
  console.log(`\nSaved ${items.length} items to scripts/any-pattern-${safeName}.txt`);
}

// Show sample of each pattern
console.log('\n=== Samples ===');
for (const [pattern, items] of Object.entries(patterns)) {
  if (items.length === 0) continue;
  console.log(`\n--- ${pattern} (${items.length} total) ---`);
  for (const item of items.slice(0, 5)) {
    console.log(`  ${item.file}:${item.line}  ${item.source}`);
  }
}
