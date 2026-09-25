/**
 * 集成测试：销售退货 申请 → 审批 → 入库（退货入库单）→ 红字应收 链路
 *
 * 覆盖任务书 P1-3「销售退货：申请→审批→入库→退款」链路。
 *
 * 测试策略：
 * - 领域层：直接驱动 ReturnOrder 聚合真实代码，验证状态机与业务规则（无 DB 依赖）
 * - 应用层：mock 三个 repository + @/lib/db，验证 approveReturn / completeReturn 编排
 *   （退货入库单、红字应收单的创建与回写）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server-translate', () => ({
  t: (key: string) => key,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

const mockOutbox = { saveEvents: vi.fn().mockResolvedValue(undefined) };
vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: () => mockOutbox,
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn(async () => []),
  execute: vi.fn(async () => ({ insertId: 1, affectedRows: 1 })),
  transaction: vi.fn((fn: (conn: unknown) => unknown) => fn({})),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/document-numbering', () => ({
  generateDocumentNo: vi.fn(async (type: string) => `DOC-${type}-001`),
}));

import { ReturnOrder } from '@/domain/sales/aggregates/ReturnOrder';
import { ReturnOrderStatus } from '@/domain/sales/value-objects/ReturnOrderStatus';
import { ReturnOrderApplicationService } from '@/application/services/ReturnOrderApplicationService';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { query } from '@/lib/db';

/** 构造一条退货单（默认待审核态） */
function mkReturn(overrides: Record<string, unknown> = {}) {
  return ReturnOrder.create({
    id: 4,
    returnNo: 'SR-2026-001',
    orderId: 151,
    orderNo: 'SO202609260004',
    customerId: 61,
    customerName: '美的集团',
    warehouseId: 1,
    reason: '质量问题',
    returnDate: '2026-09-26',
    currency: 'CNY',
    ...overrides,
    lines: (overrides.lines as never) ?? [
      {
        lineNo: 1,
        materialId: 11,
        materialCode: 'MAT001',
        materialName: 'PET薄膜',
        unit: 'kg',
        quantity: 10,
        unitPrice: 50,
      },
      {
        lineNo: 2,
        materialId: 12,
        materialCode: 'MAT002',
        materialName: 'PC片材',
        unit: 'kg',
        quantity: 5,
        unitPrice: 40,
      },
    ],
  });
}

describe('销售退货：领域状态机与业务规则', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('状态值域：1-待审核 2-已审核 3-已完成 9-已取消', () => {
    expect(ReturnOrderStatusEnumValues()).toEqual([1, 2, 3, 9]);
    expect(ReturnOrderStatus.from(1).label).toBe('待审核');
    expect(ReturnOrderStatus.from(2).label).toBe('已审核');
    expect(ReturnOrderStatus.from(3).label).toBe('已完成');
    expect(ReturnOrderStatus.from(9).label).toBe('已取消');
    // 越界状态（库内历史脏数据出现过的 0）必须被拒绝，避免静默流转
    expect(() => ReturnOrderStatus.from(0)).toThrow(DomainError);
  });

  it('创建：金额按明细行汇总，初始状态为 1（待审核）', () => {
    const ret = mkReturn();
    expect(ret.status.value).toBe(1);
    expect(ret.totalAmount).toBe(10 * 50 + 5 * 40); // 700
    expect(ret.lines).toHaveLength(2);
  });

  it('创建：缺少订单/客户/仓库/明细/原因，抛 DomainError', () => {
    expect(() => mkReturn({ orderId: 0 })).toThrow(DomainError);
    expect(() => mkReturn({ customerId: 0 })).toThrow(DomainError);
    expect(() => mkReturn({ warehouseId: 0 })).toThrow(DomainError);
    expect(() => mkReturn({ lines: [] })).toThrow(DomainError);
    expect(() => mkReturn({ reason: '  ' })).toThrow(DomainError);
  });

  it('审批：1 → 2，记录审批人与审批时间，并发布审批事件', () => {
    const ret = mkReturn();
    ret.approve(9);
    expect(ret.status.value).toBe(2);
    expect(ret.approveBy).toBe(9);
    expect(ret.approveTime).toBeTruthy();
    expect(ret.getDomainEvents().some((e) => e.eventType === 'return_order.approved')).toBe(true);
  });

  it('审批：审批人非法或重复审批，抛 DomainError', () => {
    const ret = mkReturn();
    expect(() => ret.approve(0)).toThrow(DomainError);
    ret.approve(9);
    expect(() => ret.approve(10)).toThrow(DomainError); // 已审核不可再审批
  });

  it('完成：2 → 3，绑定退货入库单与红字应收单', () => {
    const ret = mkReturn();
    ret.approve(9);
    ret.complete(
      9,
      () => ({ inboundOrderId: 321, inboundOrderNo: 'IN-RET-001' }),
      () => ({ receivableId: 555, receivableNo: 'AR-RED-001' })
    );
    expect(ret.status.value).toBe(3);
    expect(ret.inboundOrderId).toBe(321);
    expect(ret.inboundOrderNo).toBe('IN-RET-001');
    expect(ret.receivableId).toBe(555);
    expect(ret.receivableNo).toBe('AR-RED-001');
    expect(ret.getDomainEvents().some((e) => e.eventType === 'return_order.completed')).toBe(true);
  });

  it('完成：未审批（1）直接完成，抛 DomainError', () => {
    const ret = mkReturn();
    expect(() =>
      ret.complete(
        9,
        () => ({ inboundOrderId: 1, inboundOrderNo: 'x' }),
        () => ({ receivableId: 1, receivableNo: 'y' })
      )
    ).toThrow(DomainError);
  });

  it('完成：回调未返回入库单/应收单，抛 DomainError（不允许半成品完成）', () => {
    const ret = mkReturn();
    ret.approve(9);
    expect(() =>
      ret.complete(
        9,
        () => ({ inboundOrderId: 0, inboundOrderNo: '' }),
        () => ({ receivableId: 1, receivableNo: 'y' })
      )
    ).toThrow(DomainError);
  });

  it('取消：待审核/已审核可取消（→9）；已完成为终态不可取消', () => {
    const r1 = mkReturn();
    r1.cancel('客户撤销');
    expect(r1.status.value).toBe(9);

    const r2 = mkReturn();
    r2.approve(9);
    r2.cancel();
    expect(r2.status.value).toBe(9);

    const r3 = mkReturn();
    r3.approve(9);
    r3.complete(
      9,
      () => ({ inboundOrderId: 1, inboundOrderNo: 'a' }),
      () => ({ receivableId: 1, receivableNo: 'b' })
    );
    expect(() => r3.cancel()).toThrow(DomainError);
    expect(r3.status.isTerminal()).toBe(true);
  });

  it('可编辑/可删除仅待审核态（1）', () => {
    const ret = mkReturn();
    expect(ret.canEdit()).toBe(true);
    expect(ret.canDelete()).toBe(true);
    ret.approve(9);
    expect(ret.canEdit()).toBe(false);
    expect(ret.canDelete()).toBe(false);
  });

  it('审批校验：退货数量不得超过已发货量（同物料多行累加）', () => {
    const ret = mkReturn({
      lines: [
        {
          lineNo: 1,
          materialId: 11,
          materialCode: 'MAT001',
          materialName: 'PET薄膜',
          unit: 'kg',
          quantity: 12,
          unitPrice: 50,
        },
      ],
    });

    // 可退 10 → 退 12 不合法
    expect(() => ret.validateAgainstShippedQuantities(new Map([[11, 10]]))).toThrow(/超出可退数量/);

    // 可退 10 → 退 10 合法
    const okRet = mkReturn({
      lines: [
        {
          lineNo: 1,
          materialId: 11,
          materialCode: 'MAT001',
          materialName: 'PET薄膜',
          unit: 'kg',
          quantity: 10,
          unitPrice: 50,
        },
      ],
    });
    expect(() => okRet.validateAgainstShippedQuantities(new Map([[11, 10]]))).not.toThrow();
  });

  it('审批校验：扣除已退数量后可退额度下降', () => {
    const ret = mkReturn({
      lines: [
        {
          lineNo: 1,
          materialId: 11,
          materialCode: 'MAT001',
          materialName: 'PET薄膜',
          unit: 'kg',
          quantity: 4,
          unitPrice: 50,
        },
      ],
    });
    // 已发 10、已退 8 → 可退 2，退 4 超限
    expect(() => ret.validateAgainstShippedQuantities(new Map([[11, 10]]), new Map([[11, 8]]))).toThrow(
      /超出可退数量/
    );
    // 已退 6 → 可退 4，退 4 合法
    expect(() =>
      ret.validateAgainstShippedQuantities(new Map([[11, 10]]), new Map([[11, 6]]))
    ).not.toThrow();
  });

  it('审批校验：销售单无明细（shipped=0）时任何退货均非法', () => {
    const ret = mkReturn();
    expect(() => ret.validateAgainstShippedQuantities(new Map())).toThrow(/超出可退数量/);
  });
});

describe('销售退货：应用服务编排（审批 / 完成）', () => {
  const inboundRepo = { save: vi.fn(async () => ({ id: 321, orderNo: 'IN-RET-001' })) } as never;
  const receivableRepo = { save: vi.fn(async () => 555) } as never;
  const orderRepo = { findById: vi.fn(async () => null) } as never;
  const currencyService = {
    convert: vi.fn(async (m: { amount: number }) => m),
  } as never;

  let returnRepo: { findById: ReturnType<typeof vi.fn>; updateApproval: ReturnType<typeof vi.fn>; updateCompletion: ReturnType<typeof vi.fn>; updateStatus: ReturnType<typeof vi.fn>; softDelete: ReturnType<typeof vi.fn> };
  let service: ReturnOrderApplicationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOutbox.saveEvents.mockResolvedValue(undefined);
    returnRepo = {
      findById: vi.fn(),
      updateApproval: vi.fn(),
      updateCompletion: vi.fn(),
      updateStatus: vi.fn(),
      softDelete: vi.fn(),
    };
    service = new ReturnOrderApplicationService(
      returnRepo as never,
      inboundRepo,
      receivableRepo,
      orderRepo,
      currencyService
    );
  });

  it('审批：校验数量不超已发货 → 落库审批信息 → 发布事件', async () => {
    returnRepo.findById.mockResolvedValue(mkReturn());
    // sal_order_detail 聚合：物料 11 已发 10、物料 12 已发 5
    vi.mocked(query).mockResolvedValue([
      { material_id: 11, delivered_qty: '10' },
      { material_id: 12, delivered_qty: '5' },
    ] as never);

    const res = await service.approveReturn(4, 9);
    expect(res.status).toBe(2);
    expect(returnRepo.updateApproval).toHaveBeenCalledTimes(1);
    const [id, status, approveBy] = returnRepo.updateApproval.mock.calls[0] as [number, number, number];
    expect(id).toBe(4);
    expect(status).toBe(2);
    expect(approveBy).toBe(9);
    expect(mockOutbox.saveEvents).toHaveBeenCalled();
  });

  it('审批：退货量超出已发货量时拒绝，且不落库', async () => {
    returnRepo.findById.mockResolvedValue(mkReturn());
    vi.mocked(query).mockResolvedValue([
      { material_id: 11, delivered_qty: '2' }, // 只发 2，却退 10
      { material_id: 12, delivered_qty: '5' },
    ] as never);

    await expect(service.approveReturn(4, 9)).rejects.toThrow(/超出可退数量/);
    expect(returnRepo.updateApproval).not.toHaveBeenCalled();
  });

  it('审批：销售单无明细时拒绝（无发货记录）', async () => {
    returnRepo.findById.mockResolvedValue(mkReturn());
    vi.mocked(query).mockResolvedValue([] as never);
    await expect(service.approveReturn(4, 9)).rejects.toThrow(/超出可退数量/);
  });

  it('完成：创建退货入库单 + 红字应收单，回写单号与状态 3', async () => {
    const ret = mkReturn();
    ret.approve(9);
    returnRepo.findById.mockResolvedValue(ret);

    const res = await service.completeReturn(4, 9);

    expect(res.status).toBe(3);
    expect(res.inboundOrderId).toBe(321);
    expect(res.receivableId).toBe(555);
    expect(returnRepo.updateCompletion).toHaveBeenCalledTimes(1);
    const args = returnRepo.updateCompletion.mock.calls[0] as unknown[];
    expect(args[0]).toBe(4);
    expect(args[1]).toBe(3); // status
    expect(args[4]).toBeTruthy(); // inbound_order_no
    expect(args[6]).toBeTruthy(); // receivable_no
  });

  it('完成：未审批退货单不允许完成', async () => {
    returnRepo.findById.mockResolvedValue(mkReturn());
    await expect(service.completeReturn(4, 9)).rejects.toThrow(DomainError);
    expect(returnRepo.updateCompletion).not.toHaveBeenCalled();
  });

  it('取消：落库状态 9', async () => {
    returnRepo.findById.mockResolvedValue(mkReturn());
    const res = await service.cancelReturn(4, '客户撤销');
    expect(res.status).toBe(9);
    expect(returnRepo.updateStatus).toHaveBeenCalledWith(4, 9);
  });

  it('单据不存在：抛 NotFoundError（路由映射为 400，非 500）', async () => {
    returnRepo.findById.mockResolvedValue(null);
    await expect(service.approveReturn(999, 9)).rejects.toThrow(NotFoundError);
  });

  it('删除：仅待审核可删，已审核拒绝', async () => {
    returnRepo.findById.mockResolvedValue(mkReturn());
    await service.deleteReturn(4);
    expect(returnRepo.softDelete).toHaveBeenCalledWith(4);

    const approved = mkReturn();
    approved.approve(9);
    returnRepo.findById.mockResolvedValue(approved);
    await expect(service.deleteReturn(4)).rejects.toThrow(DomainError);
  });
});

/** 取状态值域用于断言（领域层未导出枚举数组，此处从合法构造反推） */
function ReturnOrderStatusEnumValues(): number[] {
  return [1, 2, 3, 9].filter((v) => {
    try {
      return ReturnOrderStatus.from(v as 1 | 2 | 3 | 9).value === v;
    } catch {
      return false;
    }
  });
}
