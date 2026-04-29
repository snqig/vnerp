/**
 * 数据库表使用情况静态分析脚本
 * 基于代码分析，不连接数据库
 */

import * as fs from 'fs';
import * as path from 'path';

// 数据库schema中定义的所有表
const schemaTables = [
  // 系统管理模块
  { name: 'sys_user', module: '系统管理', description: '系统用户表' },
  { name: 'sys_department', module: '系统管理', description: '部门表' },
  { name: 'sys_role', module: '系统管理', description: '角色表' },
  { name: 'sys_user_role', module: '系统管理', description: '用户角色关联表' },
  { name: 'sys_menu', module: '系统管理', description: '菜单权限表' },
  { name: 'sys_role_menu', module: '系统管理', description: '角色菜单关联表' },
  { name: 'sys_operation_log', module: '系统管理', description: '操作日志表' },
  { name: 'sys_login_log', module: '系统管理', description: '登录日志表' },
  { name: 'sys_dict_type', module: '系统管理', description: '字典类型表' },
  { name: 'sys_dict_data', module: '系统管理', description: '字典数据表' },
  { name: 'sys_config', module: '系统管理', description: '系统配置表' },

  // 客户管理模块
  { name: 'crm_customer', module: '客户管理', description: '客户表' },
  { name: 'crm_customer_contact', module: '客户管理', description: '客户联系人表' },
  { name: 'crm_customer_follow_up', module: '客户管理', description: '客户跟进记录表' },

  // 供应商管理模块
  { name: 'pur_supplier', module: '供应商管理', description: '供应商表' },
  { name: 'pur_supplier_material', module: '供应商管理', description: '供应商物料关联表' },

  // 物料管理模块
  { name: 'inv_material_category', module: '物料管理', description: '物料分类表' },
  { name: 'inv_material', module: '物料管理', description: '物料表' },
  { name: 'inv_warehouse', module: '物料管理', description: '仓库表' },
  { name: 'inv_inventory', module: '物料管理', description: '库存表' },
  { name: 'inv_inventory_log', module: '物料管理', description: '库存日志表' },

  // 采购管理模块
  { name: 'pur_request', module: '采购管理', description: '采购申请单表' },
  { name: 'pur_request_detail', module: '采购管理', description: '采购申请明细表' },
  { name: 'pur_order', module: '采购管理', description: '采购订单表' },
  { name: 'pur_order_detail', module: '采购管理', description: '采购订单明细表' },
  { name: 'pur_receipt', module: '采购管理', description: '采购入库单表' },
  { name: 'pur_receipt_detail', module: '采购管理', description: '采购入库明细表' },

  // 销售管理模块
  { name: 'sal_order', module: '销售管理', description: '销售订单表' },
  { name: 'sal_order_detail', module: '销售管理', description: '销售订单明细表' },
  { name: 'sal_delivery', module: '销售管理', description: '销售出库单表' },
  { name: 'sal_delivery_detail', module: '销售管理', description: '销售出库明细表' },

  // 生产管理模块
  { name: 'prd_standard_card', module: '生产管理', description: '标准卡表' },
  { name: 'prd_work_order', module: '生产管理', description: '生产工单表' },
  { name: 'prd_bom', module: '生产管理', description: 'BOM表' },
  { name: 'prd_bom_detail', module: '生产管理', description: 'BOM明细表' },

  // 财务管理模块
  { name: 'fin_receivable', module: '财务管理', description: '应收款表' },
  { name: 'fin_payable', module: '财务管理', description: '应付款表' },
  { name: 'fin_receipt_record', module: '财务管理', description: '收款记录表' },
  { name: 'fin_payment_record', module: '财务管理', description: '付款记录表' },

  // 质量管理模块
  { name: 'qc_inspection', module: '质量管理', description: '质检记录表' },
  { name: 'qc_unqualified', module: '质量管理', description: '不合格品记录表' },
];

// 从API代码中提取实际使用的表
function analyzeUsedTables() {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const usedTables = new Map<string, { files: string[]; operations: Set<string> }>();

  // 递归读取API目录中的所有.ts文件
  function readDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        readDir(fullPath);
      } else if (file.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = path.relative(process.cwd(), fullPath);

        // 匹配表名（支持多种SQL模式）
        for (const table of schemaTables) {
          const tableName = table.name;
          const patterns = [
            new RegExp(`FROM\\s+\\\`${tableName}\\\`\\b`, 'gi'),
            new RegExp(`FROM\\s+${tableName}\\b`, 'gi'),
            new RegExp(`JOIN\\s+\\\`${tableName}\\\`\\b`, 'gi'),
            new RegExp(`JOIN\\s+${tableName}\\b`, 'gi'),
            new RegExp(`INTO\\s+\\\`${tableName}\\\`\\b`, 'gi'),
            new RegExp(`INTO\\s+${tableName}\\b`, 'gi'),
            new RegExp(`UPDATE\\s+\\\`${tableName}\\\`\\b`, 'gi'),
            new RegExp(`UPDATE\\s+${tableName}\\b`, 'gi'),
            new RegExp(`DELETE\\s+FROM\\s+\\\`${tableName}\\\`\\b`, 'gi'),
            new RegExp(`DELETE\\s+FROM\\s+${tableName}\\b`, 'gi'),
          ];

          let matched = false;
          for (const pattern of patterns) {
            if (pattern.test(content)) {
              matched = true;
              break;
            }
          }

          if (matched) {
            if (!usedTables.has(tableName)) {
              usedTables.set(tableName, { files: [], operations: new Set() });
            }
            const info = usedTables.get(tableName)!;
            if (!info.files.includes(relativePath)) {
              info.files.push(relativePath);
            }

            // 识别操作类型
            if (/SELECT|FROM|JOIN/i.test(content)) info.operations.add('SELECT');
            if (/INSERT/i.test(content)) info.operations.add('INSERT');
            if (/UPDATE/i.test(content)) info.operations.add('UPDATE');
            if (/DELETE/i.test(content)) info.operations.add('DELETE');
          }
        }
      }
    }
  }

  if (fs.existsSync(apiDir)) {
    readDir(apiDir);
  }

  return usedTables;
}

// 主函数
function main() {
  console.log('========================================');
  console.log('数据库表使用情况静态分析报告');
  console.log('========================================\n');

  // 分析API中使用的表
  console.log('正在分析API代码中的表使用情况...\n');
  const usedTables = analyzeUsedTables();

  // 分类统计
  const usedInApi: typeof schemaTables = [];
  const notUsedInApi: typeof schemaTables = [];

  for (const table of schemaTables) {
    if (usedTables.has(table.name)) {
      usedInApi.push(table);
    } else {
      notUsedInApi.push(table);
    }
  }

  // 按模块分组
  function groupByModule(tables: typeof schemaTables) {
    const groups = new Map<string, typeof schemaTables>();
    for (const table of tables) {
      if (!groups.has(table.module)) {
        groups.set(table.module, []);
      }
      groups.get(table.module)!.push(table);
    }
    return groups;
  }

  // 1. 输出正在使用的表
  console.log('----------------------------------------');
  console.log(`一、API中正在使用的表 (${usedInApi.length}/${schemaTables.length})`);
  console.log('----------------------------------------\n');

  const usedByModule = groupByModule(usedInApi);
  for (const [module, tables] of usedByModule) {
    console.log(`【${module}】`);
    for (const table of tables) {
      const info = usedTables.get(table.name)!;
      console.log(`  ✓ ${table.name}`);
      console.log(`    ${table.description}`);
      console.log(`    操作: ${[...info.operations].join(', ')}`);
      console.log(`    引用: ${info.files.length} 个文件`);
    }
    console.log('');
  }

  // 2. 输出未使用的表
  console.log('----------------------------------------');
  console.log(`二、API中未使用的表 (${notUsedInApi.length}/${schemaTables.length})`);
  console.log('----------------------------------------\n');

  const unusedByModule = groupByModule(notUsedInApi);
  for (const [module, tables] of unusedByModule) {
    console.log(`【${module}】`);
    for (const table of tables) {
      console.log(`  ⚠ ${table.name}`);
      console.log(`    ${table.description}`);
      console.log(`    建议: ${getRecommendation(table.name, module)}`);
    }
    console.log('');
  }

  // 3. 优化建议
  console.log('----------------------------------------');
  console.log('三、优化建议汇总');
  console.log('----------------------------------------\n');

  // 可以安全删除的表（未使用且非核心）
  const safeToDelete = notUsedInApi.filter(t =>
    !['sys_operation_log', 'sys_login_log', 'sys_dict_type', 'sys_dict_data', 'sys_config'].includes(t.name)
  );

  console.log(`1. 可以安全删除/归档的表 (${safeToDelete.length}个):`);
  console.log('   这些表在API代码中没有被引用，如果业务上也不使用，可以考虑删除。\n');
  for (const table of safeToDelete) {
    console.log(`   - ${table.name} (${table.module} - ${table.description})`);
  }

  console.log('\n2. 建议保留的系统表 (4个):');
  console.log('   - sys_operation_log: 操作日志（审计需要）');
  console.log('   - sys_login_log: 登录日志（安全审计）');
  console.log('   - sys_dict_type/sys_dict_data: 数据字典（系统配置）');
  console.log('   - sys_config: 系统配置表');

  console.log('\n3. 模块完整性分析:');
  for (const [module, tables] of unusedByModule) {
    const totalInModule = schemaTables.filter(t => t.module === module).length;
    const unusedInModule = tables.length;
    const usageRate = ((totalInModule - unusedInModule) / totalInModule * 100).toFixed(0);
    console.log(`   - ${module}: ${totalInModule - unusedInModule}/${totalInModule} 表被使用 (${usageRate}%)`);
  }

  console.log('\n========================================');
  console.log('分析完成');
  console.log('========================================');
}

// 获取优化建议
function getRecommendation(tableName: string, module: string): string {
  const recommendations: Record<string, string> = {
    // 系统管理
    'sys_operation_log': '建议保留用于审计，可定期归档历史数据',
    'sys_login_log': '建议保留用于安全审计，可定期清理',
    'sys_dict_type': '建议保留，用于系统数据字典',
    'sys_dict_data': '建议保留，用于系统数据字典',
    'sys_config': '建议保留，用于系统配置',

    // 客户管理
    'crm_customer_contact': '如不需要多联系人功能，可删除',
    'crm_customer_follow_up': '如不需要跟进记录，可删除',

    // 供应商管理
    'pur_supplier_material': '如不需要供应商物料关联，可删除',

    // 物料管理
    'inv_material_category': '建议保留，用于物料分类',
    'inv_inventory_log': '建议保留用于库存追溯，可定期归档',

    // 采购管理
    'pur_order': '建议保留，用于完整采购流程',
    'pur_order_detail': '建议保留，用于完整采购流程',
    'pur_receipt': '建议保留，用于完整采购流程',
    'pur_receipt_detail': '建议保留，用于完整采购流程',

    // 销售管理
    'sal_order': '建议保留，用于完整销售流程',
    'sal_order_detail': '建议保留，用于完整销售流程',
    'sal_delivery': '建议保留，用于完整销售流程',
    'sal_delivery_detail': '建议保留，用于完整销售流程',

    // 生产管理
    'prd_bom': '如不需要BOM管理，可删除',
    'prd_bom_detail': '如不需要BOM管理，可删除',

    // 财务管理
    'fin_receivable': '如不需要财务管理，可删除',
    'fin_payable': '如不需要财务管理，可删除',
    'fin_receipt_record': '如不需要财务管理，可删除',
    'fin_payment_record': '如不需要财务管理，可删除',

    // 质量管理
    'qc_inspection': '如不需要质量管理，可删除',
    'qc_unqualified': '如不需要质量管理，可删除',
  };

  return recommendations[tableName] || '根据业务需求决定是否删除';
}

main();
