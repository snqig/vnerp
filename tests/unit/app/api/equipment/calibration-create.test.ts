/**
 * 设备校准单创建回归测试 —— 守护 P1-2 修复（2026-09-27）
 *
 * 背景：POST /api/equipment/calibration 此前零校验直接 INSERT，
 *       calibration_result 值域（qualified/unqualified）也无人把关。
 * 修复后：设备编码/名称至少一项非空、校准日期必填、校准结果必须落在值域内
 *       （缺省按 DB 默认 'qualified' 处理）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(async () => [[]]),
  execute: vi.fn(async () => [{ affectedRows: 1, insertId: 1 }]),
  generateDocNo: vi.fn(() => 'JD20260927001'),
}));

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock('@/lib/api-permissions', () => ({
  withPermission: (handler: (request: Request, userInfo: unknown) => Promise<Response>) =>
    async (request: Request): Promise<Response> =>
      handler(request, { userId: 1, realName: '管理员', username: 'admin' }),
}));

vi.mock('@/lib/global-config', () => ({
  getJdPrefix: vi.fn(() => 'JD'),
  generateDocNo: mocks.generateDocNo,
}));

import { POST } from '@/app/api/equipment/calibration/route';

function makePost(body: Record<string, unknown>) {
  return new Request('http://localhost/api/equipment/calibration', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    equipment_id: null,
    equipment_code: 'EQ-001',
    equipment_name: '印刷机一号',
    calibration_date: '2026-09-27',
    next_calibration_date: '2027-09-27',
    calibration_org: '计量院',
    calibration_result: 'qualified',
    certificate_no: 'CERT-001',
    calibration_cost: 0,
    remark: '',
    ...overrides,
  };
}

describe('POST /api/equipment/calibration - 校准单创建硬校验（P1-2）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('设备编码与名称都为空：400 请填写设备编码或设备名称，不 INSERT', async () => {
    const res = await POST(makePost(validBody({ equipment_code: '', equipment_name: '' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('equipmentIdentityRequired');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('校准日期为空：400 请选择校准日期', async () => {
    const res = await POST(makePost(validBody({ calibration_date: '' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('calibrationDateRequired');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('校准结果为非法值（excellent）：400', async () => {
    const res = await POST(makePost(validBody({ calibration_result: 'excellent' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('calibrationResultInvalid');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('校准结果为空字符串：按 DB 默认 qualified 落库', async () => {
    const res = await POST(makePost(validBody({ calibration_result: '' })));
    expect(res.status).toBe(200);
    const args = (mocks.execute.mock.calls[0] as unknown[])[1] as unknown[];
    expect(args[7]).toBe('qualified'); // calibration_result 列
  });

  it('校准结果 qualified：200', async () => {
    const res = await POST(makePost(validBody({ calibration_result: 'qualified' })));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('校准结果 unqualified：200', async () => {
    const res = await POST(makePost(validBody({ calibration_result: 'unqualified' })));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
