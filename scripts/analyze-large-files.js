#!/usr/bin/env node
/**
 * 分析大文件并生成拆分建议
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// 大文件列表
const largeFiles = [];

// 扫描大文件
function scanLargeFiles() {
  const appDir = path.join(SRC_DIR, 'app', '[locale]');
  
  function scan(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scan(fullPath);
      } else if (item.name === 'page.tsx') {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        if (lines > 500) {
          largeFiles.push({
            path: path.relative(SRC_DIR, fullPath),
            fullPath,
            lines,
            components: countComponents(content),
            functions: countFunctions(content),
          });
        }
      }
    }
  }
  
  scan(appDir);
}

// 统计组件数量
function countComponents(content) {
  const matches = content.match(/<[A-Z][a-zA-Z]*/g);
  return matches ? matches.length : 0;
}

// 统计函数数量
function countFunctions(content) {
  const matches = content.match(/(function|const|async)\s+\w+\s*[=\(]/g);
  return matches ? matches.length : 0;
}

// 生成拆分建议
function generateSuggestions() {
  console.log('='.repeat(80));
  console.log('Large Files Analysis & Refactoring Suggestions');
  console.log('='.repeat(80));
  
  console.log(`\nFound ${largeFiles.length} files with more than 500 lines:\n`);
  
  // 按行数排序
  largeFiles.sort((a, b) => b.lines - a.lines);
  
  for (const file of largeFiles) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`File: ${file.path}`);
    console.log(`Lines: ${file.lines} | Components: ${file.components} | Functions: ${file.functions}`);
    console.log('─'.repeat(80));
    
    // 生成拆分建议
    console.log('\nSuggested Refactoring:');
    
    if (file.lines > 2000) {
      console.log('  1. Extract components to separate files');
      console.log('  2. Create custom hooks for data fetching');
      console.log('  3. Move constants and configurations to separate files');
      console.log('  4. Create utility functions for common operations');
    } else if (file.lines > 1000) {
      console.log('  1. Extract reusable components');
      console.log('  2. Create custom hooks');
      console.log('  3. Move helper functions to utils');
    } else {
      console.log('  1. Consider extracting large components');
      console.log('  2. Move complex logic to custom hooks');
    }
    
    // 建议的文件结构
    const baseName = path.basename(path.dirname(file.fullPath));
    console.log(`\n  Suggested Structure:`);
    console.log(`    ${baseName}/`);
    console.log(`      page.tsx (main page, < 200 lines)`);
    console.log(`      components/`);
    console.log(`        TableSection.tsx`);
    console.log(`        FormSection.tsx`);
    console.log(`        FilterSection.tsx`);
    console.log(`      hooks/`);
    console.log(`        useData.ts`);
    console.log(`        useActions.ts`);
    console.log(`      utils/`);
    console.log(`        helpers.ts`);
    console.log(`        constants.ts`);
  }
  
  // 总结
  console.log('\n' + '='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  
  const totalLines = largeFiles.reduce((sum, f) => sum + f.lines, 0);
  console.log(`\nTotal large files: ${largeFiles.length}`);
  console.log(`Total lines: ${totalLines}`);
  console.log(`Average lines per file: ${Math.round(totalLines / largeFiles.length)}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('Priority Refactoring Order');
  console.log('='.repeat(80));
  
  const priority = largeFiles.filter(f => f.lines > 1500).slice(0, 5);
  console.log('\nTop 5 files to refactor first:');
  priority.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.path} (${f.lines} lines)`);
  });
}

scanLargeFiles();
generateSuggestions();
