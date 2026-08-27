const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '..', 'messages');
const languages = ['zh-CN', 'en', 'zh-TW', 'vi'];

const allKeys = {};
const allHr = {};

languages.forEach(lang => {
  const filePath = path.join(messagesDir, `${lang}.json`);
  const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  allHr[lang] = Object.keys(messages.Hr || {});
  allKeys[lang] = new Set(allHr[lang]);
});

// Find all unique keys
const allUniqueKeys = new Set();
languages.forEach(lang => allHr[lang].forEach(k => allUniqueKeys.add(k)));

console.log(`\n=== Hr 命名空间键统计 ===`);
languages.forEach(lang => {
  console.log(`  ${lang}: ${allHr[lang].length} 个键`);
});
console.log(`  唯一键总数: ${allUniqueKeys.size}`);

// Check zh-CN as baseline
const zhCNKeys = allKeys['zh-CN'];

console.log(`\n=== 各文件与 zh-CN 对比结果 ===`);
languages.filter(l => l !== 'zh-CN').forEach(lang => {
  const missing = [...zhCNKeys].filter(k => !allKeys[lang].has(k));
  if (missing.length > 0) {
    console.log(`\n  ❌ ${lang} 缺失键 (${missing.length}):`);
    missing.forEach(k => console.log(`     - ${k}: ${allHr['zh-CN'][allHr['zh-CN'].indexOf(k)]} (zh-CN: "${allHr['zh-CN'][allHr['zh-CN'].indexOf(k)]}" 需要在 zh-CN 查值)`));
  } else {
    console.log(`\n  ✅ ${lang} 与 zh-CN 完全一致`);
  }
});

// Look up actual values
const zhCNData = JSON.parse(fs.readFileSync(path.join(messagesDir, 'zh-CN.json'), 'utf8'));

languages.filter(l => l !== 'zh-CN').forEach(lang => {
  const missing = [...zhCNKeys].filter(k => !allKeys[lang].has(k));
  if (missing.length > 0) {
    console.log(`\n  🔧 ${lang} 需要补充的键值:`, JSON.stringify(
      Object.fromEntries(missing.map(k => [k, zhCNData.Hr[k]])),
      null, 2
    ));
  }
});