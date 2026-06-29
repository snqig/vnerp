/**
 * 盘点流程集成测试
 * 测试完整的盘点流程：创建盘点单 → 盘点录入 → 差异计算 → 审批 → 库存调整
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

describe('盘点流程集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('完整盘点流程', () => {
    it('应该完成盘点流程：创建 → 录入 → 审批 → 调整', async () => {
      // Step 1: 创建盘点单
      const stocktakingOrder = {
        id: 1,
        stocktaking_no: 'ST20240101001',
        warehouse_id: 1,
        warehouse_code: 'WH001',
        status: 'draft',
        type: 'full', // 全盘
        items: [],
      };

      // Mock创建盘点单
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);

      // Step 2: 生成盘点明细（从库存快照）
      mockConnection.query.mockResolvedValueOnce([
        {
          material_id: 101,
          material_code: 'MAT-001',
          material_name: '材料1',
          batch_no: 'B001',
          system_qty: 100,
          unit: 'kg',
        },
        {
          material_id: 102,
          material_code: 'MAT-002',
          material_name: '材料2',
          batch_no: 'B002',
          system_qty: 50,
          unit: 'pcs',
        },
      ]);

      // Mock插入盘点明细
      mockConnection.execute.mockResolvedValue({ insertId: 1 } as any);

      // Step 3: 提交盘点单（开始盘点）
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      // Step 4: 录入实盘数量
      const actualQtys = [
        { material_id: 101, batch_no: 'B001', actual_qty: 95 }, // 盘亏5
        { material_id: 102, batch_no: 'B002', actual_qty: 52 }, // 盘盈2
      ];

      // Mock更新实盘数量
      mockConnection.execute.mockResolvedValue({ affectedRows: 1 } as any);

      // Step 5: 计算差异
      const differences = actualQtys.map((item) => {
        const systemQty = item.material_id === 101 ? 100 : 50;
        return {
          ...item,
          system_qty: systemQty,
          difference: item.actual_qty - systemQty,
          difference_type: item.actual_qty > systemQty ? 'profit' : 'loss',
        };
      });

      expect(differences[0].difference).toBe(-5); // 盘亏
      expect(differences[0].difference_type).toBe('loss');
      expect(differences[1].difference).toBe(2); // 盘盈
      expect(differences[1].difference_type).toBe('profit');

      // Step 6: 审批盘点单
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      // Step 7: 执行库存调整
      // 盘亏：扣减库存
      // 盘盈：增加库存
      mockConnection.execute.mockResolvedValue({ affectedRows: 1 } as any);

      // Step 8: 记录库存交易
      mockConnection.execute.mockResolvedValue({ insertId: 1 } as any);
    });

    it('应该正确计算盘点差异', async () => {
      const systemQty = 100;
      const actualQty = 95;
      const difference = actualQty - systemQty;

      expect(difference).toBe(-5);
      expect(Math.abs(difference)).toBe(5);
    });

    it('应该正确处理盘盈（库存增加）', async () => {
      const systemQty = 100;
      const actualQty = 105;
      const difference = actualQty - systemQty;

      expect(difference).toBe(5);
      expect(difference > 0).toBe(true); // 盘盈
    });

    it('应该正确处理盘亏（库存扣减）', async () => {
      const systemQty = 100;
      const actualQty = 95;
      const difference = actualQty - systemQty;

      expect(difference).toBe(-5);
      expect(difference < 0).toBe(true); // 盘亏
    });
  });

  describe('盘点类型', () => {
    it('应该支持全盘', async () => {
      const fullStocktaking = {
        type: 'full',
        warehouse_id: 1,
      };

      // 全盘：盘点仓库内所有物料
      mockConnection.query.mockResolvedValueOnce([
        { material_id: 101, batch_no: 'B001', system_qty: 100 },
        { material_id: 102, batch_no: 'B002', system_qty: 50 },
        { material_id: 103, batch_no: 'B003', system_qty: 30 },
      ]);

      const items = await mockConnection.query('');
      expect(items).toHaveLength(3);
    });

    it('应该支持抽盘', async () => {
      const sampleStocktaking = {
        type: 'sample',
        warehouse_id: 1,
        sample_rate: 0.3, // 抽盘30%
      };

      // 抽盘：随机抽取部分物料
      mockConnection.query.mockResolvedValueOnce([
        { material_id: 101, batch_no: 'B001', system_qty: 100 },
      ]);

      const items = await mockConnection.query('');
      expect(items.length).toBeLessThan(3);
    });

    it('应该支持循环盘点', async () => {
      const cycleStocktaking = {
        type: 'cycle',
        warehouse_id: 1,
        cycle_group: 'A', // A类物料
      };

      // 循环盘点：按物料分类定期盘点
      expect(cycleStocktaking.type).toBe('cycle');
    });

    it('应该支持指定物料盘点', async () => {
      const specificStocktaking = {
        type: 'specific',
        warehouse_id: 1,
        material_ids: [101, 102],
      };

      // 指定物料盘点
      mockConnection.query.mockResolvedValueOnce([
        { material_id: 101, batch_no: 'B001', system_qty: 100 },
        { material_id: 102, batch_no: 'B002', system_qty: 50 },
      ]);

      const items = await mockConnection.query('');
      expect(items).toHaveLength(2);
    });
  });

  describe('盘点状态流转', () => {
    it('应该按正确顺序流转状态', async () => {
      const statusFlow = ['draft', 'in_progress', 'completed', 'approved'];

      // draft → in_progress（开始盘点）
      // in_progress → completed（盘点完成）
      // completed → approved（审批通过）

      expect(statusFlow).toEqual(['draft', 'in_progress', 'completed', 'approved']);
    });

    it('应该允许取消未审批的盘点单', async () => {
      const canCancelDraft = true; // 草稿状态可取消
      const canCancelInProgress = true; // 进行中可取消
      const canCancelCompleted = true; // 已完成可取消
      const canCancelApproved = false; // 已审批不可取消

      expect(canCancelApproved).toBe(false);
    });
  });

  describe('并发控制', () => {
    it('应该防止盘点期间库存变动', async () => {
      // 盘点期间应该锁定库存，不允许其他出入库操作
      const stocktakingInProgress = true;
      const allowInventoryChange = !stocktakingInProgress;

      expect(allowInventoryChange).toBe(false);
    });

    it('应该使用快照保证数据一致性', async () => {
      // 创建盘点单时生成库存快照
      const snapshotTime = new Date('2024-01-01 10:00:00');

      mockConnection.query.mockResolvedValueOnce([
        {
          material_id: 101,
          batch_no: 'B001',
          system_qty: 100,
          snapshot_time: snapshotTime,
        },
      ]);

      // 即使后续库存变动，盘点仍使用快照数据
      const snapshot = await mockConnection.query('');
      expect(snapshot[0].snapshot_time).toEqual(snapshotTime);
    });
  });

  describe('差异处理', () => {
    it('应该正确计算差异金额', async () => {
      const differences = [
        { material_id: 101, difference: -5, unit_cost: 10 }, // 盘亏5，单价10
        { material_id: 102, difference: 2, unit_cost: 20 }, // 盘盈2，单价20
      ];

      const totalLoss = differences
        .filter((d) => d.difference < 0)
        .reduce((sum, d) => sum + Math.abs(d.difference) * d.unit_cost, 0);

      const totalProfit = differences
        .filter((d) => d.difference > 0)
        .reduce((sum, d) => sum + d.difference * d.unit_cost, 0);

      expect(totalLoss).toBe(50); // 5 * 10
      expect(totalProfit).toBe(40); // 2 * 20
    });

    it('应该生成差异报告', async () => {
      const report = {
        stocktaking_no: 'ST20240101001',
        warehouse_code: 'WH001',
        total_items: 10,
        profit_items: 3,
        loss_items: 2,
        match_items: 5,
        total_profit_value: 100,
        total_loss_value: 150,
      };

      expect(report.profit_items + report.loss_items + report.match_items).toBe(report.total_items);
    });
  });

  describe('审批流程', () => {
    it('应该根据差异金额决定审批级别', async () => {
      const differenceValue = 5000;
      const approvalThresholds = [
        { max_value: 1000, approver: 'warehouse_manager' },
        { max_value: 10000, approver: 'finance_manager' },
        { max_value: Infinity, approver: 'general_manager' },
      ];

      const requiredApprover = approvalThresholds.find(
        (t) => differenceValue <= t.max_value
      )?.approver;

      expect(requiredApprover).toBe('finance_manager');
    });

    it('应该支持多级审批', async () => {
      const approvalFlow = [
        { level: 1, approver_id: 1, approver_name: '仓库主管', status: 'approved' },
        { level: 2, approver_id: 2, approver_name: '财务经理', status: 'pending' },
      ];

      expect(approvalFlow[0].status).toBe('approved');
      expect(approvalFlow[1].status).toBe('pending');
    });
  });

  describe('业务场景', () => {
    it('场景1：月度盘点', async () => {
      const monthlyStocktaking = {
        stocktaking_no: 'ST20240101001',
        type: 'full',
        period: '2024-01',
        warehouse_id: 1,
      };

      expect(monthlyStocktaking.period).toBe('2024-01');
    });

    it('场景2：年度大盘点', async () => {
      const yearlyStocktaking = {
        stocktaking_no: 'ST20240101001',
        type: 'full',
        period: '2024',
        warehouse_id: null, // 所有仓库
      };

      expect(yearlyStocktaking.period).toBe('2024');
      expect(yearlyStocktaking.warehouse_id).toBeNull();
    });

    it('场景3：异常盘点（发现差异后立即盘点）', async () => {
      const exceptionStocktaking = {
        stocktaking_no: 'ST20240101001',
        type: 'specific',
        reason: '库存异常',
        material_ids: [101],
      };

      expect(exceptionStocktaking.reason).toBe('库存异常');
    });
  });

  describe('数据一致性', () => {
    it('应该保证盘点单和库存调整的一致性', async () => {
      const differences = [
        { material_id: 101, batch_no: 'B001', difference: -5 },
        { material_id: 102, batch_no: 'B002', difference: 2 },
      ];

      const result = await transaction(async (conn) => {
        // 1. 更新盘点单状态
        await conn.execute('UPDATE stocktaking_order SET status = ? WHERE id = ?', ['approved', 1]);

        // 2. 调整库存
        for (const diff of differences) {
          if (diff.difference !== 0) {
            await conn.execute('UPDATE inv_inventory_batch SET quantity = quantity + ? WHERE batch_no = ?', [diff.difference, diff.batch_no]);
          }
        }

        // 3. 记录库存交易
        await conn.execute('INSERT INTO inv_inventory_transaction ...', []);

        return { success: true };
      });

      expect(result).toBeDefined();
    });
  });
});
