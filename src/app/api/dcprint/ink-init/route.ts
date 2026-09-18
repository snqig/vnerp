import { getTranslations } from 'next-intl/server';
import type { DbRow } from '@/types/db';

;
import { NextRequest } from 'next/server';
import { execute, query, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ALTER_TABLE_INK_OPENING_RECORD, CREATE_TABLE_INK_DISPATCH_ITEM, CREATE_TABLE_INK_FORMULA_WORKORDER, ALTER_TABLE_INV_INVENTORY_BATCH, ALTER_TABLE_INK_OPENING_RECORD_2, CREATE_TABLE_INK_DISPATCH, CREATE_TABLE_INK_FORMULA_ITEM, CREATE_TABLE_INK_FORMULA, CREATE_TABLE_INK_USAGE, ALTER_TABLE_INV_SCAN_LOG } from '@/lib/db/ddl/dcprint-ink-init';

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
      await safeCreateTable(
        'ink_formula',
        CREATE_TABLE_INK_FORMULA
      )
    );

    results.push(
      await safeCreateTable(
        'ink_formula_item',
        CREATE_TABLE_INK_FORMULA_ITEM
      )
    );

    results.push(
      await safeCreateTable(
        'ink_formula_workorder',
        CREATE_TABLE_INK_FORMULA_WORKORDER
      )
    );

    results.push(
      await safeCreateTable(
        'ink_dispatch',
        CREATE_TABLE_INK_DISPATCH
      )
    );

    results.push(
      await safeCreateTable(
        'ink_dispatch_item',
        CREATE_TABLE_INK_DISPATCH_ITEM
      )
    );

    results.push(
      await safeCreateTable(
        'ink_usage',
        CREATE_TABLE_INK_USAGE
      )
    );

    try {
      const cols = await query("SHOW COLUMNS FROM ink_opening_record LIKE 'workorder_id'");
      if (cols.length === 0) {
        await execute(
          ALTER_TABLE_INK_OPENING_RECORD
        );
        await execute(
          ALTER_TABLE_INK_OPENING_RECORD_2
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
      const cols = await query("SHOW COLUMNS FROM inv_inventory_batch LIKE 'inspection_id'");
      if (cols.length === 0) {
        await execute(
          ALTER_TABLE_INV_INVENTORY_BATCH
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
      const cols = await query("SHOW COLUMNS FROM inv_scan_log LIKE 'batch_no'");
      if (cols.length === 0) {
        await execute(
          ALTER_TABLE_INV_SCAN_LOG
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
