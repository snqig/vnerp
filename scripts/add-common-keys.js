/**
 * 扫描所有页面中 tc("key") 调用，将缺失的 key 添加到 Common 命名空间
 */
const fs = require('fs');
const path = require('path');

const PROJECT = process.cwd();
const LANGS = ['zh-CN', 'en', 'zh-TW', 'vi'];

// 加载语言文件
const messages = {};
for (const lang of LANGS) {
  const filePath = path.join(PROJECT, 'messages', `${lang}.json`);
  messages[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// 扫描所有页面文件，提取 tc("key") 调用
const usedKeys = new Set();

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
  const content = fs.readFileSync(fullPath, 'utf-8');
  const matches = [...content.matchAll(/tc\("(\w+)"\)/g)];
  for (const m of matches) {
    usedKeys.add(m[1]);
  }
}

console.log(`Found ${usedKeys.size} unique tc() keys across ${files.length} files`);

// 检查哪些 key 在 Common 中缺失
const commonKeys = new Set(Object.keys(messages['zh-CN'].Common || {}));
const missingKeys = [...usedKeys].filter(k => !commonKeys.has(k));

console.log(`\nMissing from Common: ${missingKeys.length}`);
if (missingKeys.length > 0) {
  missingKeys.forEach(k => console.log(`  ${k}`));
}

// 添加缺失的 key 到 Common
for (const key of missingKeys) {
  for (const lang of LANGS) {
    if (!messages[lang].Common) messages[lang].Common = {};
    messages[lang].Common[key] = key; // 用 key 本身作为占位翻译
  }
}

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
}

console.log(`\nAdded ${missingKeys.length} keys to Common namespace across all 4 language files.`);
console.log(`Common now has ${Object.keys(messages['zh-CN'].Common).length} keys.`);