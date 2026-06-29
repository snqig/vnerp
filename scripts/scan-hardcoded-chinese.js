/**
 * 扫描所有页面和组件中的硬编码中文字符串
 * 排除：注释、logger调用、console调用、export/print函数中的内容
 */
const fs = require('fs');
const path = require('path');

const CHINESE_PATTERN = /[\u4e00-\u9fa5]/;

const SCAN_DIRS = [
  'src/app/[locale]',
];

// 需要排除的上下文（这些场景中的中文不属于硬编码）
const EXCLUDE_LINE_TESTS = [
  (line) => line.includes('logger.info') || line.includes('logger.warn') || line.includes('logger.error') || line.includes('logger.debug'),
  (line) => line.includes('console.error') || line.includes('console.log') || line.includes('console.warn'),
  (line) => line.trim().startsWith('//'),
  (line) => line.trim().startsWith('/*'),
  (line) => line.trim().startsWith('*'),
  (line) => line.includes('import {'),
  (line) => line.includes('import type'),
  (line) => line.includes('export '),
  (line) => line.includes('useTranslations'),
  (line) => line.includes('t("') || line.includes("t('") || line.includes('tc("') || line.includes("tc('"),
  (line) => line.includes('toast.'),
  (line) => line.includes('printWindow') || line.includes('exportTo') || line.includes('.write(') || line.includes('.innerHTML'),
  (line) => line.includes('require('),
  (line) => line.includes('module.exports'),
];

function walkDir(dir, fileList = []) {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) return fileList;

  const items = fs.readdirSync(fullPath);
  for (const item of items) {
    const itemPath = path.join(fullPath, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.next') continue;
      walkDir(path.join(dir, item), fileList);
    } else if (item === 'page.tsx' || item === 'layout.tsx') {
      fileList.push(path.join(dir, item));
    }
  }
  return fileList;
}

function scanFile(filePath) {
  const content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  const lines = content.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (!line.trim()) continue;
    if (!CHINESE_PATTERN.test(line)) continue;

    let shouldExclude = false;
    for (const test of EXCLUDE_LINE_TESTS) {
      if (test(line)) {
        shouldExclude = true;
        break;
      }
    }
    if (shouldExclude) continue;

    const chineseMatches = line.match(/[\u4e00-\u9fa5]+/g);
    if (chineseMatches) {
      results.push({
        line: lineNum,
        text: line.trim().substring(0, 120),
        chinese: chineseMatches.join(', '),
      });
    }
  }
  return results;
}

function main() {
  console.log('Scanning for hardcoded Chinese strings...\n');

  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    walkDir(dir, allFiles);
  }

  let totalIssues = 0;
  const fileResults = [];

  for (const file of allFiles) {
    const results = scanFile(file);
    if (results.length > 0) {
      fileResults.push({ file, results });
      totalIssues += results.length;
    }
  }

  for (const { file, results } of fileResults) {
    console.log(`\n${file} (${results.length} issues)`);
    for (const r of results) {
      console.log(`  L${r.line}: ${r.text}`);
      console.log(`       CN: ${r.chinese}`);
    }
  }

  console.log(`\n\nTotal: ${fileResults.length} files, ${totalIssues} hardcoded strings`);
}

main();