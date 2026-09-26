/**
 * 领料单路由契约回归测试 —— 守护 P0 契约断裂修复
 *
 * 背景（2026-09-26 表单验证清单 P0-1）：
 *   旧版 POST 不识别前端 {action:'auto-generate'|'over-issue'|'supplementary'}，
 *   且要求 warehouseId → 页面 3 个按钮必 400；
 *   旧版 PUT 只认 {action:'issue'|'cancel'}，前端审批 {id,status:1|3} 落入未知分支也 400；
 *   旧版 POST 写遗留表 prd_material_issue，而 GET 读 material_requisitions → 新建单列表不可见。
 *
 * 修复后契约（与 src/app/[locale]/material-requisitions/page.tsx 对齐）：
 *   POST {action:'auto-generate', workOrderId}                → autoGenerateRequisition
 *   POST {action:'over-issue', workOrderId, materialId, quantity, reason}
 *                                                             → submitOverRequisition
 *   POST {action:'supplementary', originalRequisitionId, materialId, quantity, reason}
 *                                                             → submitSupplementaryRequisition
 *   PUT  {id, status:1|3}                                     → approveRequisition
 *   任何路径都不得再写 prd_material_issue。
 *
 * 本测试用 mock 驱动路由 handler（不连真实库），领域函数全部 mock，只验证「路由接线契约」。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
  autoGenerateRequisition: vi.fn(),
  submitOverRequisition: vi.fn(),
  submitSupplementaryRequisition: vi.fn(),
  approveRequisition: vi.fn(),
  issueMaterial: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
  queryOne: mocks.queryOne,
  transaction: mocks.transaction,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock('@/lib/api-permissions', () => ({
  withPermission:
    (
      handler: (
        request: Request,
        userInfo: { userId: number; realName: string; username: string },
        ctx?: unknown
      ) => Promise<Response>
    ) =>
    async (request: Request, ctx?: unknown): Promise<Response> =>
      handler(
        request,
        { userId: 1, realName: '管理员', username: 'admin' },
        ctx
      ),
}));

vi.mock('@/lib/global-config', () => ({
  getMrPrefix: vi.fn(() => 'MR'),
  generateDocNo: vi.fn((prefix: string) => `${prefix}20260926001`),
  getConfig: vi.fn(),
}));

vi.mock('@/lib/category-validation', () => ({
  checkMaterialsCategorized: vi.fn(async () => ({ blocked: false, uncategorized: [] })),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

vi.mock('@/lib/material-requisition', () => ({
  autoGenerateRequisition: mocks.autoGenerateRequisition,
  submitOverRequisition: mocks.submitOverRequisition,
  submitSupplementaryRequisition: mocks.submitSupplementaryRequisition,
  approveRequisition: mocks.approveRequisition,
  issueMaterial: mocks.issueMaterial,
}));

import { POST, PUT } from '@/app/api/material-requisitions/route';

function makePost(body: Record<string, unknown>) {
  return new Request('http://localhost/api/material-requisitions', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;
}

function makePut(body: Record<string, unknown>) {
  return new Request('http://localhost/api/material-requisitions', {
    method: 'PUT',
    body: JSON.stringify(body),
  }) as never;
}

describe('POST /api/material-requisitions - action 分发契约', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('action=auto-generate：调用 autoGenerateRequisition(workOrderId, userId, 姓名)，透传单号', async () => {
    mocks.autoGenerateRequisition.mockResolvedValueOnce({
      success: true,
      requisitionId: 11,
      requisitionNo: 'MR20260926001',
      message: '领料单生成成功: MR20260926001',
    });

    const res = await POST(makePost({ action: 'auto-generate', workOrderId: 77 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.requisition_no).toBe('MR20260926001');
    expect(mocks.autoGenerateRequisition).toHaveBeenCalledWith(77, 1, '管理员');
    // 契约守护：不得再写遗留表 prd_material_issue
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('action=auto-generate 领域失败：透传 400 与原因', async () => {
    mocks.autoGenerateRequisition.mockResolvedValueOnce({
      success: false,
      message: '未找到BOM信息，无法生成领料单',
    });

    const res = await POST(makePost({ action: 'auto-generate', workOrderId: 1 }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toContain('BOM');
  });

  it('action=auto-generate 缺 workOrderId：400，不触达领域函数', async () => {
    const res = await POST(makePost({ action: 'auto-generate' }));

    expect(res.status).toBe(400);
    expect(mocks.autoGenerateRequisition).not.toHaveBeenCalled();
  });

  it('action=over-issue：调用 submitOverRequisition(workOrderId, materialId, quantity, reason, …)', async () => {
    mocks.submitOverRequisition.mockResolvedValueOnce({
      success: true,
      requisitionId: 12,
      message: '超领申请已提交，等待审批',
    });

    const res = await POST(
      makePost({
        action: 'over-issue',
        workOrderId: 7,
        materialId: 88,
        quantity: 5,
        reason: '工序损耗',
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.submitOverRequisition).toHaveBeenCalledWith(7, 88, 5, '工序损耗', 1, '管理员');
  });

  it('action=over-issue quantity=0/-5：400 数量必须大于0，不触达领域函数', async () => {
    for (const q of [0, -5]) {
      const res = await POST(
        makePost({ action: 'over-issue', workOrderId: 7, materialId: 88, quantity: q, reason: 'x' })
      );
      expect(res.status).toBe(400);
    }
    expect(mocks.submitOverRequisition).not.toHaveBeenCalled();
  });

  it('action=supplementary：调用 submitSupplementaryRequisition(originalRequisitionId, …)', async () => {
    mocks.submitSupplementaryRequisition.mockResolvedValueOnce({
      success: true,
      requisitionId: 13,
      message: '补料单已生成',
    });

    const res = await POST(
      makePost({
        action: 'supplementary',
        originalRequisitionId: 9,
        materialId: 66,
        quantity: 3,
        reason: '破损补料',
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.submitSupplementaryRequisition).toHaveBeenCalledWith(9, 66, 3, '破损补料', 1, '管理员');
  });

  it('未知/缺失 action：400（旧契约的裸 workOrderId+warehouseId 不再写遗留表）', async () => {
    const res = await POST(
      makePost({ workOrderId: 7, warehouseId: 1, items: [{ materialId: 1, quantity: 1 }] })
    );

    expect(res.status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

describe('PUT /api/material-requisitions - 审批契约', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('{id, status:1}：审批通过 approveRequisition(id, true, userId, 姓名)', async () => {
    mocks.approveRequisition.mockResolvedValueOnce({ success: true, message: '审批通过' });

    const res = await PUT(makePut({ id: 9, status: 1 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.approveRequisition).toHaveBeenCalledWith(9, true, 1, '管理员');
  });

  it('{id, status:3}：驳回 approveRequisition(id, false, …)', async () => {
    mocks.approveRequisition.mockResolvedValueOnce({ success: true, message: '审批已驳回' });

    const res = await PUT(makePut({ id: 9, status: 3 }));

    expect(res.status).toBe(200);
    expect(mocks.approveRequisition).toHaveBeenCalledWith(9, false, 1, '管理员');
  });

  it('status 越界（如 2）：400 无效状态，不触达领域函数', async () => {
    const res = await PUT(makePut({ id: 9, status: 2 }));

    expect(res.status).toBe(400);
    expect(mocks.approveRequisition).not.toHaveBeenCalled();
  });

  it('缺 id：400', async () => {
    const res = await PUT(makePut({ status: 1 }));

    expect(res.status).toBe(400);
    expect(mocks.approveRequisition).not.toHaveBeenCalled();
  });
});
