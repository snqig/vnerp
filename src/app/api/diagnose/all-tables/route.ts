import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

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

export async function GET(request: NextRequest) {
  const results: any = {};

  for (const table of tables) {
    try {
      const columns = await query(`SHOW COLUMNS FROM ${table}`);
      results[table] = { exists: true, columns: columns.map((c: any) => c.Field) };
    } catch (error: any) {
      results[table] = { exists: false, error: error.message };
    }
  }

  return Response.json({
    success: true,
    tables: results
  });
}
