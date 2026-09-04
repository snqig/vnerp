import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

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
      await conn.execute(ts('k_jjz4t9'));
      results.push('inv_warehouse');

      await conn.execute(ts('k_16gfgmx'));
      results.push('pur_supplier');

      await conn.execute(ts('k_kocni7'));
      results.push('crm_customer');

      await conn.execute(ts('k_1uv4c89'));
      results.push('inv_material');

      await conn.execute(ts('k_dejeui'));
      results.push('sal_order');

      await conn.execute(ts('k_1be563s'));
      results.push('sal_order_detail');

      await conn.execute(ts('k_1515qlp'));
      results.push('sal_order_item');

      await conn.execute(ts('k_t81rav'));
      results.push('pur_order');

      await conn.execute(ts('k_1sem167'));
      results.push('pur_order_detail');

      await conn.execute(ts('k_1nyox0a'));
      results.push('pur_purchase_order');

      await conn.execute(ts('k_134ne9e'));
      results.push('pur_purchase_order_line');

      await conn.execute(ts('k_1vo1940'));
      results.push('pur_request');

      await conn.execute(ts('k_1xeqdu3'));
      results.push('pur_request_item');

      await conn.execute(ts('k_1krom0a'));
      results.push('inv_inbound_order');

      await conn.execute(ts('k_f90mfz'));
      results.push('inv_inbound_item');

      // ========================================
      // 1. 送货单表
      // ========================================
      await conn.execute(ts('k_18ely72'));
      results.push('sal_delivery');

      await conn.execute(ts('k_1hawuvm'));
      results.push('sal_delivery_detail');

      // ========================================
      // 2. 退货单表
      // ========================================
      await conn.execute(ts('k_ik94k5'));
      results.push('sal_return');

      await conn.execute(ts('k_rt9wtn'));
      results.push('sal_return_detail');

      // ========================================
      // 3. 销售对账表
      // ========================================
      await conn.execute(ts('k_lteu6g'));
      results.push('sal_reconciliation');

      await conn.execute(ts('k_1h0cbbv'));
      results.push('sal_reconciliation_line');

      await conn.execute(ts('k_1lier7j'));
      results.push('sal_reconciliation_writeoff');

      // ========================================
      // 4. 设备管理表
      // ========================================
      await conn.execute(ts('k_1jtzu7v'));
      results.push('eqp_equipment');

      await conn.execute(ts('k_ysaln8'));
      results.push('eqp_maintenance_plan');

      await conn.execute(ts('k_6b1t81'));
      results.push('eqp_maintenance_record');

      // ========================================
      // 5. 印前管理表
      // ========================================
      await conn.execute(ts('k_vyjz8t'));
      results.push('prd_die_template');

      // ========================================
      // 6. 生产报工表
      // ========================================
      await conn.execute(ts('k_2gux6l'));
      results.push('prd_work_report');

      // ========================================
      // 7. 工艺路线表
      // ========================================
      await conn.execute(ts('k_1jy9lgl'));
      results.push('prd_process_route');

      await conn.execute(ts('k_1l27718'));
      results.push('prd_process_route_step');

      // ========================================
      // 8. 生产工单表
      // ========================================
      await conn.execute(ts('k_1pa0x8h'));
      results.push('prod_work_order');

      await conn.execute(ts('k_1vx14c4'));
      results.push('prod_work_order_item');

      await conn.execute(ts('k_feqlh2'));
      results.push('prod_work_order_material_req');

      // ========================================
      // 9. 库存表
      // ========================================
      await conn.execute(ts('k_d8sc06'));
      results.push('inv_inventory');

      await conn.execute(ts('k_upjq15'));
      results.push('inv_inventory_batch');

      await conn.execute(ts('k_ov1iog'));
      results.push('inv_inventory_log');

      // ========================================
      // 10. 出库单表
      // ========================================
      await conn.execute(ts('k_torr33'));
      results.push('inv_outbound_order');

      await conn.execute(ts('k_mi92io'));
      results.push('inv_outbound_item');

      // ========================================
      // 11. 库存事务表
      // ========================================
      await conn.execute(ts('k_1ojuyfc'));
      results.push('inv_inventory_transaction');

      // ========================================
      // 12. 质检表
      // ========================================
      await conn.execute(ts('k_1ufvyzy'));
      results.push('qc_inspection');

      await conn.execute(ts('k_o2m3on'));
      results.push('qc_unqualified');

      // ========================================
      // 13. 财务应收/应付表
      // ========================================
      await conn.execute(ts('k_1n6w2yk'));
      results.push('fin_receivable');

      await conn.execute(ts('k_18vdddh'));
      results.push('fin_payable');

      await conn.execute(ts('k_1b549lk'));
      results.push('fin_receipt_record');

      await conn.execute(ts('k_icy93o'));
      results.push('fin_payment_record');

      await conn.execute(ts('k_1vdcqgt'));
      results.push('prd_bom');

      await conn.execute(ts('k_isbwrh'));
      results.push('prd_bom_detail');

      await conn.execute(ts('k_fpg9tl'));
      results.push('sal_sample_order');

      // ========================================
      // 库位表
      // ========================================
      await conn.execute(ts('k_1lwpkf1'));
      results.push('inv_location');

      // ========================================
      // 客户联系人表
      // ========================================
      await conn.execute(ts('k_1ei2pk8'));
      results.push('crm_customer_contact');

      // ========================================
      // 物料标签表（二维码追溯核心）
      // ========================================
      await conn.execute(ts('k_71n9l1'));
      results.push('inv_material_label');

      // ========================================
      // 分切记录表
      // ========================================
      await conn.execute(ts('k_4u3fsj'));
      results.push('inv_cutting_record');

      // ========================================
      // 分切明细表
      // ========================================
      await conn.execute(ts('k_unp12q'));
      results.push('inv_cutting_detail');

      // ========================================
      // 生产流程卡表
      // ========================================
      await conn.execute(ts('k_utjzo3'));
      results.push('prd_process_card');

      // ========================================
      // 流程卡物料关联表
      // ========================================
      await conn.execute(ts('k_1x51dsd'));
      results.push('prd_process_card_material');

      // ========================================
      // 追溯记录表
      // ========================================
      await conn.execute(ts('k_428k7i'));
      results.push('inv_trace_record');

      // ========================================
      // 追溯明细表
      // ========================================
      await conn.execute(ts('k_ho3b6k'));
      results.push('inv_trace_detail');

      // ========================================
      // 扫码操作日志表
      // ========================================
      await conn.execute(ts('k_1vpijoa'));
      results.push('inv_scan_log');

      // ========================================
      // 油墨开罐记录表
      // ========================================
      await conn.execute(ts('k_vmklcp'));
      results.push('ink_opening_record');

      await conn.execute(ts('k_b3ratl'));
      results.push('sys_dict_type');

      await conn.execute(ts('k_1cyithy'));
      results.push('sys_dict_data');

      await conn.execute(ts('k_piqkeq'));
      results.push('sys_config');

      await conn.execute(ts('k_1xcgg01'));
      results.push('sys_oper_log');

      await conn.execute(ts('k_p4sugp'));
      results.push('sys_login_log');

      await conn.execute(ts('k_mb31su'));
      results.push('sys_notice');

      await conn.execute(ts('k_sg18ks'));
      results.push('ink_mixed_record');

      await conn.execute(ts('k_8pdzru'));
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
