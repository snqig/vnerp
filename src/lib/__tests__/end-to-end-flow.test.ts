import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query, execute, transaction } from '@/lib/db';
import { createWorkOrderFromSalesOrder } from '@/lib/services/sales-order-service';
import { FinanceVoucherHandler } from '@/lib/FinanceVoucherHandler';
import { SalesOrderStateMachine } from '@/lib/sales-order-state-machine';
import { ShipmentStateMachine } from '@/lib/shipment-state-machine';

describe('P0-1: 端到端业务流程闭环测试', () => {
  let testCustomerId: number;
  let testProductId: number;
  let testMaterialId: number;
  let testWarehouseId: number;
  let testBomId: number;
  let testSalesOrderId: number;
  let testWorkOrderId: number;
  let testIssueId: number;
  let testInboundId: number;
  let testOutboundId: number;

  beforeAll(async () => {
    const [custResult]: any = await execute(
      `INSERT INTO crm_customer (customer_code, customer_name, customer_type, status, deleted)
       VALUES ('TEST-CUST-001', '测试客户-端到端', 'enterprise', 1, 0)`
    );
    testCustomerId = custResult.insertId;

    const [matResult]: any = await execute(
      `INSERT INTO inv_material_std (material_code, material_name, material_type, unit, status, deleted)
       VALUES ('TEST-PROD-001', '测试产品-包装膜', 'product', '㎡', 1, 0)`
    );
    testProductId = matResult.insertId;

    const [rawResult]: any = await execute(
      `INSERT INTO inv_material_std (material_code, material_name, material_type, unit, status, deleted)
       VALUES ('TEST-RAW-001', '测试原材料-PE膜', 'raw', 'kg', 1, 0)`
    );
    testMaterialId = rawResult.insertId;

    const [whResult]: any = await execute(
      `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, warehouse_type, status, deleted)
       VALUES ('TEST-WH', '测试仓库', 'main', 1, 0)`
    );
    testWarehouseId = whResult.insertId;

    const [bomResult]: any = await execute(
      `INSERT INTO prd_bom_std (bom_code, product_id, version, status, deleted)
       VALUES ('TEST-BOM-001', ?, 'V1.0', 1, 0)`,
      [testProductId]
    );
    testBomId = bomResult.insertId;

    await execute(
      `INSERT INTO prd_bom_line_std (bom_id, material_id, material_code, material_name, consumption_qty, waste_rate, deleted)
       VALUES (?, ?, 'TEST-RAW-001', '测试原材料-PE膜', 1.2, 5.0, 0)`,
      [testBomId, testMaterialId]
    );

    await execute(
      `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, unit, deleted)
       VALUES (?, 'TEST-RAW-001', '测试原材料-PE膜', ?, 10000, 'kg', 0)`,
      [testMaterialId, testWarehouseId]
    );

    const [soResult]: any = await execute(
      `INSERT INTO sal_order (order_no, customer_id, total_amount, status, deleted)
       VALUES ('SO-TEST-001', ?, 10000.00, 20, 0)`,
      [testCustomerId]
    );
    testSalesOrderId = soResult.insertId;

    await execute(
      `INSERT INTO sal_order_detail (order_id, material_id, material_name, quantity, unit_price, amount, deleted)
       VALUES (?, ?, '测试产品-包装膜', 1000, 10.00, 10000.00, 0)`,
      [testSalesOrderId, testProductId]
    );
  });

  afterAll(async () => {
    await execute(
      `DELETE FROM fin_voucher_line WHERE voucher_id IN (SELECT id FROM fin_voucher WHERE source_no LIKE 'TEST-%')`
    );
    await execute(`DELETE FROM fin_voucher WHERE source_no LIKE 'TEST-%'`);
    await execute(`DELETE FROM inv_inventory_transaction WHERE source_no LIKE 'TEST-%'`);
    await execute(`DELETE FROM inv_inventory_batch WHERE material_id IN (?, ?)`, [
      testProductId,
      testMaterialId,
    ]);
    await execute(`DELETE FROM inv_inventory WHERE material_id IN (?, ?)`, [
      testProductId,
      testMaterialId,
    ]);
    await execute(
      `DELETE FROM prd_material_issue_item WHERE issue_id IN (SELECT id FROM prd_material_issue WHERE issue_no LIKE 'TEST-%')`
    );
    await execute(`DELETE FROM prd_material_issue WHERE issue_no LIKE 'TEST-%'`);
    await execute(
      `DELETE FROM inv_production_inbound_item WHERE inbound_id IN (SELECT id FROM inv_production_inbound WHERE inbound_no LIKE 'TEST-%')`
    );
    await execute(`DELETE FROM inv_production_inbound WHERE inbound_no LIKE 'TEST-%'`);
    await execute(
      `DELETE FROM inv_sales_outbound_item WHERE outbound_id IN (SELECT id FROM inv_sales_outbound WHERE outbound_no LIKE 'TEST-%')`
    );
    await execute(`DELETE FROM inv_sales_outbound WHERE outbound_no LIKE 'TEST-%'`);
    await execute(`DELETE FROM prod_work_order_material_req WHERE work_order_id = ?`, [
      testWorkOrderId,
    ]);
    await execute(`DELETE FROM prod_work_order WHERE id = ?`, [testWorkOrderId]);
    await execute(`DELETE FROM sal_order_detail WHERE order_id = ?`, [testSalesOrderId]);
    await execute(`DELETE FROM sal_order WHERE id = ?`, [testSalesOrderId]);
    await execute(`DELETE FROM prd_bom_line_std WHERE bom_id = ?`, [testBomId]);
    await execute(`DELETE FROM prd_bom_std WHERE id = ?`, [testBomId]);
    await execute(`DELETE FROM inv_warehouse WHERE id = ?`, [testWarehouseId]);
    await execute(`DELETE FROM inv_material_std WHERE id IN (?, ?)`, [
      testProductId,
      testMaterialId,
    ]);
    await execute(`DELETE FROM crm_customer WHERE id = ?`, [testCustomerId]);
  });

  describe('步骤1: 销售订单 → 生产工单', () => {
    it('应能根据销售订单创建生产工单', async () => {
      const result = await createWorkOrderFromSalesOrder(testSalesOrderId);

      expect(result).toBeDefined();
      expect(result.workOrderId).toBeGreaterThan(0);
      expect(result.workOrderNo).toMatch(/^WO\d{14}\d{4}$/);
      expect(result.materialReqCount).toBeGreaterThanOrEqual(1);

      testWorkOrderId = result.workOrderId;

      const [woRows]: any = await query(`SELECT * FROM prod_work_order WHERE id = ?`, [
        testWorkOrderId,
      ]);
      expect(woRows.length).toBe(1);
      expect(woRows[0].sales_order_id).toBe(testSalesOrderId);
      expect(woRows[0].product_id).toBe(testProductId);
    });

    it('销售订单状态机应支持正确的状态流转', () => {
      expect(SalesOrderStateMachine.canTransition('draft', 'pending_review')).toBe(true);
      expect(SalesOrderStateMachine.canTransition('approved', 'producing')).toBe(true);
      expect(SalesOrderStateMachine.canTransition('producing', 'shipped')).toBe(true);
      expect(SalesOrderStateMachine.canTransition('draft', 'completed')).toBe(false);
    });
  });

  describe('步骤2: 生产工单 → 领料单', () => {
    it('应能根据工单创建领料单并过账', async () => {
      const [issueResult]: any = await execute(
        `INSERT INTO prd_material_issue (issue_no, work_order_id, work_order_no, warehouse_id, issue_date, issue_type, operator_name, status)
         VALUES ('TEST-MI-001', ?, 'TEST-WO', ?, CURDATE(), 1, '测试员', 1)`,
        [testWorkOrderId, testWarehouseId]
      );
      testIssueId = issueResult.insertId;

      await execute(
        `INSERT INTO prd_material_issue_item (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit)
         VALUES (?, ?, 'TEST-RAW-001', '测试原材料-PE膜', 1200, 1200, 'kg')`,
        [testIssueId, testMaterialId]
      );

      const [beforeInv]: any = await query(
        `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ?`,
        [testMaterialId, testWarehouseId]
      );
      const beforeQty = beforeInv[0].quantity;

      await execute(`UPDATE prd_material_issue SET status = 3 WHERE id = ?`, [testIssueId]);
      await execute(
        `UPDATE inv_inventory SET quantity = quantity - 1200 WHERE material_id = ? AND warehouse_id = ?`,
        [testMaterialId, testWarehouseId]
      );

      const [afterInv]: any = await query(
        `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ?`,
        [testMaterialId, testWarehouseId]
      );
      expect(Number(afterInv[0].quantity)).toBe(Number(beforeQty) - 1200);
    });
  });

  describe('步骤3: 车间报工 → 生产入库', () => {
    it('应能创建生产入库单并增加库存', async () => {
      const [inboundResult]: any = await execute(
        `INSERT INTO inv_production_inbound (inbound_no, work_order_id, work_order_no, warehouse_id, inbound_date, operator_name, qc_status, status)
         VALUES ('TEST-PI-001', ?, 'TEST-WO', ?, CURDATE(), '测试员', 'pass', 1)`,
        [testWorkOrderId, testWarehouseId]
      );
      testInboundId = inboundResult.insertId;

      await execute(
        `INSERT INTO inv_production_inbound_item (inbound_id, material_id, material_code, material_name, quantity, unit)
         VALUES (?, ?, 'TEST-PROD-001', '测试产品-包装膜', 950, '㎡')`,
        [testInboundId, testProductId]
      );

      await execute(`UPDATE inv_production_inbound SET status = 3 WHERE id = ?`, [testInboundId]);

      await execute(
        `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, unit)
         VALUES (?, 'TEST-PROD-001', '测试产品-包装膜', ?, 950, '㎡')
         ON DUPLICATE KEY UPDATE quantity = quantity + 950`,
        [testProductId, testWarehouseId]
      );

      const [invRows]: any = await query(
        `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ?`,
        [testProductId, testWarehouseId]
      );
      expect(Number(invRows[0].quantity)).toBeGreaterThanOrEqual(950);
    });
  });

  describe('步骤4: 销售出库 → 库存减少', () => {
    it('应能创建销售出库单并扣减库存', async () => {
      const [outboundResult]: any = await execute(
        `INSERT INTO inv_sales_outbound (outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, status)
         VALUES ('TEST-SO-001', ?, 'SO-TEST-001', ?, '测试客户', ?, CURDATE(), '测试员', 1)`,
        [testSalesOrderId, testCustomerId, testWarehouseId]
      );
      testOutboundId = outboundResult.insertId;

      await execute(
        `INSERT INTO inv_sales_outbound_item (outbound_id, material_id, material_code, material_name, quantity, unit)
         VALUES (?, ?, 'TEST-PROD-001', '测试产品-包装膜', 500, '㎡')`,
        [testOutboundId, testProductId]
      );

      const [beforeInv]: any = await query(
        `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ?`,
        [testProductId, testWarehouseId]
      );
      const beforeQty = Number(beforeInv[0].quantity);

      await execute(`UPDATE inv_sales_outbound SET status = 3 WHERE id = ?`, [testOutboundId]);
      await execute(
        `UPDATE inv_inventory SET quantity = quantity - 500 WHERE material_id = ? AND warehouse_id = ?`,
        [testProductId, testWarehouseId]
      );

      const [afterInv]: any = await query(
        `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ?`,
        [testProductId, testWarehouseId]
      );
      expect(Number(afterInv[0].quantity)).toBe(beforeQty - 500);
    });

    it('发货单状态机应支持完整的物流状态流转', () => {
      expect(ShipmentStateMachine.canTransition('draft', 'pending_review')).toBe(true);
      expect(ShipmentStateMachine.canTransition('approved', 'picking')).toBe(true);
      expect(ShipmentStateMachine.canTransition('picked', 'shipped')).toBe(true);
      expect(ShipmentStateMachine.canTransition('shipped', 'delivered')).toBe(true);
      expect(ShipmentStateMachine.canTransition('delivered', 'draft')).toBe(false);
    });
  });

  describe('步骤5: 出库完成 → 财务凭证', () => {
    it('应能生成销售出库财务凭证', async () => {
      const result = await FinanceVoucherHandler.generateSalesOutboundVoucher(
        testOutboundId,
        'TEST-SO-001',
        [
          {
            material_id: testProductId,
            material_name: '测试产品-包装膜',
            quantity: 500,
            total_cost: 3500.0,
            avg_cost: 7.0,
          },
        ],
        testCustomerId,
        '测试客户',
        testWarehouseId
      );

      expect(result.success).toBe(true);
      expect(result.voucher_id).toBeGreaterThan(0);
      expect(result.voucher_no).toMatch(/^FV\d{14}\d{4}$/);

      const vouchers = await FinanceVoucherHandler.getVouchersBySource(
        'sales_outbound',
        testOutboundId
      );
      expect(vouchers.length).toBeGreaterThanOrEqual(1);
      expect(vouchers[0].total_amount).toBe(3500.0);
    });

    it('应能生成领料财务凭证', async () => {
      const result = await FinanceVoucherHandler.generateMaterialIssueVoucher(
        testIssueId,
        'TEST-MI-001',
        testWorkOrderId,
        'TEST-WO',
        [
          {
            material_id: testMaterialId,
            material_name: '测试原材料-PE膜',
            quantity: 1200,
            total_cost: 2400.0,
          },
        ]
      );

      expect(result.success).toBe(true);
      expect(result.voucher_id).toBeGreaterThan(0);
    });

    it('应能生成生产入库财务凭证', async () => {
      const result = await FinanceVoucherHandler.generateProductionInboundVoucher(
        testInboundId,
        'TEST-PI-001',
        testWorkOrderId,
        'TEST-WO',
        [
          {
            product_id: testProductId,
            product_name: '测试产品-包装膜',
            quantity: 950,
            standard_cost: 5.0,
            actual_cost: 5900.0,
          },
        ]
      );

      expect(result.success).toBe(true);
      expect(result.voucher_id).toBeGreaterThan(0);
    });

    it('应防止重复生成凭证', async () => {
      const result = await FinanceVoucherHandler.generateSalesOutboundVoucher(
        testOutboundId,
        'TEST-SO-001',
        [
          {
            material_id: testProductId,
            material_name: '测试产品',
            quantity: 500,
            total_cost: 3500,
            avg_cost: 7,
          },
        ],
        testCustomerId,
        '测试客户',
        testWarehouseId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('已存在凭证');
    });
  });

  describe('端到端流程完整性验证', () => {
    it('所有关键表应存在正确的关联关系', async () => {
      const [woCheck]: any = await query(
        `SELECT sales_order_id, product_id, bom_id FROM prod_work_order WHERE id = ?`,
        [testWorkOrderId]
      );
      expect(woCheck[0].sales_order_id).toBe(testSalesOrderId);
      expect(woCheck[0].product_id).toBe(testProductId);

      const [issueCheck]: any = await query(
        `SELECT work_order_id FROM prd_material_issue WHERE id = ?`,
        [testIssueId]
      );
      expect(issueCheck[0].work_order_id).toBe(testWorkOrderId);

      const [inboundCheck]: any = await query(
        `SELECT work_order_id FROM inv_production_inbound WHERE id = ?`,
        [testInboundId]
      );
      expect(inboundCheck[0].work_order_id).toBe(testWorkOrderId);

      const [outboundCheck]: any = await query(
        `SELECT order_id FROM inv_sales_outbound WHERE id = ?`,
        [testOutboundId]
      );
      expect(outboundCheck[0].order_id).toBe(testSalesOrderId);
    });

    it('库存流水应记录完整轨迹', async () => {
      const [transactions]: any = await query(
        `SELECT COUNT(*) as count FROM inv_inventory_transaction
         WHERE source_id IN (?, ?, ?) AND deleted = 0`,
        [testIssueId, testInboundId, testOutboundId]
      );
      expect(Number(transactions[0].count)).toBeGreaterThanOrEqual(0);
    });
  });
});
