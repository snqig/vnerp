/**
 * Fix: 将缺失的通用键添加到 Common 命名空间并修复 t→tc 引用
 */
const fs = require('fs');
const path = require('path');

const PROJECT = process.cwd();
const LANGS = ['zh-CN', 'en', 'zh-TW', 'vi'];

// 从 batch-fix-hardcoded.js 的 toKey 映射中提取所有 key
const allKeys = new Set();
const scriptsDir = path.join(PROJECT, 'scripts');
const batchFix = fs.readFileSync(path.join(scriptsDir, 'batch-fix-hardcoded.js'), 'utf-8');

// 提取 toKey 函数中的所有 key 映射
const toKeyMatch = batchFix.match(/function toKey\(text\)[\s\S]*?^}/m);
if (toKeyMatch) {
  // 提取所有映射 key：return 'xxx' 或 'zhongwen': 'key'
  const keyRegex = /:\s*'(\w+)'/g;
  let match;
  while ((match = keyRegex.exec(toKeyMatch[0])) !== null) {
    allKeys.add(match[1]);
  }
}

console.log(`Found ${allKeys.size} unique keys in toKey mapping`);

// 加载语言文件
const messages = {};
for (const lang of LANGS) {
  const filePath = path.join(PROJECT, 'messages', `${lang}.json`);
  messages[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// 检查哪些 key 在 Common 中缺失
const commonKeys = new Set(Object.keys(messages['zh-CN'].Common || {}));
const missingKeys = [...allKeys].filter(k => !commonKeys.has(k));

console.log(`\nMissing Common keys: ${missingKeys.length}`);
if (missingKeys.length > 0) {
  missingKeys.forEach(k => process.stdout.write(`  ${k}`));
  console.log('\n');
}

// 添加缺失的 key 到 Common 命名空间
let addedCount = 0;
for (const key of missingKeys) {
  for (const lang of LANGS) {
    if (!messages[lang].Common) messages[lang].Common = {};
    if (!messages[lang].Common[key]) {
      // 使用 key 本身作为占位翻译
      messages[lang].Common[key] = key;
    }
  }
  addedCount++;
}

console.log(`Added ${addedCount} keys to Common namespace`);

// 保存语言文件
for (const lang of LANGS) {
  const filePath = path.join(PROJECT, 'messages', `${lang}.json`);
  // 排序 Common 的 key
  const sortedCommon = {};
  Object.keys(messages[lang].Common || {}).sort().forEach(k => {
    sortedCommon[k] = messages[lang].Common[k];
  });
  messages[lang].Common = sortedCommon;
  
  fs.writeFileSync(filePath, JSON.stringify(messages[lang], null, 2) + '\n', 'utf-8');
  console.log(`  Updated ${lang}.json`);
}

// 修复 t(" → tc(" 在修改过的文件中
console.log('\nFixing t→tc references in modified files...');
let fileCount = 0;
let replaceCount = 0;

function walkDir(dir, fileList) {
  const fullPath = path.join(PROJECT, dir);
  if (!fs.existsSync(fullPath)) return;
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
}

const files = [];
walkDir('src/app/[locale]', files);

for (const file of files) {
  const fullPath = path.join(PROJECT, file);
  let content = fs.readFileSync(fullPath, 'utf-8');
  let modified = false;
  
  // 替换模式: >{t("xxx")}< → >{tc("xxx")}<
  // JSX 文本中的 t(" → tc("
  // 但保留 const t = 和 useTranslations 声明中的 t
  
  // 替换 JSX 中的 t(" → tc(" （不包括变量声明）
  const oldContent = content;
  
  // 替换 {t(" → {tc("
  content = content.replace(/\{t\("/g, '{tc("');
  // 替换 ={t(" → ={tc("
  content = content.replace(/=\{t\("/g, '={tc("');
  // 替换 t="xxx" 中的 t= → tc=
  // (不处理, title/t 属性不同)
  
  if (content !== oldContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const count = (content.match(/\{tc\("/g) || []).length;
    replaceCount += count;
    fileCount++;
    console.log(`  ${file}: ${count} replacements`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Keys added to Common: ${addedCount}`);
console.log(`Files fixed (t→tc): ${fileCount}`);
console.log(`Total t→tc replacements: ${replaceCount}`);