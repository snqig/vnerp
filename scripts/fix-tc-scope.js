/**
 * 修复 tc() 在组件外部作用域使用的 TypeScript 错误
 * 策略：将 tc("key") 替换回原始中文文本（通过反向查找 toKey 映射）
 */
const fs = require('fs');
const path = require('path');

const PROJECT = process.cwd();

// 从 batch-fix-hardcoded.js 提取 toKey 映射
const batchFix = fs.readFileSync(path.join(PROJECT, 'scripts', 'batch-fix-hardcoded.js'), 'utf-8');
const toKeyMatch = batchFix.match(/function toKey\(chinese\)[\s\S]*?^}/m);
if (!toKeyMatch) {
  console.error('Could not find toKey function');
  process.exit(1);
}

// 构建反向映射：key → 中文
const reverseMap = {};
const mapStr = toKeyMatch[0].match(/const map = \{([\s\S]*?)\};/);
if (mapStr) {
  const pairs = mapStr[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g);
  for (const m of pairs) {
    reverseMap[m[2]] = m[1];
  }
}
console.log(`Built reverse map with ${Object.keys(reverseMap).length} entries`);

// 找到所有有 TypeScript 错误的文件
const { execSync } = require('child_process');
let tscOutput = '';
try {
  tscOutput = execSync('npx tsc --noEmit 2>&1', { cwd: PROJECT, encoding: 'utf-8', stdio: 'pipe' });
} catch (e) {
  tscOutput = e.stdout || e.stderr || '';
}

// 解析错误，提取文件和行号
const errorFiles = new Map();
const errorRegex = /src\\([^(:]+):\((\d+),/g;
let match;
while ((match = errorRegex.exec(tscOutput)) !== null) {
  const filePath = 'src\\' + match[1];
  if (!errorFiles.has(filePath)) {
    errorFiles.set(filePath, new Set());
  }
  errorFiles.get(filePath).add(parseInt(match[2]));
}

console.log(`Found ${errorFiles.size} files with errors`);

// 只处理 tc 相关的错误
let fixedFiles = 0;
let fixedLines = 0;

for (const [filePath, errorLines] of errorFiles) {
  const fullPath = path.join(PROJECT, filePath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  
  for (const lineNum of errorLines) {
    const line = lines[lineNum - 1];
    if (!line || !line.includes('tc(')) continue;
    
    // 替换 tc("key") 为原始中文
    const tcRegex = /tc\("(\w+)"\)/g;
    let tcMatch;
    let newLine = line;
    while ((tcMatch = tcRegex.exec(line)) !== null) {
      const key = tcMatch[1];
      const chinese = reverseMap[key];
      if (chinese) {
        newLine = newLine.replace(`tc("${key}")`, `"${chinese}"`);
        fixedLines++;
      }
    }
    
    if (newLine !== line) {
      lines[lineNum - 1] = newLine;
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8');
    fixedFiles++;
    console.log(`  Fixed ${filePath}: ${errorLines.size} lines`);
  }
}

console.log(`\nFixed ${fixedLines} lines in ${fixedFiles} files`);