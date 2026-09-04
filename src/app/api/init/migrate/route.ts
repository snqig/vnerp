import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
  const result = await transaction(async (conn) => {
    const results: string[] = [];

    const migrations: { table: string; column: string; definition: string; after?: string }[] = [
      {
        table: 'inv_trace_record',
        column: 'deleted',
        definition: ts('k_1ra2khz'),
        after: 'remark',
      },
      {
        table: 'inv_material_label',
        column: 'mix_remark',
        definition: ts('k_km57c4'),
        after: 'color_code',
      },
      {
        table: 'inv_material_label',
        column: 'label_type',
        definition: ts('k_1byb2hz'),
        after: 'is_cut',
      },
      {
        table: 'inv_material_label',
        column: 'remaining_width',
        definition: ts('k_1p48jeo'),
        after: 'label_type',
      },
      {
        table: 'inv_material_label',
        column: 'remaining_length',
        definition: ts('k_1s7ujz1'),
        after: 'remaining_width',
      },
      {
        table: 'prd_process_card',
        column: 'lock_status',
        definition: ts('k_1b4t5u0'),
        after: 'burdening_status',
      },
      {
        table: 'sys_user',
        column: 'first_login',
        definition: ts('k_r7rt0k'),
        after: 'status',
      },
      {
        table: 'sys_user',
        column: 'pwd_update_time',
        definition: ts('k_tpq3p4'),
        after: 'first_login',
      },
      {
        table: 'prd_standard_card',
        column: 'mold_type',
        definition: ts('k_yj9x43'),
        after: 'material_type',
      },
      {
        table: 'prd_standard_card',
        column: 'etch_mold',
        definition: ts('k_14scsuz'),
        after: 'back_mylar_mold',
      },
      {
        table: 'prd_standard_card',
        column: 'storage_location',
        definition: ts('k_h85ril'),
        after: 'etch_mold',
      },
      {
        table: 'prd_standard_card',
        column: 'extra_field',
        definition: ts('k_1bht84v'),
        after: 'storage_location',
      },
    ];

    for (const migration of migrations) {
      try {
        const [columns] = await conn.execute(
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
        sql: ts('k_hq1ib4'),
      },
      {
        name: 'bom_line',
        sql: ts('k_8vkbcl'),
      },
    ];

    for (const table of createTables) {
      try {
        const [rows] = await conn.execute(
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
        const [indexes] = await conn.execute(
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

  return successResponse(result, ts('k_16ymw9w'));
});
