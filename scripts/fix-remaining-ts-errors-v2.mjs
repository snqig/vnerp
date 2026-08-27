import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = 'd:\\dcprint\\erp-project';

// All TS errors from catch blocks
const errors = [
  { file: 'src/app/[locale]/settings/seed-data/page.tsx', line: 59, varName: 'e' },
  { file: 'src/app/[locale]/settings/seed-data/page.tsx', line: 89, varName: 'e' },
  { file: 'src/app/[locale]/warehouse/inbound-simple/page.tsx', line: 42, varName: 'e' },
  { file: 'src/app/api/dcprint/formula/color/route.ts', line: 34, varName: 'e' },
  { file: 'src/app/api/init/data-logic/route.ts', line: 16, varName: 'e' },
  { file: 'src/app/api/init/data-logic/route.ts', line: 29, varName: 'e' },
  { file: 'src/app/api/init/inventory-tables/route.ts', line: 61, varName: 'error' },
  { file: 'src/app/api/init/inventory-tables/route.ts', line: 98, varName: 'error' },
  { file: 'src/app/api/init/po-grn-tables/route.ts', line: 22, varName: 'e' },
  { file: 'src/app/api/init/supplement-tables/route.ts', line: 15, varName: 'e' },
  { file: 'src/app/api/init/supplement-tables/route.ts', line: 905, varName: 'e' },
  { file: 'src/app/api/init/three-layer-tables/route.ts', line: 22, varName: 'e' },
  { file: 'src/infrastructure/monitoring/DeadlockMonitor.ts', line: 60, varName: 'error' },
  { file: 'src/infrastructure/monitoring/DeadlockMonitor.ts', line: 97, varName: 'error' },
  { file: 'src/infrastructure/monitoring/DeadlockMonitor.ts', line: 131, varName: 'error' },
  { file: 'src/infrastructure/schedulers/BatchExpiryScheduler.ts', line: 38, varName: 'error' },
  { file: 'src/infrastructure/schedulers/BatchExpiryScheduler.ts', line: 59, varName: 'error' },
  { file: 'src/infrastructure/schedulers/BatchExpiryScheduler.ts', line: 88, varName: 'error' },
  { file: 'src/infrastructure/schedulers/BatchExpiryScheduler.ts', line: 116, varName: 'error' },
];

// Group by file
const byFile = {};
for (const err of errors) {
  if (!byFile[err.file]) byFile[err.file] = [];
  byFile[err.file].push(err);
}

let totalFixed = 0;

for (const [filePath, fileErrors] of Object.entries(byFile)) {
  const fullPath = resolve(projectRoot, filePath);
  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  let changed = false;

  for (const err of fileErrors) {
    const lineIdx = err.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) continue;

    let line = lines[lineIdx];
    const varName = err.varName;
    let modified = false;

    // Pattern 1: varName.message (not already wrapped in (varName as Error))
    // Replace varName.message → (varName as Error).message
    // But NOT if preceded by ") as Error)." or "(varName as Error)."
    const msgRegex = new RegExp(`(?<!as Error\\)\\.)\\b${varName}\\.message\\b`, 'g');
    if (msgRegex.test(line)) {
      msgRegex.lastIndex = 0; // reset
      line = line.replace(msgRegex, `(${varName} as Error).message`);
      modified = true;
    }

    // Pattern 2: varName?.message → (varName as Error)?.message
    const optMsgRegex = new RegExp(`(?<!as Error\\)\\??\\.)\\b${varName}\\?\\.message\\b`, 'g');
    if (optMsgRegex.test(line)) {
      optMsgRegex.lastIndex = 0;
      line = line.replace(optMsgRegex, `(${varName} as Error)?.message`);
      modified = true;
    }

    // Pattern 3: varName.code → (varName as Error & { code?: string }).code
    // For MySQL error codes like ER_DUP_ENTRY
    const codeRegex = new RegExp(`(?<!as Error\\)\\.)\\b${varName}\\.code\\b`, 'g');
    if (codeRegex.test(line)) {
      codeRegex.lastIndex = 0;
      line = line.replace(codeRegex, `(${varName} as Error & { code?: string }).code`);
      modified = true;
    }

    if (modified) {
      lines[lineIdx] = line;
      changed = true;
      totalFixed++;
      console.log(`  Fixed: ${filePath}:${err.line}`);
    }
  }

  if (changed) {
    writeFileSync(fullPath, lines.join('\n'), 'utf8');
  }
}

console.log(`\nDone! Fixed ${totalFixed} errors`);
