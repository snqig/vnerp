import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ALTER_TABLE_EQP_EQUIPMENT, CREATE_TABLE_INK_MIXED_BATCH_DETAIL, ALTER_TABLE_INV_OUTBOUND_ORDER, CREATE_TABLE_BIZ_CONTRACT_REVIEW, CREATE_TABLE_FIN_VOUCHER, ALTER_TABLE_INV_MATERIAL, CREATE_TABLE_ENG_SAMPLE_TO_MASS, ALTER_TABLE_INV_INBOUND_ORDER, ALTER_TABLE_PROD_WORK_ORDER, ALTER_TABLE_EQP_EQUIPMENT_2, ALTER_TABLE_INV_SALES_OUTBOUND, ALTER_TABLE_PUR_SUPPLIER, ALTER_TABLE_PROD_WORK_ORDER_2, ALTER_TABLE_INV_INBOUND_ORDER_2, ALTER_TABLE_PUR_SUPPLIER_2, ALTER_TABLE_PROD_WORK_ORDER_3, CREATE_TABLE_INK_OPENING_RECORD, ALTER_TABLE_CRM_CUSTOMER, ALTER_TABLE_INV_OUTBOUND_ORDER_2, ALTER_TABLE_INV_MATERIAL_LABEL, ALTER_TABLE_PUR_SUPPLIER_3, ALTER_TABLE_INV_SALES_OUTBOUND_2, ALTER_TABLE_INV_INBOUND_ORDER_3, ALTER_TABLE_INV_INBOUND_ORDER_4, ALTER_TABLE_INV_INVENTORY_BATCH, ALTER_TABLE_INV_INBOUND_ORDER_5, ALTER_TABLE_EQP_EQUIPMENT_3, CREATE_TABLE_INV_SCAN_LOG, ALTER_TABLE_PUR_SUPPLIER_4, ALTER_TABLE_PROD_WORK_ORDER_4, CREATE_TABLE_PRD_PRODUCT_TRACE_LINK, CREATE_TABLE_INV_FIFO_OVERRIDE_LOG, ALTER_TABLE_INV_MATERIAL_2, ALTER_TABLE_EQP_EQUIPMENT_4, ALTER_TABLE_INV_INVENTORY_BATCH_2, CREATE_TABLE_INK_MIXED_BATCH, ALTER_TABLE_CRM_CUSTOMER_2, ALTER_TABLE_INV_INBOUND_ORDER_6 } from '@/lib/db/ddl/init-data-logic';

export const POST = withPermission(
  async (_request: NextRequest, _userInfo) => {
    const result = await transaction(async (conn) => {
  const ts = await getTranslations('Common');
      const results: string[] = [];

      const safeExecute = async (sql: string, label: string) => {
        try {
          await conn.execute(sql);
          results.push(`${label}: OK`);
        } catch (e) {
          if (
            (e as Error & { code?: string }).code === 'ER_DUP_FIELDNAME' ||
            (e as Error & { code?: string }).code === 'ER_DUP_KEYNAME'
          ) {
            results.push(`${label}: 已存在`);
          } else {
            results.push(`${label}: ${(e as Error).message}`);
          }
        }
      };

      const safeCreateTable = async (name: string, sql: string) => {
        try {
          await conn.execute(sql);
          results.push(`${name}: 创建成功`);
        } catch (e) {
          if ((e as Error & { code?: string }).code === 'ER_TABLE_EXISTS_ERROR') {
            results.push(`${name}: 已存在`);
          } else {
            results.push(`${name}: ${(e as Error).message}`);
          }
        }
      };

      // ========================================
      // 1. 产品追溯链表 (QR Code Trace Link)
      //    成品标签 ← 生产工单 ← 来料批次
      // ========================================
      await safeCreateTable(
        'prd_product_trace_link',
        CREATE_TABLE_PRD_PRODUCT_TRACE_LINK
      );

      // ========================================
      // 2. FIFO覆盖日志表 (FIFO Override Log)
      //    当用户跳过FIFO推荐批次时记录
      // ========================================
      await safeCreateTable(
        'inv_fifo_override_log',
        CREATE_TABLE_INV_FIFO_OVERRIDE_LOG
      );

      // ========================================
      // 3. 财务凭证表 (Finance Voucher)
      //    出入库单据过账生成财务凭证
      // ========================================
      await safeCreateTable(
        'fin_voucher',
        CREATE_TABLE_FIN_VOUCHER
      );

      // ========================================
      // 4. 合同评审表 (Contract Review)
      //    销售订单→合同评审→生产/采购/财务联合评审
      // ========================================
      await safeCreateTable(
        'biz_contract_review',
        CREATE_TABLE_BIZ_CONTRACT_REVIEW
      );

      // ========================================
      // 5. 样品转量产记录表 (Sample to Mass Production)
      //    打样订单→标准卡→流程卡→量产工单
      // ========================================
      await safeCreateTable(
        'eng_sample_to_mass',
        CREATE_TABLE_ENG_SAMPLE_TO_MASS
      );

      // ========================================
      // 6. 油墨开罐记录表 (Ink Opening Record)
      //    开罐后重新计算有效期
      // ========================================
      await safeCreateTable(
        'ink_opening_record',
        CREATE_TABLE_INK_OPENING_RECORD
      );

      // ========================================
      // 7. 调色油墨批次表 (Ink Mixed Batch)
      //    调色油墨由多种原墨混合而成
      // ========================================
      await safeCreateTable(
        'ink_mixed_batch',
        CREATE_TABLE_INK_MIXED_BATCH
      );

      await safeCreateTable(
        'ink_mixed_batch_detail',
        CREATE_TABLE_INK_MIXED_BATCH_DETAIL
      );

      // ========================================
      // 8. 扫码日志表 (Scan Log)
      //    统一记录所有扫码操作
      // ========================================
      await safeCreateTable(
        'inv_scan_log',
        CREATE_TABLE_INV_SCAN_LOG
      );

      // ========================================
      // 9. 添加缺失的关联字段
      // ========================================

      // 入库单添加采购订单关联
      await safeExecute(
        ALTER_TABLE_INV_INBOUND_ORDER,
        'inv_inbound_order.purchase_order_id'
      );
      await safeExecute(
        ALTER_TABLE_INV_INBOUND_ORDER_5,
        'inv_inbound_order.purchase_order_no'
      );

      // 入库单添加质检状态
      await safeExecute(
        ALTER_TABLE_INV_INBOUND_ORDER_2,
        'inv_inbound_order.inspection_status'
      );
      await safeExecute(
        ALTER_TABLE_INV_INBOUND_ORDER_4,
        'inv_inbound_order.inspection_id'
      );

      // 出库单添加财务过账状态
      await safeExecute(
        ALTER_TABLE_INV_OUTBOUND_ORDER_2,
        'inv_outbound_order.finance_posted'
      );
      await safeExecute(
        ALTER_TABLE_INV_OUTBOUND_ORDER,
        'inv_outbound_order.voucher_no'
      );

      // 销售出库添加销售订单关联
      await safeExecute(
        ALTER_TABLE_INV_SALES_OUTBOUND_2,
        'inv_sales_outbound.finance_posted'
      );
      await safeExecute(
        ALTER_TABLE_INV_SALES_OUTBOUND,
        'inv_sales_outbound.voucher_no'
      );

      // 入库单添加财务过账状态
      await safeExecute(
        ALTER_TABLE_INV_INBOUND_ORDER_3,
        'inv_inbound_order.finance_posted'
      );
      await safeExecute(
        ALTER_TABLE_INV_INBOUND_ORDER_6,
        'inv_inbound_order.voucher_no'
      );

      // 批次库存添加冻结状态
      await safeExecute(
        ALTER_TABLE_INV_INVENTORY_BATCH,
        'inv_inventory_batch.freeze_reason'
      );
      await safeExecute(
        ALTER_TABLE_INV_INVENTORY_BATCH_2,
        'inv_inventory_batch.inspection_id'
      );

      // 生产工单添加销售订单关联
      await safeExecute(
        ALTER_TABLE_PROD_WORK_ORDER_4,
        'prod_work_order.sales_order_id'
      );
      await safeExecute(
        ALTER_TABLE_PROD_WORK_ORDER,
        'prod_work_order.sales_order_no'
      );

      // 生产工单添加标准卡/流程卡关联
      await safeExecute(
        ALTER_TABLE_PROD_WORK_ORDER_3,
        'prod_work_order.standard_card_id'
      );
      await safeExecute(
        ALTER_TABLE_PROD_WORK_ORDER_2,
        'prod_work_order.process_card_id'
      );

      // 物料标签添加追溯链关联
      await safeExecute(
        ALTER_TABLE_INV_MATERIAL_LABEL,
        'inv_material_label.trace_link_id'
      );

      // 供应商添加质量评估分数
      await safeExecute(
        ALTER_TABLE_PUR_SUPPLIER,
        'pur_supplier.quality_score'
      );
      await safeExecute(
        ALTER_TABLE_PUR_SUPPLIER_2,
        'pur_supplier.delivery_score'
      );
      await safeExecute(
        ALTER_TABLE_PUR_SUPPLIER_4,
        'pur_supplier.price_score'
      );
      await safeExecute(
        ALTER_TABLE_PUR_SUPPLIER_3,
        'pur_supplier.overall_score'
      );

      // 客户添加信用额度
      await safeExecute(
        ALTER_TABLE_CRM_CUSTOMER_2,
        'crm_customer.credit_limit'
      );
      await safeExecute(
        ALTER_TABLE_CRM_CUSTOMER,
        'crm_customer.credit_used'
      );

      // 设备添加OEE字段
      await safeExecute(
        ALTER_TABLE_EQP_EQUIPMENT_4,
        'eqp_equipment.oee_availability'
      );
      await safeExecute(
        ALTER_TABLE_EQP_EQUIPMENT_3,
        'eqp_equipment.oee_performance'
      );
      await safeExecute(
        ALTER_TABLE_EQP_EQUIPMENT,
        'eqp_equipment.oee_quality'
      );
      await safeExecute(
        ALTER_TABLE_EQP_EQUIPMENT_2,
        'eqp_equipment.oee_overall'
      );

      // 物料添加SGS认证关联
      await safeExecute(
        ALTER_TABLE_INV_MATERIAL,
        'inv_material.sgs_cert_required'
      );
      await safeExecute(
        ALTER_TABLE_INV_MATERIAL_2,
        'inv_material.sgs_cert_id'
      );

      // ========================================
      // 10. 创建数据关联视图
      // ========================================

      await safeCreateTable(
        'v_order_to_delivery',
        `CREATE OR REPLACE VIEW v_order_to_delivery AS
      SELECT
        so.id as order_id,
        so.order_no,
        so.customer_id,
        c.customer_name,
        so.total_amount as order_amount,
        so.status as order_status,
        so.delivery_date,
        sd.id as delivery_id,
        sd.delivery_no,
        sd.status as delivery_status,
        sd.total_qty as delivered_qty,
        so.id as sales_order_id
      FROM sal_order so
      LEFT JOIN crm_customer c ON so.customer_id = c.id
      LEFT JOIN sal_delivery sd ON sd.order_id = so.id AND sd.deleted = 0
      WHERE so.deleted = 0`
      );

      await safeCreateTable(
        'v_purchase_to_inbound',
        `CREATE OR REPLACE VIEW v_purchase_to_inbound AS
      SELECT
        po.id as purchase_id,
        po.po_no as purchase_no,
        po.supplier_id,
        ps.supplier_name,
        po.total_amount as purchase_amount,
        po.status as purchase_status,
        io.id as inbound_id,
        io.order_no as inbound_no,
        io.status as inbound_status,
        io.inspection_status,
        io.finance_posted as inbound_posted
      FROM pur_purchase_order po
      LEFT JOIN pur_supplier ps ON po.supplier_id = ps.id
      LEFT JOIN inv_inbound_order io ON io.po_id = po.id AND io.deleted = 0
      WHERE po.deleted = 0`
      );

      await safeCreateTable(
        'v_workorder_to_outbound',
        `CREATE OR REPLACE VIEW v_workorder_to_outbound AS
      SELECT
        wo.id as workorder_id,
        wo.order_no as workorder_no,
        wo.order_id as sales_order_id,
        wo.order_no as sales_order_no,
        wo.quantity as plan_qty,
        wo.status as workorder_status,
        mi.id as issue_id,
        mi.issue_no,
        mi.status as issue_status,
        so2.id as sales_outbound_id,
        so2.outbound_no as sales_outbound_no
      FROM prod_work_order wo
      LEFT JOIN prd_material_issue mi ON mi.work_order_id = wo.id AND mi.deleted = 0
      LEFT JOIN inv_sales_outbound so2 ON so2.order_id = wo.order_id AND so2.deleted = 0
      WHERE wo.deleted = 0`
      );

      await safeCreateTable(
        'v_fifo_cost_analysis',
        `CREATE OR REPLACE VIEW v_fifo_cost_analysis AS
      SELECT
        ib.material_id,
        ib.material_code,
        ib.material_name,
        ib.batch_no,
        ib.available_qty,
        ib.unit_price,
        ib.inbound_date,
        ib.status as batch_status,
        ib.warehouse_id,
        w.warehouse_name,
        (ib.available_qty * ib.unit_price) as batch_value,
        CASE
          WHEN ib.expire_date IS NOT NULL AND ib.expire_date < CURDATE() THEN 'EXPIRED'
          WHEN ib.alert_level = 'frozen' THEN 'FROZEN'
          WHEN ib.available_qty > 0 THEN 'AVAILABLE'
          ELSE 'EMPTY'
        END as fifo_status
      FROM inv_inventory_batch ib
      LEFT JOIN inv_warehouse w ON ib.warehouse_id = w.id
      WHERE ib.deleted = 0`
      );

      results.push(ts('k_1vem9e4'));

      return results;
    });

    return successResponse(result);
  },
  { errorMessage: '数据逻辑关系修正失败' }
);
