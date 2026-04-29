/**
 * 数据库数据导出脚本
 * 使用纯 Node.js 导出表结构和数据
 */

import { query } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

// 要备份的表列表（按依赖关系排序）
const TABLES_TO_BACKUP = [
  // 系统管理
  'sys_user',
  'sys_department',
  'sys_role',
  'sys_user_role',
  'sys_menu',
  'sys_role_menu',
  'sys_dict_type',
  'sys_dict_data',
  'sys_config',

  // 客户管理
  'crm_customer',
  'crm_customer_contact',
  'crm_customer_follow_up',

  // 供应商管理
  'pur_supplier',
  'pur_supplier_material',

  // 物料管理
  'inv_material_category',
  'inv_material',
  'inv_warehouse',
  'sys_warehouse_category',
  'inv_inventory',
  'inv_inventory_log',

  // 采购管理
  'pur_request',
  'pur_request_detail',
  'pur_order',
  'pur_order_detail',
  'pur_receipt',
  'pur_receipt_detail',

  // 销售管理
  'sal_order',
  'sal_order_detail',
  'sal_delivery',
  'sal_delivery_detail',

  // 生产管理
  'prd_standard_card',
  'prd_work_order',
  'prd_bom',
  'prd_bom_detail',

  // 财务管理
  'fin_receivable',
  'fin_payable',
  'fin_receipt_record',
  'fin_payment_record',

  // 质量管理
  'qc_inspection',
  'qc_unqualified',

  // 其他
  'delivery_vehicle',
  'sys_company',
  'sys_employee',
  'inv_inbound_label',
];

async function exportTableStructure(tableName: string): Promise<string> {
  try {
    const result = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    const columns = result as any[];
    if (columns.length === 0) {
      return `-- 表 ${tableName} 不存在或没有列\n`;
    }

    let sql = `\n-- 表结构: ${tableName}\n`;
    sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sql += `CREATE TABLE \`${tableName}\` (\n`;

    const columnDefs = columns.map(col => {
      let def = `  \`${col.COLUMN_NAME}\` ${col.DATA_TYPE}`;
      if (col.IS_NULLABLE === 'NO') def += ' NOT NULL';
      if (col.COLUMN_DEFAULT !== null) def += ` DEFAULT ${col.COLUMN_DEFAULT}`;
      if (col.EXTRA) def += ` ${col.EXTRA}`;
      if (col.COLUMN_COMMENT) def += ` COMMENT '${col.COLUMN_COMMENT}'`;
      return def;
    });

    sql += columnDefs.join(',\n');
    sql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n';

    return sql;
  } catch (error) {
    console.error(`导出表 ${tableName} 结构失败:`, error);
    return `-- 导出表 ${tableName} 结构失败\n`;
  }
}

async function exportTableData(tableName: string): Promise<string> {
  try {
    // 获取列名
    const columnsResult = await query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    const columns = (columnsResult as any[]).map(c => c.COLUMN_NAME);
    if (columns.length === 0) {
      return `-- 表 ${tableName} 不存在\n`;
    }

    // 获取数据
    const dataResult = await query(`SELECT * FROM \`${tableName}\``);
    const rows = dataResult as any[];

    if (rows.length === 0) {
      return `-- 表 ${tableName} 没有数据\n`;
    }

    let sql = `\n-- 表数据: ${tableName} (${rows.length} 条记录)\n`;

    // 分批生成 INSERT 语句（每批100条）
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = batch.map(row => {
        const vals = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
          return val;
        });
        return `(${vals.join(', ')})`;
      });

      sql += `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES\n`;
      sql += values.join(',\n');
      sql += ';\n';
    }

    return sql;
  } catch (error) {
    console.error(`导出表 ${tableName} 数据失败:`, error);
    return `-- 导出表 ${tableName} 数据失败\n`;
  }
}

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `backup_data_${timestamp}.sql`);

  // 创建备份目录
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('========================================');
  console.log('数据库数据备份');
  console.log('========================================\n');
  console.log(`备份文件: ${backupFile}\n`);

  let totalSQL = `-- ERP数据库备份\n`;
  totalSQL += `-- 生成时间: ${new Date().toISOString()}\n`;
  totalSQL += `-- 数据库: vnerpdacahng\n\n`;
  totalSQL += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

  let successCount = 0;
  let failCount = 0;

  for (const tableName of TABLES_TO_BACKUP) {
    try {
      process.stdout.write(`正在备份: ${tableName} ... `);

      // 导出结构
      const structureSQL = await exportTableStructure(tableName);
      totalSQL += structureSQL;

      // 导出数据
      const dataSQL = await exportTableData(tableName);
      totalSQL += dataSQL;

      console.log('✓');
      successCount++;
    } catch (error) {
      console.log('✗');
      failCount++;
    }
  }

  totalSQL += `\nSET FOREIGN_KEY_CHECKS=1;\n`;

  // 写入文件
  fs.writeFileSync(backupFile, totalSQL);

  // 获取文件大小
  const stats = fs.statSync(backupFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log('\n========================================');
  console.log('备份完成！');
  console.log('========================================');
  console.log(`成功: ${successCount} 个表`);
  console.log(`失败: ${failCount} 个表`);
  console.log(`文件大小: ${sizeMB} MB`);
  console.log(`保存位置: ${backupFile}\n`);

  return backupFile;
}

// 主函数
async function main() {
  try {
    await backupDatabase();
    process.exit(0);
  } catch (error) {
    console.error('备份失败:', error);
    process.exit(1);
  }
}

main();
