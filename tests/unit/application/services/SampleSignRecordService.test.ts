/**
 * SampleSignRecordService — 打样签样登记服务单元测试
 *
 * 覆盖：
 * - createSignRecord：签样登记事务（登记 + 色样档案 + delivery_status→signed）
 * - 校验分支：订单不存在 / 未交付 / 重复签样
 * - 编号生成：SG/CS 前缀按当日最大序号递增
 * - getSignRecordByOrderId：登记 + 色样档案查询
 *
 * Mock 策略（同 SampleProcessCardService.test.ts）：
 *   - @/lib/db: query/transaction + mockConn.execute（按 SQL 分派）
 *   - @/lib/logger: logger 各方法 mock
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = { execute: vi.fn() };
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
    transaction: vi.fn(async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    logger: mockLogger,
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  transaction: mocks.transaction,
}));
vi.mock('@/lib/logger', () => ({
  logger: mocks.logger,
  secureLog: vi.fn(),
}));

import { SampleSignRecordService } from '@/application/services/SampleSignRecordService';

/** 服务按「当天」本地钟面生成 SG 前缀（todayPrefix），期望值必须同源动态计算，防跨日时间炸弹 */
const YMD = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

// ===== Mock 辅助 =====

function mockSelectReturn(rows: unknown[]) {
  return [rows, []];
}
function mockInsertReturn(insertId: number) {
  return [{ affectedRows: 1, insertId }, []];
}
function mockUpdateReturn() {
  return [{ affectedRows: 1, insertId: 0 }, []];
}

/** 按 SQL 关键字分派 mockConn.execute 的返回 */
function dispatchExecute(map: {
  sampleOrderRows?: unknown[];
  maxSignNoRows?: unknown[];
  maxColorNoRows?: unknown[];
  signRecordInsertId?: number;
  colorInsertIds?: number[];
}) {
  const colorInsertQueue = [...(map.colorInsertIds ?? [])];
  // 模拟 InnoDB 同事务可见性：同事务 INSERT 后，下一次 LIKE 查最大号能看到自己刚插的行
  let colorLikeCallCount = 0;
  mocks.mockConn.execute.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM sal_sample_order')) {
      return mockSelectReturn(map.sampleOrderRows ?? []);
    }
    if (sql.includes('FROM sal_sample_sign_record')) {
      return mockSelectReturn(map.maxSignNoRows ?? []);
    }
    if (sql.includes('FROM sal_sample_color_standard') && sql.includes('LIKE')) {
      colorLikeCallCount += 1;
      const base = map.maxColorNoRows?.[0] as { color_no?: string } | undefined;
      if (!base?.color_no) return mockSelectReturn([]);
      const head = base.color_no.slice(0, -5);
      const seq = parseInt(base.color_no.slice(-5), 10) + colorLikeCallCount - 1;
      return mockSelectReturn([{ color_no: `${head}${String(seq).padStart(5, '0')}` }]);
    }
    if (sql.includes('INSERT INTO sal_sample_sign_record')) {
      return mockInsertReturn(map.signRecordInsertId ?? 901);
    }
    if (sql.includes('INSERT INTO sal_sample_color_standard')) {
      return mockInsertReturn(colorInsertQueue.length > 0 ? (colorInsertQueue.shift() as number) : 0);
    }
    if (sql.includes('UPDATE sal_sample_order')) {
      return mockUpdateReturn();
    }
    throw new Error(`Unexpected SQL in test: ${sql}`);
  });
}

function makeSampleOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    order_no: 'SA202610040001',
    customer_name: '测试客户',
    product_name: '测试印刷品',
    delivery_status: 'delivered',
    ...overrides,
  };
}

const validInput = {
  sample_order_id: 11,
  sign_date: '2026-10-04',
  customer_rep: '王先生',
  retained_qty: 3,
  retained_location: '留样柜A-01',
  remark: '客户确认签样',
  colors: [
    {
      color_name: '专红 PANTONE 485C',
      l_value: 45.2,
      a_value: 68.5,
      b_value: 42.1,
      measure_device: 'X-Rite eXact',
      measure_date: '2026-10-04',
      de_threshold: 1.5,
    },
    {
      color_name: '黑 K100',
      l_value: 12.3,
      a_value: 0.2,
      b_value: -1.1,
    },
  ],
};

describe('SampleSignRecordService.createSignRecord', () => {
  let service: SampleSignRecordService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SampleSignRecordService();
  });

  it('delivered 订单签样成功：插入登记 + 2 条色样 + 置 signed，返回编号', async () => {
    dispatchExecute({
      sampleOrderRows: [makeSampleOrderRow()],
      maxSignNoRows: [{ sign_no: `SG${YMD}00001` }],
      maxColorNoRows: [{ color_no: `CS${YMD}00005` }],
      signRecordInsertId: 901,
      colorInsertIds: [911, 912],
    });

    const result = await service.createSignRecord(validInput, 7);

    expect(result.id).toBe(901);
    expect(result.signNo).toBe(`SG${YMD}00002`);
    expect(result.colorNos).toEqual([`CS${YMD}00006`, `CS${YMD}00007`]);

    const calls = mocks.mockConn.execute.mock.calls as unknown as [string, unknown[]][];

    // 登记表 INSERT 参数
    const signInsert = calls.find(([sql]) => sql.includes('INSERT INTO sal_sample_sign_record'));
    expect(signInsert).toBeDefined();
    expect(signInsert![1][0]).toBe(`SG${YMD}00002`); // sign_no
    expect(signInsert![1][1]).toBe(11); // sample_order_id
    expect(signInsert![1][2]).toBe('SA202610040001'); // sample_order_no
    expect(signInsert![1][3]).toBe('测试客户'); // customer_name 快照
    expect(signInsert![1][5]).toBe('2026-10-04'); // sign_date
    expect(signInsert![1][6]).toBe(7); // sign_by
    expect(signInsert![1][7]).toBe('王先生'); // customer_rep
    expect(signInsert![1][8]).toBe(3); // retained_qty
    expect(signInsert![1][9]).toBe('留样柜A-01'); // retained_location
    expect(signInsert![1][11]).toBe(7); // create_by

    // 色样 INSERT：基准 Lab 值 + 默认阈值 1.5
    const colorInserts = calls.filter(([sql]) => sql.includes('INSERT INTO sal_sample_color_standard'));
    expect(colorInserts).toHaveLength(2);
    expect(colorInserts[0][1][0]).toBe(`CS${YMD}00006`);
    expect(colorInserts[0][1][1]).toBe(901); // sign_record_id
    expect(colorInserts[0][1][5]).toBe(45.2); // l_value
    expect(colorInserts[0][1][6]).toBe(68.5); // a_value
    expect(colorInserts[0][1][7]).toBe(42.1); // b_value
    expect(colorInserts[1][1][11]).toBe(1.5); // 默认 de_threshold

    // 签样动作：delivery_status → signed
    const update = calls.find(([sql]) => sql.includes('UPDATE sal_sample_order'));
    expect(update).toBeDefined();
    expect(update![0]).toContain("delivery_status = 'signed'");
    expect(update![1][0]).toBe(11);
  });

  it('colors 缺省时只插登记不插色样', async () => {
    dispatchExecute({
      sampleOrderRows: [makeSampleOrderRow()],
      maxSignNoRows: [],
      signRecordInsertId: 902,
    });

    const result = await service.createSignRecord(
      { sample_order_id: 11, retained_qty: 1 },
      7
    );

    expect(result.signNo).toBe(`SG${YMD}00001`); // 无历史序号从 1 起
    expect(result.colorNos).toEqual([]);

    const calls = mocks.mockConn.execute.mock.calls as unknown as [string, unknown[]][];
    expect(calls.filter(([sql]) => sql.includes('INSERT INTO sal_sample_color_standard'))).toHaveLength(0);
  });

  it('订单不存在 → 抛错且不更新状态', async () => {
    dispatchExecute({ sampleOrderRows: [] });

    await expect(service.createSignRecord(validInput, 7)).rejects.toThrow('打样订单不存在');

    const calls = mocks.mockConn.execute.mock.calls as unknown as [string, unknown[]][];
    expect(calls.filter(([sql]) => sql.includes('UPDATE sal_sample_order'))).toHaveLength(0);
  });

  it('pending（未交付）订单 → 抛「尚未交付」', async () => {
    dispatchExecute({
      sampleOrderRows: [makeSampleOrderRow({ delivery_status: 'pending' })],
    });

    await expect(service.createSignRecord(validInput, 7)).rejects.toThrow('尚未交付');
  });

  it('已 signed 订单 → 抛「已签样」', async () => {
    dispatchExecute({
      sampleOrderRows: [makeSampleOrderRow({ delivery_status: 'signed' })],
    });

    await expect(service.createSignRecord(validInput, 7)).rejects.toThrow('已签样');
  });

  it('事务内 INSERT 失败 → 异常上抛（由 transaction 回滚）', async () => {
    dispatchExecute({ sampleOrderRows: [makeSampleOrderRow()] });
    mocks.mockConn.execute.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM sal_sample_order')) return mockSelectReturn([makeSampleOrderRow()]);
      if (sql.includes('FROM sal_sample_sign_record')) return mockSelectReturn([]);
      if (sql.includes('INSERT INTO sal_sample_sign_record')) {
        throw new Error('DB write failed');
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(service.createSignRecord(validInput, 7)).rejects.toThrow('DB write failed');
  });
});

describe('SampleSignRecordService.getSignRecordByOrderId', () => {
  let service: SampleSignRecordService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SampleSignRecordService();
  });

  it('返回登记 + 色样档案列表', async () => {
    const record = { id: 901, sign_no: 'SG2026100400002', sample_order_id: 11 };
    const colors = [
      { id: 911, sign_record_id: 901, color_name: '专红', l_value: 45.2, de_threshold: 1.5 },
    ];
    mocks.query
      .mockResolvedValueOnce([record])
      .mockResolvedValueOnce(colors);

    const result = await service.getSignRecordByOrderId(11);

    expect(result).toEqual({ record, colors });
    expect(mocks.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM sal_sample_sign_record'),
      [11]
    );
    expect(mocks.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM sal_sample_color_standard'),
      [901]
    );
  });

  it('无登记记录 → 返回 null', async () => {
    mocks.query.mockResolvedValueOnce([]);

    const result = await service.getSignRecordByOrderId(999);

    expect(result).toBeNull();
  });
});

describe('SampleSignRecordService.listColorStandards', () => {
  let service: SampleSignRecordService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SampleSignRecordService();
  });

  it('keyword 过滤：color_no/color_name/sample_order_no 三字段 LIKE', async () => {
    mocks.query.mockResolvedValueOnce([{ id: 911, color_no: 'CS2026100400006' }]);

    const result = await service.listColorStandards({ keyword: '专红' });

    expect(result).toEqual([{ id: 911, color_no: 'CS2026100400006' }]);
    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).toContain('FROM sal_sample_color_standard');
    expect(sql).toContain('LIKE');
    expect(params[0]).toBe('%专红%');
    expect(params[1]).toBe('%专红%');
    expect(params[2]).toBe('%专红%');
    expect(params[3]).toBe(50); // 默认 limit
  });

  it('无 keyword：全量查最近 N 条，limit 可自定义', async () => {
    mocks.query.mockResolvedValueOnce([]);

    await service.listColorStandards({ limit: 10 });

    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).not.toContain('LIKE');
    expect(params).toEqual([10]);
  });
});
