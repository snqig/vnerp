import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const results: string[] = [];

    const migrations: { table: string; column: string; definition: string; after?: string }[] = [
      {
        table: 'inv_trace_record',
        column: 'deleted',
        definition: 'TINYINT DEFAULT 0 COMMENT \'软删除: 0-否, 1-是\'',
        after: 'remark',
      },
      {
        table: 'inv_material_label',
        column: 'mix_remark',
        definition: 'VARCHAR(500) COMMENT \'混料备注\'',
        after: 'color_code',
      },
      {
        table: 'inv_material_label',
        column: 'label_type',
        definition: 'TINYINT DEFAULT 1 COMMENT \'标签类型: 1-原材料, 2-分切子批, 3-余料\'',
        after: 'is_cut',
      },
      {
        table: 'inv_material_label',
        column: 'remaining_width',
        definition: 'DECIMAL(18,2) COMMENT \'剩余宽幅（余料）\'',
        after: 'label_type',
      },
      {
        table: 'inv_material_label',
        column: 'remaining_length',
        definition: 'DECIMAL(18,2) COMMENT \'剩余长度（余料）\'',
        after: 'remaining_width',
      },
      {
        table: 'prd_process_card',
        column: 'lock_status',
        definition: 'TINYINT DEFAULT 0 COMMENT \'锁住状态: 0-未锁, 1-已锁\'',
        after: 'burdening_status',
      },
      {
        table: 'sys_user',
        column: 'first_login',
        definition: 'TINYINT DEFAULT 1 COMMENT \'首次登录: 0-否, 1-是\'',
        after: 'status',
      },
      {
        table: 'sys_user',
        column: 'pwd_update_time',
        definition: 'DATETIME COMMENT \'密码更新时间\'',
        after: 'first_login',
      },
    ];

    for (const migration of migrations) {
      try {
        const [columns]: any = await conn.execute(
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
      } catch (err: any) {
        results.push(`${migration.table}.${migration.column}: 添加失败 - ${err.message}`);
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
        const [indexes]: any = await conn.execute(
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
      } catch (err: any) {
        results.push(`${idxMigration.table}.${idxMigration.indexName}: 索引添加失败 - ${err.message}`);
      }
    }

    return results;
  });

  return successResponse(result, '数据库迁移完成');
});
