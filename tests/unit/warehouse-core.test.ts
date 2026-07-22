/**
 * warehouse-core.ts 单元测试
 * 覆盖 FIFO 批次分配、整料检查、小料拆分、FIFO 校验、库存查询
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

vi.mock('@/lib/global-config', () => ({
  getConfig: vi.fn((key?: string) => {
    // 默认开启 FIFO
    if (key === 'fifo_enabled') return true;
    if (key === 'allow_whole_material_issue') return false;
    if (key === 'film_split_length') return 100;
    if (key === 'ink_split_weight') return 5;
    if (key === 'solvent_split_volume') return 20;
    if (key === 'mesh_split_length') return 50;
    if (key === 'pvc_split_length') return 80;
    return undefined;
  }),
}));

import { query, execute, transaction } from '@/lib/db';
import { getConfig } from '@/lib/global-config';
import {
  allocateFIFO,
  checkWholeMaterial,
  splitMaterial,
  enforceFIFO,
  logFIFOOverride,
  queryMaterialBatches,
  queryExpiringMaterials,
  queryObsoleteMaterials,
} from '@/lib/warehouse-core';

describe('warehouse-core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConn.execute.mockReset();
    mockConn.query.mockReset();
    vi.mocked(query).mockReset();
    vi.mocked(execute).mockReset();
    vi.mocked(transaction).mockImplementation((fn: any) => fn(mockConn));
    vi.mocked(getConfig).mockImplementation((key?: string) => {
      if (key === 'fifo_enabled') return true;
      if (key === 'allow_whole_material_issue') return false;
      if (key === 'film_split_length') return 100;
      if (key === 'ink_split_weight') return 5;
      if (key === 'solvent_split_volume') return 20;
      if (key === 'mesh_split_length') return 50;
      if (key === 'pvc_split_length') return 80;
      return undefined;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('allocateFIFO', () => {
    it('FIFO 启用：余料优先排序分配', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          qr_code: 'QR001',
          available_qty: '50',
          remaining_quantity: '50',
          unit_cost: '10',
          split_flag: 2, // 余料
          inbound_date: '2024-02-01',
          expire_date: '2024-12-01',
          warehouse_id: 1,
          location: 'A1',
        },
        {
          id: 2,
          batch_no: 'B002',
          qr_code: 'QR002',
          available_qty: '100',
          remaining_quantity: '100',
          unit_cost: '12',
          split_flag: 0,
          inbound_date: '2024-01-01',
          expire_date: '2024-11-01',
          warehouse_id: 1,
          location: 'A2',
        },
      ] as any);

      const result = await allocateFIFO(101, 80);

      expect(result.success).toBe(true);
      expect(result.totalAllocated).toBe(80);
      // 余料优先：先扣余料 50，再扣整料 30
      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0].quantity).toBe(50);
      expect(result.allocations[0].splitFlag).toBe(2);
      expect(result.allocations[1].quantity).toBe(30);
    });

    it('FIFO 禁用：按入库时间排序', async () => {
      vi.mocked(getConfig).mockReturnValueOnce(false);
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          qr_code: 'QR001',
          available_qty: '100',
          remaining_quantity: '100',
          unit_cost: '10',
          split_flag: 0,
          inbound_date: '2024-01-01',
          expire_date: '2024-11-01',
          warehouse_id: 1,
          location: 'A1',
        },
      ] as any);

      const result = await allocateFIFO(101, 50);

      expect(result.success).toBe(true);
      expect(result.totalAllocated).toBe(50);
      // 不带余料优先排序的 SQL
      expect(vi.mocked(query)).toHaveBeenCalledWith(
        expect.not.stringContaining('CASE WHEN split_flag'),
        expect.anything()
      );
    });

    it('带 warehouseId 时 SQL 包含仓库过滤', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          qr_code: 'QR001',
          available_qty: '50',
          remaining_quantity: '50',
          unit_cost: '10',
          split_flag: 0,
          inbound_date: '2024-01-01',
          expire_date: '2024-11-01',
          warehouse_id: 1,
          location: 'A1',
        },
      ] as any);

      await allocateFIFO(101, 30, 1);

      expect(vi.mocked(query)).toHaveBeenCalledWith(
        expect.stringContaining('AND warehouse_id = ?'),
        expect.arrayContaining([101, 1])
      );
    });

    it('库存不足时返回部分分配结果', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          qr_code: 'QR001',
          available_qty: '30',
          remaining_quantity: '30',
          unit_cost: '10',
          split_flag: 0,
          inbound_date: '2024-01-01',
          expire_date: '2024-11-01',
          warehouse_id: 1,
          location: 'A1',
        },
      ] as any);

      const result = await allocateFIFO(101, 100);

      expect(result.success).toBe(false);
      expect(result.totalAllocated).toBe(30);
      expect(result.remainingNeed).toBe(70);
      expect(result.message).toContain('Insufficient stock');
    });

    it('无可用批次时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      const result = await allocateFIFO(101, 50);

      expect(result.success).toBe(false);
      expect(result.totalAllocated).toBe(0);
      expect(result.remainingNeed).toBe(50);
    });

    it('查询抛错时返回失败', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB 错误'));

      const result = await allocateFIFO(101, 50);

      expect(result.success).toBe(false);
      expect(result.message).toContain('FIFO分配失败');
    });
  });

  describe('checkWholeMaterial', () => {
    it('二维码不存在时返回 isWhole=false', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      const result = await checkWholeMaterial('QR999');

      expect(result.isWhole).toBe(false);
      expect(result.message).toBe('二维码不存在');
    });

    it('整料且禁止直接领用时返回 isWhole=true', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          material_id: 101,
          split_flag: 0,
        },
      ] as any);

      const result = await checkWholeMaterial('QR001');

      expect(result.isWhole).toBe(true);
      expect(result.materialId).toBe(101);
      expect(result.message).toContain('整料禁止直接领用');
    });

    it('允许整料直接领用时返回 isWhole=false', async () => {
      vi.mocked(getConfig).mockImplementationOnce((key?: string) => {
        if (key === 'allow_whole_material_issue') return true;
        return undefined;
      });
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          material_id: 101,
          split_flag: 0,
        },
      ] as any);

      const result = await checkWholeMaterial('QR001');

      expect(result.isWhole).toBe(false);
      expect(result.materialId).toBe(101);
      expect(result.message).toBe('可以领用');
    });

    it('小料（split_flag=1）允许直接领用', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          material_id: 101,
          split_flag: 1,
        },
      ] as any);

      const result = await checkWholeMaterial('QR001');

      expect(result.isWhole).toBe(false);
      expect(result.materialId).toBe(101);
    });
  });

  describe('splitMaterial', () => {
    const wholeBatch = {
      id: 1,
      material_id: 101,
      batch_no: 'B001',
      qr_code: 'QR001',
      quantity: '350',
      unit_cost: '10',
      warehouse_id: 1,
      location: 'A1',
      inbound_date: '2024-01-01',
      expire_date: '2024-12-01',
      material_code: 'MAT001',
      material_name: '材料1',
    };

    it('整料拆分成功生成小料和余料', async () => {
      // SELECT 整料
      mockConn.execute.mockResolvedValueOnce([[wholeBatch], []] as any);
      // SELECT 物料（pet_film 标准拆分 100）
      mockConn.execute.mockResolvedValueOnce([[{ material_type: 'pet_film', unit: '米' }], []] as any);
      // 冻结整料
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      // 插入小料
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      // 插入余料（350 - 3*100 = 50）
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      // 插入流水
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      // 插入成本记录
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await splitMaterial('QR001', undefined, 1);

      expect(result.success).toBe(true);
      expect(result.splitQuantity).toBe(300); // 3 个小料 * 100
      expect(result.remainderQuantity).toBe(50);
      expect(result.smallMaterialQRCode).toContain('SM-');
      expect(result.remainderQRCode).toContain('RM-');
      expect(result.message).toContain('拆分成功');
    });

    it('无余料时不创建余料批次', async () => {
      // quantity=300，按 100 拆分恰好整除
      mockConn.execute.mockResolvedValueOnce([
        [{ ...wholeBatch, quantity: '300' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ material_type: 'pet_film', unit: '米' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      // 不插入余料（remainderQty=0）
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await splitMaterial('QR001');

      expect(result.success).toBe(true);
      expect(result.remainderQuantity).toBe(0);
      expect(result.remainderQRCode).toBeUndefined();
    });

    it('整料不存在时抛错', async () => {
      mockConn.execute.mockResolvedValueOnce([[], []] as any);

      const result = await splitMaterial('QR999');

      expect(result.success).toBe(false);
      expect(result.message).toContain('整料不存在或已拆分');
    });

    it('物料记录不存在时抛错', async () => {
      mockConn.execute.mockResolvedValueOnce([[wholeBatch], []] as any);
      mockConn.execute.mockResolvedValueOnce([[], []] as any);

      const result = await splitMaterial('QR001');

      expect(result.success).toBe(false);
      expect(result.message).toContain('物料不存在');
    });

    it('数量不足按标准拆分时抛错', async () => {
      mockConn.execute.mockResolvedValueOnce([
        [{ ...wholeBatch, quantity: '50' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ material_type: 'pet_film', unit: '米' }],
        [],
      ] as any);

      const result = await splitMaterial('QR001');

      expect(result.success).toBe(false);
      expect(result.message).toContain('数量不足');
    });

    it('未知 material_type 使用默认拆分标准', async () => {
      mockConn.execute.mockResolvedValueOnce([[wholeBatch], []] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ material_type: 'unknown_type', unit: '个' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      const result = await splitMaterial('QR001', undefined, 1);

      // 默认标准 10，350/10=35 个小料，余料 0
      expect(result.success).toBe(true);
      expect(result.splitQuantity).toBe(350);
      expect(result.remainderQuantity).toBe(0);
    });

    it('自定义 splitQuantity 时使用传入值', async () => {
      mockConn.execute.mockResolvedValueOnce([[wholeBatch], []] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ material_type: 'pet_film', unit: '米' }],
        [],
      ] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);
      mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

      // 350 / 150 = 2，余料 50
      const result = await splitMaterial('QR001', 150);

      expect(result.success).toBe(true);
      expect(result.splitQuantity).toBe(300);
      expect(result.remainderQuantity).toBe(50);
    });

    it('自定义 splitQuantity <= 0 时抛错', async () => {
      // 0 在源码中会被当作 falsy 而回退到默认标准，使用 -1 触发 <=0 分支
      mockConn.execute.mockResolvedValueOnce([[wholeBatch], []] as any);
      mockConn.execute.mockResolvedValueOnce([
        [{ material_type: 'pet_film', unit: '米' }],
        [],
      ] as any);

      const result = await splitMaterial('QR001', -1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('拆分标准未配置');
    });
  });

  describe('enforceFIFO', () => {
    it('FIFO 禁用时直接通过', async () => {
      vi.mocked(getConfig).mockReturnValueOnce(false);

      const result = await enforceFIFO(101, 'B001');

      expect(result.isValid).toBe(true);
      expect(result.needsApproval).toBe(false);
      expect(result.message).toBe('FIFO未启用');
    });

    it('批次与推荐批次一致时通过', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          qr_code: 'QR001',
          available_qty: '50',
          remaining_quantity: '50',
          unit_cost: '10',
          split_flag: 0,
          inbound_date: '2024-01-01',
          expire_date: '2024-11-01',
          warehouse_id: 1,
          location: 'A1',
        },
      ] as any);

      const result = await enforceFIFO(101, 'B001');

      expect(result.isValid).toBe(true);
      expect(result.recommendedBatchNo).toBe('B001');
      expect(result.needsApproval).toBe(false);
    });

    it('批次与推荐批次不一致时需要审批', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          qr_code: 'QR001',
          available_qty: '50',
          remaining_quantity: '50',
          unit_cost: '10',
          split_flag: 0,
          inbound_date: '2024-01-01',
          expire_date: '2024-11-01',
          warehouse_id: 1,
          location: 'A1',
        },
      ] as any);

      const result = await enforceFIFO(101, 'B999');

      expect(result.isValid).toBe(false);
      expect(result.recommendedBatchNo).toBe('B001');
      expect(result.needsApproval).toBe(true);
      expect(result.message).toContain('非FIFO批次');
    });

    it('无可用批次时返回失败', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      const result = await enforceFIFO(101, 'B001');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('无可用批次');
    });
  });

  describe('logFIFOOverride', () => {
    it('记录 FIFO 异常并返回 insertId', async () => {
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 100 } as any);

      const id = await logFIFOOverride(
        101,
        'B001',
        'B999',
        '客户指定批次',
        1,
        'admin',
        50
      );

      expect(id).toBe(100);
      expect(vi.mocked(execute)).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inv_fifo_override_log'),
        expect.arrayContaining([101, 'B001', 'B999', 50, '客户指定批次', 1, 'admin'])
      );
    });

    it('缺省参数时使用 null', async () => {
      vi.mocked(execute).mockResolvedValueOnce({ insertId: 1 } as any);

      await logFIFOOverride(101, 'B001', 'B999', '原因');

      expect(vi.mocked(execute)).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([101, 'B001', 'B999', null, '原因', null, ''])
      );
    });
  });

  describe('queryMaterialBatches', () => {
    it('不带 warehouseId 查询全部', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          material_code: 'MAT001',
          material_name: '材料1',
        },
      ] as any);

      const result = await queryMaterialBatches(101);

      expect(result).toHaveLength(1);
      expect(vi.mocked(query)).toHaveBeenCalledWith(
        expect.stringContaining('WHERE b.material_id = ?'),
        [101]
      );
    });

    it('带 warehouseId 时加入仓库过滤', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      await queryMaterialBatches(101, 1);

      expect(vi.mocked(query)).toHaveBeenCalledWith(
        expect.stringContaining('AND b.warehouse_id = ?'),
        [101, 1]
      );
    });
  });

  describe('queryExpiringMaterials', () => {
    it('返回即将过期物料列表', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          material_code: 'MAT001',
          days_remaining: 7,
        },
      ] as any);

      const result = await queryExpiringMaterials(30);

      expect(result).toHaveLength(1);
      expect(vi.mocked(query)).toHaveBeenCalledWith(
        expect.stringContaining('DATEDIFF(b.expire_date, CURDATE())'),
        [30]
      );
    });

    it('使用默认 30 天', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      await queryExpiringMaterials();

      expect(vi.mocked(query)).toHaveBeenCalledWith(expect.anything(), [30]);
    });
  });

  describe('queryObsoleteMaterials', () => {
    it('返回呆滞料列表', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          batch_no: 'B001',
          material_code: 'MAT001',
          days_in_stock: 120,
        },
      ] as any);

      const result = await queryObsoleteMaterials(90);

      expect(result).toHaveLength(1);
      expect(vi.mocked(query)).toHaveBeenCalledWith(
        expect.stringContaining('DATEDIFF(CURDATE(), b.inbound_date)'),
        [90]
      );
    });

    it('使用默认 90 天', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      await queryObsoleteMaterials();

      expect(vi.mocked(query)).toHaveBeenCalledWith(expect.anything(), [90]);
    });
  });
});
