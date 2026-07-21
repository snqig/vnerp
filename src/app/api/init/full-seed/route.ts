import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  seedMasterData,
  seedCommercialData,
  seedProductionData,
  seedInventoryData,
  seedQualityData,
  seedFinancialData,
  seedMaintenanceData,
  seedContactsAndLocations,
} from '@/lib/seeds/full-seed-steps';

export const POST = withPermission(async (_request: NextRequest, _userInfo) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const truncateTables = [
      'fin_payment_record',
      'fin_receipt_record',
      'fin_payable',
      'fin_receivable',
      'qc_unqualified',
      'qc_inspection',
      'prd_work_report',
      'prod_work_order_item',
      'prod_work_order',
      'prd_bom_detail',
      'prd_bom',
      'sal_reconciliation_writeoff',
      'sal_reconciliation_line',
      'sal_reconciliation',
      'sal_return_detail',
      'sal_return',
      'sal_delivery_detail',
      'sal_delivery',
      'inv_inventory_transaction',
      'inv_outbound_item',
      'inv_outbound_order',
      'inv_inventory_log',
      'inv_inventory_batch',
      'inv_inventory',
      'inv_inbound_item',
      'inv_inbound_order',
      'sal_order_detail',
      'sal_order',
      'sal_sample_order',
      'pur_receipt_detail',
      'pur_receipt',
      'pur_purchase_order_line',
      'pur_purchase_order',
      'pur_order_detail',
      'pur_order',
      'pur_request_detail',
      'pur_request',
      'prd_process_route_step',
      'prd_process_route',
      'prd_die_template',
      'eqp_maintenance_record',
      'eqp_maintenance_plan',
      'eqp_equipment',
      'inv_material',
      'pur_supplier',
      'crm_customer_contact',
      'crm_customer',
      'inv_warehouse',
      'inv_location',
      'inv_material_label',
      'inv_cutting_record',
      'inv_cutting_detail',
      'prd_process_card',
      'prd_process_card_material',
      'inv_trace_record',
      'inv_trace_detail',
      'inv_scan_log',
      'ink_opening_record',
    ];

    for (const table of truncateTables) {
      try {
        await conn.execute(`DELETE FROM ${table}`);
        await conn.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (_e) {}
    }

    const materials = await seedMasterData(conn, stats);

    const { saleOrderIds, salesOrders, purchaseOrders, deliveryOrders } = await seedCommercialData(conn, stats);

    await seedProductionData(conn, stats, saleOrderIds, salesOrders, materials);
    await seedInventoryData(conn, stats, purchaseOrders);
    await seedQualityData(conn, stats);
    await seedFinancialData(conn, stats, deliveryOrders);
    await seedMaintenanceData(conn, stats);
    await seedContactsAndLocations(conn, stats);

    return stats;
  });

  return successResponse(result, '丝网印刷行业种子数据初始化成功');
});
