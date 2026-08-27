#!/usr/bin/env node
/**
 * 分析项目中使用的翻译键
 * 找出缺失的翻译键并生成报告
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'messages');

// 所有翻译键（按命名空间分组）
const usedKeys = {};

// 从代码中提取翻译键
function extractKeysFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 匹配 t('xxx') 和 $t('xxx') 模式
    const patterns = [
      /t\(['"]([\w.]+)['"]\)/g,
      /\$t\(['"]([\w.]+)['"]\)/g,
      /useTranslation\(['"]([\w]+)['"]\)/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        
        // 解析命名空间和键
        if (key.includes('.')) {
          const [namespace, ...rest] = key.split('.');
          if (!usedKeys[namespace]) usedKeys[namespace] = new Set();
          usedKeys[namespace].add(rest.join('.'));
        } else {
          // 可能是命名空间本身（useTranslation）
          if (!usedKeys[key]) usedKeys[key] = new Set();
        }
      }
    }
  } catch (e) {
    // 忽略无法读取的文件
  }
}

// 递归扫描 src 目录
function scanDirectory(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      scanDirectory(fullPath);
    } else if (item.isFile() && /\.(tsx|ts|jsx|js)$/.test(item.name)) {
      extractKeysFromFile(fullPath);
    }
  }
}

// 加载现有翻译文件
function loadMessages(filename) {
  const filePath = path.join(MESSAGES_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return {};
  }
}

// 检查缺失的翻译键
function findMissingKeys(messages, usedKeys) {
  const missing = {};
  
  for (const [namespace, keys] of Object.entries(usedKeys)) {
    if (!messages[namespace]) {
      missing[namespace] = Array.from(keys);
      continue;
    }
    
    const missingInNamespace = [];
    for (const key of keys) {
      if (!messages[namespace][key]) {
        missingInNamespace.push(key);
      }
    }
    
    if (missingInNamespace.length > 0) {
      missing[namespace] = missingInNamespace;
    }
  }
  
  return missing;
}

// 主函数
function main() {
  console.log('='.repeat(60));
  console.log('翻译键分析');
  console.log('='.repeat(60));
  
  // 扫描源代码
  console.log('\n扫描源代码...');
  const srcDir = path.join(PROJECT_ROOT, 'src');
  scanDirectory(srcDir);
  
  // 统计使用的键
  console.log('\n使用的翻译键统计:');
  let totalKeys = 0;
  for (const [namespace, keys] of Object.entries(usedKeys)) {
    console.log(`  ${namespace}: ${keys.size} 个键`);
    totalKeys += keys.size;
  }
  console.log(`\n总计: ${totalKeys} 个翻译键`);
  
  // 加载现有翻译文件
  const languages = [
    { file: 'en.json', name: '英文' },
    { file: 'vi.json', name: '越南语' },
    { file: 'zh-CN.json', name: '中文简体' },
    { file: 'zh-TW.json', name: '中文繁体' },
  ];
  
  console.log('\n' + '='.repeat(60));
  console.log('缺失翻译键分析');
  console.log('='.repeat(60));
  
  for (const lang of languages) {
    const messages = loadMessages(lang.file);
    const missing = findMissingKeys(messages, usedKeys);
    
    console.log(`\n【${lang.name}】${lang.file}:`);
    
    if (Object.keys(missing).length === 0) {
      console.log('  ✓ 无缺失');
    } else {
      let missingCount = 0;
      for (const [namespace, keys] of Object.entries(missing)) {
        console.log(`  ${namespace}: ${keys.join(', ')}`);
        missingCount += keys.length;
      }
      console.log(`  缺失总计: ${missingCount} 个`);
    }
  }
  
  // 生成建议的翻译内容
  console.log('\n' + '='.repeat(60));
  console.log('建议补充的翻译内容');
  console.log('='.repeat(60));
  
  // 收集所有缺失的键
  const allMissing = {};
  for (const lang of languages) {
    const messages = loadMessages(lang.file);
    const missing = findMissingKeys(messages, usedKeys);
    
    for (const [namespace, keys] of Object.entries(missing)) {
      if (!allMissing[namespace]) allMissing[namespace] = new Set();
      keys.forEach(k => allMissing[namespace].add(k));
    }
  }
  
  // 输出建议的 JSON
  console.log('\n建议添加到 messages 文件的内容:');
  console.log(JSON.stringify(
    Object.fromEntries(
      Object.entries(allMissing).map(([k, v]) => [k, Object.fromEntries(Array.from(v).map(key => [key, `[${key}]`]))])
    ),
    null,
    2
  ));
}

main();
