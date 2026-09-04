import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { execute, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

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
    const results: SqlValue[] = [];

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_1gzpyyh')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_10y2xau')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_rnxn9n')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_1nw9fwb')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_8xz2jk')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_1c12lj9')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_1khznlf')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_z5zcfw')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_18qmaej')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_rzldfw')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_1q1zkqq')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_v37o1g')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_1xs9oez')
      )
    );

    results.push(
      await safeAlterTable(
        'prd_die_template',
        ts('k_aabqae')
      )
    );

    results.push(
      await safeCreateTable(
        'prd_die_usage_log',
        ts('k_1pdbuuv')
      )
    );

    results.push(
      await safeCreateTable(
        'prd_die_maintenance',
        ts('k_189son5')
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
