/**
 * 数据库清理脚本
 * 用于查询表数据量、归档历史数据、删除未使用的表
 * 使用方法: npx tsx scripts/db-cleanup.ts [command] [options]
 *
 * 命令:
 *   stats     - 查看所有表的数据量统计
 *   analyze   - 分析未使用的表
 *   archive   - 归档历史数据
 *   drop      - 删除指定的表（需要确认）
 *   cleanup   - 清理所有未使用的空表
 *
 * 示例:
 *   npx tsx scripts/db-cleanup.ts stats
 *   npx tsx scripts/db-cleanup.ts analyze
 *   npx tsx scripts/db-cleanup.ts archive --table inv_inventory_log --days 365
 *   npx tsx scripts/db-cleanup.ts drop --table crm_customer_contact
 */

import { query, execute, transaction } from '../src/lib/db';
import * as readline from 'readline';

// 未使用的表列表（根据静态分析结果）
const UNUSED_TABLES = {
  // 客户管理
  'crm_customer_contact': { module: '客户管理', description: '客户联系人表', safeToDelete: true },
  'crm_customer_follow_up': { module: '客户管理', description: '客户跟进记录表', safeToDelete: true },

  // 供应商管理
  'pur_supplier': { module: '供应商管理', description: '供应商表', safeToDelete: true },
  'pur_supplier_material': { module: '供应商管理', description: '供应商物料关联表', safeToDelete: true },

  // 物料管理
  'inv_material_category': { module: '物料管理', description: '物料分类表', safeToDelete: false },
  'inv_material': { module: '物料管理', description: '物料表', safeToDelete: false },
  'inv_inventory': { module: '物料管理', description: '库存表', safeToDelete: false },
  'inv_inventory_log': { module: '物料管理', description: '库存日志表', safeToDelete: false, archivable: true },

  // 采购管理
  'pur_request_detail': { module: '采购管理', description: '采购申请明细表', safeToDelete: true },
  'pur_order': { module: '采购管理', description: '采购订单表', safeToDelete: true },
  'pur_order_detail': { module: '采购管理', description: '采购订单明细表', safeToDelete: true },
  'pur_receipt': { module: '采购管理', description: '采购入库单表', safeToDelete: true },
  'pur_receipt_detail': { module: '采购管理', description: '采购入库明细表', safeToDelete: true },

  // 销售管理
  'sal_order': { module: '销售管理', description: '销售订单表', safeToDelete: true },
  'sal_order_detail': { module: '销售管理', description: '销售订单明细表', safeToDelete: true },
  'sal_delivery': { module: '销售管理', description: '销售出库单表', safeToDelete: true },
  'sal_delivery_detail': { module: '销售管理', description: '销售出库明细表', safeToDelete: true },

  // 生产管理
  'prd_work_order': { module: '生产管理', description: '生产工单表', safeToDelete: true },
  'prd_bom': { module: '生产管理', description: 'BOM表', safeToDelete: true },
  'prd_bom_detail': { module: '生产管理', description: 'BOM明细表', safeToDelete: true },

  // 财务管理
  'fin_receivable': { module: '财务管理', description: '应收款表', safeToDelete: true },
  'fin_payable': { module: '财务管理', description: '应付款表', safeToDelete: true },
  'fin_receipt_record': { module: '财务管理', description: '收款记录表', safeToDelete: true },
  'fin_payment_record': { module: '财务管理', description: '付款记录表', safeToDelete: true },

  // 质量管理
  'qc_inspection': { module: '质量管理', description: '质检记录表', safeToDelete: true },
  'qc_unqualified': { module: '质量管理', description: '不合格品记录表', safeToDelete: true },
};

// 用户确认提示
function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// 获取所有表的数据量统计
async function getTableStats() {
  console.log('\n========================================');
  console.log('数据库表数据量统计');
  console.log('========================================\n');

  try {
    const result = await query(`
      SELECT
        TABLE_NAME as tableName,
        TABLE_ROWS as rowCount,
        ROUND(DATA_LENGTH / 1024 / 1024, 2) as dataSizeMB,
        ROUND(INDEX_LENGTH / 1024 / 1024, 2) as indexSizeMB,
        ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as totalSizeMB,
        TABLE_COMMENT as description
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
    `);

    const tables = result as any[];

    console.log('表名 | 数据量 | 数据大小 | 索引大小 | 总大小 | 说明');
    console.log('-'.repeat(100));

    let totalSize = 0;
    for (const table of tables) {
      totalSize += parseFloat(table.totalSizeMB || 0);
      const isUnused = UNUSED_TABLES[table.tableName as keyof typeof UNUSED_TABLES];
      const marker = isUnused ? ' [未使用]' : '';
      console.log(
        `${table.tableName}${marker} | ` +
        `${table.rowCount || 0} | ` +
        `${table.dataSizeMB || 0} MB | ` +
        `${table.indexSizeMB || 0} MB | ` +
        `${table.totalSizeMB || 0} MB | ` +
        `${table.description || ''}`
      );
    }

    console.log('-'.repeat(100));
    console.log(`总计: ${tables.length} 个表，占用空间 ${totalSize.toFixed(2)} MB`);

    // 统计未使用表的空间占用
    const unusedSize = tables
      .filter((t) => UNUSED_TABLES[t.tableName as keyof typeof UNUSED_TABLES])
      .reduce((sum, t) => sum + parseFloat(t.totalSizeMB || 0), 0);

    console.log(`未使用表占用空间: ${unusedSize.toFixed(2)} MB (${(unusedSize / totalSize * 100).toFixed(1)}%)`);

  } catch (error) {
    console.error('获取表统计失败:', error);
  }
}

// 分析未使用的表
async function analyzeUnusedTables() {
  console.log('\n========================================');
  console.log('未使用表详细分析');
  console.log('========================================\n');

  const unusedTableNames = Object.keys(UNUSED_TABLES);

  console.log('表名 | 模块 | 数据量 | 大小 | 可安全删除 | 说明');
  console.log('-'.repeat(100));

  for (const tableName of unusedTableNames) {
    const info = UNUSED_TABLES[tableName as keyof typeof UNUSED_TABLES];

    try {
      // 获取数据量
      const countResult = await query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = (countResult as any[])[0]?.count || 0;

      // 获取表大小
      const sizeResult = await query(`
        SELECT ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as sizeMB
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      `, [tableName]);
      const sizeMB = (sizeResult as any[])[0]?.sizeMB || 0;

      const safeMarker = info.safeToDelete ? '✓' : '✗';
      console.log(
        `${tableName} | ` +
        `${info.module} | ` +
        `${rowCount} | ` +
        `${sizeMB} MB | ` +
        `${safeMarker} | ` +
        `${info.description}`
      );
    } catch (error) {
      console.log(`${tableName} | ${info.module} | 错误 | - | - | ${info.description}`);
    }
  }
}

// 归档历史数据
async function archiveTableData(tableName: string, days: number) {
  console.log(`\n========================================`);
  console.log(`归档表数据: ${tableName}`);
  console.log(`保留最近 ${days} 天的数据`);
  console.log(`========================================\n`);

  try {
    // 检查表是否存在 create_time 字段
    const columnResult = await query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME IN ('create_time', 'created_at', 'createTime')
    `, [tableName]);

    if ((columnResult as any[]).length === 0) {
      console.error(`错误: 表 ${tableName} 没有时间字段，无法按时间归档`);
      return;
    }

    const timeColumn = (columnResult as any[])[0].COLUMN_NAME;

    // 获取要归档的数据量
    const countResult = await query(`
      SELECT COUNT(*) as count FROM \`${tableName}\`
      WHERE \`${timeColumn}\` < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);
    const archiveCount = (countResult as any[])[0]?.count || 0;

    if (archiveCount === 0) {
      console.log(`没有需要归档的数据（${days}天前的数据）`);
      return;
    }

    console.log(`将要归档 ${archiveCount} 条数据`);

    // 用户确认
    const confirmed = await confirm(`确认归档 ${tableName} 表的 ${archiveCount} 条历史数据？`);
    if (!confirmed) {
      console.log('操作已取消');
      return;
    }

    // 创建归档表
    const archiveTableName = `${tableName}_archive`;
    await execute(`CREATE TABLE IF NOT EXISTS \`${archiveTableName}\` LIKE \`${tableName}\``);

    // 归档数据
    await transaction(async (connection) => {
      // 插入归档表
      await connection.execute(`
        INSERT INTO \`${archiveTableName}\`
        SELECT * FROM \`${tableName}\`
        WHERE \`${timeColumn}\` < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [days]);

      // 删除原表数据
      await connection.execute(`
        DELETE FROM \`${tableName}\`
        WHERE \`${timeColumn}\` < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [days]);
    });

    console.log(`✓ 归档完成！已归档 ${archiveCount} 条数据到 ${archiveTableName}`);

  } catch (error) {
    console.error('归档失败:', error);
  }
}

// 删除指定的表
async function dropTable(tableName: string, force: boolean = false) {
  console.log(`\n========================================`);
  console.log(`删除表: ${tableName}`);
  console.log(`========================================\n`);

  // 检查表是否在未使用列表中
  const unusedInfo = UNUSED_TABLES[tableName as keyof typeof UNUSED_TABLES];
  if (!unusedInfo && !force) {
    console.error(`错误: ${tableName} 不在未使用表列表中，如需删除请使用 --force 参数`);
    return;
  }

  try {
    // 获取表信息
    const countResult = await query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    const rowCount = (countResult as any[])[0]?.count || 0;

    const sizeResult = await query(`
      SELECT ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as sizeMB
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [tableName]);
    const sizeMB = (sizeResult as any[])[0]?.sizeMB || 0;

    console.log(`表名: ${tableName}`);
    console.log(`模块: ${unusedInfo?.module || '未知'}`);
    console.log(`描述: ${unusedInfo?.description || ''}`);
    console.log(`数据量: ${rowCount} 条`);
    console.log(`大小: ${sizeMB} MB`);

    if (rowCount > 0) {
      console.log('\n⚠ 警告: 该表包含数据，删除后无法恢复！');
    }

    // 用户确认
    const confirmed = await confirm(`确认删除表 ${tableName}？`);
    if (!confirmed) {
      console.log('操作已取消');
      return;
    }

    // 再次确认（如果表有数据）
    if (rowCount > 0) {
      const confirmed2 = await confirm(`再次确认: 表 ${tableName} 有 ${rowCount} 条数据，确定删除？`);
      if (!confirmed2) {
        console.log('操作已取消');
        return;
      }
    }

    // 删除表
    await execute(`DROP TABLE IF EXISTS \`${tableName}\``);
    console.log(`✓ 表 ${tableName} 已删除`);

  } catch (error) {
    console.error('删除失败:', error);
  }
}

// 清理所有未使用的空表
async function cleanupEmptyTables() {
  console.log('\n========================================');
  console.log('清理未使用的空表');
  console.log('========================================\n');

  const emptyTables: string[] = [];

  // 找出所有未使用的空表
  for (const [tableName, info] of Object.entries(UNUSED_TABLES)) {
    if (!info.safeToDelete) continue;

    try {
      const result = await query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = (result as any[])[0]?.count || 0;

      if (rowCount === 0) {
        emptyTables.push(tableName);
      }
    } catch (error) {
      // 表可能不存在，忽略错误
    }
  }

  if (emptyTables.length === 0) {
    console.log('没有发现可以安全删除的空表');
    return;
  }

  console.log(`发现 ${emptyTables.length} 个未使用的空表:`);
  for (const tableName of emptyTables) {
    const info = UNUSED_TABLES[tableName as keyof typeof UNUSED_TABLES];
    console.log(`  - ${tableName} (${info.module} - ${info.description})`);
  }

  // 用户确认
  const confirmed = await confirm(`确认删除以上 ${emptyTables.length} 个空表？`);
  if (!confirmed) {
    console.log('操作已取消');
    return;
  }

  // 删除表
  let successCount = 0;
  for (const tableName of emptyTables) {
    try {
      await execute(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`✓ 已删除: ${tableName}`);
      successCount++;
    } catch (error) {
      console.error(`✗ 删除失败: ${tableName}`, error);
    }
  }

  console.log(`\n清理完成: ${successCount}/${emptyTables.length} 个表已删除`);
}

// 显示帮助信息
function showHelp() {
  console.log(`
数据库清理脚本

使用方法: npx tsx scripts/db-cleanup.ts [command] [options]

命令:
  stats                    查看所有表的数据量统计
  analyze                  分析未使用的表
  archive                  归档历史数据
    --table <表名>         要归档的表名
    --days <天数>          保留最近多少天的数据（默认365）
  drop                     删除指定的表
    --table <表名>         要删除的表名（必需）
    --force                强制删除（即使不在未使用列表）
  cleanup                  清理所有未使用的空表

示例:
  npx tsx scripts/db-cleanup.ts stats
  npx tsx scripts/db-cleanup.ts analyze
  npx tsx scripts/db-cleanup.ts archive --table inv_inventory_log --days 365
  npx tsx scripts/db-cleanup.ts drop --table crm_customer_contact
  npx tsx scripts/db-cleanup.ts cleanup
`);
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (key) {
      options[key] = value || true;
    }
  }

  return { command, options };
}

// 主函数
async function main() {
  const { command, options } = parseArgs();

  if (!command || command === 'help' || command === '-h' || command === '--help') {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'stats':
      await getTableStats();
      break;

    case 'analyze':
      await analyzeUnusedTables();
      break;

    case 'archive':
      const archiveTable = options.table as string;
      const days = parseInt(options.days as string) || 365;
      if (!archiveTable) {
        console.error('错误: 请指定要归档的表名，使用 --table <表名>');
        process.exit(1);
      }
      await archiveTableData(archiveTable, days);
      break;

    case 'drop':
      const dropTableName = options.table as string;
      if (!dropTableName) {
        console.error('错误: 请指定要删除的表名，使用 --table <表名>');
        process.exit(1);
      }
      await dropTable(dropTableName, options.force as boolean);
      break;

    case 'cleanup':
      await cleanupEmptyTables();
      break;

    default:
      console.error(`未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('执行失败:', error);
  process.exit(1);
});
