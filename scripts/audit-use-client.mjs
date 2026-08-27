#!/usr/bin/env node
/**
 * 扫描所有 page.tsx 文件，检查 'use client' 指令位置是否正确
 * 规则：'use client' 必须在文件第一行（前面不能有 import 或 BOM）
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// 获取所有 page.tsx 文件
const files = execSync('git ls-files "src/app/**/page.tsx"', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const issues = [];

for (const filePath of files) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // 检查第一行是否是 'use client'
    const firstLine = lines[0].trim();
    const hasUseClient = content.includes("'use client'") || content.includes('"use client"');

    if (!hasUseClient) continue; // 没有 'use client' 指令，跳过

    // 'use client' 可以带分号：'use client'; 或 "use client";
    const isFirstLineUseClient =
      firstLine === "'use client'" ||
      firstLine === '"use client"' ||
      firstLine === "'use client';" ||
      firstLine === '"use client";';

    if (!isFirstLineUseClient) {
      // 找到 'use client' 在第几行
      const useClientLineNum = lines.findIndex(
        (l) =>
          l.trim() === "'use client'" ||
          l.trim() === '"use client"' ||
          l.trim() === "'use client';" ||
          l.trim() === '"use client";'
      );

      // 检查是否有 BOM 字符
      const hasBOM = content.charCodeAt(0) === 0xfeff;

      issues.push({
        file: filePath,
        useClientLine: useClientLineNum + 1,
        firstLine: firstLine.substring(0, 80),
        hasBOM,
        issue:
          useClientLineNum > 0
            ? `'use client' on line ${useClientLineNum + 1}, not line 1`
            : `'use client' not found as standalone directive`,
      });
    }
  } catch {
    // 读取失败，跳过
  }
}

console.log(`=== Scanned ${files.length} page.tsx files ===`);
console.log(`=== Found ${issues.length} files with 'use client' position issues ===\n`);

for (const issue of issues) {
  console.log(`❌ ${issue.file}`);
  console.log(`   Issue: ${issue.issue}`);
  console.log(`   First line: "${issue.firstLine}"`);
  if (issue.hasBOM) console.log(`   ⚠️  BOM character detected`);
  console.log();
}

if (issues.length === 0) {
  console.log('✅ All files with "use client" directive have it correctly placed on line 1');
}
