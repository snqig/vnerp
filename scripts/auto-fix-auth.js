#!/usr/bin/env node
/**
 * 自动为页面添加认证检查
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// authFetch 代码模板
const AUTH_FETCH_CODE = `
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }
  return fetch(url, { ...options, headers });
};
`;

// 需要修复的页面列表
const pagesToFix = [
  'app/[locale]/dcprint/ink/page.tsx',
  'app/[locale]/dcprint/die/page.tsx',
  'app/[locale]/dcprint/labels/page.tsx',
  'app/[locale]/dcprint/trace/page.tsx',
  'app/[locale]/dcprint/ink-usage/page.tsx',
  'app/[locale]/dcprint/ink-opening/page.tsx',
  'app/[locale]/dcprint/ink-mixed/page.tsx',
  'app/[locale]/dcprint/process-cards/page.tsx',
  'app/[locale]/dcprint/screen-plate/page.tsx',
  'app/[locale]/equipment/calibration/page.tsx',
  'app/[locale]/equipment/repair/page.tsx',
  'app/[locale]/equipment/scrap/page.tsx',
  'app/[locale]/equipment/page.tsx',
  'app/[locale]/finance/page.tsx',
  'app/[locale]/finance/costs/page.tsx',
  'app/[locale]/finance/payables/page.tsx',
  'app/[locale]/finance/receivables/page.tsx',
  'app/[locale]/crm/analysis/page.tsx',
  'app/[locale]/crm/follow/page.tsx',
  'app/[locale]/outsource/issue/page.tsx',
  'app/[locale]/outsource/order/page.tsx',
  'app/[locale]/outsource/receive/page.tsx',
  'app/[locale]/outsource/settlement/page.tsx',
  'app/[locale]/delivery/vehicles/page.tsx',
  'app/[locale]/delivery/vehicles/new/page.tsx',
  'app/[locale]/engineering/sop/page.tsx',
  'app/[locale]/engineering/sample-to-mass/page.tsx',
  'app/[locale]/plm/eco/page.tsx',
  'app/[locale]/plm/lifecycle/page.tsx',
  'app/[locale]/production/material-issue/page.tsx',
  'app/[locale]/purchase/orders/page.tsx',
  'app/[locale]/business/contract-review/page.tsx',
  'app/[locale]/settings/basics/page.tsx',
  'app/[locale]/settings/seed-data/page.tsx',
];

let fixedCount = 0;
let skippedCount = 0;

// 修复单个文件
function fixFile(relativePath) {
  const filePath = path.join(SRC_DIR, relativePath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] File not found: ${relativePath}`);
    skippedCount++;
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 检查是否已有 authFetch
  if (content.includes('const authFetch = async')) {
    console.log(`  [SKIP] Already has authFetch: ${relativePath}`);
    skippedCount++;
    return;
  }
  
  // 找到组件函数开始位置
  const funcMatch = content.match(/export default function \w+\([^)]*\)\s*\{/);
  if (!funcMatch) {
    console.log(`  [SKIP] No function found: ${relativePath}`);
    skippedCount++;
    return;
  }
  
  const insertPos = content.indexOf(funcMatch[0]) + funcMatch[0].length;
  
  // 插入 authFetch 代码
  content = content.slice(0, insertPos) + AUTH_FETCH_CODE + content.slice(insertPos);
  
  // 替换 fetch() 为 authFetch()
  // 但不替换已经带有 Authorization 的 fetch
  content = content.replace(/(?<!Authorization.*?)(?<!auth)fetch\(/g, 'authFetch(');
  
  // 写回文件
  fs.writeFileSync(filePath, content);
  console.log(`  [FIXED] ${relativePath}`);
  fixedCount++;
}

// 主函数
function main() {
  console.log('='.repeat(80));
  console.log('Adding Authentication Check to Pages');
  console.log('='.repeat(80));
  
  console.log(`\nProcessing ${pagesToFix.length} files...\n`);
  
  for (const file of pagesToFix) {
    fixFile(file);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`Fixed: ${fixedCount} files`);
  console.log(`Skipped: ${skippedCount} files`);
}

main();
