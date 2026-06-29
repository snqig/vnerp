/**
 * 精确扫描：只抓取真正的硬编码 UI 中文（非注释、非 logger、非已翻译）
 */
const fs = require('fs');
const path = require('path');

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

// 匹配真正的硬编码中文模式（非注释、非 logger、非 console、非已翻译）
const HARDCODED_PATTERNS = [
  // >中文<  (JSX 标签内容)
  { regex: />([\u4e00-\u9fa5]{1,30})</g, type: 'JSX_TEXT' },
  // placeholder="中文"
  { regex: /placeholder="([\u4e00-\u9fa5][^"]*[\u4e00-\u9fa5][^"]*)"/g, type: 'PLACEHOLDER' },
  // placeholder='中文'
  { regex: /placeholder='([\u4e00-\u9fa5][^']*[\u4e00-\u9fa5][^']*)'/g, type: 'PLACEHOLDER' },
  // confirm('中文')
  { regex: /confirm\(['"]([\u4e00-\u9fa5][^'"]*)[\u4e00-\u9fa5][^'"]*['"]\)/g, type: 'CONFIRM' },
  // label: '中文' (状态映射)
  { regex: /label:\s*['"]([\u4e00-\u9fa5]{1,20})['"]/g, type: 'STATUS_LABEL' },
  // title="中文"
  { regex: /title="([\u4e00-\u9fa5][^"]*[\u4e00-\u9fa5][^"]*)"/g, type: 'TITLE' },
];

function scanFile(filePath) {
  const content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  const lines = content.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    if (!line.trim()) continue;

    // 跳过注释行
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) continue;
    // 跳过 logger
    if (line.includes('logger.')) continue;
    // 跳过 console  
    if (line.includes('console.')) continue;
    // 跳过 import/export
    if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) continue;

    // 如果行内已经有 t(" 或 tc("，说明已翻译，跳过
    if (line.includes('t("') || line.includes("t('") || line.includes('tc("') || line.includes("tc('")) continue;

    for (const { regex, type } of HARDCODED_PATTERNS) {
      const matches = [...line.matchAll(regex)];
      for (const m of matches) {
        results.push({
          line: lineNum,
          type,
          text: line.trim().substring(0, 100),
          chinese: m[1],
        });
      }
    }
  }
  return results;
}

function main() {
  const allFiles = [];
  walkDir('src/app/[locale]', allFiles);

  let totalIssues = 0;
  const byFile = {};

  for (const file of allFiles) {
    const results = scanFile(file);
    if (results.length > 0) {
      byFile[file] = results;
      totalIssues += results.length;
    }
  }

  // Group by type for summary
  const byType = {};
  for (const [file, results] of Object.entries(byFile)) {
    for (const r of results) {
      if (!byType[r.chinese]) byType[r.chinese] = [];
      byType[r.chinese].push({ file, line: r.line, type: r.type });
    }
  }

  // Output
  console.log('=== HARCODED CHINESE UI STRINGS ===\n');
  
  // Sort by frequency
  const sorted = Object.entries(byType).sort((a, b) => b[1].length - a[1].length);
  
  for (const [cn, occurrences] of sorted) {
    console.log(`\n"${cn}" (${occurrences.length} occurrences)`);
    for (const o of occurrences) {
      console.log(`  ${o.file}:${o.line} [${o.type}]`);
    }
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Unique hardcoded strings: ${sorted.length}`);
  console.log(`Total occurrences: ${totalIssues}`);
  console.log(`Files affected: ${Object.keys(byFile).length}`);
}

main();