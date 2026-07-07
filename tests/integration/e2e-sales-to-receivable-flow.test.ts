/**
 * 端到端流程集成测试
 * 销售订单审核 → 生成生产工单 → 工单领料 → 工单完工入库 → 销售出库 → 库存更新 → 应收凭证生成
 *
 * 测试策略：
 * - Mock @/lib/db（query/execute/transaction）与 @/lib/logger
 * - Mock DomainEventOutboxFactory
 * - 使用真实领域聚合（SalesOrder, WorkOrder）构造事件
 * - 使用真实事件处理器验证 SQL 操作的正确性
 * - 逐步验证每个环节的数据流转
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockConn = {
  query: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn: any) => fn(mockConn)),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: () => ({
    saveEvents: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { SalesOrder } from '@/domain/sales/aggregates/SalesOrder';
import { WorkOrder } from '@/domain/production/aggregates/WorkOrder';
import { SalesOrderApprovedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { SalesOrderShippedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { WorkOrderMaterialIssuedEvent } from '@/domain/production/events/WorkOrderEvents';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { SalesToWorkOrderHandler } from '@/application/handlers/SalesToWorkOrderHandler';
import { WorkOrderMaterialIssuedHandler } from '@/application/handlers/WorkOrderMaterialIssuedHandler';
import { WorkOrderCompletedHandler } from '@/application/handlers/WorkOrderCompletedHandler';
import { SalesShippedHandler } from '@/application/handlers/SalesShippedHandler';
import { SalesReceivableHandler } from '@/application/handlers/SalesReceivableHandler';
import { transaction, query } from '@/lib/db';

describe('端到端流程：销售→MRP→生产→库存→应收', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConn.query.mockReset();
    mockConn.execute.mockReset();
    vi.mocked(transaction).mockImplementation((fn: any) => fn(mockConn));
    // SalesToWorkOrderHandler.getMaterialRequirements 使用 query（非 conn.execute）
    // 默认返回空数组（无 BOM），避免抛错导致工单 INSERT 被跳过
    vi.mocked(query).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Step 1: 销售订单审核 → 生成生产工单', () => {
    it('SalesToWorkOrderHandler 应根据销售订单行创建工单（prd_work_order INSERT）', async () => {
      const salesOrder = SalesOrder.reconstitute({
        id: 100,
        orderNo: 'SO20260101001',
        status: 'approved' as any,
        customerId: 50,
        customerName: '测试客户',
        orderDate: '2026-01-01',
        warehouseId: 1,
        lines: [
          {
            lineNo: 1,
            materialId: 10,
            materialCode: 'PROD-001',
            materialName: '产品A',
            unit: '件',
            orderQty: 100,
            unitPrice: 50,
            shippedQty: 0,
            amount: 5000,
          },
        ],
      });

      const approvedEvent = new SalesOrderApprovedEvent({
        orderId: 100,
        orderNo: 'SO20260101001',
        customerId: 50,
        customerName: '测试客户',
        lines: salesOrder.lines.map((l) => ({
          materialId: l.materialId,
          materialCode: l.materialCode,
          materialName: l.materialName,
          orderQty: l.orderQty,
          unitPrice: l.unitPrice,
          remainingQty: l.remainingQty,
        })),
        totalAmount: 5000,
      });

      mockConn.execute.mockResolvedValue([{ insertId: 1 }]);

      const handler = new SalesToWorkOrderHandler();
      await handler.handle(approvedEvent);

      const insertCall = mockConn.execute.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO prd_work_order')
      );

      expect(insertCall).toBeDefined();
      expect(insertCall![0]).toContain('prd_work_order');
      expect(insertCall![0]).toContain('work_order_no');
      expect(insertCall![0]).toContain('sales_order_id');
      expect(insertCall![0]).toContain('material_id');
      expect(insertCall![0]).toContain('plan_qty');

      const params = insertCall![1];
      expect(params).toContain(100);
      expect(params).toContain(10);
      expect(params).toContain(100);
    });
  });

  describe('Step 2: 工单领料 → 库存扣减', () => {
    it('WorkOrderMaterialIssuedHandler 应扣减 inv_inventory 和 inv_inventory_batch', async () => {
      const event = new WorkOrderMaterialIssuedEvent({
        workOrderId: 1,
        workOrderNo: 'WO20260101001',
        issuedItems: [
          {
            materialId: 101,
            materialCode: 'MAT-001',
            materialName: '材料1',
            quantity: 20,
            batchNo: 'B001',
            warehouseId: 1,
          },
        ],
      });

      mockConn.execute
        .mockResolvedValueOnce([[{ id: 1, quantity: 100, available_qty: 100 }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([[{ id: 1, available_qty: 100, quantity: 100 }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any);

      const handler = new WorkOrderMaterialIssuedHandler();
      await handler.handle(event);

      const calls = mockConn.execute.mock.calls.map((c) => c[0] as string);

      expect(calls.some((s) => s.includes('SELECT id, quantity, available_qty') && s.includes('inv_inventory'))).toBe(true);
      expect(calls.some((s) => s.includes('UPDATE inv_inventory') && s.includes('quantity = quantity -'))).toBe(true);
      expect(calls.some((s) => s.includes('UPDATE inv_inventory_batch') && s.includes('available_qty = available_qty -'))).toBe(true);
      expect(calls.some((s) => s.includes("INSERT INTO inv_inventory_transaction") && s.includes("'out'"))).toBe(true);
    });

    it('库存不足时应抛出错误', async () => {
      const event = new WorkOrderMaterialIssuedEvent({
        workOrderId: 1,
        workOrderNo: 'WO20260101001',
        issuedItems: [
          {
            materialId: 101,
            materialCode: 'MAT-001',
            materialName: '材料1',
            quantity: 200,
            batchNo: 'B001',
            warehouseId: 1,
          },
        ],
      });

      mockConn.execute.mockResolvedValueOnce([[{ id: 1, quantity: 50, available_qty: 50 }]] as any);

      const handler = new WorkOrderMaterialIssuedHandler();
      await expect(handler.handle(event)).rejects.toThrow('库存不足');
    });
  });

  describe('Step 3: 工单完工 → 成品入库', () => {
    it('WorkOrderCompletedHandler 应增加 inv_inventory 和创建 inv_inventory_batch', async () => {
      const event = new WorkOrderCompletedEvent({
        workOrderId: 1,
        workOrderNo: 'WO20260101001',
        productId: 10,
        productName: '产品A',
        completedQty: 100,
        warehouseId: 1,
      });

      // mysql2 execute() 返回 [rows, fields]；SELECT 需 [[...]]，INSERT/UPDATE 需 [{...}]
      mockConn.execute
        .mockResolvedValueOnce([[{ id: 5, quantity: 50, available_qty: 50, unit: '件' }]] as any)
        .mockResolvedValueOnce([[{ material_code: 'PROD-001', unit: '件' }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any);

      const handler = new WorkOrderCompletedHandler();
      await handler.handle(event);

      const calls = mockConn.execute.mock.calls.map((c) => c[0] as string);

      expect(calls.some((s) => s.includes('SELECT id, quantity, available_qty') && s.includes('inv_inventory'))).toBe(true);
      expect(calls.some((s) => s.includes('UPDATE inv_inventory') && s.includes('quantity = quantity +'))).toBe(true);
      expect(calls.some((s) => s.includes('INSERT INTO inv_inventory_batch'))).toBe(true);
      expect(calls.some((s) => s.includes("INSERT INTO inv_inventory_transaction") && s.includes("'in'"))).toBe(true);
      expect(calls.some((s) => s.includes('workorder_completion'))).toBe(true);
    });

    it('库存记录不存在时应创建新记录', async () => {
      const event = new WorkOrderCompletedEvent({
        workOrderId: 1,
        workOrderNo: 'WO20260101001',
        productId: 10,
        productName: '产品A',
        completedQty: 50,
        warehouseId: 1,
      });

      // SELECT inv_inventory 返回空行数组（记录不存在），触发 INSERT 新记录分支
      mockConn.execute
        .mockResolvedValueOnce([[]] as any)
        .mockResolvedValueOnce([[{ material_code: 'PROD-001', unit: '件' }]] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any);

      const handler = new WorkOrderCompletedHandler();
      await handler.handle(event);

      const calls = mockConn.execute.mock.calls.map((c) => c[0] as string);

      expect(calls.some((s) => s.includes('INSERT INTO inv_inventory'))).toBe(true);
    });
  });

  describe('Step 4: 销售出库 → 库存扣减 + 应收凭证', () => {
    it('SalesShippedHandler 应扣减库存并记录出库流水', async () => {
      const event = new SalesOrderShippedEvent({
        orderId: 100,
        orderNo: 'SO20260101001',
        customerId: 50,
        customerName: '测试客户',
        shippedItems: [
          {
            materialId: 10,
            materialCode: 'PROD-001',
            materialName: '产品A',
            quantity: 100,
            unitPrice: 50,
            batchNo: 'B001',
            warehouseId: 1,
          },
        ],
        totalShippedAmount: 5000,
      });

      // mysql2 execute() 返回 [rows, fields]；SELECT 需 [[...]]，INSERT/UPDATE 需 [{...}]
      // 注意：available_qty=200 - item.quantity=100 → newAvailableQty=100 > 0，走减法分支
      mockConn.execute
        .mockResolvedValueOnce([[{ id: 1, quantity: 200 }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([[{ id: 1, available_qty: 200, quantity: 200 }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any);

      const handler = new SalesShippedHandler();
      await handler.handle(event);

      const calls = mockConn.execute.mock.calls.map((c) => c[0] as string);

      expect(calls.some((s) => s.includes('SELECT id, quantity') && s.includes('inv_inventory'))).toBe(true);
      expect(calls.some((s) => s.includes('UPDATE inv_inventory SET quantity = quantity -'))).toBe(true);
      expect(calls.some((s) => s.includes('inv_inventory_batch') && s.includes('available_qty = available_qty -'))).toBe(true);
      expect(calls.some((s) => s.includes("INSERT INTO inv_inventory_transaction") && s.includes("'out'") && s.includes('sales'))).toBe(true);
    });

    it('SalesReceivableHandler 应创建 fin_receivable 记录', async () => {
      const event = new SalesOrderShippedEvent({
        orderId: 100,
        orderNo: 'SO20260101001',
        customerId: 50,
        customerName: '测试客户',
        shippedItems: [
          {
            materialId: 10,
            materialCode: 'PROD-001',
            materialName: '产品A',
            quantity: 100,
            unitPrice: 50,
            batchNo: 'B001',
            warehouseId: 1,
          },
        ],
        totalShippedAmount: 5000,
      });

      mockConn.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const handler = new SalesReceivableHandler();
      await handler.handle(event);

      const insertCall = mockConn.execute.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO fin_receivable')
      );

      expect(insertCall).toBeDefined();
      expect(insertCall![0]).toContain('fin_receivable');
      expect(insertCall![0]).toContain('receivable_no');
      expect(insertCall![0]).toContain('customer_id');
      expect(insertCall![0]).toContain('amount');

      const params = insertCall![1];
      expect(params).toContain(50);
      expect(params).toContain(100);
      expect(params).toContain('SO20260101001');
      expect(params).toContain(5000);
    });

    it('出库金额为0时不应创建应收凭证', async () => {
      const event = new SalesOrderShippedEvent({
        orderId: 100,
        orderNo: 'SO20260101001',
        customerId: 50,
        customerName: '测试客户',
        shippedItems: [],
        totalShippedAmount: 0,
      });

      const handler = new SalesReceivableHandler();
      await handler.handle(event);

      expect(mockConn.execute).not.toHaveBeenCalled();
    });
  });

  describe('端到端数据流验证', () => {
    it('完整流程：审核→工单→领料→完工→出库→应收', async () => {
      // === Step 1: 销售审核 → 创建工单 ===
      const salesOrder = SalesOrder.reconstitute({
        id: 100,
        orderNo: 'SO20260101001',
        status: 'approved' as any,
        customerId: 50,
        customerName: '测试客户',
        orderDate: '2026-01-01',
        warehouseId: 1,
        lines: [
          {
            lineNo: 1,
            materialId: 10,
            materialCode: 'PROD-001',
            materialName: '产品A',
            unit: '件',
            orderQty: 100,
            unitPrice: 50,
            shippedQty: 0,
            amount: 5000,
          },
        ],
      });

      const approvedEvent = new SalesOrderApprovedEvent({
        orderId: 100,
        orderNo: 'SO20260101001',
        customerId: 50,
        customerName: '测试客户',
        lines: salesOrder.lines.map((l) => ({
          materialId: l.materialId,
          materialCode: l.materialCode,
          materialName: l.materialName,
          orderQty: l.orderQty,
          unitPrice: l.unitPrice,
          remainingQty: l.remainingQty,
        })),
        totalAmount: 5000,
      });

      mockConn.execute.mockResolvedValue([{ insertId: 1 }]);

      const salesHandler = new SalesToWorkOrderHandler();
      await salesHandler.handle(approvedEvent);

      const woInsert = mockConn.execute.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO prd_work_order')
      );
      expect(woInsert).toBeDefined();

      mockConn.execute.mockClear();

      // === Step 2: 工单领料 → 库存扣减 ===
      const issueEvent = new WorkOrderMaterialIssuedEvent({
        workOrderId: 1,
        workOrderNo: 'WO20260101001',
        issuedItems: [
          {
            materialId: 101,
            materialCode: 'MAT-001',
            materialName: '原材料1',
            quantity: 200,
            batchNo: 'B001',
            warehouseId: 1,
          },
        ],
      });

      // mysql2 execute() 返回 [rows, fields]；SELECT 需 [[...]]，INSERT/UPDATE 需 [{...}]
      mockConn.execute
        .mockResolvedValueOnce([[{ id: 1, quantity: 500, available_qty: 500 }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([[{ id: 1, available_qty: 500, quantity: 500 }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any);

      const issueHandler = new WorkOrderMaterialIssuedHandler();
      await issueHandler.handle(issueEvent);

      const issueCalls = mockConn.execute.mock.calls.map((c) => c[0] as string);
      expect(issueCalls.some((s) => s.includes('UPDATE inv_inventory') && s.includes('quantity = quantity -'))).toBe(true);

      mockConn.execute.mockClear();

      // === Step 3: 工单完工 → 成品入库 ===
      const completeEvent = new WorkOrderCompletedEvent({
        workOrderId: 1,
        workOrderNo: 'WO20260101001',
        productId: 10,
        productName: '产品A',
        completedQty: 100,
        warehouseId: 1,
      });

      mockConn.execute
        .mockResolvedValueOnce([[{ id: 5, quantity: 0, available_qty: 0, unit: '件' }]] as any)
        .mockResolvedValueOnce([[{ material_code: 'PROD-001', unit: '件' }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any);

      const completeHandler = new WorkOrderCompletedHandler();
      await completeHandler.handle(completeEvent);

      const completeCalls = mockConn.execute.mock.calls.map((c) => c[0] as string);
      expect(completeCalls.some((s) => s.includes('UPDATE inv_inventory') && s.includes('quantity = quantity +'))).toBe(true);
      expect(completeCalls.some((s) => s.includes('INSERT INTO inv_inventory_batch'))).toBe(true);

      mockConn.execute.mockClear();

      // === Step 4: 销售出库 → 库存扣减 ===
      const shipEvent = new SalesOrderShippedEvent({
        orderId: 100,
        orderNo: 'SO20260101001',
        customerId: 50,
        customerName: '测试客户',
        shippedItems: [
          {
            materialId: 10,
            materialCode: 'PROD-001',
            materialName: '产品A',
            quantity: 100,
            unitPrice: 50,
            batchNo: 'B001',
            warehouseId: 1,
          },
        ],
        totalShippedAmount: 5000,
      });

      // available_qty=200 > item.quantity=100 → 走减法分支
      mockConn.execute
        .mockResolvedValueOnce([[{ id: 5, quantity: 200 }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([[{ id: 1, available_qty: 200, quantity: 200 }]] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any)
        .mockResolvedValueOnce([{ insertId: 1 }] as any);

      const shipHandler = new SalesShippedHandler();
      await shipHandler.handle(shipEvent);

      const shipCalls = mockConn.execute.mock.calls.map((c) => c[0] as string);
      expect(shipCalls.some((s) => s.includes('UPDATE inv_inventory SET quantity = quantity -'))).toBe(true);

      mockConn.execute.mockClear();

      // === Step 5: 应收凭证生成 ===
      mockConn.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const receivableHandler = new SalesReceivableHandler();
      await receivableHandler.handle(shipEvent);

      const receivableInsert = mockConn.execute.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO fin_receivable')
      );
      expect(receivableInsert).toBeDefined();
      expect(receivableInsert![1]).toContain(5000);
    });
  });
});
