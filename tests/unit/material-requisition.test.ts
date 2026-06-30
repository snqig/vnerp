/**
 * 物料领用管理单元测试
 * 覆盖 material-requisition.ts 的 4 个未测函数：
 * - autoGenerateRequisition（自动生成领料单）
 * - issueMaterial（扫码领料出库）
 * - createReturn（创建退料单）
 * - confirmReturn（确认退料入库）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 数据库
const mockConn = {
  query: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn: any) => fn(mockConn)),
}));

// Mock 配置
vi.mock('@/lib/global-config', () => ({
  getConfig: vi.fn((key: string) => {
    const config: Record<string, any> = {
      mr_prefix: 'MR',
      over_requisition_approval: true,
      replenish_dual_approval: true,
    };
    return config[key];
  }),
  generateDocNo: vi.fn((prefix: string) => `${prefix}20260629001`),
}));

// Mock 日志
vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

// Mock warehouse-core
vi.mock('@/lib/warehouse-core', () => ({
  allocateFIFO: vi.fn(),
  enforceFIFO: vi.fn(),
  checkWholeMaterial: vi.fn(),
}));

// Mock inventory-sync
vi.mock('@/lib/inventory-sync', () => ({
  adjustInventory: vi.fn(),
}));

import { query, execute, transaction } from '@/lib/db';
import { getConfig } from '@/lib/global-config';
import { secureLog } from '@/lib/logger';
import { allocateFIFO, enforceFIFO, checkWholeMaterial } from '@/lib/warehouse-core';
import { adjustInventory } from '@/lib/inventory-sync';
import {
  autoGenerateRequisition,
  issueMaterial,
  createReturn,
  confirmReturn,
  submitOverRequisition,
  submitSupplementaryRequisition,
  approveRequisition,
} from '@/lib/material-requisition';

describe('物料领用管理 - material-requisition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConn.query.mockReset();
    mockConn.execute.mockReset();
    vi.mocked(transaction).mockImplementation((fn: any) => fn(mockConn));
  });

  // ============================================================
  // autoGenerateRequisition
  // ============================================================
  describe('autoGenerateRequisition - 自动生成领料单', () => {
    it('工单不存在时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([]);

      const result = await autoGenerateRequisition(999);

      expect(result.success).toBe(false);
      expect(result.message).toContain('工单不存在');
    });

    it('BOM 不存在时返回失败', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ id: 1, work_order_no: 'WO001', material_id: 101, plan_qty: 100, warehouse_id: 1 }])
        .mockResolvedValueOnce([]);

      const result = await autoGenerateRequisition(1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('BOM');
    });

    it('成功生成领料单（含 FIFO 推荐）', async () => {
      // query 1: 工单信息
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, work_order_no: 'WO001', material_id: 101, plan_qty: 100, warehouse_id: 1 },
      ]);
      // query 2: BOM 明细
      vi.mocked(query).mockResolvedValueOnce([
        { material_id: 201, material_code: 'M201', material_name: '物料A', quantity: '2', unit: '米' },
        { material_id: 202, material_code: 'M202', material_name: '物料B', quantity: '1', unit: '个' },
      ]);

      // allocateFIFO 两次返回
      vi.mocked(allocateFIFO)
        .mockResolvedValueOnce({
          allocations: [
            { qrCode: 'QR001', batchNo: 'B001', location: 'L01', splitFlag: 1, unitCost: 10 },
          ],
          shortage: false,
          shortageQty: 0,
        } as any)
        .mockResolvedValueOnce({
          allocations: [],
          shortage: true,
          shortageQty: 50,
        } as any);

      // 事务内 conn.execute 序列：
      // 1. INSERT material_requisitions -> [result, fields]
      // 2. INSERT material_requisition_items (BOM1)
      // 3. INSERT material_requisition_items (BOM2)
      // 4. UPDATE material_requisitions total_quantity
      mockConn.execute
        .mockResolvedValueOnce([{ insertId: 1 }, []] as any) // INSERT 领料单
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any) // INSERT 明细1
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any) // INSERT 明细2
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any); // UPDATE 总数量

      const result = await autoGenerateRequisition(1, 1, '张三');

      expect(result.success).toBe(true);
      expect(result.requisitionId).toBe(1);
      expect(result.requisitionNo).toBeDefined();
      expect(secureLog).toHaveBeenCalledWith('info', expect.stringContaining('成功'), expect.anything());
    });

    it('事务异常时返回失败并记录日志', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, work_order_no: 'WO001', material_id: 101, plan_qty: 100, warehouse_id: 1 },
      ]);
      vi.mocked(query).mockResolvedValueOnce([
        { material_id: 201, material_code: 'M201', material_name: '物料A', quantity: '2', unit: '米' },
      ]);
      vi.mocked(allocateFIFO).mockResolvedValueOnce({ allocations: [], shortage: false, shortageQty: 0 } as any);

      mockConn.execute.mockRejectedValueOnce(new Error('DB 连接失败'));

      const result = await autoGenerateRequisition(1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('生成失败');
      expect(secureLog).toHaveBeenCalledWith('error', expect.stringContaining('失败'), expect.anything());
    });
  });

  // ============================================================
  // issueMaterial
  // ============================================================
  describe('issueMaterial - 扫码领料出库', () => {
    it('领料单不存在时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([]);

      const result = await issueMaterial(999, []);

      expect(result.success).toBe(false);
      expect(result.message).toContain('不存在');
    });

    it('领料单状态不正确时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, status: 0, requisition_no: 'MR001', warehouse_id: 1 },
      ]);

      const result = await issueMaterial(1, []);

      expect(result.success).toBe(false);
      expect(result.message).toContain('状态不正确');
    });

    it('整料检查失败时抛错并返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, status: 1, requisition_no: 'MR001', warehouse_id: 1 },
      ]);
      vi.mocked(checkWholeMaterial).mockResolvedValueOnce({
        isWhole: true,
        message: '整料不可直接领用',
      } as any);

      const result = await issueMaterial(1, [
        { materialId: 101, qrCode: 'QR001', quantity: 10 },
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain('出库失败');
    });

    it('FIFO 校验失败时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, status: 1, requisition_no: 'MR001', warehouse_id: 1 },
      ]);
      vi.mocked(checkWholeMaterial).mockResolvedValueOnce({ isWhole: false, message: '' } as any);
      vi.mocked(enforceFIFO).mockResolvedValueOnce({
        isValid: false,
        needsApproval: true,
        message: '非 FIFO 批次',
      } as any);

      const result = await issueMaterial(1, [
        { materialId: 101, qrCode: 'QR001', quantity: 10 },
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain('出库失败');
    });

    it('库存扣减失败时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, status: 1, requisition_no: 'MR001', warehouse_id: 1 },
      ]);
      vi.mocked(checkWholeMaterial).mockResolvedValueOnce({ isWhole: false, message: '' } as any);
      vi.mocked(enforceFIFO).mockResolvedValueOnce({ isValid: true, needsApproval: false, message: '' } as any);
      vi.mocked(adjustInventory).mockResolvedValueOnce({ success: false, message: '库存不足' } as any);

      const result = await issueMaterial(1, [
        { materialId: 101, qrCode: 'QR001', quantity: 10 },
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain('出库失败');
    });

    it('成功出库（单物料）', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, status: 1, requisition_no: 'MR001', warehouse_id: 1 },
      ]);
      vi.mocked(checkWholeMaterial).mockResolvedValueOnce({ isWhole: false, message: '' } as any);
      vi.mocked(enforceFIFO).mockResolvedValueOnce({ isValid: true, needsApproval: false, message: '' } as any);
      vi.mocked(adjustInventory).mockResolvedValueOnce({ success: true, message: '' } as any);

      // 事务内 conn.execute:
      // 1. UPDATE material_requisition_items
      // 2. UPDATE material_batch_costs
      // 3. UPDATE material_requisitions (状态)
      mockConn.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await issueMaterial(
        1,
        [{ materialId: 101, qrCode: 'QR001', quantity: 10, batchNo: 'B001' }],
        1
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('出库成功');
      expect(result.issuedItems).toHaveLength(1);
      expect(secureLog).toHaveBeenCalledWith('info', expect.stringContaining('成功'), expect.anything());
    });

    it('成功出库（多物料）', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, status: 1, requisition_no: 'MR001', warehouse_id: 1 },
      ]);
      vi.mocked(checkWholeMaterial)
        .mockResolvedValueOnce({ isWhole: false, message: '' } as any)
        .mockResolvedValueOnce({ isWhole: false, message: '' } as any);
      vi.mocked(enforceFIFO)
        .mockResolvedValueOnce({ isValid: true, needsApproval: false, message: '' } as any)
        .mockResolvedValueOnce({ isValid: true, needsApproval: false, message: '' } as any);
      vi.mocked(adjustInventory)
        .mockResolvedValueOnce({ success: true, message: '' } as any)
        .mockResolvedValueOnce({ success: true, message: '' } as any);

      // 2 个物料 * (UPDATE items + UPDATE costs) + 1 UPDATE requisition = 5
      mockConn.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await issueMaterial(
        1,
        [
          { materialId: 101, qrCode: 'QR001', quantity: 10, batchNo: 'B001' },
          { materialId: 102, qrCode: 'QR002', quantity: 5, batchNo: 'B002' },
        ],
        1
      );

      expect(result.success).toBe(true);
      expect(result.issuedItems).toHaveLength(2);
    });
  });

  // ============================================================
  // createReturn
  // ============================================================
  describe('createReturn - 创建退料单', () => {
    it('成功创建退料单（单物料）', async () => {
      // 事务内 conn.execute 序列：
      // 1. INSERT material_returns -> [{ insertId: 1 }, []]
      // 2. SELECT inv_material -> [[{material_code, material_name, unit}], []]
      // 3. SELECT material_batch_costs -> [[{unit_cost}], []]
      // 4. INSERT material_return_items
      // 5. UPDATE material_returns total_quantity
      mockConn.execute
        .mockResolvedValueOnce([{ insertId: 1 }, []] as any)
        .mockResolvedValueOnce([[{ material_code: 'M101', material_name: '物料A', unit: '米' }], []] as any)
        .mockResolvedValueOnce([[{ unit_cost: '10.5' }], []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await createReturn(
        1,
        1,
        [{ materialId: 101, qrCode: 'QR001', quantity: 5, reason: '剩余' }],
        1,
        '张三'
      );

      expect(result.success).toBe(true);
      expect(result.returnId).toBe(1);
      expect(result.returnNo).toBeDefined();
    });

    it('批次成本不存在时单价为 0', async () => {
      mockConn.execute
        .mockResolvedValueOnce([{ insertId: 2 }, []] as any)
        .mockResolvedValueOnce([[{ material_code: 'M101', material_name: '物料A', unit: '米' }], []] as any)
        .mockResolvedValueOnce([[], []] as any) // 无成本记录
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await createReturn(1, 1, [
        { materialId: 101, qrCode: 'QR001', quantity: 5 },
      ]);

      expect(result.success).toBe(true);
      expect(result.returnId).toBe(2);
    });

    it('事务异常时返回失败并记录日志', async () => {
      mockConn.execute.mockRejectedValueOnce(new Error('DB 异常'));

      const result = await createReturn(1, 1, [
        { materialId: 101, qrCode: 'QR001', quantity: 5 },
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain('创建失败');
      expect(secureLog).toHaveBeenCalledWith('error', expect.stringContaining('失败'), expect.anything());
    });
  });

  // ============================================================
  // confirmReturn
  // ============================================================
  describe('confirmReturn - 确认退料入库', () => {
    it('退料单不存在时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([]);

      const result = await confirmReturn(999, 1, 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('不存在');
    });

    it('退料单状态不正确时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, status: 1, return_no: 'RT001' },
      ]);

      const result = await confirmReturn(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('状态不正确');
    });

    it('库存回写失败时返回失败', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ id: 1, status: 0, return_no: 'RT001' }])
        .mockResolvedValueOnce([{ material_id: 101, batch_no: 'B001', quantity: 5 }]);
      vi.mocked(adjustInventory).mockResolvedValueOnce({ success: false, message: '批次不存在' } as any);

      const result = await confirmReturn(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('库存回写失败');
    });

    it('成功确认退料入库（单明细）', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ id: 1, status: 0, return_no: 'RT001' }])
        .mockResolvedValueOnce([{ material_id: 101, batch_no: 'B001', quantity: 5 }]);
      vi.mocked(adjustInventory).mockResolvedValueOnce({ success: true, message: '' } as any);
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      const result = await confirmReturn(1, 1, 1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('确认成功');
    });

    it('成功确认退料入库（多明细）', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ id: 1, status: 0, return_no: 'RT001' }])
        .mockResolvedValueOnce([
          { material_id: 101, batch_no: 'B001', quantity: 5 },
          { material_id: 102, batch_no: 'B002', quantity: 3 },
        ]);
      vi.mocked(adjustInventory)
        .mockResolvedValueOnce({ success: true, message: '' } as any)
        .mockResolvedValueOnce({ success: true, message: '' } as any);
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      const result = await confirmReturn(1, 1, 1);

      expect(result.success).toBe(true);
    });

    it('异常时返回失败并记录日志', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB 异常'));

      const result = await confirmReturn(1, 1, 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('确认失败');
      expect(secureLog).toHaveBeenCalledWith('error', expect.stringContaining('失败'), expect.anything());
    });
  });

  // ============================================================
  // 补充分支覆盖：空可选参数 + 异常路径
  // ============================================================
  describe('分支覆盖 - 空可选参数与异常路径', () => {
    it('autoGenerateRequisition 不传申请人且 warehouse_id 为 null', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ id: 1, work_order_no: 'WO001', material_id: 101, plan_qty: 100, warehouse_id: null }])
        .mockResolvedValueOnce([{ material_id: 201, material_code: 'M201', material_name: 'A', quantity: '1', unit: 'pcs' }]);
      vi.mocked(allocateFIFO).mockResolvedValueOnce({ allocations: [], shortage: false, shortageQty: 0 } as any);

      mockConn.execute
        .mockResolvedValueOnce([{ insertId: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await autoGenerateRequisition(1);

      expect(result.success).toBe(true);
    });

    it('submitOverRequisition 不传申请人参数', async () => {
      vi.mocked(execute)
        .mockResolvedValueOnce({ insertId: 1 } as any)
        .mockResolvedValueOnce({} as any);

      const result = await submitOverRequisition(1, 101, 50, '测试');

      expect(result.success).toBe(true);
    });

    it('submitOverRequisition 异常路径触发 catch', async () => {
      vi.mocked(execute).mockRejectedValueOnce(new Error('DB 异常'));

      const result = await submitOverRequisition(1, 101, 50, '测试');

      expect(result.success).toBe(false);
      expect(result.message).toContain('申请失败');
    });

    it('submitSupplementaryRequisition 不需要双重审批且不传申请人', async () => {
      vi.mocked(getConfig).mockReturnValueOnce(false); // replenish_dual_approval = false
      vi.mocked(query).mockResolvedValueOnce([{ id: 1, work_order_id: 1, work_order_no: 'WO001' }]);
      vi.mocked(execute)
        .mockResolvedValueOnce({ insertId: 2 } as any)
        .mockResolvedValueOnce({} as any);

      const result = await submitSupplementaryRequisition(1, 101, 30, '测试');

      expect(result.success).toBe(true);
      expect(result.message).toContain('已生成');
    });

    it('submitSupplementaryRequisition 异常路径触发 catch', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ id: 1, work_order_id: 1, work_order_no: 'WO001' }]);
      vi.mocked(execute).mockRejectedValueOnce(new Error('DB 异常'));

      const result = await submitSupplementaryRequisition(1, 101, 30, '测试');

      expect(result.success).toBe(false);
      expect(result.message).toContain('申请失败');
      expect(secureLog).toHaveBeenCalledWith('error', expect.stringContaining('失败'), expect.anything());
    });

    it('approveRequisition 异常路径触发 catch', async () => {
      vi.mocked(execute).mockRejectedValueOnce(new Error('DB 异常'));

      const result = await approveRequisition(1, true, 2, '李四');

      expect(result.success).toBe(false);
      expect(result.message).toContain('审批失败');
      expect(secureLog).toHaveBeenCalledWith('error', expect.stringContaining('失败'), expect.anything());
    });

    it('createReturn 物料查询为空时使用默认值', async () => {
      // INSERT returns -> SELECT material (空) -> SELECT cost (空) -> INSERT item -> UPDATE total
      mockConn.execute
        .mockResolvedValueOnce([{ insertId: 1 }, []] as any)
        .mockResolvedValueOnce([[], []] as any) // 物料不存在
        .mockResolvedValueOnce([[], []] as any) // 成本不存在
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await createReturn(1, 1, [{ materialId: 101, qrCode: 'QR001', quantity: 5 }]);

      expect(result.success).toBe(true);
    });

    it('issueMaterial 不传 operatorId', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ id: 1, status: 1, requisition_no: 'MR001', warehouse_id: 1 }]);
      vi.mocked(checkWholeMaterial).mockResolvedValueOnce({ isWhole: false, message: '' } as any);
      vi.mocked(enforceFIFO).mockResolvedValueOnce({ isValid: true, needsApproval: false, message: '' } as any);
      vi.mocked(adjustInventory).mockResolvedValueOnce({ success: true, message: '' } as any);

      mockConn.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await issueMaterial(1, [{ materialId: 101, qrCode: 'QR001', quantity: 10, batchNo: 'B001' }]);

      expect(result.success).toBe(true);
    });

    it('autoGenerateRequisition 配置 mr_prefix 为空时使用默认 MR', async () => {
      vi.mocked(getConfig).mockReturnValueOnce(''); // mr_prefix 为空
      vi.mocked(query)
        .mockResolvedValueOnce([{ id: 1, work_order_no: 'WO001', material_id: 101, plan_qty: 100, warehouse_id: 1 }])
        .mockResolvedValueOnce([{ material_id: 201, material_code: 'M201', material_name: 'A', quantity: '1', unit: 'pcs' }]);
      vi.mocked(allocateFIFO).mockResolvedValueOnce({ allocations: [], shortage: false, shortageQty: 0 } as any);

      mockConn.execute
        .mockResolvedValueOnce([{ insertId: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await autoGenerateRequisition(1, 1, '张三');
      expect(result.success).toBe(true);
    });

    it('submitOverRequisition 配置 mr_prefix 为空时使用默认 MR', async () => {
      vi.mocked(getConfig).mockReturnValueOnce(true).mockReturnValueOnce(''); // over_requisition_approval=true, mr_prefix=''
      vi.mocked(execute)
        .mockResolvedValueOnce({ insertId: 1 } as any)
        .mockResolvedValueOnce({} as any);

      const result = await submitOverRequisition(1, 101, 50, '测试', 1, '张三');
      expect(result.success).toBe(true);
    });

    it('submitSupplementaryRequisition 配置 mr_prefix 为空时使用默认 MR', async () => {
      vi.mocked(getConfig).mockReturnValueOnce(true).mockReturnValueOnce(''); // replenish_dual_approval=true, mr_prefix=''
      vi.mocked(query).mockResolvedValueOnce([{ id: 1, work_order_id: 1, work_order_no: 'WO001' }]);
      vi.mocked(execute)
        .mockResolvedValueOnce({ insertId: 2 } as any)
        .mockResolvedValueOnce({} as any);

      const result = await submitSupplementaryRequisition(1, 101, 30, '测试', 1, '张三');
      expect(result.success).toBe(true);
    });

    it('issueMaterial 不传 batchNo 时使用空字符串', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ id: 1, status: 1, requisition_no: 'MR001', warehouse_id: 1 }]);
      vi.mocked(checkWholeMaterial).mockResolvedValueOnce({ isWhole: false, message: '' } as any);
      vi.mocked(enforceFIFO).mockResolvedValueOnce({ isValid: true, needsApproval: false, message: '' } as any);
      vi.mocked(adjustInventory).mockResolvedValueOnce({ success: true, message: '' } as any);

      mockConn.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      // 不传 batchNo
      const result = await issueMaterial(1, [{ materialId: 101, qrCode: 'QR001', quantity: 10 }], 1);
      expect(result.success).toBe(true);
    });

    it('approveRequisition 不传审批人参数', async () => {
      vi.mocked(execute).mockResolvedValueOnce({} as any);

      const result = await approveRequisition(1, true);
      expect(result.success).toBe(true);
    });

    it('autoGenerateRequisition FIFO 推荐批次字段为空时使用默认值', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ id: 1, work_order_no: 'WO001', material_id: 101, plan_qty: 100, warehouse_id: 1 }])
        .mockResolvedValueOnce([{ material_id: 201, material_code: 'M201', material_name: 'A', quantity: '1', unit: 'pcs' }]);
      // allocation 存在但字段为空字符串
      vi.mocked(allocateFIFO).mockResolvedValueOnce({
        allocations: [{ qrCode: '', batchNo: '', location: '', splitFlag: 1, unitCost: 0 }],
        shortage: false,
        shortageQty: 0,
      } as any);

      mockConn.execute
        .mockResolvedValueOnce([{ insertId: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await autoGenerateRequisition(1, 1, '张三');
      expect(result.success).toBe(true);
    });

    it('issueMaterial FIFO 校验无效但无需审批时继续出库', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ id: 1, status: 1, requisition_no: 'MR001', warehouse_id: 1 }]);
      vi.mocked(checkWholeMaterial).mockResolvedValueOnce({ isWhole: false, message: '' } as any);
      // isValid=false 且 needsApproval=false，不抛错，继续出库，L381 走 0
      vi.mocked(enforceFIFO).mockResolvedValueOnce({ isValid: false, needsApproval: false, message: '' } as any);
      vi.mocked(adjustInventory).mockResolvedValueOnce({ success: true, message: '' } as any);

      mockConn.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await issueMaterial(1, [{ materialId: 101, qrCode: 'QR001', quantity: 10, batchNo: 'B001' }], 1);
      expect(result.success).toBe(true);
    });
  });
});
