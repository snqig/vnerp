/**
 * 盘点扫码回填回归测试 —— 守护 P0-2 修复（2026-09-26）
 *
 * 背景：旧版 actual_quantity 仅挡 undefined/null，0、负数、非数字全部放行，
 *       负实盘数可直接写库（UPDATE inv_stocktaking_item.actual_qty/diff_qty）。
 * 修复后：实盘数必须是 >=0 的有限数字（0 是合法值，盘亏可为 0）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryOne: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  queryOne: mocks.queryOne,
  execute: mocks.execute,
  query: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock('@/lib/api-permissions', () => ({
  withPermission:
    (
      handler: (
        request: Request,
        userInfo: { userId: number },
        ctx?: { params: Promise<Record<string, string>> }
      ) => Promise<Response>
    ) =>
    async (request: Request, ctx?: { params: Promise<Record<string, string>> }): Promise<Response> =>
      handler(request, { userId: 1 }, ctx),
}));

import { POST } from '@/app/api/warehouse/stocktaking/[id]/scan/route';

function makeScanCall(body: Record<string, unknown>) {
  const request = new Request('http://localhost/api/warehouse/stocktaking/1/scan', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const ctx = { params: Promise.resolve({ id: '1' }) };
  return POST(request as never, ctx as never);
}

describe('POST /api/warehouse/stocktaking/[id]/scan - 实盘数量校验（P0-2）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryOne.mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes('inv_stocktaking WHERE')) return { id: 1, status: 1 };
      if (s.includes('qrcode_record')) {
        return { qr_code: 'QR001', material_name: '物料A', batch_no: 'B001', warehouse_location: 'L01' };
      }
      if (s.includes('inv_stocktaking_item')) {
        return { id: 5, system_qty: 10, split_flag: 0, parent_qr_code: null };
      }
      if (s.includes('COUNT(CASE')) return { checked_count: 1, total_count: 3 };
      return null;
    });
    mocks.execute.mockResolvedValue([{ affectedRows: 1, insertId: 0 }]);
  });

  it('负数实盘 -5：400，不写库', async () => {
    const res = await makeScanCall({ qr_code: 'QR001', actual_quantity: -5 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('stocktakeQtyInvalid');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('非数字 "abc"：400，不写库', async () => {
    const res = await makeScanCall({ qr_code: 'QR001', actual_quantity: 'abc' });
    expect(res.status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('0 是合法值（盘亏为 0）：200，diff = 0 - system_qty', async () => {
    const res = await makeScanCall({ qr_code: 'QR001', actual_quantity: 0 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.difference).toBe(-10);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.execute.mock.calls[0][1]).toEqual([0, -10, 5]);
  });

  it('正常正数 8：200，diff = -2', async () => {
    const res = await makeScanCall({ qr_code: 'QR001', actual_quantity: 8 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.actual_quantity).toBe(8);
    expect(body.data.difference).toBe(-2);
  });

  it('数字字符串 "8"：按数字接受', async () => {
    const res = await makeScanCall({ qr_code: 'QR001', actual_quantity: '8' });
    expect(res.status).toBe(200);
  });

  it('缺 qr_code：400（原有校验保持）', async () => {
    const res = await makeScanCall({ actual_quantity: 5 });
    expect(res.status).toBe(400);
  });

  it('缺 actual_quantity：400（原有校验保持）', async () => {
    const res = await makeScanCall({ qr_code: 'QR001' });
    expect(res.status).toBe(400);
  });
});
