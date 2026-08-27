#!/usr/bin/env node
/**
 * ERP 项目全面分析脚本
 * 分析 PLM、CRM、SCM、ERP、MES、QM、EMS、WMS 等模块
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// 模块定义
const MODULES = {
  // ERP 核心模块
  'ERP_Orders': { name: '订单管理', path: 'orders', system: 'ERP' },
  'ERP_Purchase': { name: '采购管理', path: 'purchase', system: 'ERP' },
  'ERP_Sales': { name: '销售管理', path: 'sales', system: 'ERP' },
  'ERP_Finance': { name: '财务管理', path: 'finance', system: 'ERP' },
  'ERP_HR': { name: '人事管理', path: 'hr', system: 'ERP' },
  
  // WMS 仓库管理
  'WMS_Warehouse': { name: '仓库管理', path: 'warehouse', system: 'WMS' },
  'WMS_Inventory': { name: '库存管理', path: 'warehouse/inventory', system: 'WMS' },
  'WMS_Inbound': { name: '入库管理', path: 'warehouse/inbound', system: 'WMS' },
  'WMS_Outbound': { name: '出库管理', path: 'warehouse/outbound', system: 'WMS' },
  
  // MES 生产管理
  'MES_Production': { name: '生产管理', path: 'production', system: 'MES' },
  'MES_WorkOrder': { name: '工单管理', path: 'production/workorder', system: 'MES' },
  'MES_Schedule': { name: '生产排程', path: 'production/schedule', system: 'MES' },
  'MES_Material': { name: '领料管理', path: 'production/material-issue', system: 'MES' },
  
  // QM 质量管理
  'QM_Quality': { name: '质量管理', path: 'quality', system: 'QM' },
  'QM_Incoming': { name: '来料检验', path: 'quality/incoming', system: 'QM' },
  'QM_Process': { name: '过程检验', path: 'quality/process', system: 'QM' },
  'QM_Final': { name: '成品检验', path: 'quality/final', system: 'QM' },
  
  // EMS 设备管理
  'EMS_Equipment': { name: '设备管理', path: 'equipment', system: 'EMS' },
  'EMS_Maintenance': { name: '设备保养', path: 'equipment/maintenance', system: 'EMS' },
  'EMS_Repair': { name: '设备维修', path: 'equipment/repair', system: 'EMS' },
  
  // CRM 客户管理
  'CRM_Customer': { name: '客户管理', path: 'crm', system: 'CRM' },
  'CRM_Follow': { name: '客户跟进', path: 'crm/follow', system: 'CRM' },
  
  // SRM/SCM 供应商管理
  'SCM_Supplier': { name: '供应商管理', path: 'srm', system: 'SCM' },
  'SCM_Purchase': { name: '采购管理', path: 'purchase', system: 'SCM' },
  
  // PLM 产品生命周期
  'PLM_Engineering': { name: '工程管理', path: 'engineering', system: 'PLM' },
  'PLM_BOM': { name: 'BOM管理', path: 'orders/bom', system: 'PLM' },
  'PLM_ECO': { name: '工程变更', path: 'plm/eco', system: 'PLM' },
  
  // 印刷专用
  'DCPRINT_Ink': { name: '油墨管理', path: 'dcprint/ink', system: 'DCPRINT' },
  'DCPRINT_Die': { name: '刀模管理', path: 'dcprint/die', system: 'DCPRINT' },
  'DCPRINT_Label': { name: '标签管理', path: 'dcprint/labels', system: 'DCPRINT' },
  
  // 委外管理
  'Outsource': { name: '委外管理', path: 'outsource', system: 'ERP' },
  
  // 配送管理
  'Delivery': { name: '配送管理', path: 'delivery', system: 'ERP' },
  
  // 系统设置
  'System': { name: '系统设置', path: 'settings', system: 'System' },
};

// 分析结果
const analysis = {
  summary: {
    totalPages: 0,
    totalApis: 0,
    totalComponents: 0,
    totalTables: 0,
    issues: [],
  },
  modules: {},
  relationships: [],
  dataFlow: [],
};

// 扫描页面
function scanPages(modulePath) {
  const pages = [];
  const fullPath = path.join(SRC_DIR, 'app', '[locale]', modulePath);
  
  if (!fs.existsSync(fullPath)) return pages;
  
  function scan(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) {
        scan(p);
      } else if (item.name === 'page.tsx') {
        pages.push(p);
      }
    }
  }
  
  scan(fullPath);
  return pages;
}

// 扫描 API
function scanApis(modulePath) {
  const apis = [];
  const fullPath = path.join(SRC_DIR, 'app', 'api', modulePath);
  
  if (!fs.existsSync(fullPath)) return apis;
  
  function scan(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) {
        scan(p);
      } else if (item.name === 'route.ts') {
        apis.push(p);
      }
    }
  }
  
  scan(fullPath);
  return apis;
}

// 分析文件内容
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    return {
      hasTranslation: content.includes('useTranslations'),
      hasAuthFetch: content.includes('authFetch') || content.includes('Bearer'),
      hasToast: content.includes('toast.') || content.includes('useToast'),
      hasForm: content.includes('useState') && content.includes('handleSubmit'),
      hasTable: content.includes('<Table') || content.includes('DataTable'),
      hasDialog: content.includes('Dialog') || content.includes('Modal'),
      hasLoading: content.includes('loading') || content.includes('setLoading'),
      hasError: content.includes('catch') || content.includes('error'),
      lineCount: content.split('\n').length,
    };
  } catch (e) {
    return {};
  }
}

// 检查问题
function checkIssues(moduleKey, pages, apis) {
  const issues = [];
  
  // 检查页面问题
  for (const page of pages) {
    const analysis = analyzeFile(page);
    const pageName = path.basename(path.dirname(page));
    
    if (!analysis.hasTranslation) {
      issues.push({
        type: 'i18n',
        severity: 'medium',
        file: pageName,
        message: 'Missing i18n translation',
      });
    }
    
    if (!analysis.hasAuthFetch && analysis.lineCount > 50) {
      issues.push({
        type: 'auth',
        severity: 'high',
        file: pageName,
        message: 'Missing authentication check',
      });
    }
    
    if (!analysis.hasError && analysis.hasForm) {
      issues.push({
        type: 'error',
        severity: 'medium',
        file: pageName,
        message: 'Missing error handling',
      });
    }
    
    if (analysis.lineCount > 500) {
      issues.push({
        type: 'size',
        severity: 'low',
        file: pageName,
        message: `Large file (${analysis.lineCount} lines), consider splitting`,
      });
    }
  }
  
  // 检查 API 问题
  if (apis.length === 0 && pages.length > 0) {
    issues.push({
      type: 'api',
      severity: 'high',
      file: 'N/A',
      message: 'No API routes found for this module',
    });
  }
  
  return issues;
}

// 主函数
function main() {
  console.log('='.repeat(80));
  console.log('ERP Project Comprehensive Analysis');
  console.log('='.repeat(80));
  console.log('\nSystems: PLM, CRM, SCM, ERP, MES, QM, EMS, WMS');
  console.log('='.repeat(80));
  
  // 分析每个模块
  for (const [key, config] of Object.entries(MODULES)) {
    const pages = scanPages(config.path);
    const apis = scanApis(config.path);
    const issues = checkIssues(key, pages, apis);
    
    analysis.modules[key] = {
      name: config.name,
      system: config.system,
      pages: pages.length,
      apis: apis.length,
      issues: issues,
      issueCount: issues.length,
    };
    
    analysis.summary.totalPages += pages.length;
    analysis.summary.totalApis += apis.length;
  }
  
  // 按系统分组统计
  console.log('\n' + '='.repeat(80));
  console.log('System Summary');
  console.log('='.repeat(80));
  
  const systems = {};
  for (const [key, m] of Object.entries(analysis.modules)) {
    if (!systems[m.system]) {
      systems[m.system] = { pages: 0, apis: 0, issues: 0, modules: [] };
    }
    systems[m.system].pages += m.pages;
    systems[m.system].apis += m.apis;
    systems[m.system].issues += m.issueCount;
    systems[m.system].modules.push(m.name);
  }
  
  console.log('\n');
  for (const [sys, data] of Object.entries(systems)) {
    const status = data.issues > 0 ? `[!] ${data.issues} issues` : '[OK]';
    console.log(`${sys.padEnd(10)} | Pages: ${data.pages.toString().padStart(3)} | APIs: ${data.apis.toString().padStart(3)} | ${status}`);
  }
  
  // 模块详情
  console.log('\n' + '='.repeat(80));
  console.log('Module Details');
  console.log('='.repeat(80));
  
  for (const [key, m] of Object.entries(analysis.modules)) {
    console.log(`\n[${m.system}] ${m.name}`);
    console.log(`  Pages: ${m.pages}, APIs: ${m.apis}`);
    
    if (m.issues.length > 0) {
      console.log(`  Issues (${m.issues.length}):`);
      m.issues.slice(0, 5).forEach(i => {
        console.log(`    - [${i.severity}] ${i.message} (${i.file})`);
      });
      if (m.issues.length > 5) {
        console.log(`    ... and ${m.issues.length - 5} more issues`);
      }
    } else {
      console.log('  Status: OK');
    }
  }
  
  // 问题汇总
  console.log('\n' + '='.repeat(80));
  console.log('Issue Summary');
  console.log('='.repeat(80));
  
  const allIssues = [];
  for (const [key, m] of Object.entries(analysis.modules)) {
    m.issues.forEach(i => {
      allIssues.push({ ...i, module: m.name, system: m.system });
    });
  }
  
  const issuesByType = {};
  const issuesBySeverity = { high: 0, medium: 0, low: 0 };
  
  allIssues.forEach(i => {
    issuesByType[i.type] = (issuesByType[i.type] || 0) + 1;
    issuesBySeverity[i.severity]++;
  });
  
  console.log('\nBy Severity:');
  console.log(`  High:   ${issuesBySeverity.high}`);
  console.log(`  Medium: ${issuesBySeverity.medium}`);
  console.log(`  Low:    ${issuesBySeverity.low}`);
  
  console.log('\nBy Type:');
  for (const [type, count] of Object.entries(issuesByType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(10)}: ${count}`);
  }
  
  // 总体统计
  console.log('\n' + '='.repeat(80));
  console.log('Overall Statistics');
  console.log('='.repeat(80));
  console.log(`\nTotal Pages: ${analysis.summary.totalPages}`);
  console.log(`Total APIs: ${analysis.summary.totalApis}`);
  console.log(`Total Issues: ${allIssues.length}`);
  
  // 完成度评估
  const completionRate = Math.round(
    ((analysis.summary.totalPages - issuesBySeverity.high) / analysis.summary.totalPages) * 100
  );
  console.log(`\nProject Completion: ${completionRate}%`);
  
  // 优先修复建议
  console.log('\n' + '='.repeat(80));
  console.log('Priority Fix Recommendations');
  console.log('='.repeat(80));
  
  const highIssues = allIssues.filter(i => i.severity === 'high');
  if (highIssues.length > 0) {
    console.log('\nHigh Priority Issues:');
    highIssues.slice(0, 10).forEach((i, idx) => {
      console.log(`  ${idx + 1}. [${i.system}] ${i.module}: ${i.message}`);
    });
  }
}

main();
