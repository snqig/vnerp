#!/usr/bin/env node
/**
 * 扫描项目中使用的翻译键
 * 与翻译文件对比，找出缺失的翻译
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'messages');

// 收集使用的翻译键
const usedKeys = {};

// 扫描文件中的翻译键使用
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 匹配 useTranslations('Namespace') 模式
    const namespaceMatches = content.matchAll(/useTranslations\(['"]([\w]+)['"]\)/g);
    const namespaces = [];
    for (const match of namespaceMatches) {
      namespaces.push(match[1]);
    }
    
    // 如果找到命名空间，查找 t('key') 调用
    if (namespaces.length > 0) {
      // 匹配 t('key') 模式
      const keyMatches = content.matchAll(/\bt\(['"]([\w]+)['"]\)/g);
      for (const match of keyMatches) {
        const key = match[1];
        for (const ns of namespaces) {
          if (!usedKeys[ns]) usedKeys[ns] = new Set();
          usedKeys[ns].add(key);
        }
      }
    }
  } catch (e) {
    // 忽略错误
  }
}

// 递归扫描目录
function scanDirectory(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'build'].includes(item.name)) {
        scanDirectory(fullPath);
      }
    } else if (item.isFile() && /\.(tsx|ts|jsx|js)$/.test(item.name)) {
      scanFile(fullPath);
    }
  }
}

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
  console.log('='.repeat(60));
  console.log('项目翻译键使用分析');
  console.log('='.repeat(60));
  
  // 扫描源代码
  console.log('\n扫描源代码...');
  scanDirectory(SRC_DIR);
  
  // 加载翻译文件
  const zhCN = loadMessages('zh-CN.json');
  
  // 统计使用的键
  console.log('\n【使用的翻译键统计】');
  let totalUsed = 0;
  let totalMissing = 0;
  
  for (const [ns, keys] of Object.entries(usedKeys).sort()) {
    const nsKeys = zhCN[ns] || {};
    const missing = [];
    
    for (const key of keys) {
      if (!nsKeys[key]) {
        missing.push(key);
      }
    }
    
    totalUsed += keys.size;
    totalMissing += missing.length;
    
    const status = missing.length === 0 ? '✓' : `缺 ${missing.length}`;
    console.log(`  ${ns.padEnd(20)} ${keys.size.toString().padStart(3)} 个键 ${status}`);
    
    if (missing.length > 0) {
      console.log(`    缺失: ${missing.join(', ')}`);
    }
  }
  
  console.log(`\n总计: 使用 ${totalUsed} 个翻译键，缺失 ${totalMissing} 个`);
  
  // 检查翻译文件中未被使用的键
  console.log('\n' + '='.repeat(60));
  console.log('未使用的翻译键');
  console.log('='.repeat(60));
  
  let totalUnused = 0;
  for (const [ns, keys] of Object.entries(zhCN).sort()) {
    const usedNsKeys = usedKeys[ns] || new Set();
    const unused = [];
    
    for (const key of Object.keys(keys)) {
      if (!usedNsKeys.has(key)) {
        unused.push(key);
      }
    }
    
    totalUnused += unused.length;
    
    if (unused.length > 0) {
      console.log(`\n【${ns}】(${unused.length}个未使用)`);
      console.log(`  ${unused.join(', ')}`);
    }
  }
  
  console.log(`\n总计: ${totalUnused} 个未使用的翻译键`);
}

main();
