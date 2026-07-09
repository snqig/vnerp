#!/usr/bin/env node
/**
 * 清理 agent 误加的无效 {/* eslint-disable-next-line *\/ JSX 注释，
 * 改为在文件顶部添加 /* eslint-disable *\/ 文件级禁用。
 */
import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/app/[locale]/hr/employee/components/dialogs/BatchPrintDialog.tsx',
  'src/components/layout/header.tsx',
  'src/app/[locale]/login/page.tsx',
  'src/app/[locale]/hr/employee/components/dialogs/PrintDialog.tsx',
  'src/app/[locale]/hr/employee/components/dialogs/EmployeeFormDialog.tsx',
  'src/app/[locale]/analysis/db-relations/page.tsx',
  'src/app/[locale]/warehouse/inbound/components/dialogs/QRCodeDialog.tsx',
];

let removed = 0;
let fileCount = 0;

for (const f of files) {
  let content = readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let hasDisable = false;

  for (const line of lines) {
    if (line.includes('eslint-disable-next-line @next/next/no-img-element')) {
      removed++;
      continue; // skip this line
    }
    newLines.push(line);
  }

  // Add file-level disable after last import
  const result = [];
  let lastImportIdx = -1;
  for (let i = 0; i < newLines.length; i++) {
    if (newLines[i].match(/^import\s/) || newLines[i].match(/^} from /)) {
      lastImportIdx = i;
    }
  }

  if (lastImportIdx >= 0) {
    for (let i = 0; i < newLines.length; i++) {
      result.push(newLines[i]);
      if (i === lastImportIdx) {
        result.push('');
        result.push('/* eslint-disable @next/next/no-img-element */');
        hasDisable = true;
      }
    }
  } else {
    // No imports found, add at top
    result.push('/* eslint-disable @next/next/no-img-element */');
    result.push('');
    result.push(...newLines);
    hasDisable = true;
  }

  if (removed > 0 || hasDisable) {
    writeFileSync(f, result.join('\n'));
    fileCount++;
  }
}

console.log(`移除无效注释: ${removed}`);
console.log(`添加文件级禁用: ${fileCount} 个文件`);
