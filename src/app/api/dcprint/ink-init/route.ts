import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { execute, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

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
      await safeCreateTable(
        'ink_formula',
        ts('k_ewnh68')
      )
    );

    results.push(
      await safeCreateTable(
        'ink_formula_item',
        ts('k_eu68ll')
      )
    );

    results.push(
      await safeCreateTable(
        'ink_formula_workorder',
        ts('k_1p19ht1')
      )
    );

    results.push(
      await safeCreateTable(
        'ink_dispatch',
        ts('k_abez5h')
      )
    );

    results.push(
      await safeCreateTable(
        'ink_dispatch_item',
        ts('k_1f6xsay')
      )
    );

    results.push(
      await safeCreateTable(
        'ink_usage',
        ts('k_n07ykg')
      )
    );

    try {
      const [cols] = await execute("SHOW COLUMNS FROM ink_opening_record LIKE 'workorder_id'");
      if (cols.length === 0) {
        await execute(
          ts('k_1bf4t44')
        );
        await execute(
          ts('k_1t4b2fu')
        );
        results.push({
          table: 'ink_opening_record',
          action: 'add_columns',
          columns: ['workorder_id', 'workorder_no'],
        });
      }
    } catch (e) {
      results.push({
        table: 'ink_opening_record',
        action: 'add_columns',
        status: 'error',
        message: (e as Error).message,
      });
    }

    try {
      const [cols] = await execute("SHOW COLUMNS FROM inv_inventory_batch LIKE 'inspection_id'");
      if (cols.length === 0) {
        await execute(
          ts('k_1qspozm')
        );
        results.push({
          table: 'inv_inventory_batch',
          action: 'add_column',
          column: 'inspection_id',
        });
      }
    } catch (e) {
      results.push({
        table: 'inv_inventory_batch',
        action: 'add_column',
        status: 'error',
        message: (e as Error).message,
      });
    }

    try {
      const [cols] = await execute("SHOW COLUMNS FROM inv_scan_log LIKE 'batch_no'");
      if (cols.length === 0) {
        await execute(
          ts('k_xykevy')
        );
        results.push({ table: 'inv_scan_log', action: 'add_column', column: 'batch_no' });
      }
    } catch (e) {
      results.push({
        table: 'inv_scan_log',
        action: 'add_column',
        status: 'error',
        message: (e as Error).message,
      });
    }

    return successResponse(results, ts('k_1wvxhnk'));
  },
  { logTitle: '油墨管理表初始化', logType: 'business' }
);
