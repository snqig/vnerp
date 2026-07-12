/**
 * SampleProcessCardService — 打样工艺卡全链路单元测试
 *
 * 覆盖全流程：
 *   createCard → submitCard → confirmCard → generateQuote → convertToFormalWorkOrder → getCostVariance
 *   以及 duplicateVersion、cancelCard、状态校验异常分支
 *
 * Mock 策略：
 *   - @/lib/db: query/execute/transaction + mockConn.execute
 *   - @/lib/logger: logger.info/warn/error + secureLog
 *   - @/infrastructure/event-bus/DomainEventOutboxFactory: getDomainEventOutbox
 *   - @/domain/sample-card/events/SampleCardEvents: 事件类构造函数
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = { execute: vi.fn() };
  const mockOutbox = { saveEvents: vi.fn().mockResolvedValue(undefined) };
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    stepStart: vi.fn(),
    stepEnd: vi.fn(),
    branch: vi.fn(),
    db: vi.fn(),
    permission: vi.fn(),
  };
  return {
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    secureLog: vi.fn(),
    logger: mockLogger,
    getDomainEventOutbox: vi.fn(() => mockOutbox),
    mockOutbox,
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
  transaction: mocks.transaction,
}));
vi.mock('@/lib/logger', () => ({
  secureLog: mocks.secureLog,
  logger: mocks.logger,
}));
vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: mocks.getDomainEventOutbox,
}));
vi.mock('@/domain/sample-card/events/SampleCardEvents', () => ({
  SampleCardQuoteGeneratedEvent: vi.fn(function (this: unknown, data: unknown) {
    (this as { type: string; data: unknown }).type = 'SampleCardQuoteGenerated';
    (this as { type: string; data: unknown }).data = data;
  }),
  SampleCardConvertedToWorkOrderEvent: vi.fn(function (this: unknown, data: unknown) {
    (this as { type: string; data: unknown }).type = 'SampleCardConvertedToWorkOrder';
    (this as { type: string; data: unknown }).data = data;
  }),
}));

import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';
import type { SampleProcessCardInput } from '@/lib/validators/sample-card.schema';

// ===== Mock 数据工厂 =====

function mockSelectReturn(rows: unknown[]) {
  return [rows, []];
}
function mockExecReturn(overrides: Record<string, unknown> = {}) {
  return [{ affectedRows: 1, insertId: 0, ...overrides }, []];
}

/** 工艺卡行（模拟数据库返回） */
function makeCardRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    sample_no: 'SP2026071000001',
    sample_name: '测试工艺卡',
    customer_id: 100,
    customer_name: '测试客户',
    product_id: 200,
    product_name: '测试产品',
    version_no: 'V1.0',
    status: 1,
    substrate_material_id: 10,
    substrate_material_name: 'PET薄膜',
    spec: '100x50mm',
    print_color: '红+蓝',
    ink_color_id: 5,
    screen_plate_id: 20,
    die_tool_id: 10,
    material_loss_rate: 5,
    estimated_hour: 2.5,
    total_material_cost: 1200,
    total_labor_cost: 400,
    total_tool_cost: 50,
    total_cost: 1650,
    sample_work_order_id: null,
    sample_work_order_no: null,
    quote_id: null,
    formal_work_order_id: null,
    source_version_id: null,
    confirm_by: null,
    confirm_time: null,
    diagram_url: null,
    remark: null,
    create_by: 1,
    create_time: '2026-07-10 00:00:00',
    update_by: null,
    update_time: '2026-07-10 00:00:00',
    deleted: 0,
    ...overrides,
  };
}

/** 物料明细行 */
function makeItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    card_id: 1,
    item_type: 1,
    material_id: 10,
    material_code: 'MAT-001',
    material_name: 'PET薄膜',
    specification: '100x50mm',
    unit_dosage: 0.5,
    unit: 'kg',
    unit_cost: 100,
    line_cost: 50,
    remark: null,
    sort: 1,
    ...overrides,
  };
}

/** 工序明细行 */
function makeStepRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    card_id: 1,
    process_id: 3,
    process_name: '丝网印刷',
    work_hour: 2,
    hourly_rate: 80,
    line_cost: 160,
    process_param: '温度80℃',
    sort: 1,
    ...overrides,
  };
}

/** 创建工艺卡输入数据 */
function makeCardInput(overrides: Partial<SampleProcessCardInput> = {}): SampleProcessCardInput {
  return {
    sample_name: '测试工艺卡',
    customer_id: 100,
    customer_name: '测试客户',
    product_id: 200,
    product_name: '测试产品',
    version_no: 'V1.0',
    substrate_material_id: 10,
    substrate_material_name: 'PET薄膜',
    spec: '100x50mm',
    print_color: '红+蓝',
    ink_color_id: 5,
    screen_plate_id: 20,
    die_tool_id: 10,
    material_loss_rate: 5,
    estimated_hour: 2.5,
    items: [
      {
        item_type: 1,
        material_id: 10,
        material_code: 'MAT-001',
        material_name: 'PET薄膜',
        specification: '100x50mm',
        unit_dosage: 0.5,
        unit: 'kg',
        unit_cost: 100,
        line_cost: 50,
      },
    ],
    steps: [
      {
        process_id: 3,
        process_name: '丝网印刷',
        work_hour: 2,
        hourly_rate: 80,
        line_cost: 160,
        process_param: '温度80℃',
      },
    ],
    ...overrides,
  } as SampleProcessCardInput;
}

// ===== 每次测试前重置 mocks =====
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
  mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
});

// ============================================================
// 1. createCard — 创建工艺卡
// ============================================================
describe('SampleProcessCardService.createCard', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正常创建：生成编号、计算成本、写入主表+明细', async () => {
    // query 调用序列：generateSampleNo(1) + fetchToolCosts(1)
    mocks.query
      .mockResolvedValueOnce([]) // generateSampleNo — 无已有编号
      .mockResolvedValueOnce([{ total: 0.1 }]); // fetchToolCosts

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 1 })) // INSERT card
      .mockResolvedValueOnce(mockExecReturn()) // INSERT item
      .mockResolvedValueOnce(mockExecReturn()); // INSERT step

    const input = makeCardInput();
    const cardId = await service.createCard(input, 1);

    expect(cardId).toBe(1);
    // 3 conn.execute: INSERT card, INSERT item, INSERT step
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(3);

    // 验证 INSERT card 的参数包含成本
    // VALUES 有 25 个占位符，但 status=1 是硬编码不占参数位
    // [0..6]=基础字段 [7..15]=物料/工装 [16..19]=四项成本 [20..22]=diagram/remark/create_by
    const cardInsertParams = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    // total_material_cost = 0.5 * 100 * 1.05 = 52.5
    expect(cardInsertParams[16]).toBe(52.5);
    // total_labor_cost = 2 * 80 = 160
    expect(cardInsertParams[17]).toBe(160);
    // total_cost = 52.5 + 160 + toolCost(0.1 rounded)
    expect(cardInsertParams[19]).toBe(52.5 + 160 + 0.1);

    // logger.info 应输出成本计算和创建完成
    expect(mocks.logger.info).toHaveBeenCalled();
  });

  it('已有 sample_no 时不重新生成编号', async () => {
    mocks.query.mockResolvedValueOnce([{ total: 0 }]); // fetchToolCosts only
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 5 }))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    const input = makeCardInput({ sample_no: 'CUSTOM-001' });
    const cardId = await service.createCard(input, 1);

    expect(cardId).toBe(5);
    // 第一个 INSERT 参数应为自定义编号
    const cardInsertParams = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    expect(cardInsertParams[0]).toBe('CUSTOM-001');
  });

  it('logger.error 在异常时输出 phase 信息', async () => {
    mocks.query.mockResolvedValueOnce([]); // generateSampleNo
    mocks.query.mockResolvedValueOnce([{ total: 0 }]); // fetchToolCosts
    mocks.mockConn.execute.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(service.createCard(makeCardInput(), 1)).rejects.toThrow('DB connection lost');

    // logger.error(ctx, 'createCard 失败 [phase=insert_card]', { error, sampleNo })
    // phase 在消息字符串中，error 在数据对象中
    const errorCall = mocks.logger.error.mock.calls[0];
    expect(errorCall[0]).toMatchObject({ module: 'sample-card', action: 'createCard' });
    expect(errorCall[1] as string).toContain('createCard 失败');
    expect(errorCall[1] as string).toContain('phase=insert_card');
    expect(errorCall[2]).toMatchObject({ error: 'DB connection lost' });
  });
});

// ============================================================
// 2. submitCard — 提交工艺卡（草稿→打样中）+ 生成打样工单
// ============================================================
describe('SampleProcessCardService.submitCard', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正常提交：状态 1→2，生成打样工单并回写', async () => {
    const card = makeCardRow({ status: 1 });
    // getCardDetail: 3 queries (card, items, steps)
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()]);

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE card status
      .mockResolvedValueOnce(mockExecReturn({ insertId: 500 })) // INSERT work order
      .mockResolvedValueOnce(mockExecReturn()); // UPDATE card work_order_id

    const result = await service.submitCard(1, 1);

    expect(result.workOrderId).toBe(500);
    expect(result.workOrderNo).toMatch(/^SWO\d{8}00001$/);

    // 3 conn.execute calls
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(3);

    // logger.info should log work order generation
    const infoMessages = mocks.logger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('准备生成打样工单');
    expect(infoMessages).toContain('打样工单已生成');
  });

  it('工艺卡不存在时抛出错误', async () => {
    mocks.query.mockResolvedValueOnce([]); // card not found

    await expect(service.submitCard(999, 1)).rejects.toThrow('工艺卡不存在');
    expect(mocks.logger.warn).toHaveBeenCalled();
  });

  it('状态非草稿时抛出错误', async () => {
    const card = makeCardRow({ status: 2 });
    mocks.query.mockResolvedValueOnce([card]);

    await expect(service.submitCard(1, 1)).rejects.toThrow('仅草稿状态可提交');
  });
});

// ============================================================
// 3. confirmCard — 确认工艺卡（打样中→已确认）
// ============================================================
describe('SampleProcessCardService.confirmCard', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正常确认：状态 2→3', async () => {
    mocks.query.mockResolvedValueOnce([{ status: 2 }]);
    mocks.execute.mockResolvedValueOnce(mockExecReturn());

    await service.confirmCard(1, 1);

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const updateParams = mocks.execute.mock.calls[0][1] as unknown[];
    // params: confirm_by, update_by, id
    expect(updateParams[0]).toBe(1); // confirm_by
    expect(updateParams[1]).toBe(1); // update_by
    expect(updateParams[2]).toBe(1); // id

    const infoMessages = mocks.logger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('工艺卡已确认');
  });

  it('工艺卡不存在时抛出错误', async () => {
    mocks.query.mockResolvedValueOnce([]);

    await expect(service.confirmCard(999, 1)).rejects.toThrow('工艺卡不存在');
  });

  it('状态非打样中时抛出错误', async () => {
    mocks.query.mockResolvedValueOnce([{ status: 1 }]);

    await expect(service.confirmCard(1, 1)).rejects.toThrow('仅打样中状态可确认');
  });
});

// ============================================================
// 4. cancelCard — 作废工艺卡
// ============================================================
describe('SampleProcessCardService.cancelCard', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正常作废：任意非已作废状态 → 4', async () => {
    mocks.query.mockResolvedValueOnce([{ status: 3 }]);
    mocks.execute.mockResolvedValueOnce(mockExecReturn());

    await service.cancelCard(1, 1);

    const updateParams = mocks.execute.mock.calls[0][1] as unknown[];
    expect(updateParams[0]).toBe(1); // update_by
    expect(updateParams[1]).toBe(1); // id

    const infoMessages = mocks.logger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('工艺卡已作废');
  });

  it('已作废状态重复操作时抛出错误', async () => {
    mocks.query.mockResolvedValueOnce([{ status: 4 }]);

    await expect(service.cancelCard(1, 1)).rejects.toThrow('已作废的工艺卡不可重复操作');
  });
});

// ============================================================
// 5. generateQuote — 一键生成报价单（已确认 → 报价单）
// ============================================================
describe('SampleProcessCardService.generateQuote', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正常生成报价：成本×加价率×数量 = 报价', async () => {
    const card = makeCardRow({
      status: 3,
      total_material_cost: 1200,
      total_labor_cost: 400,
      total_tool_cost: 50,
      total_cost: 1650,
    });
    // getCardDetail: 3 queries
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()])
      // generateQuoteNo
      .mockResolvedValueOnce([]);

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 300 })) // INSERT sal_quote
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE card quote_id
      .mockResolvedValue(undefined); // saveEvents etc.

    const result = await service.generateQuote(
      1,
      { markupRate: 30, quantity: 2 },
      1
    );

    expect(result.quoteId).toBe(300);
    expect(result.quoteNo).toMatch(/^QT\d{8}00001$/);
    // quotedPrice = 1650 * (1 + 30/100) * 2 = 1650 * 1.3 * 2 = 4290
    expect(result.quotedPrice).toBe(4290);

    // INSERT sal_quote params
    // VALUES: ?, CURDATE(), ?, ?, ?, ?, ?, ?, 'pcs', ?, ?, ?, ?, ?, ?, 'CNY', 1, ?, ?, ?, NOW()
    // 硬编码位：CURDATE()/'pcs'/'CNY'/1/NOW() 不占参数位
    const quoteParams = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    expect(quoteParams[0]).toMatch(/^QT/); // quote_no
    expect(quoteParams[1]).toBe(100); // customer_id
    expect(quoteParams[6]).toBe(2); // quantity
    expect(quoteParams[12]).toBe(4290); // quoted_price

    // saveEvents called
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalled();
  });

  it('工艺卡状态非已确认时抛出错误', async () => {
    const card = makeCardRow({ status: 2 });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      service.generateQuote(1, { markupRate: 30 }, 1)
    ).rejects.toThrow('仅已确认状态可生成报价');
  });

  it('已生成过报价单时抛出错误', async () => {
    const card = makeCardRow({ status: 3, quote_id: 200 });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      service.generateQuote(1, { markupRate: 30 }, 1)
    ).rejects.toThrow('该工艺卡已生成过报价单，不可重复生成');
  });

  it('工艺卡不存在时抛出错误', async () => {
    mocks.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      service.generateQuote(999, { markupRate: 30 }, 1)
    ).rejects.toThrow('工艺卡不存在');
  });

  it('使用默认 markupRate=30 和 quantity=1', async () => {
    const card = makeCardRow({ status: 3, total_cost: 1000 });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 1 }))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValue(undefined);

    const result = await service.generateQuote(1, {}, 1);

    // quotedPrice = 1000 * 1.3 * 1 = 1300
    expect(result.quotedPrice).toBe(1300);
  });
});

// ============================================================
// 6. convertToFormalWorkOrder — 转正式生产工单（已确认 → BOM/工艺）
// ============================================================
describe('SampleProcessCardService.convertToFormalWorkOrder', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正常转换：生成正式工单 + BOM 明细 + 回写', async () => {
    const card = makeCardRow({ status: 3, total_cost: 1650 });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()])
      .mockResolvedValueOnce([]); // generateFormalWorkOrderNo

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 700 })) // INSERT work_order
      .mockResolvedValueOnce(mockExecReturn()) // INSERT BOM item
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE card formal_work_order_id
      .mockResolvedValue(undefined);

    const result = await service.convertToFormalWorkOrder(
      1,
      { planQty: 1000 },
      1
    );

    expect(result.workOrderId).toBe(700);
    expect(result.workOrderNo).toMatch(/^PWO\d{8}00001$/);

    // 3 conn.execute: INSERT work_order, INSERT BOM, UPDATE card
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(3);

    // BOM item: quantity = unit_dosage * planQty = 0.5 * 1000 = 500
    const bomParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(bomParams[0]).toBe(700); // work_order_id
    expect(bomParams[1]).toBe(1); // line_no
    expect(bomParams[2]).toBe(10); // material_id
    expect(bomParams[4]).toBe(500); // quantity
    expect(bomParams[6]).toBe(100); // unit_price
    // total_price = 500 * 100 = 50000
    expect(bomParams[7]).toBe(50000);

    // saveEvents called
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalled();
  });

  it('工艺卡状态非已确认时抛出错误', async () => {
    const card = makeCardRow({ status: 2 });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      service.convertToFormalWorkOrder(1, {}, 1)
    ).rejects.toThrow('仅已确认状态可转正式工单');
  });

  it('已转过正式工单时抛出错误', async () => {
    const card = makeCardRow({ status: 3, formal_work_order_id: 700 });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      service.convertToFormalWorkOrder(1, {}, 1)
    ).rejects.toThrow('该工艺卡已转过正式工单，不可重复转换');
  });

  it('使用默认 planQty=1000', async () => {
    const card = makeCardRow({ status: 3 });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 1 }))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValue(undefined);

    const result = await service.convertToFormalWorkOrder(1, {}, 1);

    // BOM quantity = 0.5 * 1000 = 500
    const bomParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(bomParams[4]).toBe(500);
  });

  it('无物料明细时跳过 BOM 写入', async () => {
    const card = makeCardRow({ status: 3 });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([]) // no items
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 1 }))
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE card
      .mockResolvedValue(undefined);

    const result = await service.convertToFormalWorkOrder(1, { planQty: 100 }, 1);

    // Only 2 conn.execute: INSERT work_order, UPDATE card (no BOM)
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// 7. getCostVariance — 成本差异分析（预估 vs 实际）
// ============================================================
describe('SampleProcessCardService.getCostVariance', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('无正式工单时：实际 = 预估，差异为 0', async () => {
    const card = makeCardRow({
      total_material_cost: 1200,
      total_labor_cost: 400,
      total_tool_cost: 50,
      total_cost: 1650,
      formal_work_order_id: null,
    });
    mocks.query
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()]);

    const result = await service.getCostVariance(1);

    expect(result.estimated.totalCost).toBe(1650);
    expect(result.actual.totalCost).toBe(1650);
    expect(result.variance.totalCost).toBe(0);
    expect(result.variance.varianceRate).toBe(0);
    expect(result.workOrderNo).toBeNull();
  });

  it('有正式工单时：实际物料成本从 BOM 汇总', async () => {
    const card = makeCardRow({
      total_material_cost: 1200,
      total_labor_cost: 400,
      total_tool_cost: 50,
      total_cost: 1650,
      formal_work_order_id: 700,
    });
    mocks.query
      .mockResolvedValueOnce([card]) // getCardDetail card
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()])
      .mockResolvedValueOnce([{ work_order_no: 'PWO2026071000001' }])
      .mockResolvedValueOnce([{ actual_material: 1500 }]);

    const result = await service.getCostVariance(1);

    expect(result.workOrderNo).toBe('PWO2026071000001');
    expect(result.actual.materialCost).toBe(1500);
    expect(result.actual.laborCost).toBe(400);
    expect(result.actual.toolCost).toBe(50);
    expect(result.actual.totalCost).toBe(1950);
    expect(result.variance.materialCost).toBe(300);
    expect(result.variance.totalCost).toBe(300);
    // varianceRate = (1950 - 1650) / 1650 * 100 = 18.18
    expect(result.variance.varianceRate).toBeCloseTo(18.18, 1);
  });

  it('工艺卡不存在时抛出错误', async () => {
    mocks.query.mockResolvedValueOnce([]);

    await expect(service.getCostVariance(999)).rejects.toThrow('工艺卡不存在');
  });
});

// ============================================================
// 8. duplicateVersion — 版本复制
// ============================================================
describe('SampleProcessCardService.duplicateVersion', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正常复制：V1.0 → V1.1，复制物料和工序', async () => {
    const card = makeCardRow({ status: 3, version_no: 'V1.0' });
    mocks.query
      .mockResolvedValueOnce([card]) // getCardDetail card
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()])
      .mockResolvedValueOnce([]); // generateSampleNo

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 2 })) // INSERT new card
      .mockResolvedValueOnce(mockExecReturn()) // INSERT item
      .mockResolvedValueOnce(mockExecReturn()); // INSERT step

    const newCardId = await service.duplicateVersion(1, 1);

    expect(newCardId).toBe(2);

    // Verify new card INSERT has version V1.1 and source_version_id
    // VALUES: ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
    // status=1 和 NOW() 是硬编码，不占参数位 → 共 24 个参数 [0..23]
    const cardParams = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    // version_no is 7th placeholder (index 6)
    expect(cardParams[6]).toBe('V1.1');
    // source_version_id is at index 22 (before create_by at 23)
    expect(cardParams[22]).toBe(1);
  });

  it('源工艺卡不存在时抛出错误', async () => {
    mocks.query
      .mockResolvedValueOnce([]) // card not found
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(service.duplicateVersion(999, 1)).rejects.toThrow('源工艺卡不存在');
  });
});

// ============================================================
// 9. deleteCard — 软删除（仅草稿可删）
// ============================================================
describe('SampleProcessCardService.deleteCard', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正常删除草稿工艺卡', async () => {
    mocks.query.mockResolvedValueOnce([{ status: 1 }]);
    mocks.execute.mockResolvedValueOnce(mockExecReturn());

    await service.deleteCard(1);

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const sql = mocks.execute.mock.calls[0][0] as string;
    expect(sql).toContain('SET deleted = 1');
  });

  it('非草稿状态时抛出错误', async () => {
    mocks.query.mockResolvedValueOnce([{ status: 3 }]);

    await expect(service.deleteCard(1)).rejects.toThrow('仅草稿状态可删除');
  });

  it('工艺卡不存在时抛出错误', async () => {
    mocks.query.mockResolvedValueOnce([]);

    await expect(service.deleteCard(999)).rejects.toThrow('工艺卡不存在');
  });
});

// ============================================================
// 10. previewCost — 成本预览（不入库）
// ============================================================
describe('SampleProcessCardService.previewCost', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('正确计算物料+人工+工装成本', async () => {
    mocks.query.mockResolvedValueOnce([{ total: 0.15 }]); // fetchToolCosts

    const result = await service.previewCost({
      items: [
        { unit_dosage: 0.5, unit_cost: 100 },
      ] as never,
      steps: [
        { work_hour: 2, hourly_rate: 80 },
      ] as never,
      material_loss_rate: 5,
      die_tool_id: 10,
      screen_plate_id: 20,
    });

    // materialCost = 0.5 * 100 * 1.05 = 52.5
    expect(result.materialCost).toBe(52.5);
    // laborCost = 2 * 80 = 160
    expect(result.laborCost).toBe(160);
    // toolCost = 0.15
    expect(result.toolCost).toBe(0.15);
    // totalCost = 52.5 + 160 + 0.15 = 212.65
    expect(result.totalCost).toBe(212.65);
  });

  it('无工装时 toolCost = 0', async () => {
    const result = await service.previewCost({
      items: [{ unit_dosage: 1, unit_cost: 50 }] as never,
      steps: [{ work_hour: 1, hourly_rate: 80 }] as never,
      material_loss_rate: 0,
      die_tool_id: null,
      screen_plate_id: null,
    });

    expect(result.toolCost).toBe(0);
    // materialCost = 1 * 50 * 1 = 50
    expect(result.materialCost).toBe(50);
    // laborCost = 1 * 80 = 80
    expect(result.laborCost).toBe(80);
    expect(result.totalCost).toBe(130);
  });
});

// ============================================================
// 11. 全链路集成测试 — createCard → submitCard → confirmCard → generateQuote → convertToFormalWorkOrder → getCostVariance
// ============================================================
describe('SampleProcessCardService — 全链路集成测试', () => {
  let service: SampleProcessCardService;

  beforeEach(() => {
    service = new SampleProcessCardService();
  });

  it('完整流程：创建→提交→确认→报价→转工单→成本差异', async () => {
    // ===== Step 1: createCard =====
    mocks.query
      .mockResolvedValueOnce([]) // generateSampleNo
      .mockResolvedValueOnce([{ total: 0.1 }]); // fetchToolCosts
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 1 })) // INSERT card
      .mockResolvedValueOnce(mockExecReturn()) // INSERT item
      .mockResolvedValueOnce(mockExecReturn()); // INSERT step

    const cardId = await service.createCard(makeCardInput(), 1);
    expect(cardId).toBe(1);

    // ===== Step 2: submitCard =====
    const cardDraft = makeCardRow({ status: 1 });
    mocks.query
      .mockResolvedValueOnce([cardDraft]) // getCardDetail card
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()]);
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE card status
      .mockResolvedValueOnce(mockExecReturn({ insertId: 500 })) // INSERT work order
      .mockResolvedValueOnce(mockExecReturn()); // UPDATE card work_order_id

    const submitResult = await service.submitCard(1, 1);
    expect(submitResult.workOrderId).toBe(500);

    // ===== Step 3: confirmCard =====
    mocks.query.mockResolvedValueOnce([{ status: 2 }]);
    mocks.execute.mockResolvedValueOnce(mockExecReturn());

    await service.confirmCard(1, 1);

    // ===== Step 4: generateQuote =====
    const cardConfirmed = makeCardRow({
      status: 3,
      total_material_cost: 52.5,
      total_labor_cost: 160,
      total_tool_cost: 0.1,
      total_cost: 212.6,
    });
    mocks.query
      .mockResolvedValueOnce([cardConfirmed]) // getCardDetail card
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()])
      .mockResolvedValueOnce([]); // generateQuoteNo
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 300 })) // INSERT sal_quote
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE card quote_id
      .mockResolvedValue(undefined);

    const quoteResult = await service.generateQuote(1, { markupRate: 30, quantity: 1 }, 1);
    expect(quoteResult.quoteId).toBe(300);
    // quotedPrice = 212.6 * 1.3 * 1 = 276.38
    expect(quoteResult.quotedPrice).toBe(276.38);

    // ===== Step 5: convertToFormalWorkOrder =====
    const cardWithQuote = makeCardRow({
      status: 3,
      quote_id: 300,
      formal_work_order_id: null,
    });
    mocks.query
      .mockResolvedValueOnce([cardWithQuote]) // getCardDetail card
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()])
      .mockResolvedValueOnce([]); // generateFormalWorkOrderNo
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 700 })) // INSERT work_order
      .mockResolvedValueOnce(mockExecReturn()) // INSERT BOM
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE card formal_work_order_id
      .mockResolvedValue(undefined);

    const woResult = await service.convertToFormalWorkOrder(1, { planQty: 1000 }, 1);
    expect(woResult.workOrderId).toBe(700);

    // ===== Step 6: getCostVariance =====
    const cardWithFormalWO = makeCardRow({
      status: 3,
      formal_work_order_id: 700,
      total_material_cost: 52.5,
      total_labor_cost: 160,
      total_tool_cost: 0.1,
      total_cost: 212.6,
    });
    mocks.query
      .mockResolvedValueOnce([cardWithFormalWO]) // getCardDetail card
      .mockResolvedValueOnce([makeItemRow()])
      .mockResolvedValueOnce([makeStepRow()])
      .mockResolvedValueOnce([{ work_order_no: 'PWO2026071000001' }])
      .mockResolvedValueOnce([{ actual_material: 60 }]); // actual material from BOM

    const variance = await service.getCostVariance(1);
    expect(variance.workOrderNo).toBe('PWO2026071000001');
    expect(variance.estimated.totalCost).toBe(212.6);
    expect(variance.actual.materialCost).toBe(60);
    expect(variance.actual.totalCost).toBe(60 + 160 + 0.1); // 220.1
    expect(variance.variance.totalCost).toBe(220.1 - 212.6); // 7.5
    expect(variance.variance.varianceRate).toBeGreaterThan(0);
  });
});
