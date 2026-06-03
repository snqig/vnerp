#!/usr/bin/env node
/**
 * 分析翻译文件完整性
 * 找出缺失的翻译键并生成补充建议
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'messages');

// 加载翻译文件
function loadMessages(filename) {
  const filePath = path.join(MESSAGES_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return {};
  }
}

// 比较两个翻译文件的键
function compareKeys(obj1, obj2, prefix = '') {
  const missing = [];
  const extra = [];
  
  for (const key in obj1) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!(key in obj2)) {
      missing.push(fullKey);
    } else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
      const subResult = compareKeys(obj1[key], obj2[key], fullKey);
      missing.push(...subResult.missing);
      extra.push(...subResult.extra);
    }
  }
  
  for (const key in obj2) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!(key in obj1)) {
      extra.push(fullKey);
    }
  }
  
  return { missing, extra };
}

// 主函数
function main() {
  console.log('='.repeat(60));
  console.log('翻译文件完整性分析');
  console.log('='.repeat(60));
  
  // 加载所有翻译文件
  const en = loadMessages('en.json');
  const zhCN = loadMessages('zh-CN.json');
  const zhTW = loadMessages('zh-TW.json');
  const vi = loadMessages('vi.json');
  
  console.log('\n【文件加载成功】');
  console.log(`  en.json: ${Object.keys(en).length} 个命名空间`);
  console.log(`  zh-CN.json: ${Object.keys(zhCN).length} 个命名空间`);
  console.log(`  zh-TW.json: ${Object.keys(zhTW).length} 个命名空间`);
  console.log(`  vi.json: ${Object.keys(vi).length} 个命名空间`);
  
  // 比较各文件
  console.log('\n' + '='.repeat(60));
  console.log('翻译键对比分析');
  console.log('='.repeat(60));
  
  // 以 zh-CN 为基准比较
  console.log('\n【zh-CN vs en】');
  const zhCNvsEn = compareKeys(zhCN, en);
  if (zhCNvsEn.missing.length === 0 && zhCNvsEn.extra.length === 0) {
    console.log('  ✓ 完全一致');
  } else {
    if (zhCNvsEn.missing.length > 0) {
      console.log(`  en 缺失 ${zhCNvsEn.missing.length} 个键:`);
      zhCNvsEn.missing.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (zhCNvsEn.missing.length > 10) console.log(`    ... 还有 ${zhCNvsEn.missing.length - 10} 个`);
    }
    if (zhCNvsEn.extra.length > 0) {
      console.log(`  en 多出 ${zhCNvsEn.extra.length} 个键:`);
      zhCNvsEn.extra.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (zhCNvsEn.extra.length > 10) console.log(`    ... 还有 ${zhCNvsEn.extra.length - 10} 个`);
    }
  }
  
  console.log('\n【zh-CN vs zh-TW】');
  const zhCNvsZhTW = compareKeys(zhCN, zhTW);
  if (zhCNvsZhTW.missing.length === 0 && zhCNvsZhTW.extra.length === 0) {
    console.log('  ✓ 完全一致');
  } else {
    if (zhCNvsZhTW.missing.length > 0) {
      console.log(`  zh-TW 缺失 ${zhCNvsZhTW.missing.length} 个键:`);
      zhCNvsZhTW.missing.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (zhCNvsZhTW.missing.length > 10) console.log(`    ... 还有 ${zhCNvsZhTW.missing.length - 10} 个`);
    }
    if (zhCNvsZhTW.extra.length > 0) {
      console.log(`  zh-TW 多出 ${zhCNvsZhTW.extra.length} 个键:`);
      zhCNvsZhTW.extra.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (zhCNvsZhTW.extra.length > 10) console.log(`    ... 还有 ${zhCNvsZhTW.extra.length - 10} 个`);
    }
  }
  
  console.log('\n【zh-CN vs vi】');
  const zhCNvsVi = compareKeys(zhCN, vi);
  if (zhCNvsVi.missing.length === 0 && zhCNvsVi.extra.length === 0) {
    console.log('  ✓ 完全一致');
  } else {
    if (zhCNvsVi.missing.length > 0) {
      console.log(`  vi 缺失 ${zhCNvsVi.missing.length} 个键:`);
      zhCNvsVi.missing.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (zhCNvsVi.missing.length > 10) console.log(`    ... 还有 ${zhCNvsVi.missing.length - 10} 个`);
    }
    if (zhCNvsVi.extra.length > 0) {
      console.log(`  vi 多出 ${zhCNvsVi.extra.length} 个键:`);
      zhCNvsVi.extra.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (zhCNvsVi.extra.length > 10) console.log(`    ... 还有 ${zhCNvsVi.extra.length - 10} 个`);
    }
  }
  
  // 统计每个命名空间的键数量
  console.log('\n' + '='.repeat(60));
  console.log('命名空间统计');
  console.log('='.repeat(60));
  
  const namespaces = Object.keys(zhCN).sort();
  console.log('\n命名空间\t\tzh-CN\t\ten\t\tzh-TW\t\tvi');
  console.log('-'.repeat(60));
  
  for (const ns of namespaces) {
    const zhCNCount = Object.keys(zhCN[ns] || {}).length;
    const enCount = Object.keys(en[ns] || {}).length;
    const zhTWCount = Object.keys(zhTW[ns] || {}).length;
    const viCount = Object.keys(vi[ns] || {}).length;
    
    const status = (zhCNCount === enCount && enCount === zhTWCount && zhTWCount === viCount) ? '✓' : '!';
    console.log(`${ns.padEnd(20)}\t${zhCNCount}\t\t${enCount}\t\t${zhTWCount}\t\t${viCount}\t${status}`);
  }
  
  // 检查空翻译
  console.log('\n' + '='.repeat(60));
  console.log('空翻译检查');
  console.log('='.repeat(60));
  
  function findEmptyTranslations(obj, prefix = '') {
    const empty = [];
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'string') {
        if (!obj[key] || obj[key].trim() === '') {
          empty.push(fullKey);
        }
      } else if (typeof obj[key] === 'object') {
        empty.push(...findEmptyTranslations(obj[key], fullKey));
      }
    }
    return empty;
  }
  
  const emptyZhCN = findEmptyTranslations(zhCN);
  const emptyEn = findEmptyTranslations(en);
  const emptyZhTW = findEmptyTranslations(zhTW);
  const emptyVi = findEmptyTranslations(vi);
  
  if (emptyZhCN.length === 0 && emptyEn.length === 0 && emptyZhTW.length === 0 && emptyVi.length === 0) {
    console.log('\n  ✓ 无空翻译');
  } else {
    if (emptyZhCN.length > 0) {
      console.log(`\n  zh-CN 空翻译 (${emptyZhCN.length}个):`);
      emptyZhCN.slice(0, 5).forEach(k => console.log(`    - ${k}`));
    }
    if (emptyEn.length > 0) {
      console.log(`\n  en 空翻译 (${emptyEn.length}个):`);
      emptyEn.slice(0, 5).forEach(k => console.log(`    - ${k}`));
    }
    if (emptyZhTW.length > 0) {
      console.log(`\n  zh-TW 空翻译 (${emptyZhTW.length}个):`);
      emptyZhTW.slice(0, 5).forEach(k => console.log(`    - ${k}`));
    }
    if (emptyVi.length > 0) {
      console.log(`\n  vi 空翻译 (${emptyVi.length}个):`);
      emptyVi.slice(0, 5).forEach(k => console.log(`    - ${k}`));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('分析完成');
  console.log('='.repeat(60));
}

main();
