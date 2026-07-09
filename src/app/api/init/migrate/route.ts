import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(async (_request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const results: string[] = [];

    const migrations: { table: string; column: string; definition: string; after?: string }[] = [
      {
        table: 'inv_trace_record',
        column: 'deleted',
        definition: "TINYINT DEFAULT 0 COMMENT '软删除: 0-否, 1-是'",
        after: 'remark',
      },
      {
        table: 'inv_material_label',
        column: 'mix_remark',
        definition: "VARCHAR(500) COMMENT '混料备注'",
        after: 'color_code',
      },
      {
        table: 'inv_material_label',
        column: 'label_type',
        definition: "TINYINT DEFAULT 1 COMMENT '标签类型: 1-原材料, 2-分切子批, 3-余料'",
        after: 'is_cut',
      },
      {
        table: 'inv_material_label',
        column: 'remaining_width',
        definition: "DECIMAL(18,2) COMMENT '剩余宽幅（余料）'",
        after: 'label_type',
      },
      {
        table: 'inv_material_label',
        column: 'remaining_length',
        definition: "DECIMAL(18,2) COMMENT '剩余长度（余料）'",
        after: 'remaining_width',
      },
      {
        table: 'prd_process_card',
        column: 'lock_status',
        definition: "TINYINT DEFAULT 0 COMMENT '锁住状态: 0-未锁, 1-已锁'",
        after: 'burdening_status',
      },
      {
        table: 'sys_user',
        column: 'first_login',
        definition: "TINYINT DEFAULT 1 COMMENT '首次登录: 0-否, 1-是'",
        after: 'status',
      },
      {
        table: 'sys_user',
        column: 'pwd_update_time',
        definition: "DATETIME COMMENT '密码更新时间'",
        after: 'first_login',
      },
      {
        table: 'prd_standard_card',
        column: 'mold_type',
        definition: "VARCHAR(100) DEFAULT '' COMMENT '模号/种类'",
        after: 'material_type',
      },
      {
        table: 'prd_standard_card',
        column: 'etch_mold',
        definition: "VARCHAR(100) DEFAULT '' COMMENT '腐蚀刀模'",
        after: 'back_mylar_mold',
      },
      {
        table: 'prd_standard_card',
        column: 'storage_location',
        definition: "VARCHAR(100) DEFAULT '' COMMENT '存放位置'",
        after: 'etch_mold',
      },
      {
        table: 'prd_standard_card',
        column: 'extra_field',
        definition: "VARCHAR(100) DEFAULT '' COMMENT '额外字段'",
        after: 'storage_location',
      },
    ];

    for (const migration of migrations) {
      try {
        const [columns]: Loose = await conn.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [migration.table, migration.column]
        );

        if (columns && columns.length > 0) {
          results.push(`${migration.table}.${migration.column}: 已存在，跳过`);
          continue;
        }

        const afterClause = migration.after ? ` AFTER \`${migration.after}\`` : '';
        await conn.execute(
          `ALTER TABLE \`${migration.table}\` ADD COLUMN \`${migration.column}\` ${migration.definition}${afterClause}`
        );
        results.push(`${migration.table}.${migration.column}: 添加成功`);
      } catch (err) {
        results.push(
          `${migration.table}.${migration.column}: 添加失败 - ${(err as Error).message}`
        );
      }
    }

    const createTables: { name: string; sql: string }[] = [
      {
        name: 'bom_header',
        sql: `CREATE TABLE IF NOT EXISTS bom_header (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bom_no VARCHAR(50) NOT NULL COMMENT 'BOM编号',
          product_id INT COMMENT '产品ID',
          product_code VARCHAR(50) COMMENT '产品编码',
          product_name VARCHAR(200) COMMENT '产品名称',
          product_spec VARCHAR(200) COMMENT '产品规格',
          version VARCHAR(20) DEFAULT '1.0' COMMENT '版本号',
          is_default TINYINT DEFAULT 1 COMMENT '是否默认BOM',
          status INT DEFAULT 10 COMMENT '状态: 10-草稿 20-已审核 30-已发布 90-已停用',
          unit VARCHAR(20) COMMENT '单位',
          base_qty DECIMAL(12,2) DEFAULT 1 COMMENT '基本数量',
          total_material_count INT DEFAULT 0 COMMENT '物料总数',
          total_cost DECIMAL(12,2) DEFAULT 0 COMMENT '总成本',
          remark VARCHAR(500) COMMENT '备注',
          deleted TINYINT DEFAULT 0 COMMENT '软删除',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_bom_no (bom_no)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM头表'`,
      },
      {
        name: 'bom_line',
        sql: `CREATE TABLE IF NOT EXISTS bom_line (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bom_id INT NOT NULL COMMENT 'BOM头ID',
          line_no INT NOT NULL COMMENT '行号',
          material_id INT COMMENT '物料ID',
          material_code VARCHAR(50) COMMENT '物料编码',
          material_name VARCHAR(200) COMMENT '物料名称',
          material_spec VARCHAR(200) COMMENT '物料规格',
          material_unit VARCHAR(20) COMMENT '物料单位',
          usage_qty DECIMAL(12,4) NOT NULL DEFAULT 0 COMMENT '用量',
          loss_rate DECIMAL(5,2) DEFAULT 0 COMMENT '损耗率',
          unit_cost DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
          total_cost DECIMAL(12,2) DEFAULT 0 COMMENT '总成本',
          remark VARCHAR(500) COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_bom_id (bom_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM行表'`,
      },
    ];

    for (const table of createTables) {
      try {
        const [rows]: Loose = await conn.execute(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [table.name]
        );
        if (rows && rows.length > 0) {
          results.push(`${table.name}: 表已存在，跳过`);
        } else {
          await conn.execute(table.sql);
          results.push(`${table.name}: 表创建成功`);
        }
      } catch (err) {
        results.push(`${table.name}: 创建失败 - ${(err as Error).message}`);
      }
    }

    const indexMigrations: { table: string; indexName: string; definition: string }[] = [
      {
        table: 'inv_trace_record',
        indexName: 'idx_deleted',
        definition: 'idx_deleted (deleted)',
      },
    ];

    for (const idxMigration of indexMigrations) {
      try {
        const [indexes]: Loose = await conn.execute(
          `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
          [idxMigration.table, idxMigration.indexName]
        );

        if (indexes && indexes.length > 0) {
          results.push(`${idxMigration.table}.${idxMigration.indexName}: 索引已存在，跳过`);
          continue;
        }

        await conn.execute(
          `ALTER TABLE \`${idxMigration.table}\` ADD INDEX ${idxMigration.definition}`
        );
        results.push(`${idxMigration.table}.${idxMigration.indexName}: 索引添加成功`);
      } catch (err) {
        results.push(
          `${idxMigration.table}.${idxMigration.indexName}: 索引添加失败 - ${(err as Error).message}`
        );
      }
    }

    return results;
  });

  return successResponse(result, '数据库迁移完成');
});
