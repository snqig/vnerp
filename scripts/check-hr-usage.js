const fs = require('fs');
const path = require('path');

// Get Hr keys from zh-CN
const zhCN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'zh-CN.json'), 'utf8'));
const hrKeys = new Set(Object.keys(zhCN.Hr));

// Get all t("key") from page
const pageContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', '[locale]', 'hr', 'employee', 'page.tsx'), 'utf8');
const tCalls = pageContent.match(/t\("([^"]+)"\)/g) || [];
const usedKeys = new Set(tCalls.map(m => m.replace(/t\("([^"]+)"\)/, '$1')));

// Also check tc() calls
const tcCalls = pageContent.match(/tc\("([^"]+)"\)/g) || [];
const usedTcKeys = new Set(tcCalls.map(m => m.replace(/tc\("([^"]+)"\)/, '$1')));

console.log('=== t("key") 使用的键 (Hr namespace) ===');
const missing = [...usedKeys].filter(k => !hrKeys.has(k));
const found = [...usedKeys].filter(k => hrKeys.has(k));

console.log(`  总共使用: ${usedKeys.size} 个`);
console.log(`  已存在: ${found.length} 个`);
console.log(`  缺失: ${missing.length} 个`);

if (missing.length > 0) {
  console.log('\n  ❌ Hr 命名空间缺失的键:');
  missing.forEach(k => console.log(`     - "${k}"`));
}

if (usedTcKeys.size > 0) {
  console.log('\n=== tc("key") 使用的键 (Common namespace) ===');
  usedTcKeys.forEach(k => console.log(`     - "${k}"`));
}