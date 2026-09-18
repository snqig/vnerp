import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { CREATE_TABLE_PUR_PURCHASE_ORDER_LINE, CREATE_TABLE_SAL_ORDER_ITEM, CREATE_TABLE_PUR_SUPPLIER, CREATE_TABLE_SAL_DELIVERY, CREATE_TABLE_FIN_PAYABLE, CREATE_TABLE_FIN_RECEIPT_RECORD, CREATE_TABLE_SAL_ORDER_DETAIL, CREATE_TABLE_SYS_DICT_DATA, CREATE_TABLE_CRM_CUSTOMER_CONTACT, CREATE_TABLE_SAL_RECONCILIATION_LINE, CREATE_TABLE_SAL_DELIVERY_DETAIL, CREATE_TABLE_EQP_EQUIPMENT, CREATE_TABLE_PRD_PROCESS_ROUTE, CREATE_TABLE_INV_INBOUND_ORDER, CREATE_TABLE_PRD_PROCESS_ROUTE_STEP, CREATE_TABLE_SAL_RECONCILIATION_WRITEOFF, CREATE_TABLE_INV_LOCATION, CREATE_TABLE_FIN_RECEIVABLE, CREATE_TABLE_PUR_PURCHASE_ORDER, CREATE_TABLE_INV_INVENTORY_TRANSACTION, CREATE_TABLE_PROD_WORK_ORDER, CREATE_TABLE_PUR_ORDER_DETAIL, CREATE_TABLE_QC_INSPECTION, CREATE_TABLE_INV_MATERIAL, CREATE_TABLE_PRD_BOM, CREATE_TABLE_PUR_REQUEST, CREATE_TABLE_INV_SCAN_LOG, CREATE_TABLE_PROD_WORK_ORDER_ITEM, CREATE_TABLE_PRD_PROCESS_CARD_MATERIAL, CREATE_TABLE_SYS_OPER_LOG, CREATE_TABLE_PUR_REQUEST_ITEM, CREATE_TABLE_PRD_WORK_REPORT, CREATE_TABLE_INV_TRACE_RECORD, CREATE_TABLE_INV_CUTTING_RECORD, CREATE_TABLE_EQP_MAINTENANCE_RECORD, CREATE_TABLE_INV_MATERIAL_LABEL, CREATE_TABLE_BASE_INK, CREATE_TABLE_SYS_DICT_TYPE, CREATE_TABLE_INV_INVENTORY, CREATE_TABLE_SAL_ORDER, CREATE_TABLE_INV_INBOUND_ITEM, CREATE_TABLE_PROD_WORK_ORDER_MATERIAL_REQ, CREATE_TABLE_SAL_SAMPLE_ORDER, CREATE_TABLE_INV_TRACE_DETAIL, CREATE_TABLE_FIN_PAYMENT_RECORD, CREATE_TABLE_SAL_RETURN, CREATE_TABLE_PRD_BOM_DETAIL, CREATE_TABLE_INV_WAREHOUSE, CREATE_TABLE_CRM_CUSTOMER, CREATE_TABLE_SAL_RECONCILIATION, CREATE_TABLE_SYS_NOTICE, CREATE_TABLE_INV_OUTBOUND_ITEM, CREATE_TABLE_QC_UNQUALIFIED, CREATE_TABLE_INV_INVENTORY_LOG, CREATE_TABLE_SYS_LOGIN_LOG, CREATE_TABLE_SYS_CONFIG, CREATE_TABLE_SAL_RETURN_DETAIL, CREATE_TABLE_INK_MIXED_RECORD, CREATE_TABLE_PUR_ORDER, CREATE_TABLE_INV_OUTBOUND_ORDER, CREATE_TABLE_INV_CUTTING_DETAIL, CREATE_TABLE_INV_INVENTORY_BATCH, CREATE_TABLE_PRD_PROCESS_CARD, CREATE_TABLE_INK_OPENING_RECORD, CREATE_TABLE_PRD_DIE_TEMPLATE, CREATE_TABLE_EQP_MAINTENANCE_PLAN } from '@/lib/db/ddl/init-full-tables';

export const POST = withPermission(
  async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const result = await transaction(async (conn) => {
      const results: string[] = [];

      // ========================================
      // 0. 清理可能存在的不一致表（其他init路由创建的表列名可能不同）
      // ========================================
      await conn.execute(`SET FOREIGN_KEY_CHECKS = 0`);
      const dropTables = [
        'fin_payment_record',
        'fin_receipt_record',
        'fin_payable',
        'fin_receivable',
        'qc_unqualified',
        'qc_inspection',
        'prd_work_report',
        'prod_work_order_material_req',
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
        'sal_order_item',
        'sal_order',
        'sal_sample_order',
        'pur_receipt_detail',
        'pur_receipt',
        'pur_purchase_order_line',
        'pur_purchase_order',
        'pur_request_item',
        'pur_request',
        'pur_order_detail',
        'pur_order',
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
        'inv_location',
        'inv_warehouse',
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
      for (const table of dropTables) {
        try {
          await conn.execute(`DROP TABLE IF EXISTS ${table}`);
        } catch (_e) {}
      }
      await conn.execute(`SET FOREIGN_KEY_CHECKS = 1`);
      results.push(ts('k_u96cad'));

      // ========================================
      // 1. 核心基础表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_WAREHOUSE);
      results.push('inv_warehouse');

      await conn.execute(CREATE_TABLE_PUR_SUPPLIER);
      results.push('pur_supplier');

      await conn.execute(CREATE_TABLE_CRM_CUSTOMER);
      results.push('crm_customer');

      await conn.execute(CREATE_TABLE_INV_MATERIAL);
      results.push('inv_material');

      await conn.execute(CREATE_TABLE_SAL_ORDER);
      results.push('sal_order');

      await conn.execute(CREATE_TABLE_SAL_ORDER_DETAIL);
      results.push('sal_order_detail');

      await conn.execute(CREATE_TABLE_SAL_ORDER_ITEM);
      results.push('sal_order_item');

      await conn.execute(CREATE_TABLE_PUR_ORDER);
      results.push('pur_order');

      await conn.execute(CREATE_TABLE_PUR_ORDER_DETAIL);
      results.push('pur_order_detail');

      await conn.execute(CREATE_TABLE_PUR_PURCHASE_ORDER);
      results.push('pur_purchase_order');

      await conn.execute(CREATE_TABLE_PUR_PURCHASE_ORDER_LINE);
      results.push('pur_purchase_order_line');

      await conn.execute(CREATE_TABLE_PUR_REQUEST);
      results.push('pur_request');

      await conn.execute(CREATE_TABLE_PUR_REQUEST_ITEM);
      results.push('pur_request_item');

      await conn.execute(CREATE_TABLE_INV_INBOUND_ORDER);
      results.push('inv_inbound_order');

      await conn.execute(CREATE_TABLE_INV_INBOUND_ITEM);
      results.push('inv_inbound_item');

      // ========================================
      // 1. 送货单表
      // ========================================
      await conn.execute(CREATE_TABLE_SAL_DELIVERY);
      results.push('sal_delivery');

      await conn.execute(CREATE_TABLE_SAL_DELIVERY_DETAIL);
      results.push('sal_delivery_detail');

      // ========================================
      // 2. 退货单表
      // ========================================
      await conn.execute(CREATE_TABLE_SAL_RETURN);
      results.push('sal_return');

      await conn.execute(CREATE_TABLE_SAL_RETURN_DETAIL);
      results.push('sal_return_detail');

      // ========================================
      // 3. 销售对账表
      // ========================================
      await conn.execute(CREATE_TABLE_SAL_RECONCILIATION);
      results.push('sal_reconciliation');

      await conn.execute(CREATE_TABLE_SAL_RECONCILIATION_LINE);
      results.push('sal_reconciliation_line');

      await conn.execute(CREATE_TABLE_SAL_RECONCILIATION_WRITEOFF);
      results.push('sal_reconciliation_writeoff');

      // ========================================
      // 4. 设备管理表
      // ========================================
      await conn.execute(CREATE_TABLE_EQP_EQUIPMENT);
      results.push('eqp_equipment');

      await conn.execute(CREATE_TABLE_EQP_MAINTENANCE_PLAN);
      results.push('eqp_maintenance_plan');

      await conn.execute(CREATE_TABLE_EQP_MAINTENANCE_RECORD);
      results.push('eqp_maintenance_record');

      // ========================================
      // 5. 印前管理表
      // ========================================
      await conn.execute(CREATE_TABLE_PRD_DIE_TEMPLATE);
      results.push('prd_die_template');

      // ========================================
      // 6. 生产报工表
      // ========================================
      await conn.execute(CREATE_TABLE_PRD_WORK_REPORT);
      results.push('prd_work_report');

      // ========================================
      // 7. 工艺路线表
      // ========================================
      await conn.execute(CREATE_TABLE_PRD_PROCESS_ROUTE);
      results.push('prd_process_route');

      await conn.execute(CREATE_TABLE_PRD_PROCESS_ROUTE_STEP);
      results.push('prd_process_route_step');

      // ========================================
      // 8. 生产工单表
      // ========================================
      await conn.execute(CREATE_TABLE_PROD_WORK_ORDER);
      results.push('prod_work_order');

      await conn.execute(CREATE_TABLE_PROD_WORK_ORDER_ITEM);
      results.push('prod_work_order_item');

      await conn.execute(CREATE_TABLE_PROD_WORK_ORDER_MATERIAL_REQ);
      results.push('prod_work_order_material_req');

      // ========================================
      // 9. 库存表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_INVENTORY);
      results.push('inv_inventory');

      await conn.execute(CREATE_TABLE_INV_INVENTORY_BATCH);
      results.push('inv_inventory_batch');

      await conn.execute(CREATE_TABLE_INV_INVENTORY_LOG);
      results.push('inv_inventory_log');

      // ========================================
      // 10. 出库单表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_OUTBOUND_ORDER);
      results.push('inv_outbound_order');

      await conn.execute(CREATE_TABLE_INV_OUTBOUND_ITEM);
      results.push('inv_outbound_item');

      // ========================================
      // 11. 库存事务表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_INVENTORY_TRANSACTION);
      results.push('inv_inventory_transaction');

      // ========================================
      // 12. 质检表
      // ========================================
      await conn.execute(CREATE_TABLE_QC_INSPECTION);
      results.push('qc_inspection');

      await conn.execute(CREATE_TABLE_QC_UNQUALIFIED);
      results.push('qc_unqualified');

      // ========================================
      // 13. 财务应收/应付表
      // ========================================
      await conn.execute(CREATE_TABLE_FIN_RECEIVABLE);
      results.push('fin_receivable');

      await conn.execute(CREATE_TABLE_FIN_PAYABLE);
      results.push('fin_payable');

      await conn.execute(CREATE_TABLE_FIN_RECEIPT_RECORD);
      results.push('fin_receipt_record');

      await conn.execute(CREATE_TABLE_FIN_PAYMENT_RECORD);
      results.push('fin_payment_record');

      await conn.execute(CREATE_TABLE_PRD_BOM);
      results.push('prd_bom');

      await conn.execute(CREATE_TABLE_PRD_BOM_DETAIL);
      results.push('prd_bom_detail');

      await conn.execute(CREATE_TABLE_SAL_SAMPLE_ORDER);
      results.push('sal_sample_order');

      // ========================================
      // 库位表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_LOCATION);
      results.push('inv_location');

      // ========================================
      // 客户联系人表
      // ========================================
      await conn.execute(CREATE_TABLE_CRM_CUSTOMER_CONTACT);
      results.push('crm_customer_contact');

      // ========================================
      // 物料标签表（二维码追溯核心）
      // ========================================
      await conn.execute(CREATE_TABLE_INV_MATERIAL_LABEL);
      results.push('inv_material_label');

      // ========================================
      // 分切记录表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_CUTTING_RECORD);
      results.push('inv_cutting_record');

      // ========================================
      // 分切明细表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_CUTTING_DETAIL);
      results.push('inv_cutting_detail');

      // ========================================
      // 生产流程卡表
      // ========================================
      await conn.execute(CREATE_TABLE_PRD_PROCESS_CARD);
      results.push('prd_process_card');

      // ========================================
      // 流程卡物料关联表
      // ========================================
      await conn.execute(CREATE_TABLE_PRD_PROCESS_CARD_MATERIAL);
      results.push('prd_process_card_material');

      // ========================================
      // 追溯记录表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_TRACE_RECORD);
      results.push('inv_trace_record');

      // ========================================
      // 追溯明细表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_TRACE_DETAIL);
      results.push('inv_trace_detail');

      // ========================================
      // 扫码操作日志表
      // ========================================
      await conn.execute(CREATE_TABLE_INV_SCAN_LOG);
      results.push('inv_scan_log');

      // ========================================
      // 油墨开罐记录表
      // ========================================
      await conn.execute(CREATE_TABLE_INK_OPENING_RECORD);
      results.push('ink_opening_record');

      await conn.execute(CREATE_TABLE_SYS_DICT_TYPE);
      results.push('sys_dict_type');

      await conn.execute(CREATE_TABLE_SYS_DICT_DATA);
      results.push('sys_dict_data');

      await conn.execute(CREATE_TABLE_SYS_CONFIG);
      results.push('sys_config');

      await conn.execute(CREATE_TABLE_SYS_OPER_LOG);
      results.push('sys_oper_log');

      await conn.execute(CREATE_TABLE_SYS_LOGIN_LOG);
      results.push('sys_login_log');

      await conn.execute(CREATE_TABLE_SYS_NOTICE);
      results.push('sys_notice');

      await conn.execute(CREATE_TABLE_INK_MIXED_RECORD);
      results.push('ink_mixed_record');

      await conn.execute(CREATE_TABLE_BASE_INK);
      results.push('base_ink');

      return { tablesCreated: true, tables: results };
    });

    return successResponse(result, ts('k_1huyjdo'));
  },
  { errorMessage: '创建数据库表失败' }
);

export const GET = withPermission(
  async (_request: NextRequest, _userInfo) => {
    const tables = [
      'sal_delivery',
      'sal_delivery_detail',
      'sal_return',
      'sal_return_detail',
      'sal_reconciliation',
      'sal_reconciliation_line',
      'sal_reconciliation_writeoff',
      'eqp_equipment',
      'eqp_maintenance_plan',
      'eqp_maintenance_record',
      'prd_die_template',
      'prd_work_report',
      'prd_process_route',
      'prd_process_route_step',
      'prod_work_order',
      'prod_work_order_item',
      'inv_inventory',
      'inv_outbound_order',
      'inv_outbound_item',
      'inv_inventory_transaction',
      'qc_inspection',
      'qc_unqualified',
      'fin_receivable',
      'fin_payable',
      'fin_receipt_record',
      'fin_payment_record',
      'prd_bom',
      'prd_bom_detail',
      'sal_sample_order',
    ];

    const existing: string[] = [];
    const missing: string[] = [];

    for (const table of tables) {
      try {
        await query(`SELECT 1 FROM ${table} LIMIT 1`);
        existing.push(table);
      } catch {
        missing.push(table);
      }
    }

    return successResponse({ existing, missing, total: tables.length });
  },
  { errorMessage: '检查表状态失败' }
);
