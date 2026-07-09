import { NextRequest, NextResponse } from 'next/server';
import { escapeId } from 'mysql2';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

const tables = [
  'inv_inbound_order',
  'inv_inbound_item',
  'inv_material_label',
  'inv_inventory',
  'qc_inspection',
  'crm_customer',
  'finance_receivable',
  'finance_receipt',
  'prd_process_card',
  'qc_final_inspection',
  'prd_standard_card',
  'sal_order',
  'sal_order_item',
  'prod_work_order',
  'prod_work_order_item',
];

export const GET = withPermission(async (_request: NextRequest) => {
  const results: Loose = {};

  for (const table of tables) {
    try {
      const columns = await query(`SHOW COLUMNS FROM ${escapeId(table)}`);
      results[table] = { exists: true, columns: columns.map((c: Loose) => c.Field) };
    } catch (error) {
      results[table] = { exists: false, error: (error as Error).message };
    }
  }

  return NextResponse.json({
    success: true,
    tables: results,
  });
});
