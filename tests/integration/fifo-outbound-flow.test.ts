/**
 * 集成测试：仓储出库 FIFO 分配 → 出库确认 → 扣减库存 → 流水
 *
 * 覆盖任务书 P1-3「仓储出库 FIFO 分配→出库确认→扣减库存→流水」链路。
 *
 * 测试策略：
 * - Mock @/lib/db（避免真实连接）、@/lib/logger（静音 debug）、@/lib/inventory-ledger（断言流水写入）
 * - 用内存批次数据驱动 allocateFIFO，验证分配算法的 FIFO 顺序与缺料计算
 * - 用 mock 连接驱动 executeFIFODeductionWithRetry，验证乐观锁扣减与重试
 * - 每个用例都有明确断言，不依赖外部环境，可离线自动跑通
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn: (conn: unknown) => unknown) => fn({})),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  secureLog: vi.fn(),
}));

const appendInventoryLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/inventory-ledger', () => ({
  appendInventoryLog: (...args: unknown[]) => appendInventoryLog(...(args as [])),
  appendInventoryTransaction: vi.fn(),
  recomputeInventorySummary: vi.fn(),
}));

import { allocateFIFO, executeFIFODeductionWithRetry, FIFO_POLICY } from '@/lib/fifo-allocation';
import type { DbConnection } from '@/types/db';

/** 构造一条批次行，字段对齐 buildBatchQuery 的 SELECT 清单 */
function mkBatch(o: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    batch_no: 'B-001',
    material_id: 11,
    material_code: 'MAT001',
    material_name: 'PET薄膜',
    available_qty: 100,
    unit_price: 10,
    inbound_date: '2026-01-01',
    expire_date: null,
    opened_at: null,
    split_flag: 0,
    version: 1,
    unit: 'kg',
    qr_code: null,
    location: null,
    ...o,
  };
}

/** mock 连接：query 按 SQL 内容路由，execute 可脚本化 */
function mkConn(batches: Record<string, unknown>[]) {
  const conn = {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('FROM inv_inventory_batch')) return [batches, []];
      if (sql.includes('FROM inv_inventory ')) return [[{ quantity: 1000 }], []];
      return [[], []];
    }),
    execute: vi.fn(async () => [{ affectedRows: 1 }, []]),
  };
  // 交叉类型：既满足 DbConnection 形参，又保留 vi.fn 的 mock 断言能力
  return conn as unknown as DbConnection & typeof conn;
}

const DEDUCT_PARAMS = {
  sourceType: 'outbound',
  sourceId: 1,
  sourceNo: 'OUT-TEST-001',
  warehouseId: 1,
  warehouseCode: 'WH01',
  operatorId: 1,
  operatorName: 'tester',
};

describe('仓储出库：FIFO 分配 → 扣减 → 流水', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendInventoryLog.mockClear();
    appendInventoryLog.mockResolvedValue(undefined);
  });

  it('排序策略：已开封批次优先，其次按过期日、入库日、id 升序', () => {
    expect(FIFO_POLICY.ORDER_BY_CLAUSE).toContain('split_flag');
    expect(FIFO_POLICY.ORDER_BY_CLAUSE).toContain('opened_at');
    expect(FIFO_POLICY.ORDER_BY_CLAUSE).toContain('expire_date ASC');
    expect(FIFO_POLICY.ORDER_BY_CLAUSE).toContain('inbound_date ASC');
    expect(FIFO_POLICY.ORDER_BY_CLAUSE).toContain('id ASC');
  });

  it('单批次足量：全部由该批次承担，无缺料', async () => {
    const batches = [mkBatch({ id: 1, batch_no: 'B-001', available_qty: 500 })];
    const r = await allocateFIFO(mkConn(batches), 11, 1, 200);

    expect(r.allocated_qty).toBe(200);
    expect(r.shortage).toBe(0);
    expect(r.allocations).toHaveLength(1);
    expect(r.allocations[0].batch_no).toBe('B-001');
    expect(r.allocations[0].allocate_qty).toBe(200);
    expect(r.allocations[0].available_qty_before).toBe(500);
  });

  it('跨批次拆分：按入库日期先进先出，旧批次先扣满再动新批次', async () => {
    const batches = [
      mkBatch({ id: 1, batch_no: 'B-OLD', available_qty: 30, inbound_date: '2026-01-01', unit_price: 10 }),
      mkBatch({ id: 2, batch_no: 'B-NEW', available_qty: 100, inbound_date: '2026-02-01', unit_price: 12 }),
    ];
    const r = await allocateFIFO(mkConn(batches), 11, 1, 80);

    expect(r.allocations).toHaveLength(2);
    // 分配顺序必须按传入（已排序）批次依次消耗
    expect(r.allocations[0].batch_no).toBe('B-OLD');
    expect(r.allocations[0].allocate_qty).toBe(30); // 旧批次扣满
    expect(r.allocations[1].batch_no).toBe('B-NEW');
    expect(r.allocations[1].allocate_qty).toBe(50); // 剩余从新批次补
    expect(r.allocated_qty).toBe(80);
    expect(r.shortage).toBe(0);
  });

  it('缺料：需求超过总可用量时按总量分配并记录 shortage 与百分比', async () => {
    const batches = [mkBatch({ id: 1, available_qty: 40 })];
    const r = await allocateFIFO(mkConn(batches), 11, 1, 100);

    expect(r.total_available).toBe(40);
    expect(r.allocated_qty).toBe(40);
    expect(r.shortage).toBe(60);
    expect(r.shortage_percentage).toBeCloseTo(60, 5);
  });

  it('过期批次：默认排除（SQL 带 expire_date 过滤），allowExpired 时不排除', async () => {
    const conn = mkConn([]);
    await allocateFIFO(conn, 11, 1, 10);
    const defaultSql = (conn.query as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as string;
    expect(defaultSql).toContain('expire_date >= CURDATE()');

    const conn2 = mkConn([]);
    await allocateFIFO(conn2, 11, 1, 10, { allowExpired: true });
    const allowSql = (conn2.query as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as string;
    expect(allowSql).not.toContain('expire_date >= CURDATE()');
  });

  it('排除批次：excludeBatchIds 拼入 NOT IN 且作为参数传递', async () => {
    const conn = mkConn([]);
    await allocateFIFO(conn, 11, 1, 10, { excludeBatchIds: [7, 8] });
    const [sql, params] = (conn.query as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('id NOT IN (?,?)');
    expect(params).toEqual([11, 1, 7, 8]);
  });

  it('分配查询加 FOR UPDATE 行锁，防止并发超扣', async () => {
    const conn = mkConn([mkBatch()]);
    await allocateFIFO(conn, 11, 1, 10);
    const sql = (conn.query as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as string;
    expect(sql).toContain('FOR UPDATE');
  });

  it('扣减：逐批执行乐观锁 UPDATE，成本按 Decimal 累计并写入库存流水', async () => {
    const batches = [
      mkBatch({ id: 1, batch_no: 'B-OLD', available_qty: 30, unit_price: 10.15, version: 1 }),
      mkBatch({ id: 2, batch_no: 'B-NEW', available_qty: 100, unit_price: 12, version: 3 }),
    ];
    const conn = mkConn(batches);
    const allocation = await allocateFIFO(conn, 11, 1, 50);
    const res = await executeFIFODeductionWithRetry(conn, allocation, DEDUCT_PARAMS);

    // 两批各扣一次
    expect((conn.execute as unknown as { mock: { calls: unknown[][] } }).mock.calls).toHaveLength(2);
    const firstUpdate = (conn.execute as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0][0] as string;
    expect(firstUpdate).toContain('UPDATE inv_inventory_batch');
    expect(firstUpdate).toContain('version = version + 1');
    expect(firstUpdate).toContain('AND version = ?'); // 乐观锁条件

    // 成本：30*10.15 + 20*12 = 544.5（浮点累加会得 544.49999…）
    expect(res.totalCost).toBe(544.5);
    expect(res.deductionDetails).toHaveLength(2);
    expect(res.deductionDetails[0].deducted_qty).toBe(30);

    // 每批一条库存流水
    expect(appendInventoryLog).toHaveBeenCalledTimes(2);
    const logArg = appendInventoryLog.mock.calls[0][1] as Record<string, unknown>;
    expect(logArg.batchNo).toBe('B-OLD');
    expect(logArg.operationType).toBe(2); // 2-出库
    expect(logArg.businessNo).toBe('OUT-TEST-001');
  });

  it('扣减：乐观锁冲突时自动重试，最终成功并返回尝试次数', async () => {
    const batches = [mkBatch({ id: 1, batch_no: 'B-1', available_qty: 100, version: 1 })];
    const conn = mkConn(batches);
    // 第一次 UPDATE 冲突（affectedRows=0），随后查到版本被推进，第二次成功
    (conn.execute as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    (conn.query as unknown as { mock: { calls: unknown[][] } }).mock.calls.length = 0;

    const allocation = await allocateFIFO(conn, 11, 1, 20);
    const res = await executeFIFODeductionWithRetry(conn, allocation, DEDUCT_PARAMS, 3);

    expect(res.attempts).toBe(2);
    expect(res.deductionDetails).toHaveLength(1);
  });

  it('扣减：超过重试次数仍冲突则抛出明确错误', async () => {
    const batches = [mkBatch({ id: 1, batch_no: 'B-1', available_qty: 100, version: 1 })];
    const conn = mkConn(batches);
    (conn.execute as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue([
      { affectedRows: 0 },
      [],
    ]);

    const allocation = await allocateFIFO(conn, 11, 1, 20);
    await expect(executeFIFODeductionWithRetry(conn, allocation, DEDUCT_PARAMS, 2)).rejects.toThrow(
      /乐观锁冲突|库存更新失败/
    );
  });
});
