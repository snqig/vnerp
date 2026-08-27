/**
 * 数据库表使用情况分析脚本
 * 用于识别未使用的表和优化建议
 */

import { query } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

// 数据库中定义的所有表（从schema文件提取）
const schemaTables = [
  // 系统管理模块
  'sys_user',
  'sys_department',
  'sys_role',
  'sys_user_role',
  'sys_menu',
  'sys_role_menu',
  'sys_operation_log',
  'sys_login_log',
  'sys_dict_type',
  'sys_dict_data',
  'sys_config',

  // 客户管理模块
  'crm_customer',
  'crm_customer_contact',
  'crm_customer_follow_up',

  // 供应商管理模块
  'pur_supplier',
  'pur_supplier_material',

  // 物料管理模块
  'inv_material_category',
  'inv_material',
  'inv_warehouse',
  'inv_inventory',
  'inv_inventory_log',

  // 采购管理模块
  'pur_request',
  'pur_request_detail',
  'pur_order',
  'pur_order_detail',
  'pur_receipt',
  'pur_receipt_detail',

  // 销售管理模块
  'sal_order',
  'sal_order_detail',
  'sal_delivery',
  'sal_delivery_detail',

  // 生产管理模块
  'prd_standard_card',
  'prd_work_order',
  'prd_bom',
  'prd_bom_detail',

  // 财务管理模块
  'fin_receivable',
  'fin_payable',
  'fin_receipt_record',
  'fin_payment_record',

  // 质量管理模块
  'qc_inspection',
  'qc_unqualified',
];

// 从API代码中提取实际使用的表
async function analyzeUsedTables() {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const usedTables = new Map<string, { files: string[]; operations: string[] }>();

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

        // 匹配表名（支持多种SQL模式）
        for (const table of schemaTables) {
          const patterns = [
            new RegExp(`FROM\\s+${table}\\b`, 'gi'),
            new RegExp(`JOIN\\s+${table}\\b`, 'gi'),
            new RegExp(`INTO\\s+${table}\\b`, 'gi'),
            new RegExp(`UPDATE\\s+${table}\\b`, 'gi'),
            new RegExp(`DELETE\\s+FROM\\s+${table}\\b`, 'gi'),
            new RegExp(`\\b${table}\\b`, 'gi'), // 直接匹配表名
          ];

          for (const pattern of patterns) {
            if (pattern.test(content)) {
              if (!usedTables.has(table)) {
                usedTables.set(table, { files: [], operations: [] });
              }
              const info = usedTables.get(table)!;
              if (!info.files.includes(fullPath)) {
                info.files.push(fullPath);
              }

              // 识别操作类型
              if (/SELECT|FROM|JOIN/i.test(content)) info.operations.push('SELECT');
              if (/INSERT/i.test(content)) info.operations.push('INSERT');
              if (/UPDATE/i.test(content)) info.operations.push('UPDATE');
              if (/DELETE/i.test(content)) info.operations.push('DELETE');

              break;
            }
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

// 检查数据库中实际存在的表
async function getExistingTables() {
  try {
    const result = await query(`
      SELECT TABLE_NAME as tableName
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    return (result as any[]).map((r) => r.tableName);
  } catch (error) {
    console.error('获取数据库表失败:', error);
    return [];
  }
}

// 检查表的数据量
async function getTableStats(tableName: string) {
  try {
    const result = await query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    return (result as any[])[0]?.count || 0;
  } catch (error) {
    return -1; // 表不存在或出错
  }
}

// 检查表的最后更新时间
async function getTableUpdateTime(tableName: string) {
  try {
    const result = await query(`
      SELECT UPDATE_TIME as updateTime
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `, [tableName]);
    return (result as any[])[0]?.updateTime || null;
  } catch (error) {
    return null;
  }
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('数据库表使用情况分析报告');
  console.log('========================================\n');

  // 1. 获取API中使用的表
  console.log('正在分析API代码中的表使用情况...');
  const usedTables = await analyzeUsedTables();

  // 2. 获取数据库中实际存在的表
  console.log('正在获取数据库中的实际表...');
  const existingTables = await getExistingTables();

  // 3. 分类统计
  const usedInApi: string[] = [];
  const notUsedInApi: string[] = [];
  const notInSchema: string[] = [];

  for (const table of schemaTables) {
    if (usedTables.has(table)) {
      usedInApi.push(table);
    } else {
      notUsedInApi.push(table);
    }
  }

  for (const table of existingTables) {
    if (!schemaTables.includes(table)) {
      notInSchema.push(table);
    }
  }

  // 4. 输出报告
  console.log('\n----------------------------------------');
  console.log('一、API中正在使用的表（有代码引用）');
  console.log('----------------------------------------');
  console.log(`共 ${usedInApi.length} 个表\n`);

  for (const table of usedInApi.sort()) {
    const info = usedTables.get(table)!;
    const rowCount = await getTableStats(table);
    console.log(`✓ ${table}`);
    console.log(`  数据量: ${rowCount >= 0 ? rowCount : 'N/A'} 条`);
    console.log(`  操作: ${[...new Set(info.operations)].join(', ') || '未知'}`);
    console.log(`  引用文件数: ${info.files.length} 个`);
    console.log('');
  }

  console.log('\n----------------------------------------');
  console.log('二、API中未使用的表（可能可以删除）');
  console.log('----------------------------------------');
  console.log(`共 ${notUsedInApi.length} 个表\n`);

  for (const table of notUsedInApi.sort()) {
    const rowCount = await getTableStats(table);
    const updateTime = await getTableUpdateTime(table);
    const existsInDb = existingTables.includes(table);

    if (existsInDb) {
      console.log(`⚠ ${table}`);
      console.log(`  数据量: ${rowCount >= 0 ? rowCount : 'N/A'} 条`);
      console.log(`  最后更新: ${updateTime || '未知'}`);
      console.log(`  建议: ${rowCount === 0 ? '可以安全删除（空表）' : '需要确认业务需求后再删除'}`);
    } else {
      console.log(`○ ${table}`);
      console.log(`  状态: 仅在schema定义，数据库中不存在`);
      console.log(`  建议: 如需使用请运行初始化脚本`);
    }
    console.log('');
  }

  console.log('\n----------------------------------------');
  console.log('三、数据库中有但schema未定义的表');
  console.log('----------------------------------------');
  if (notInSchema.length === 0) {
    console.log('无');
  } else {
    console.log(`共 ${notInSchema.length} 个表\n`);
    for (const table of notInSchema.sort()) {
      const rowCount = await getTableStats(table);
      console.log(`? ${table}`);
      console.log(`  数据量: ${rowCount >= 0 ? rowCount : 'N/A'} 条`);
      console.log(`  建议: 检查是否需要添加到schema或删除`);
      console.log('');
    }
  }

  console.log('\n----------------------------------------');
  console.log('四、优化建议');
  console.log('----------------------------------------');

  // 空表建议删除
  const emptyTables = [];
  for (const table of notUsedInApi) {
    const rowCount = await getTableStats(table);
    if (rowCount === 0) {
      emptyTables.push(table);
    }
  }

  if (emptyTables.length > 0) {
    console.log(`\n1. 以下 ${emptyTables.length} 个空表可以安全删除:`);
    console.log('   ' + emptyTables.join(', '));
  }

  // 大表但未使用
  const largeUnusedTables = [];
  for (const table of notUsedInApi) {
    const rowCount = await getTableStats(table);
    if (rowCount > 100) {
      largeUnusedTables.push({ table, count: rowCount });
    }
  }

  if (largeUnusedTables.length > 0) {
    console.log(`\n2. 以下未使用表包含大量数据，删除前请备份:`);
    for (const { table, count } of largeUnusedTables) {
      console.log(`   - ${table}: ${count} 条数据`);
    }
  }

  console.log('\n========================================');
  console.log('分析完成');
  console.log('========================================');

  process.exit(0);
}

main().catch(console.error);
