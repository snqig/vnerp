#!/usr/bin/env node
/**
 * 分析项目中真正缺失的翻译键
 * 过滤掉 API 参数名等不需要翻译的内容
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'messages');

// 需要翻译的命名空间（这些是 UI 显示用的）
const UI_NAMESPACES = [
  'Common', 'Nav', 'Auth', 'Dashboard', 'Orders', 'Warehouse',
  'Production', 'Dcprint', 'Purchase', 'Sales', 'Finance',
  'Quality', 'Equipment', 'Outsource', 'Srm', 'Crm', 'Hr',
  'System', 'Engineering', 'Delivery', 'Business', 'Theme',
  'Validation', 'Error', 'Success'
];

// 不需要翻译的键（通常是 API 参数名）
const SKIP_KEYS = new Set([
  'id', 'Ids', 'page', 'pageSize', 'page_size', 'limit', 'offset',
  'startTime', 'endTime', 'startDate', 'endDate', 'start_date', 'end_date',
  'module', 'type', 'status', 'action', 'format', 'mode', 'code', 'name',
  'warehouseId', 'materialId', 'productId', 'customerId', 'supplierId',
  'departmentId', 'deptId', 'dept_id', 'roleId', 'role_id', 'userId',
  'orderId', 'order_id', 'workOrderId', 'work_order_id', 'work_order_no',
  'categoryId', 'category_id', 'parentId', 'parentId',
  'sourceNo', 'sourceId', 'sourceType', 'ref_no',
  'voucherNo', 'period', 'authorization',
  'logType', 'businessType', 'financeType',
  'keyword', 'queryType', 'searchType',
  'materialCode', 'material_code', 'productCode', 'product_code',
  'customerCode', 'supplierCode', 'employeeNo', 'employee_no',
  'workOrderNo', 'orderNo', 'reviewNo', 'recordNo',
  'batchNo', 'batch_no', 'labelNo', 'cardNo',
  'inkCode', 'ink_code', 'plateCode', 'dieCode',
  'inspectionNo', 'calibrationNo', 'maintenanceNo', 'repairNo', 'scrapNo',
  'complaintNo', 'testNo', 'auditNo', 'handleNo',
  'issueNo', 'receiveNo', 'settlementNo', 'returnNo', 'transferNo',
  'inboundNo', 'outboundNo', 'adjustNo', 'checkNo',
  'ecoNo', 'sopNo', 'sampleOrderNo', 'purchaseOrderNo', 'poNo',
  'outsourceOrderNo', 'planNo',
  'quantity', 'requiredQty', 'minPackageQty', 'stock_qty', 'safety_stock',
  'available_qty', 'locked_qty', 'minWeight', 'threshold',
  'ink_type', 'inkType', 'testType', 'certType', 'handleType',
  'sopType', 'ecoType', 'followType', 'customerType', 'trainingType',
  'maintenanceType', 'adjustType', 'checkType', 'auditType',
  'materialType', 'categoryName', 'category_name',
  'customerName', 'customer_name', 'supplierName', 'supplier_name',
  'materialName', 'material_name', 'productName', 'product_name',
  'employeeName', 'contactName', 'contact_name', 'realName',
  'inkName', 'ink_name', 'plateName', 'dieName',
  'noticeTitle', 'operName', 'configName', 'dictName', 'dictLabel',
  'trainingName', 'sopName',
  'contactPhone', 'contact_phone', 'phone',
  'customerLevel', 'supplierLevel', 'credit_level',
  'deliveryStatus', 'delivery_status', 'handleStatus', 'followUpStatus',
  'burdeningStatus', 'lockStatus',
  'isMainMaterial', 'isUsed', 'isCut', 'isCurrent', 'isObsolete', 'isActive',
  'includeObsolete', 'autoFix', 'autoPrint', 'slowOnly',
  'workshop', 'sn', 'section', 'position', 'department', 'month',
  'days', 'step', 'bucket_size', 'subgroup_size',
  'materialKeyword', 'sourceLabelNo', 'mainLabelNo', 'qrCode', 'qr_code',
  'pantoneCode', 'colorName', 'specification', 'unit',
  'bom_version', 'entry_date', 'native_place', 'education', 'gender', 'age',
  'template_code', 'template_name', 'template_type',
  'planned_start_date', 'request_date', 'notify_date', 'order_date', 'delivery_date',
  'po_no', 'total_quantity', 'grand_total', 'total_amount',
  'request_dept', 'requester_name', 'request_type',
  'expiry_date', 'workflowId', 'instanceId',
  'card_id', 'old_params', 'new_params',
  'equipment_type', 'asset_type', 'die_status', 'die_id',
  'work_report_id', 'material_id', 'warehouse_id', 'product_id',
  'work_order_ids', 'supplier_type', 'qr_type',
  'sample_order_id', 'period_type', 'cost_type', 'variance_type',
  'lifecycleStage', 'dictTypeId', 'dictType', 'configKey',
  'current', 'file', 'task', 'T', 'a', 'div', 'h1', 'thead', 'tbody', 'tr',
  '0', '100', '1234', '2d', 'V1', 'xss'
]);

// 所有翻译键（按命名空间分组）
const usedKeys = {};

// 从代码中提取翻译键
function extractKeysFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 匹配 t('Namespace.key') 或 t('key') 模式
    const patterns = [
      /t\(['"]([\w.-]+)['"]\)/g,
      /\$t\(['"]([\w.-]+)['"]\)/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const fullKey = match[1];
        
        // 解析命名空间和键
        if (fullKey.includes('.')) {
          const [namespace, ...rest] = fullKey.split('.');
          const key = rest.join('.');
          
          // 只记录 UI 命名空间且不在跳过列表中的键
          if (UI_NAMESPACES.includes(namespace) && !SKIP_KEYS.has(key)) {
            if (!usedKeys[namespace]) usedKeys[namespace] = new Set();
            usedKeys[namespace].add(key);
          }
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
  console.log('UI 翻译键分析');
  console.log('='.repeat(60));
  
  // 扫描源代码
  console.log('\n扫描源代码...');
  const srcDir = path.join(PROJECT_ROOT, 'src');
  scanDirectory(srcDir);
  
  // 统计使用的键
  console.log('\n使用的 UI 翻译键统计:');
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
  
  // 收集所有缺失的键
  const allMissing = {};
  
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
        
        if (!allMissing[namespace]) allMissing[namespace] = new Set();
        keys.forEach(k => allMissing[namespace].add(k));
      }
      console.log(`  缺失总计: ${missingCount} 个`);
    }
  }
  
  // 输出需要补充的翻译
  if (Object.keys(allMissing).length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('需要补充的翻译');
    console.log('='.repeat(60));
    
    for (const [namespace, keys] of Object.entries(allMissing)) {
      console.log(`\n【${namespace}】`);
      for (const key of keys) {
        console.log(`  ${key}: 需要翻译`);
      }
    }
  } else {
    console.log('\n\n✓ 所有翻译键都已完整！');
  }
}

main();
