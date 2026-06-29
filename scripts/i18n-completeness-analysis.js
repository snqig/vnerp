#!/usr/bin/env node
/**
 * 国际化完成度详细分析脚本
 * 逐一分析每个模块页面的硬编码情况
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// 模块定义
const MODULES = {
  'Inventory': ['warehouse/inventory', 'warehouse/stocktaking', 'warehouse/stock-adjust'],
  'Warehouse': ['warehouse/inbound', 'warehouse/outbound', 'warehouse/transfer', 'warehouse/setup'],
  'Sample': ['sample/standard-card', 'sample/orders', 'sample/management'],
  'Sales': ['sales/delivery', 'sales/return', 'sales/reconciliation'],
  'Purchase': ['purchase/request', 'purchase/orders', 'purchase/suppliers'],
  'Production': ['production/workorder', 'production/schedule', 'production/process'],
  'Quality': ['quality/incoming', 'quality/process', 'quality/final', 'quality/complaint'],
  'Equipment': ['equipment/maintenance', 'equipment/calibration', 'equipment/repair'],
  'HR': ['hr/employee', 'hr/attendance', 'hr/salary', 'hr/training'],
  'Finance': ['finance/receivable', 'finance/payables', 'finance/cost', 'finance/report'],
  'System': ['settings/user', 'settings/roles', 'settings/menus', 'settings/dict'],
  'Orders': ['orders/sales', 'orders/customers', 'orders/bom', 'orders/products'],
  'Dcprint': ['dcprint/ink', 'dcprint/die', 'dcprint/labels', 'dcprint/process-cards'],
  'Outsource': ['outsource/order', 'outsource/issue', 'outsource/receive'],
  'CRM': ['crm/follow', 'crm/analysis'],
  'SRM': ['srm/evaluation'],
  'Delivery': ['delivery/vehicles'],
  'Engineering': ['engineering/sop', 'engineering/sample-to-mass'],
};

// 统计信息
const stats = {
  totalFiles: 0,
  totalWithChinese: 0,
  totalWithTranslation: 0,
  modules: {},
};

// 检查文件是否包含中文
function hasChinese(content) {
  return /[\u4e00-\u9fa5]{2,}/.test(content);
}

// 检查是否使用翻译钩子
function hasTranslationHook(content) {
  return content.includes('useTranslations');
}

// 统计中文字符串数量
function countChineseStrings(content) {
  const matches = content.match(/[\u4e00-\u9fa5]{2,}/g);
  return matches ? matches.length : 0;
}

// 扫描模块文件
function scanModuleFiles(modulePath) {
  const files = [];
  const fullModulePath = path.join(SRC_DIR, 'app', '[locale]', modulePath);
  
  if (!fs.existsSync(fullModulePath)) {
    return files;
  }
  
  function scan(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scan(fullPath);
      } else if (item.isFile() && /\.(tsx|ts)$/.test(item.name)) {
        files.push(fullPath);
      }
    }
  }
  
  scan(fullModulePath);
  return files;
}

// 分析单个文件
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(SRC_DIR, filePath);
    
    return {
      path: relativePath,
      hasChinese: hasChinese(content),
      hasTranslation: hasTranslationHook(content),
      chineseCount: countChineseStrings(content),
      needsFix: hasChinese(content) && !hasTranslationHook(content),
    };
  } catch (e) {
    return null;
  }
}

// 主函数
function main() {
  console.log('='.repeat(80));
  console.log('i18n Completeness Analysis Report');
  console.log('='.repeat(80));
  
  // 分析每个模块
  for (const [moduleName, modulePaths] of Object.entries(MODULES)) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${moduleName}]`);
    console.log('='.repeat(80));
    
    const moduleStats = {
      totalFiles: 0,
      withChinese: 0,
      withTranslation: 0,
      needsFix: 0,
      files: [],
    };
    
    for (const modulePath of modulePaths) {
      const files = scanModuleFiles(modulePath);
      
      for (const file of files) {
        const result = analyzeFile(file);
        if (!result) continue;
        
        moduleStats.totalFiles++;
        stats.totalFiles++;
        
        if (result.hasChinese) {
          moduleStats.withChinese++;
          stats.totalWithChinese++;
        }
        
        if (result.hasTranslation) {
          moduleStats.withTranslation++;
          stats.totalWithTranslation++;
        }
        
        if (result.needsFix) {
          moduleStats.needsFix++;
          moduleStats.files.push(result);
        }
      }
    }
    
    stats.modules[moduleName] = moduleStats;
    
    // 计算完成度
    const completionRate = moduleStats.totalFiles > 0 
      ? Math.round((moduleStats.withTranslation / moduleStats.totalFiles) * 100) 
      : 0;
    
    console.log(`\nTotal files: ${moduleStats.totalFiles}`);
    console.log(`With Chinese: ${moduleStats.withChinese}`);
    console.log(`With i18n: ${moduleStats.withTranslation}`);
    console.log(`Needs fix: ${moduleStats.needsFix}`);
    console.log(`Completion: ${completionRate}%`);
    
    // 显示需要修复的文件
    if (moduleStats.files.length > 0) {
      console.log(`\nFiles need fix:`);
      moduleStats.files.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.path}`);
        console.log(`     Chinese strings: ${f.chineseCount}`);
      });
    }
  }
  
  // 总体统计
  console.log('\n' + '='.repeat(80));
  console.log('Overall Statistics');
  console.log('='.repeat(80));
  
  const overallCompletion = stats.totalFiles > 0 
    ? Math.round((stats.totalWithTranslation / stats.totalFiles) * 100) 
    : 0;
  
  console.log(`\nTotal files: ${stats.totalFiles}`);
  console.log(`With Chinese: ${stats.totalWithChinese}`);
  console.log(`With i18n: ${stats.totalWithTranslation}`);
  console.log(`Needs fix: ${stats.totalFiles - stats.totalWithTranslation}`);
  console.log(`Overall completion: ${overallCompletion}%`);
  
  // 模块排名
  console.log('\n' + '='.repeat(80));
  console.log('Module Completion Ranking');
  console.log('='.repeat(80));
  
  const rankings = Object.entries(stats.modules)
    .map(([name, s]) => ({
      name,
      rate: s.totalFiles > 0 ? Math.round((s.withTranslation / s.totalFiles) * 100) : 0,
      needsFix: s.needsFix,
    }))
    .sort((a, b) => a.rate - b.rate);
  
  console.log('\n');
  rankings.forEach((r, i) => {
    const bar = '#'.repeat(Math.ceil(r.rate / 5));
    const status = r.needsFix > 0 ? `[!] ${r.needsFix} files to fix` : '[OK]';
    console.log(`${(i + 1).toString().padStart(2)}. ${r.name.padEnd(20)} ${r.rate.toString().padStart(3)}% ${bar.padEnd(20)} ${status}`);
  });
  
  // 优先修复建议
  console.log('\n' + '='.repeat(80));
  console.log('Priority Fix Suggestions');
  console.log('='.repeat(80));
  
  const needsFix = rankings.filter(r => r.needsFix > 0);
  if (needsFix.length > 0) {
    console.log('\nSuggested fix order:');
    needsFix.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name} (${r.needsFix} files)`);
    });
  } else {
    console.log('\n[OK] All modules completed i18n!');
  }
}

main();
