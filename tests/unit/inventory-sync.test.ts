/**
 * inventory-sync.ts 单元测试
 * 覆盖库存检查、调整、锁定/解锁、流水查询、预警等核心路径
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DB
const mockConn = {
  execute: vi.fn(),
  query: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn: (c: any) => Promise<any>) => fn(mockConn)),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

vi.mock('@/lib/audit-logger', () => ({
  logInventoryChange: vi.fn().mockResolvedValue(undefined),
}));

import { query, transaction } from '@/lib/db';
import { logInventoryChange } from '@/lib/audit-logger';
import {
  checkInventoryAvailability,
  adjustInventory,
  lockInventory,
  unlockInventory,
  getNegativeStockWarnings,
  getInventoryLogs,
} from '@/lib/inventory-sync';

describe('inventory-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConn.execute.mockReset();
    mockConn.query.mockReset();
    vi.mocked(query).mockReset();
    vi.mocked(transaction).mockImplementation((fn: any) => fn(mockConn));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkInventoryAvailability', () => {
    it('库存充足时返回 success', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 10, available_qty: 90 },
      ] as any);

      const result = await checkInventoryAvailability(101, 1, 50);

      expect(result.success).toBe(true);
      expect(result.availableStock).toBe(90);
      expect(result.currentStock).toBe(100);
    });

    it('无库存记录时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      const result = await checkInventoryAvailability(101, 1, 50);

      expect(result.success).toBe(false);
      expect(result.currentStock).toBe(0);
      expect(result.message).toContain('无库存记录');
    });

    it('可用库存不足时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 80, available_qty: 20 },
      ] as any);

      const result = await checkInventoryAvailability(101, 1, 50);

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存不足');
      expect(result.availableStock).toBe(20);
    });

    it('指定 batchNo 时 SQL 包含批次过滤', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);

      await checkInventoryAvailability(101, 1, 10, 'B001');

      expect(vi.mocked(query)).toHaveBeenCalledWith(
        expect.stringContaining('AND batch_no = ?'),
        expect.arrayContaining(['B001'])
      );
    });

    it('查询抛错时返回失败并记录错误', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB 连接失败'));

      const result = await checkInventoryAvailability(101, 1, 10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存检查异常');
    });
  });

  describe('adjustInventory - 入库', () => {
    it('库存记录已存在时更新库存并记录流水', async () => {
      mockConn.execute.mockResolvedValueOnce([
        [{ id: 1, quantity: '100', locked_qty: '0', available_qty: '100' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await adjustInventory({
        materialId: 101,
        warehouseId: 1,
        batchNo: 'B001',
        quantity: 50,
        operationType: 'inbound',
        businessType: '采购入库',
        businessNo: 'IN001',
        operatorId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.currentStock).toBe(150);
      // 验证事务内 UPDATE 调用
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inv_inventory SET'),
        expect.arrayContaining([150, 150, 1])
      );
      // 验证审计日志记录
      expect(logInventoryChange).toHaveBeenCalledWith(
        expect.objectContaining({
          materialId: 101,
          beforeQty: 100,
          afterQty: 150,
        })
      );
    });

    it('库存记录不存在且为入库时创建新记录', async () => {
      mockConn.execute.mockResolvedValueOnce([[], []] as any); // SELECT 返回空
      mockConn.execute.mockResolvedValueOnce([{ insertId: 99 }, []] as any); // INSERT
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any); // 流水

      const result = await adjustInventory({
        materialId: 101,
        warehouseId: 1,
        quantity: 50,
        operationType: 'inbound',
        businessType: '采购入库',
        businessNo: 'IN001',
      });

      expect(result.success).toBe(true);
      expect(result.currentStock).toBe(50);
      // 验证 INSERT 调用
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inv_inventory'),
        expect.arrayContaining([101, 1, 50, 50])
      );
    });
  });

  describe('adjustInventory - 出库', () => {
    it('库存不足时返回失败不执行调整', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 80, available_qty: 20 },
      ] as any);

      const result = await adjustInventory({
        materialId: 101,
        warehouseId: 1,
        quantity: -50,
        operationType: 'outbound',
        businessType: '销售出库',
        businessNo: 'OUT001',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存不足');
      // 不应进入事务
      expect(vi.mocked(transaction)).not.toHaveBeenCalled();
    });

    it('库存充足时执行出库扣减', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ id: 1, quantity: '100', locked_qty: '0', available_qty: '100' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await adjustInventory({
        materialId: 101,
        warehouseId: 1,
        batchNo: 'B001',
        quantity: -30,
        operationType: 'outbound',
        businessType: '销售出库',
        businessNo: 'OUT001',
      });

      expect(result.success).toBe(true);
      expect(result.currentStock).toBe(70);
    });

    it('事务内更新后可用库存变负时抛错回滚', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ id: 1, quantity: '100', locked_qty: '80', available_qty: '20' }],
        [],
      ] as any);

      const result = await adjustInventory({
        materialId: 101,
        warehouseId: 1,
        quantity: -30,
        operationType: 'outbound',
        businessType: '销售出库',
        businessNo: 'OUT001',
      });

      // 事务内 available_qty=20，扣减 30 后 newAvailableQty=-10 触发错误
      expect(result.success).toBe(false);
      expect(result.message).toContain('可用库存不足');
    });

    it('库存记录不存在且为出库时抛错', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);
      mockConn.execute.mockResolvedValueOnce([[], []] as any);

      const result = await adjustInventory({
        materialId: 101,
        warehouseId: 1,
        quantity: -30,
        operationType: 'outbound',
        businessType: '销售出库',
        businessNo: 'OUT001',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存记录不存在');
    });

    it('事务抛错时记录日志并返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);
      mockConn.execute.mockRejectedValueOnce(new Error('事务执行失败'));

      const result = await adjustInventory({
        materialId: 101,
        warehouseId: 1,
        quantity: 50,
        operationType: 'inbound',
        businessType: '采购入库',
        businessNo: 'IN001',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存调整失败');
    });

    it('使用默认值（batchNo 为空、operatorId 缺省）', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ id: 1, quantity: '100', locked_qty: '0', available_qty: '100' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await adjustInventory({
        materialId: 101,
        warehouseId: 1,
        quantity: 10,
        operationType: 'adjust',
        businessType: '盘点',
        businessNo: 'ADJ001',
      });

      expect(result.success).toBe(true);
      // 验证 batchNo 为空走 IS NULL 分支
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('batch_no IS NULL'),
        expect.anything()
      );
    });
  });

  describe('lockInventory', () => {
    it('库存检查不通过时直接返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 80, available_qty: 20 },
      ] as any);

      const result = await lockInventory(101, 1, 50, 'LOCK001', 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存不足');
    });

    it('库存充足时锁定成功', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ id: 1, quantity: '100', locked_qty: '0', available_qty: '100' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await lockInventory(101, 1, 30, 'LOCK001', 1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('库存锁定成功');
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inv_inventory SET'),
        expect.arrayContaining([30, 70, 1])
      );
    });

    it('锁定量超过可用时抛错', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ id: 1, quantity: '100', locked_qty: '80', available_qty: '20' }],
        [],
      ] as any);

      const result = await lockInventory(101, 1, 50, 'LOCK001', 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('可用库存不足');
    });

    it('库存记录不存在时抛错', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { quantity: 100, locked_qty: 0, available_qty: 100 },
      ] as any);
      mockConn.execute.mockResolvedValueOnce([[], []] as any);

      const result = await lockInventory(101, 1, 30, 'LOCK001', 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存记录不存在');
    });
  });

  describe('unlockInventory', () => {
    it('解锁成功并恢复可用库存', async () => {
      mockConn.execute.mockResolvedValueOnce([
        [{ id: 1, quantity: '100', locked_qty: '30', available_qty: '70' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await unlockInventory(101, 1, 20, 'UNLOCK001', 1);

      expect(result.success).toBe(true);
      // newLocked = 30-20=10, newAvailable = 70+20=90
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inv_inventory SET'),
        expect.arrayContaining([10, 90, 1])
      );
    });

    it('解锁量大于锁定量时 newLocked 不为负', async () => {
      mockConn.execute.mockResolvedValueOnce([
        [{ id: 1, quantity: '100', locked_qty: '5', available_qty: '95' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await unlockInventory(101, 1, 20, 'UNLOCK001', 1);

      expect(result.success).toBe(true);
      // newLocked = max(0, 5-20) = 0, newAvailable = 95 + (5-0) = 100
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inv_inventory SET'),
        expect.arrayContaining([0, 100, 1])
      );
    });

    it('库存记录不存在时抛错', async () => {
      mockConn.execute.mockResolvedValueOnce([[], []] as any);

      const result = await unlockInventory(101, 1, 20, 'UNLOCK001', 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存记录不存在');
    });

    it('事务抛错时返回失败', async () => {
      mockConn.execute.mockRejectedValueOnce(new Error('DB 异常'));

      const result = await unlockInventory(101, 1, 20, 'UNLOCK001', 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存解锁失败');
    });
  });

  describe('getNegativeStockWarnings', () => {
    it('返回预警列表并标记类型与级别', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          material_id: 101,
          material_code: 'MAT001',
          material_name: '材料1',
          specification: '规格1',
          warehouse_id: 1,
          warehouse_name: '主仓库',
          quantity: -10,
          available_qty: -10,
          locked_qty: 0,
          safety_stock: 20,
          min_stock: 10,
        },
        {
          id: 2,
          material_id: 102,
          material_code: 'MAT002',
          material_name: '材料2',
          specification: '规格2',
          warehouse_id: 1,
          warehouse_name: '主仓库',
          quantity: 5,
          available_qty: 5,
          locked_qty: 0,
          safety_stock: 10,
          min_stock: 5,
        },
      ] as any);

      const result = await getNegativeStockWarnings();

      expect(result).toHaveLength(2);
      expect(result[0].warningType).toBe('negative');
      expect(result[0].warningLevel).toBe('critical');
      expect(result[1].warningType).toBe('low_stock');
      expect(result[1].warningLevel).toBe('warning');
    });

    it('查询无数据时返回空数组', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      const result = await getNegativeStockWarnings();

      expect(result).toEqual([]);
    });
  });

  describe('getInventoryLogs', () => {
    it('返回带操作类型标签的流水列表', async () => {
      // count 查询
      vi.mocked(query).mockResolvedValueOnce([{ total: 1 }] as any);
      // list 查询
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          material_id: 101,
          operation_type: 1,
          operation_qty: 50,
          before_qty: 100,
          after_qty: 150,
          material_code: 'MAT001',
          material_name: '材料1',
          warehouse_name: '主仓库',
          operator_name: 'admin',
        },
      ] as any);

      const result = await getInventoryLogs(101, 1, 1, '2024-01-01', '2024-01-31', 1, 10);

      expect(result.total).toBe(1);
      expect(result.list).toHaveLength(1);
      expect(result.list[0].operation_type_label).toBe('入库');
    });

    it('无筛选条件时查询全部', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ total: 0 }] as any);
      vi.mocked(query).mockResolvedValueOnce([] as any);

      const result = await getInventoryLogs();

      expect(result.total).toBe(0);
      expect(result.list).toEqual([]);
    });

    it('未知 operation_type 时使用默认标签', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ total: 1 }] as any);
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          material_id: 101,
          operation_type: 99,
          operation_qty: 50,
          before_qty: 100,
          after_qty: 150,
        },
      ] as any);

      const result = await getInventoryLogs();

      expect(result.list[0].operation_type_label).toBe('未知');
    });
  });
});
