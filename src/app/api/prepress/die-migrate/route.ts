import { getTranslations } from 'next-intl/server';
import type { DbRow } from '@/types/db';

;
import { NextRequest } from 'next/server';
import { execute, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ALTER_TABLE_PRD_DIE_TEMPLATE, CREATE_TABLE_PRD_DIE_MAINTENANCE, ALTER_TABLE_PRD_DIE_TEMPLATE_2, ALTER_TABLE_PRD_DIE_TEMPLATE_3, ALTER_TABLE_PRD_DIE_TEMPLATE_4, ALTER_TABLE_PRD_DIE_TEMPLATE_5, ALTER_TABLE_PRD_DIE_TEMPLATE_6, CREATE_TABLE_PRD_DIE_USAGE_LOG, ALTER_TABLE_PRD_DIE_TEMPLATE_7, ALTER_TABLE_PRD_DIE_TEMPLATE_8, ALTER_TABLE_PRD_DIE_TEMPLATE_9, ALTER_TABLE_PRD_DIE_TEMPLATE_10, ALTER_TABLE_PRD_DIE_TEMPLATE_11, ALTER_TABLE_PRD_DIE_TEMPLATE_12, ALTER_TABLE_PRD_DIE_TEMPLATE_13, ALTER_TABLE_PRD_DIE_TEMPLATE_14 } from '@/lib/db/ddl/prepress-die-migrate';

async function safeAlterTable(tableName: string, sql: string) {
  try {
    await execute(sql);
    return { table: tableName, status: 'altered' };
  } catch (e) {
    if ((e as Error).message?.includes('Duplicate column')) {
      return { table: tableName, status: 'skipped', reason: 'column already exists' };
    }
    return { table: tableName, status: 'error', message: (e as Error).message };
  }
}

async function safeCreateTable(tableName: string, sql: string) {
  try {
    await execute(sql);
    return { table: tableName, status: 'created' };
  } catch (e) {
    return { table: tableName, status: 'error', message: (e as Error).message };
  }
}

export const POST = withPermission(
  async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const results: DbRow[] = [];

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_4
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_11
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_6
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_9
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_3
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_5
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_14
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_2
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_12
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_7
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_13
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_8
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ALTER_TABLE_PRD_DIE_TEMPLATE_10
      )
    );

    results.push(
      await safeCreateTable(
        'prd_die_usage_log',
        CREATE_TABLE_PRD_DIE_USAGE_LOG
      )
    );

    results.push(
      await safeCreateTable(
        'prd_die_maintenance',
        CREATE_TABLE_PRD_DIE_MAINTENANCE
      )
    );

    try {
      await execute(
        `UPDATE prd_die_template SET cumulative_impressions = current_usage, max_impressions = max_usage WHERE cumulative_impressions = 0 AND current_usage > 0`
      );
      results.push({
        action: 'migrate_data',
        status: 'done',
        detail: 'migrated current_usage to cumulative_impressions',
      });
    } catch (e) {
      results.push({ action: 'migrate_data', status: 'error', message: (e as Error).message });
    }

    try {
      await execute(
        `UPDATE prd_die_template SET die_status = CASE
        WHEN status = 4 THEN 'scrap'
        WHEN status = 3 THEN 're_rule_needed'
        WHEN status = 2 THEN 'maintenance_needed'
        ELSE 'available'
      END
      WHERE die_status = 'available' AND status IN (2, 3, 4)`
      );
      results.push({
        action: 'migrate_status',
        status: 'done',
        detail: 'migrated old status to die_status',
      });
    } catch (e) {
      results.push({ action: 'migrate_status', status: 'error', message: (e as Error).message });
    }

    try {
      await execute(
        `UPDATE prd_die_template SET asset_type = CASE
        WHEN template_type = 2 THEN 'screen_mesh'
        ELSE 'die'
      END
      WHERE asset_type = 'die'`
      );
      results.push({ action: 'migrate_asset_type', status: 'done' });
    } catch (e) {
      results.push({
        action: 'migrate_asset_type',
        status: 'error',
        message: (e as Error).message,
      });
    }

    return successResponse(results, ts('k_evjb9r'));
  },
  { logTitle: '刀模/网版表结构优化', logType: 'business' }
);
