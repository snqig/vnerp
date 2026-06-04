#!/usr/bin/env node
/**
 * 生成四种语言翻译分类报告
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = 'd:/dcprint/erp-project/messages';

// 加载翻译文件
function loadMessages(filename) {
  const filePath = path.join(MESSAGES_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return {};
  }
}

// 主函数
function main() {
  console.log('='.repeat(80));
  console.log('国际化翻译四种语言分类报告');
  console.log('='.repeat(80));
  
  const zhCN = loadMessages('zh-CN.json');
  const en = loadMessages('en.json');
  const zhTW = loadMessages('zh-TW.json');
  const vi = loadMessages('vi.json');
  
  const namespaces = Object.keys(zhCN).sort();
  
  // 统计总数
  let totalKeys = 0;
  const stats = {};
  
  for (const ns of namespaces) {
    const count = Object.keys(zhCN[ns] || {}).length;
    totalKeys += count;
    stats[ns] = count;
  }
  
  console.log(`\n总命名空间: ${namespaces.length} 个`);
  console.log(`总翻译键: ${totalKeys} 个`);
  
  // 按命名空间输出
  for (const ns of namespaces) {
    const keys = Object.keys(zhCN[ns] || {}).sort();
    const count = keys.length;
    
    console.log('\n' + '='.repeat(80));
    console.log(`【${ns}】命名空间 - ${count} 个翻译键`);
    console.log('='.repeat(80));
    
    // 表头
    console.log('\n' + '-'.repeat(80));
    console.log(`{'键名'.padEnd(25)} | {'中文简体'.padEnd(20)} | {'中文繁体'.padEnd(20)} | {'英文'.padEnd(20)} | {'越南文'.padEnd(20)}`);
    console.log('-'.repeat(80));
    
    // 输出每个键的翻译
    for (const key of keys) {
      const zhCNVal = (zhCN[ns]?.[key] || '').padEnd(20).slice(0, 20);
      const zhTWVal = (zhTW[ns]?.[key] || '').padEnd(20).slice(0, 20);
      const enVal = (en[ns]?.[key] || '').padEnd(20).slice(0, 20);
      const viVal = (vi[ns]?.[key] || '').padEnd(20).slice(0, 20);
      const keyPadded = key.padEnd(25).slice(0, 25);
      
      console.log(`${keyPadded} | ${zhCNVal} | ${zhTWVal} | ${enVal} | ${viVal}`);
    }
  }
  
  // 统计摘要
  console.log('\n' + '='.repeat(80));
  console.log('统计摘要');
  console.log('='.repeat(80));
  
  console.log('\n命名空间翻译键数量:');
  console.log('-'.repeat(40));
  for (const [ns, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(Math.ceil(count / 10));
    console.log(`${ns.padEnd(20)} ${count.toString().padStart(3)} ${bar}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`总计: ${totalKeys} 个翻译键分布在 ${namespaces.length} 个命名空间`);
  console.log('='.repeat(80));
}

main();
