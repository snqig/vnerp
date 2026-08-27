#!/usr/bin/env node
/**
 * 扫描并修复缺少认证检查的页面
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// 需要检查认证的页面
const pagesToFix = [];

// 扫描页面
function scanPages() {
  const appDir = path.join(SRC_DIR, 'app', '[locale]');
  
  function scan(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scan(fullPath);
      } else if (item.name === 'page.tsx') {
        checkPage(fullPath);
      }
    }
  }
  
  scan(appDir);
}

// 检查页面是否有认证检查
function checkPage(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // 跳过登录页面
  if (relativePath.includes('login')) return;
  
  // 检查是否有认证相关代码
  const hasAuth = 
    content.includes('authFetch') ||
    content.includes('Bearer') ||
    content.includes('getToken') ||
    content.includes('useSession') ||
    content.includes('localStorage.getItem(\'token\'') ||
    content.includes("localStorage.getItem('token'");
  
  // 检查是否是客户端组件且有数据获取
  const isClientComponent = content.includes("'use client'");
  const hasDataFetch = content.includes('fetch(') || content.includes('useEffect');
  
  if (isClientComponent && hasDataFetch && !hasAuth) {
    pagesToFix.push({
      path: relativePath,
      fullPath: filePath,
      lineCount: content.split('\n').length,
    });
  }
}

// 生成修复报告
function generateReport() {
  console.log('='.repeat(80));
  console.log('Pages Missing Authentication Check');
  console.log('='.repeat(80));
  
  console.log(`\nTotal pages found: ${pagesToFix.length}\n`);
  
  // 按模块分组
  const byModule = {};
  for (const page of pagesToFix) {
    const parts = page.path.split(path.sep);
    const module = parts[3] || 'unknown';
    if (!byModule[module]) byModule[module] = [];
    byModule[module].push(page);
  }
  
  for (const [module, pages] of Object.entries(byModule)) {
    console.log(`\n[${module}] (${pages.length} pages)`);
    pages.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.path}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Solution: Add authFetch helper to each page');
  console.log('='.repeat(80));
  
  console.log(`
// Add this helper function at the top of each page component:

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }
  return fetch(url, { ...options, headers });
};

// Then replace all fetch() calls with authFetch()
`);
}

scanPages();
generateReport();
