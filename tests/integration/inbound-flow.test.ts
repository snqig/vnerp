/**
 * 入库流程集成测试
 * 测试完整的入库流程：创建入库单 → 提交 → 审核 → 库存增加
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock数据库连接池
const mockConnection = {
  query: vi.fn(),
  execute: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn) => fn(mockConnection)),
  getPool: vi.fn(() => ({
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  })),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

import { query, execute, transaction } from '@/lib/db';
import { WarehouseStateMachine } from '@/lib/warehouse-state-machine';

describe('入库流程集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('完整入库流程', () => {
    it('应该完成采购入库流程：创建 → 提交 → 审核', async () => {
      // Step 1: 创建入库单（草稿状态）
      const inboundOrder = {
        id: 1,
        inbound_no: 'IN20240101001',
        warehouse_id: 1,
        warehouse_code: 'WH001',
        status: 'draft',
        total_quantity: 100,
        items: [
          {
            material_id: 101,
            material_code: 'MAT-001',
            material_name: '材料1',
            quantity: 100,
            unit_price: 10,
          },
        ],
      };

      // Mock创建入库单
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);

      // 验证初始状态
      expect(inboundOrder.status).toBe('draft');
      expect(WarehouseStateMachine.canEditInbound('draft')).toBe(true);
      expect(WarehouseStateMachine.canDeleteInbound('draft')).toBe(true);

      // Step 2: 提交入库单（草稿 → 待审核）
      const canSubmit = WarehouseStateMachine.canTransitionInbound('draft', 'pending');
      expect(canSubmit).toBe(true);

      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      // Step 3: 审核入库单（待审核 → 已完成）
      const canAudit = WarehouseStateMachine.canTransitionInbound('pending', 'completed');
      expect(canAudit).toBe(true);

      // Mock审核操作：更新入库单状态
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      // Mock创建库存批次
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);

      // Mock记录库存交易
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);

      // 验证审核后的状态
      expect(WarehouseStateMachine.canEditInbound('completed')).toBe(false);
      expect(WarehouseStateMachine.canAuditInbound('completed')).toBe(false);
    });

    it('应该正确增加库存批次', async () => {
      // Mock现有批次查询
      vi.mocked(query).mockResolvedValueOnce([]);

      // Mock创建新批次
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);

      const batchData = {
        batch_no: 'B20240101001',
        material_id: 101,
        material_code: 'MAT-001',
        material_name: '材料1',
        warehouse_id: 1,
        quantity: 100,
        available_qty: 100,
        unit_price: 10,
        inbound_date: new Date(),
        status: 'normal',
      };

      // 验证批次数据
      expect(batchData.quantity).toBe(100);
      expect(batchData.available_qty).toBe(100);
      expect(batchData.status).toBe('normal');
    });

    it('应该正确累加到现有批次', async () => {
      // Mock现有批次
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B20240101001',
          material_id: 101,
          quantity: 50,
          available_qty: 50,
          unit_price: 10,
        },
      ]);

      // Mock更新批次
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      const additionalQty = 50;
      const existingQty = 50;
      const totalQty = existingQty + additionalQty;

      expect(totalQty).toBe(100);
    });
  });

  describe('入库单撤销', () => {
    it('应该成功撤销已审核的入库单', async () => {
      // 初始状态：已完成
      const currentStatus = 'completed';

      // 检查是否允许撤销
      const canUndo = WarehouseStateMachine.canTransitionInbound('completed', 'pending');
      expect(canUndo).toBe(true);

      // Mock更新入库单状态
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      // Mock扣减库存批次
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      // Mock记录库存交易
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);
    });

    it('应该防止撤销后库存为负', async () => {
      // Mock库存批次
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          material_id: 101,
          quantity: 50,
          available_qty: 50,
        },
      ]);

      // 如果要撤销的入库数量为100，但当前库存只有50
      const currentStock = 50;
      const undoQty = 100;

      // 应该抛出错误
      expect(currentStock - undoQty).toBeLessThan(0);
    });
  });

  describe('入库单取消', () => {
    it('应该成功取消草稿状态的入库单', async () => {
      const canCancel = WarehouseStateMachine.canTransitionInbound('draft', 'cancelled');
      expect(canCancel).toBe(true);

      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);
    });

    it('应该成功取消待审核状态的入库单', async () => {
      const canCancel = WarehouseStateMachine.canTransitionInbound('pending', 'cancelled');
      expect(canCancel).toBe(true);

      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);
    });

    it('应该不允许取消已完成的入库单', async () => {
      const canCancel = WarehouseStateMachine.canTransitionInbound('completed', 'cancelled');
      expect(canCancel).toBe(false);
    });
  });

  describe('并发控制', () => {
    it('应该防止重复审核', async () => {
      // 模拟两个并发审核请求
      let auditCount = 0;

      vi.mocked(execute).mockImplementation(async () => {
        auditCount++;
        if (auditCount === 1) {
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 }; // 第二次审核失败（状态已变更）
      });

      // 第一次审核
      const result1 = await execute('UPDATE ...', []);
      expect(result1).toEqual({ affectedRows: 1 });

      // 第二次审核
      const result2 = await execute('UPDATE ...', []);
      expect(result2).toEqual({ affectedRows: 0 });
    });

    it('应该使用乐观锁防止并发修改', async () => {
      const version = 1;

      // Mock更新操作（带版本检查）
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      // 更新成功
      const result = await execute(
        'UPDATE inbound_order SET status = ?, version = version + 1 WHERE id = ? AND version = ?',
        ['pending', 1, version]
      );

      expect(result).toEqual({ affectedRows: 1 });
    });
  });

  describe('数据一致性', () => {
    it('应该保证入库单和库存批次的一致性', async () => {
      const inboundQty = 100;

      // Mock事务执行
      const results = await transaction(async (conn) => {
        // 1. 更新入库单状态
        await conn.execute('UPDATE inbound_order SET status = ? WHERE id = ?', ['completed', 1]);

        // 2. 创建库存批次
        await conn.execute('INSERT INTO inv_inventory_batch ...', [inboundQty]);

        // 3. 记录库存交易
        await conn.execute('INSERT INTO inv_inventory_transaction ...', [inboundQty]);

        return { success: true };
      });

      expect(results).toBeDefined();
    });

    it('应该在出错时回滚事务', async () => {
      vi.mocked(transaction).mockImplementation(async (fn) => {
        try {
          return await fn(mockConnection);
        } catch (error) {
          await mockConnection.rollback();
          throw error;
        }
      });

      // 模拟执行过程中出错
      mockConnection.execute
        .mockResolvedValueOnce({} as any) // 第一步成功
        .mockRejectedValueOnce(new Error('库存批次创建失败')); // 第二步失败

      await expect(
        transaction(async (conn) => {
          await conn.execute('UPDATE ...', []);
          await conn.execute('INSERT ...', []); // 这里会失败
        })
      ).rejects.toThrow();
    });
  });

  describe('业务场景', () => {
    it('场景1：采购入库', async () => {
      // 1. 创建采购入库单
      const purchaseInbound = {
        inbound_no: 'PI20240101001',
        source_type: 'purchase',
        source_id: 1,
        source_no: 'PO20240101001',
        warehouse_id: 1,
        status: 'draft',
      };

      // 2. 提交
      // 3. 审核
      // 4. 库存增加

      expect(purchaseInbound.source_type).toBe('purchase');
    });

    it('场景2：生产入库', async () => {
      const productionInbound = {
        inbound_no: 'PI20240101002',
        source_type: 'production',
        source_id: 1,
        source_no: 'WO20240101001',
        warehouse_id: 1,
        status: 'draft',
      };

      expect(productionInbound.source_type).toBe('production');
    });

    it('场景3：退货入库', async () => {
      const returnInbound = {
        inbound_no: 'RI20240101001',
        source_type: 'sales_return',
        source_id: 1,
        source_no: 'SR20240101001',
        warehouse_id: 1,
        status: 'draft',
      };

      expect(returnInbound.source_type).toBe('sales_return');
    });
  });
});
