#!/usr/bin/env node
/**
 * 扫描需要国际化的文件
 * 按优先级分类列出
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// 匹配中文字符的正则
const CHINESE_REGEX = /[\u4e00-\u9fa5]{2,}/g;

// 文件分类
const categories = {
  components: [],      // 通用组件
  layout: [],          // 布局组件
  pages: [],           // 页面
  highPriority: [],    // 高优先级
  mediumPriority: [],  // 中优先级
  lowPriority: []      // 低优先级
};

// 扫描文件
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否已经使用 useTranslations
    const hasTranslation = content.includes('useTranslations');
    
    // 查找中文字符串
    const matches = content.match(CHINESE_REGEX);
    if (!matches || matches.length === 0) return;
    
    // 过滤掉一些不需要翻译的
    const chineseStrings = matches.filter(s => {
      // 过滤掉注释中的
      return !s.match(/^[\d]+$/) && s.length >= 2;
    });
    
    if (chineseStrings.length === 0) return;
    
    const relativePath = path.relative(SRC_DIR, filePath);
    const fileInfo = {
      path: relativePath,
      fullPath: filePath,
      chineseCount: chineseStrings.length,
      hasTranslation,
      samples: [...new Set(chineseStrings)].slice(0, 5)
    };
    
    // 分类
    if (relativePath.includes('components/ui/')) {
      categories.components.push(fileInfo);
      categories.highPriority.push(fileInfo);
    } else if (relativePath.includes('components/layout/')) {
      categories.layout.push(fileInfo);
      categories.highPriority.push(fileInfo);
    } else if (relativePath.includes('/page.tsx')) {
      categories.pages.push(fileInfo);
      if (relativePath.includes('/new/') || relativePath.includes('/edit/') || relativePath.includes('/[id]/')) {
        categories.lowPriority.push(fileInfo);
      } else {
        categories.mediumPriority.push(fileInfo);
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
    } else if (item.isFile() && /\.(tsx|ts)$/.test(item.name)) {
      scanFile(fullPath);
    }
  }
}

// 主函数
function main() {
  console.log('扫描源代码目录...');
  scanDirectory(SRC_DIR);
  
  console.log('\n' + '='.repeat(60));
  console.log('高优先级文件（通用组件、布局）');
  console.log('='.repeat(60));
  
  const highSorted = categories.highPriority.sort((a, b) => b.chineseCount - a.chineseCount);
  console.log(`\n共 ${highSorted.length} 个文件需要处理:\n`);
  
  highSorted.slice(0, 20).forEach((f, i) => {
    console.log(`${i + 1}. ${f.path}`);
    console.log(`   中文字符串: ${f.chineseCount} 个`);
    console.log(`   已使用翻译: ${f.hasTranslation ? '是' : '否'}`);
    console.log(`   示例: ${f.samples.join(', ')}`);
    console.log('');
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('中优先级文件（列表页面）');
  console.log('='.repeat(60));
  
  const mediumSorted = categories.mediumPriority.sort((a, b) => b.chineseCount - a.chineseCount);
  console.log(`\n共 ${mediumSorted.length} 个文件需要处理:\n`);
  
  mediumSorted.slice(0, 15).forEach((f, i) => {
    console.log(`${i + 1}. ${f.path}`);
    console.log(`   中文字符串: ${f.chineseCount} 个`);
    console.log(`   已使用翻译: ${f.hasTranslation ? '是' : '否'}`);
    console.log('');
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('低优先级文件（详情/编辑页面）');
  console.log('='.repeat(60));
  
  const lowSorted = categories.lowPriority.sort((a, b) => b.chineseCount - a.chineseCount);
  console.log(`\n共 ${lowSorted.length} 个文件需要处理:\n`);
  
  lowSorted.slice(0, 10).forEach((f, i) => {
    console.log(`${i + 1}. ${f.path}`);
    console.log(`   中文字符串: ${f.chineseCount} 个`);
    console.log('');
  });
  
  // 输出统计
  console.log('\n' + '='.repeat(60));
  console.log('统计汇总');
  console.log('='.repeat(60));
  console.log(`高优先级: ${categories.highPriority.length} 个文件`);
  console.log(`中优先级: ${categories.mediumPriority.length} 个文件`);
  console.log(`低优先级: ${categories.lowPriority.length} 个文件`);
  console.log(`总计: ${categories.highPriority.length + categories.mediumPriority.length + categories.lowPriority.length} 个文件`);
  
  // 输出文件列表供后续处理
  const output = {
    highPriority: highSorted.slice(0, 20).map(f => f.fullPath),
    mediumPriority: mediumSorted.slice(0, 15).map(f => f.fullPath),
    lowPriority: lowSorted.slice(0, 10).map(f => f.fullPath)
  };
  
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'scripts', 'i18n-files-to-fix.json'),
    JSON.stringify(output, null, 2)
  );
  
  console.log('\n文件列表已保存到: scripts/i18n-files-to-fix.json');
}

main();
