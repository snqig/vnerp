// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

describe('FIFO Allocation Logic', () => {
  describe('allocateFIFO - quantity calculation', () => {
    it('should calculate shortage when total available is less than required', async () => {
      const batches = [
        {
          id: 1,
          batch_no: 'B001',
          material_id: 1,
          material_code: 'M001',
          material_name: '物料X',
          available_qty: '30',
          unit_price: '10',
          inbound_date: '2026-01-01',
          unit: '个',
          expire_date: null,
          opened_at: null,
          version: 1,
        },
      ];
      const conn = {
        query: vi.fn().mockResolvedValue([batches]),
        execute: vi.fn(),
      };

      const { allocateFIFO } = await import('@/lib/fifo-allocation');
      const result = await allocateFIFO(conn, 1, 1, 100);

      expect(result.allocated_qty).toBe(30);
      expect(result.shortage).toBe(70);
      expect(result.total_available).toBe(30);
    });

    it('should allocate across multiple batches when single batch is insufficient', async () => {
      const batches = [
        {
          id: 1,
          batch_no: 'B001',
          material_id: 1,
          material_code: 'M001',
          material_name: '物料Y',
          available_qty: '40',
          unit_price: '20',
          inbound_date: '2026-01-01',
          unit: '个',
          expire_date: null,
          opened_at: null,
          version: 1,
        },
        {
          id: 2,
          batch_no: 'B002',
          material_id: 1,
          material_code: 'M001',
          material_name: '物料Y',
          available_qty: '60',
          unit_price: '20',
          inbound_date: '2026-02-01',
          unit: '个',
          expire_date: null,
          opened_at: null,
          version: 1,
        },
        {
          id: 3,
          batch_no: 'B003',
          material_id: 1,
          material_code: 'M001',
          material_name: '物料Y',
          available_qty: '50',
          unit_price: '20',
          inbound_date: '2026-03-01',
          unit: '个',
          expire_date: null,
          opened_at: null,
          version: 1,
        },
      ];
      const conn = {
        query: vi.fn().mockResolvedValue([batches]),
        execute: vi.fn(),
      };

      const { allocateFIFO } = await import('@/lib/fifo-allocation');
      const result = await allocateFIFO(conn, 1, 1, 120);

      expect(result.allocations).toHaveLength(3);
      expect(result.allocations[0].allocate_qty).toBe(40);
      expect(result.allocations[1].allocate_qty).toBe(60);
      expect(result.allocations[2].allocate_qty).toBe(20);
      expect(result.allocated_qty).toBe(120);
      expect(result.shortage).toBe(0);
    });

    it('should return zero allocations when no batches available', async () => {
      const conn = {
        query: vi.fn().mockResolvedValue([[]]),
        execute: vi.fn(),
      };

      const { allocateFIFO } = await import('@/lib/fifo-allocation');
      const result = await allocateFIFO(conn, 1, 1, 50);

      expect(result.allocations).toHaveLength(0);
      expect(result.allocated_qty).toBe(0);
      expect(result.shortage).toBe(50);
      expect(result.total_available).toBe(0);
    });

    it('should return zero shortage when exactly enough stock', async () => {
      const batches = [
        {
          id: 1,
          batch_no: 'B001',
          material_id: 1,
          material_code: 'M001',
          material_name: '物料Z',
          available_qty: '100',
          unit_price: '15',
          inbound_date: '2026-01-01',
          unit: '个',
          expire_date: null,
          opened_at: null,
          version: 1,
        },
      ];
      const conn = {
        query: vi.fn().mockResolvedValue([batches]),
        execute: vi.fn(),
      };

      const { allocateFIFO } = await import('@/lib/fifo-allocation');
      const result = await allocateFIFO(conn, 1, 1, 100);

      expect(result.allocated_qty).toBe(100);
      expect(result.shortage).toBe(0);
    });

    it('should include version field in allocation items', async () => {
      const batches = [
        {
          id: 1,
          batch_no: 'B001',
          material_id: 1,
          material_code: 'M001',
          material_name: '物料V',
          available_qty: '50',
          unit_price: '10',
          inbound_date: '2026-01-01',
          unit: '个',
          expire_date: null,
          opened_at: null,
          version: 5,
        },
      ];
      const conn = {
        query: vi.fn().mockResolvedValue([batches]),
        execute: vi.fn(),
      };

      const { allocateFIFO } = await import('@/lib/fifo-allocation');
      const result = await allocateFIFO(conn, 1, 1, 30);

      expect(result.allocations[0].version).toBe(5);
    });

    it('should use FOR UPDATE in batch query SQL', async () => {
      const queryMock = vi.fn().mockResolvedValue([
        [
          {
            id: 1,
            batch_no: 'B001',
            material_id: 1,
            material_code: 'M001',
            material_name: '物料',
            available_qty: '100',
            unit_price: '10',
            inbound_date: '2026-01-01',
            unit: '个',
            expire_date: null,
            opened_at: null,
            version: 1,
          },
        ],
      ]);
      const conn = {
        query: queryMock,
        execute: vi.fn(),
      };

      const { allocateFIFO } = await import('@/lib/fifo-allocation');
      await allocateFIFO(conn, 1, 1, 50);

      const sql = queryMock.mock.calls[0][0];
      expect(sql).toContain('FOR UPDATE');
    });
  });

  describe('executeFIFODeductionWithRetry - concurrency safety', () => {
    it('should throw error when optimistic lock fails (affectedRows = 0)', async () => {
      const conn = {
        query: vi.fn(),
        execute: vi.fn().mockResolvedValue([{ affectedRows: 0, insertId: 0 }]),
      };

      const { executeFIFODeductionWithRetry } = await import('@/lib/fifo-allocation');
      const allocation = {
        material_id: 1,
        material_code: 'M001',
        material_name: '测试物料',
        required_qty: 50,
        total_available: 100,
        allocated_qty: 50,
        shortage: 0,
        shortage_percentage: 0,
        allocations: [
          {
            batch_id: 1,
            batch_no: 'B001',
            material_id: 1,
            material_code: 'M001',
            material_name: '测试物料',
            allocate_qty: 50,
            available_qty_before: 100,
            unit_cost: 10,
            inbound_date: '2026-01-01',
            expire_date: undefined,
            version: 1,
          },
        ],
      };

      await expect(
        executeFIFODeductionWithRetry(conn, allocation, {
          sourceType: 'outbound',
          sourceId: 1,
          sourceNo: 'CK001',
          warehouseId: 1,
          warehouseCode: 'WH001',
          operatorId: null,
          operatorName: 'admin',
        })
      ).rejects.toThrow();
    });

    it('should include version increment in UPDATE SQL', async () => {
      const executeMock = vi
        .fn()
        .mockResolvedValueOnce([{ affectedRows: 1, insertId: 0 }])
        .mockResolvedValueOnce([{ affectedRows: 1, insertId: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1, insertId: 1 }]);

      const conn = {
        // executeFIFODeductionInternal 会调 conn.query 查询 inv_inventory 以记录 before/after 数量，
        // mock 返回 mysql2 格式 [rows, fields]，rows 为单条库存记录。
        query: vi.fn().mockResolvedValue([[{ quantity: 100 }]]),
        execute: executeMock,
      };

      const { executeFIFODeductionWithRetry } = await import('@/lib/fifo-allocation');
      const allocation = {
        material_id: 1,
        material_code: 'M001',
        material_name: '测试物料',
        required_qty: 30,
        total_available: 100,
        allocated_qty: 30,
        shortage: 0,
        shortage_percentage: 0,
        allocations: [
          {
            batch_id: 5,
            batch_no: 'B005',
            material_id: 1,
            material_code: 'M001',
            material_name: '测试物料',
            allocate_qty: 30,
            available_qty_before: 100,
            unit_cost: 15,
            inbound_date: '2026-01-01',
            expire_date: undefined,
            version: 3,
          },
        ],
      };

      await executeFIFODeductionWithRetry(conn, allocation, {
        sourceType: 'outbound',
        sourceId: 1,
        sourceNo: 'CK001',
        warehouseId: 1,
        warehouseCode: 'WH001',
        operatorId: null,
        operatorName: 'admin',
      });

      const sql = executeMock.mock.calls[0][0];
      expect(sql).toContain('version = version + 1');
    });
  });

  describe('executeSpecifiedBatchDeduction - validation', () => {
    it('should throw error when batch does not exist', async () => {
      const conn = {
        query: vi.fn().mockResolvedValue([[]]),
        execute: vi.fn(),
      };

      const { executeSpecifiedBatchDeduction } = await import('@/lib/fifo-allocation');
      await expect(
        executeSpecifiedBatchDeduction(conn, {
          batchNo: 'NONEXIST',
          materialId: 1,
          materialCode: 'M001',
          materialName: '物料',
          warehouseId: 1,
          warehouseCode: 'WH001',
          requiredQty: 10,
          sourceType: 'outbound',
          sourceId: 1,
          sourceNo: 'CK001',
          operatorId: null,
          operatorName: 'admin',
        })
      ).rejects.toThrow('库存批次不存在');
    });

    it('should throw error when available quantity is insufficient', async () => {
      const conn = {
        query: vi.fn().mockResolvedValue([
          [
            {
              id: 1,
              batch_no: 'B001',
              available_qty: '5',
              quantity: '10',
              unit_price: '20',
              version: 1,
            },
          ],
        ]),
        execute: vi.fn(),
      };

      const { executeSpecifiedBatchDeduction } = await import('@/lib/fifo-allocation');
      await expect(
        executeSpecifiedBatchDeduction(conn, {
          batchNo: 'B001',
          materialId: 1,
          materialCode: 'M001',
          materialName: '物料',
          warehouseId: 1,
          warehouseCode: 'WH001',
          requiredQty: 50,
          sourceType: 'outbound',
          sourceId: 1,
          sourceNo: 'CK001',
          operatorId: null,
          operatorName: 'admin',
        })
      ).rejects.toThrow('库存不足');
    });

    it('should use SELECT FOR UPDATE to lock the batch row', async () => {
      const queryMock = vi.fn().mockResolvedValue([
        [
          {
            id: 1,
            batch_no: 'B001',
            available_qty: '100',
            quantity: '100',
            unit_price: '20',
            version: 1,
          },
        ],
      ]);
      const conn = {
        query: queryMock,
        execute: vi
          .fn()
          .mockResolvedValueOnce([{ affectedRows: 1 }])
          .mockResolvedValueOnce([{ affectedRows: 1 }])
          .mockResolvedValueOnce([{ affectedRows: 1 }]),
      };

      const { executeSpecifiedBatchDeduction } = await import('@/lib/fifo-allocation');
      await executeSpecifiedBatchDeduction(conn, {
        batchNo: 'B001',
        materialId: 1,
        materialCode: 'M001',
        materialName: '物料',
        warehouseId: 1,
        warehouseCode: 'WH001',
        requiredQty: 10,
        sourceType: 'outbound',
        sourceId: 1,
        sourceNo: 'CK001',
        operatorId: null,
        operatorName: 'admin',
      });

      const sql = queryMock.mock.calls[0][0];
      expect(sql).toContain('FOR UPDATE');
    });
  });
});
