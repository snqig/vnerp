// Detailed i18n hardcode analysis
// Usage: node scripts/analyze-hardcode-detail.mjs [eslint-baseline.json]

import { readFileSync, writeFileSync, statSync } from 'node:fs';

const baselinePath = process.argv[2] || 'eslint-baseline.json';

let raw;
try {
  const sz = statSync(baselinePath).size;
  console.log(`[info] reading ${baselinePath} (${(sz / 1024 / 1024).toFixed(2)} MB)`);
  raw = readFileSync(baselinePath, 'utf8');
} catch (e) {
  console.error('[error] cannot read', baselinePath);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('[error] JSON parse failed:', e.message);
  console.error('[hint] ensure eslint output uses --format json');
  process.exit(1);
}

const entries = [];
for (const file of data) {
  for (const msg of file.messages || []) {
    if (msg.ruleId !== 'i18n/no-chinese-hardcode') continue;
    const textMatch = msg.message.match(/"([^"]+)"/);
    const keyMatch = msg.message.match(/tc\('([^']+)'\)/);
    entries.push({
      file: file.filePath.replace(/\\/g, '/').replace(/^.*?\/erp-project\//, ''),
      line: msg.line,
      column: msg.column,
      text: textMatch ? textMatch[1] : '',
      suggestedKey: keyMatch ? keyMatch[1] : '',
    });
  }
}

const byModule = new Map();
const byFile = new Map();
const byText = new Map();
for (const e of entries) {
  const m = e.file.match(/\/\[locale\]\/([^/]+)/);
  const moduleName = m ? m[1] : (e.file.includes('/src/') ? e.file.split('/src/')[1].split('/')[0] : 'other');
  byModule.set(moduleName, (byModule.get(moduleName) || 0) + 1);
  byFile.set(e.file, (byFile.get(e.file) || 0) + 1);
  if (e.text) {
    if (!byText.has(e.text)) byText.set(e.text, []);
    byText.get(e.text).push(e);
  }
}

const moduleArr = [...byModule.entries()].sort((a, b) => b[1] - a[1]);
const fileArr = [...byFile.entries()].sort((a, b) => b[1] - a[1]);
const duplicated = [...byText.entries()]
  .filter(([, arr]) => arr.length >= 3)
  .sort((a, b) => b[1].length - a[1].length);

const report = {
  generatedAt: new Date().toISOString(),
  totalEntries: entries.length,
  totalFiles: byFile.size,
  totalModules: byModule.size,
  duplicatedOccurrences: duplicated.reduce((s, [, arr]) => s + arr.length, 0),
  byModule: moduleArr,
  topFiles: fileArr.slice(0, 30),
  duplicatedTexts: duplicated.slice(0, 100).map(([text, arr]) => ({
    text,
    occurrences: arr.length,
    files: [...new Set(arr.map((e) => e.file))],
  })),
};

writeFileSync('i18n-hardcode-detail.json', JSON.stringify(report, null, 2));

const lines = [];
const push = (s) => lines.push(s);
push('========================================================');
push('  i18n Hardcode Detailed Report');
push('========================================================');
push('');
push(`Total entries:        ${report.totalEntries}`);
push(`Total files:          ${report.totalFiles}`);
push(`Total modules:        ${report.totalModules}`);
push(`Duplicated occurrences: ${report.duplicatedOccurrences} (in ${duplicated.length} strings)`);
push('');
push('--- Top 20 modules ---');
for (const [m, c] of moduleArr.slice(0, 20)) {
  push(`  ${m.padEnd(20)} ${String(c).padStart(5)}  ${'#'.repeat(Math.min(50, Math.round(c / 20)))}`);
}
push('');
push('--- Top 30 files ---');
for (const [f, c] of fileArr.slice(0, 30)) {
  const short = f.length > 80 ? '...' + f.slice(-77) : f;
  push(`  ${String(c).padStart(4)}  ${short}`);
}
push('');
push(`--- Top 30 duplicated hardcoded strings (out of ${duplicated.length}) ---`);
for (const d of report.duplicatedTexts.slice(0, 30)) {
  push(`  ${String(d.occurrences).padStart(3)}x  "${d.text.slice(0, 40)}${d.text.length > 40 ? '...' : ''}"`);
  push(`        files: ${d.files.slice(0, 3).map((f) => f.split('/').pop()).join(', ')}${d.files.length > 3 ? ` ...(${d.files.length} files)` : ''}`);
}
push('');
push('========================================================');
push('Detailed data written to i18n-hardcode-detail.json');
push('========================================================');

writeFileSync('i18n-report.txt', lines.join('\n'));
console.log('Done. Report: i18n-report.txt');
console.log(`Summary: ${report.totalEntries} entries, ${report.totalFiles} files, ${report.totalModules} modules`);
