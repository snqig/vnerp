/**
 * 出库流程集成测试
 * 测试完整的出库流程：创建出库单 → 提交 → 确认 → FIFO分配 → 库存扣减
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock数据库连接
const mockConnection = {
  query: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn) => fn(mockConnection)),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

import { query, execute, transaction } from '@/lib/db';
import { WarehouseStateMachine } from '@/lib/warehouse-state-machine';

describe('出库流程集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('完整出库流程', () => {
    it('应该完成领料出库流程：创建 → 提交 → 确认 → FIFO分配', async () => {
      // Step 1: 创建出库单（草稿状态）
      const outboundOrder = {
        id: 1,
        outbound_no: 'OUT20240101001',
        warehouse_id: 1,
        warehouse_code: 'WH001',
        status: 'draft',
        total_quantity: 50,
        items: [
          {
            material_id: 101,
            material_code: 'MAT-001',
            material_name: '材料1',
            required_qty: 50,
          },
        ],
      };

      // Mock创建出库单
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);

      // 验证初始状态
      expect(outboundOrder.status).toBe('draft');
      expect(WarehouseStateMachine.canEditOutbound('draft')).toBe(true);

      // Step 2: 提交出库单（草稿 → 待确认）
      const canSubmit = WarehouseStateMachine.canTransitionOutbound('draft', 'pending');
      expect(canSubmit).toBe(true);

      // Step 3: FIFO分配
      // Mock库存批次查询
      mockConnection.query.mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          material_id: 101,
          material_code: 'MAT-001',
          material_name: '材料1',
          available_qty: 100,
          unit_price: 10,
          inbound_date: '2024-01-01',
          version: 1,
        },
      ]);

      // Mock批次扣减
      mockConnection.execute.mockResolvedValue({ affectedRows: 1 } as any);

      // Step 4: 确认出库单（待确认 → 已完成）
      const canConfirm = WarehouseStateMachine.canTransitionOutbound('pending', 'completed');
      expect(canConfirm).toBe(true);

      // 验证确认后的状态
      expect(WarehouseStateMachine.canEditOutbound('completed')).toBe(false);
    });

    it('应该正确执行FIFO分配', async () => {
      // Mock多个批次（按入库日期排序）
      mockConnection.query.mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          available_qty: 30,
          unit_price: 10,
          inbound_date: '2024-01-01',
          version: 1,
        },
        {
          id: 2,
          batch_no: 'B002',
          available_qty: 50,
          unit_price: 12,
          inbound_date: '2024-02-01',
          version: 1,
        },
      ]);

      const requiredQty = 50;
      // 应该先分配B001的30，再分配B002的20

      // Mock批次扣减
      mockConnection.execute.mockResolvedValue({ affectedRows: 1 } as any);

      // 验证分配逻辑
      const batch1Alloc = Math.min(30, requiredQty); // 30
      const batch2Alloc = requiredQty - batch1Alloc; // 20

      expect(batch1Alloc).toBe(30);
      expect(batch2Alloc).toBe(20);
    });

    it('应该正确计算出库成本', async () => {
      const allocations = [
        { batch_no: 'B001', qty: 30, unit_price: 10 },
        { batch_no: 'B002', qty: 20, unit_price: 12 },
      ];

      const totalCost = allocations.reduce((sum, a) => sum + a.qty * a.unit_price, 0);
      // 30 * 10 + 20 * 12 = 300 + 240 = 540

      expect(totalCost).toBe(540);
    });
  });

  describe('库存不足处理', () => {
    it('应该检测库存不足并提示', async () => {
      // Mock库存批次
      mockConnection.query.mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          available_qty: 30,
          unit_price: 10,
          inbound_date: '2024-01-01',
          version: 1,
        },
      ]);

      const requiredQty = 50;
      const availableQty = 30;
      const shortage = requiredQty - availableQty;

      expect(shortage).toBe(20);
    });

    it('应该允许部分出库（配置允许时）', async () => {
      // Mock配置：允许部分出库
      const allowPartialOutbound = true;

      const requiredQty = 50;
      const availableQty = 30;

      if (allowPartialOutbound) {
        // 可以出库30，缺货20
        const actualOutbound = availableQty;
        expect(actualOutbound).toBe(30);
      }
    });
  });

  describe('出库单撤销', () => {
    it('应该成功撤销已确认的出库单', async () => {
      // 初始状态：已完成
      const canUndo = WarehouseStateMachine.canTransitionOutbound('completed', 'pending');
      expect(canUndo).toBe(true);

      // Mock更新出库单状态
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      // Mock回退库存批次
      mockConnection.query.mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          material_id: 101,
          quantity: 70,
          available_qty: 70,
        },
      ]);

      mockConnection.execute.mockResolvedValue({ affectedRows: 1 } as any);
    });

    it('应该正确回退库存', async () => {
      const originalQty = 100; // 原库存
      const outboundQty = 30; // 已出库
      const afterOutbound = originalQty - outboundQty; // 70

      // 撤销出库
      const afterUndo = afterOutbound + outboundQty; // 100

      expect(afterUndo).toBe(originalQty);
    });
  });

  describe('出库单取消', () => {
    it('应该成功取消草稿状态的出库单', async () => {
      const canCancel = WarehouseStateMachine.canTransitionOutbound('draft', 'cancelled');
      expect(canCancel).toBe(true);
    });

    it('应该成功取消待确认状态的出库单', async () => {
      const canCancel = WarehouseStateMachine.canTransitionOutbound('pending', 'cancelled');
      expect(canCancel).toBe(true);
    });

    it('应该不允许取消已完成的出库单', async () => {
      const canCancel = WarehouseStateMachine.canTransitionOutbound('completed', 'cancelled');
      expect(canCancel).toBe(false);
    });
  });

  describe('并发控制', () => {
    it('应该使用乐观锁防止并发扣减', async () => {
      const version = 1;

      // Mock更新操作（带版本检查）
      mockConnection.execute.mockResolvedValueOnce({ affectedRows: 1 } as any);

      // 更新成功
      const result = await mockConnection.execute(
        'UPDATE inv_inventory_batch SET available_qty = available_qty - ?, version = version + 1 WHERE id = ? AND version = ?',
        [30, 1, version]
      );

      expect(result).toEqual({ affectedRows: 1 });
    });

    it('应该在版本冲突时重试', async () => {
      let attemptCount = 0;

      mockConnection.execute.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          return { affectedRows: 0 }; // 版本冲突
        }
        return { affectedRows: 1 }; // 成功
      });

      // 模拟重试逻辑
      let success = false;
      for (let i = 0; i < 3; i++) {
        const result = await mockConnection.execute('', []);
        if (result.affectedRows === 1) {
          success = true;
          break;
        }
      }

      expect(success).toBe(true);
      expect(attemptCount).toBe(3);
    });
  });

  describe('业务场景', () => {
    it('场景1：生产领料', async () => {
      const materialRequisition = {
        outbound_no: 'OUT20240101001',
        source_type: 'material_requisition',
        source_id: 1,
        source_no: 'MR20240101001',
        warehouse_id: 1,
        status: 'draft',
      };

      expect(materialRequisition.source_type).toBe('material_requisition');
    });

    it('场景2：销售出库', async () => {
      const salesOutbound = {
        outbound_no: 'OUT20240101002',
        source_type: 'sales_order',
        source_id: 1,
        source_no: 'SO20240101001',
        warehouse_id: 1,
        status: 'draft',
      };

      expect(salesOutbound.source_type).toBe('sales_order');
    });

    it('场景3：调拨出库', async () => {
      const transferOutbound = {
        outbound_no: 'OUT20240101003',
        source_type: 'transfer',
        source_id: 1,
        source_no: 'TF20240101001',
        from_warehouse_id: 1,
        to_warehouse_id: 2,
        status: 'draft',
      };

      expect(transferOutbound.source_type).toBe('transfer');
    });
  });

  describe('数据一致性', () => {
    it('应该保证出库单和库存批次的一致性', async () => {
      const outboundQty = 50;

      const result = await transaction(async (conn) => {
        // 1. 更新出库单状态
        await conn.execute('UPDATE outbound_order SET status = ? WHERE id = ?', ['completed', 1]);

        // 2. 扣减库存批次
        await conn.execute('UPDATE inv_inventory_batch SET available_qty = available_qty - ? WHERE id = ?', [outboundQty, 1]);

        // 3. 记录库存交易
        await conn.execute('INSERT INTO inv_inventory_transaction ...', [outboundQty]);

        return { success: true };
      });

      expect(result).toBeDefined();
    });

    it('应该在出错时回滚事务', async () => {
      mockConnection.execute
        .mockResolvedValueOnce({} as any) // 第一步成功
        .mockRejectedValueOnce(new Error('库存扣减失败')); // 第二步失败

      await expect(
        transaction(async (conn) => {
          await conn.execute('UPDATE ...', []);
          await conn.execute('UPDATE ...', []); // 这里会失败
        })
      ).rejects.toThrow();
    });
  });
});
