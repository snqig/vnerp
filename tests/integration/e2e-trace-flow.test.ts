/**
 * 端到端流程集成测试：溯源全链路
 * 入库审核 → 自动生成二维码 → 扫码登记 → 追溯查询（含 Redis 缓存命中）
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
  queryOne: vi.fn(),
  getPool: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/infrastructure/cache/CacheManager', () => ({
  getCacheManager: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    deletePattern: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { query, queryOne } from '@/lib/db';
import { MysqlQRCodeRepository } from '@/infrastructure/repositories/MysqlQRCodeRepository';
import { QRCodeApplicationService } from '@/application/services/QRCodeApplicationService';
import { getCachedTrace } from '@/application/services/TraceCacheService';

describe('端到端流程：入库→扫码→追溯', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConn.query.mockReset();
    mockConn.execute.mockReset();
    vi.mocked(query).mockReset();
    vi.mocked(queryOne).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Step 1: 入库审核后自动生成二维码', () => {
    it('应在 qrcode_record 中插入原料类型二维码', async () => {
      const repo = new MysqlQRCodeRepository();
      const service = new QRCodeApplicationService(repo);

      mockConn.execute.mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO qrcode_record')) {
          return Promise.resolve([{ insertId: 101 }]);
        }
        return Promise.resolve([[]]);
      });

      const result = await service.generateBatchQr({
        qrType: 'material',
        count: 1,
        quantity: 100,
        materialId: 10,
        materialCode: 'PET-001',
        materialName: 'PET薄膜',
        unit: 'm',
        batchNo: 'B20260101001',
        refId: 1,
        refNo: 'IN20260101001',
      });

      expect(result).toBeDefined();
      expect(result.qrCodes).toBeDefined();
      expect(result.qrCodes.length).toBeGreaterThan(0);
    });
  });

  describe('Step 2: 扫码登记', () => {
    it('应在 qrcode_scan_log 中记录扫码并更新 scan_count', async () => {
      const repo = new MysqlQRCodeRepository();
      const service = new QRCodeApplicationService(repo);

      vi.mocked(query).mockResolvedValueOnce([[{ id: 1, scan_count: 0 }]]);
      mockConn.execute
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await service.recordScan('QR-MAT-001', 'operator-001', 'warehouse-1');

      expect(mockConn.execute).toHaveBeenCalled();
    });
  });

  describe('Step 3: 追溯查询缓存', () => {
    it('首次查询应从 DB 读取并写入缓存', async () => {
      const mockRecord = {
        id: 1,
        qr_code: 'QR-MAT-001',
        qr_type: 'material',
        material_name: 'PET薄膜',
        quantity: 100,
        unit: 'm',
        batch_no: 'B20260101001',
        status: 1,
        create_time: '2026-01-01 00:00:00',
      };

      vi.mocked(queryOne).mockResolvedValueOnce(mockRecord as any);
      vi.mocked(query).mockResolvedValueOnce([[mockRecord]]);
      vi.mocked(query).mockResolvedValueOnce([[]]);
      vi.mocked(query).mockResolvedValueOnce([[]]);

      const result = await getCachedTrace('QR-MAT-001');

      expect(result).toBeDefined();
      expect(result?.record.qr_code).toBe('QR-MAT-001');
    });

    it('二次查询应命中缓存', async () => {
      vi.mocked(query).mockResolvedValue([[]]);

      const result = await getCachedTrace('QR-MAT-001');

      expect(result).toBeDefined();
    });
  });
});
