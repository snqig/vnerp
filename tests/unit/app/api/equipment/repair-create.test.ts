/**
 * 设备维修单创建回归测试 —— 守护 P1-1 修复（2026-09-27）
 *
 * 背景：POST /api/equipment/repair 此前零校验，9 字段全 `|| null` 直接 INSERT，
 *       空设备/空故障描述/空维修人的维修单可落库。
 * 修复后：设备编码/名称至少一项非空、故障日期必填、故障描述必填、维修人必填。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(async () => [[]]),
  execute: vi.fn(async () => [{ affectedRows: 1, insertId: 1 }]),
  generateDocNo: vi.fn(() => 'WX20260927001'),
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
  getWxPrefix: vi.fn(() => 'WX'),
  generateDocNo: mocks.generateDocNo,
}));

import { POST } from '@/app/api/equipment/repair/route';

function makePost(body: Record<string, unknown>) {
  return new Request('http://localhost/api/equipment/repair', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    equipment_id: null,
    equipment_code: 'EQ-001',
    equipment_name: '印刷机一号',
    fault_date: '2026-09-27',
    fault_desc: '送纸机构卡纸',
    repair_type: 'corrective',
    repair_person: '张三',
    remark: '',
    ...overrides,
  };
}

describe('POST /api/equipment/repair - 维修单创建硬校验（P1-1）', () => {
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

  it('故障日期为空：400 请选择故障日期', async () => {
    const res = await POST(makePost(validBody({ fault_date: '' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('repairFaultDateRequired');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('故障描述为空：400 请填写故障描述', async () => {
    const res = await POST(makePost(validBody({ fault_desc: '' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('repairFaultDescRequired');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('故障描述为纯空白：400', async () => {
    const res = await POST(makePost(validBody({ fault_desc: '   ' })));
    expect(res.status).toBe(400);
  });

  it('维修人为空：400 请选择维修人', async () => {
    const res = await POST(makePost(validBody({ repair_person: '' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('repairPersonRequired');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('合法单：200 创建成功，INSERT 参数含单号与设备信息', async () => {
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const args = (mocks.execute.mock.calls[0] as unknown[])[1] as unknown[];
    expect(args[0]).toBe('WX20260927001'); // repair_no
    expect(args[2]).toBe('EQ-001'); // equipment_code
    expect(args[4]).toBe('2026-09-27'); // fault_date
    expect(args[5]).toBe('送纸机构卡纸'); // fault_desc
  });
});
