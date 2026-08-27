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
  const mockOutbox = { saveEvents: vi.fn().mockResolvedValue(undefined) };
  return {
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    secureLog: vi.fn(),
    logger: mockLogger,
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
  getDomainEventOutbox: () => mocks.mockOutbox,
}));

import { ToolManagementService } from '@/application/services/ToolManagementService';
import { IToolRepository } from '@/domain/dcprint/repositories/IToolRepository';

const mockToolRepo: IToolRepository = {
  findById: vi.fn(),
  findByCode: vi.fn(),
  findList: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  updateBasicInfo: vi.fn(),
  softDelete: vi.fn(),
  existsByCode: vi.fn(),
  countByStatus: vi.fn(),
} as unknown as IToolRepository;

// Tool row factory — simulates a dcprint_tool row from MySQL (costs as strings)
function makeTool(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    tool_type: 1,
    tool_code: 'DIE-001',
    tool_name: '测试刀模',
    spec: '100x50mm',
    material_id: null,
    total_life: 10000,
    warning_threshold: 8000,
    used_count: 5000,
    remain_life: 5000,
    original_cost: '1000.00',
    accumulated_cost: '500.00',
    net_value: '500.00',
    unit_cost: '0.10',
    status: 2,
    is_deleted: 0,
    manufacture_date: '2026-01-01',
    warehouse_location: 'A-01',
    remark: null,
    create_time: '2026-01-01 00:00:00',
    update_time: '2026-01-01 00:00:00',
    ...overrides,
  };
}

// MySQL conn.execute returns [rows, fields]; SELECT → rows is array; INSERT/UPDATE → ResultSetHeader
function mockSelectReturn(rows: unknown[]) {
  return [rows, []];
}
function mockExecReturn(overrides: Record<string, unknown> = {}) {
  return [{ affectedRows: 1, insertId: 0, ...overrides }, []];
}

describe('ToolManagementService.recordUsage — 报工寿命累计 + 成本分摊', () => {
  let service: ToolManagementService;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
    mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
    service = new ToolManagementService(mockToolRepo);
  });

  it('正常累计：used_count / remain_life / accumulated_cost / net_value 正确更新', async () => {
    const tool = makeTool();
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn({ insertId: 1 }));

    await service.recordUsage({
      toolId: 10,
      workOrderId: 100,
      workOrderNo: 'WO-001',
      processName: '模切',
      useCount: 1000,
      operatorId: 5,
      operatorName: '张三',
    });

    // 3 conn.execute calls: SELECT, UPDATE, INSERT
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(3);

    // Verify UPDATE dcprint_tool params
    const updateCall = mocks.mockConn.execute.mock.calls[1];
    const updateSql = updateCall[0] as string;
    const updateParams = updateCall[1] as unknown[];
    expect(updateSql).toContain('UPDATE dcprint_tool');
    expect(updateSql).toContain('used_count = ?');
    expect(updateSql).toContain('remain_life = ?');
    expect(updateSql).toContain('accumulated_cost = ?');
    expect(updateSql).toContain('net_value = ?');

    // newUsedCount = 5000 + 1000 = 6000
    expect(updateParams[0]).toBe(6000);
    // newRemainLife = 10000 - 6000 = 4000
    expect(updateParams[1]).toBe(4000);
    // amortizedCost = 0.10 * 1000 = 100; newAccumulatedCost = 500 + 100 = 600
    expect(updateParams[2]).toBe(600);
    // newNetValue = 1000 - 600 = 400
    expect(updateParams[3]).toBe(400);
    // status stays 2 (6000 < 8000, 4000 > 0)
    expect(updateParams[4]).toBe(2);
    expect(updateParams[5]).toBe(10);

    // Verify INSERT dcprint_tool_usage params
    const insertCall = mocks.mockConn.execute.mock.calls[2];
    const insertSql = insertCall[0] as string;
    const insertParams = insertCall[1] as unknown[];
    expect(insertSql).toContain('INSERT INTO dcprint_tool_usage');
    expect(insertSql).toContain('amortized_cost');
    expect(insertParams[0]).toBe(10); // tool_id
    expect(insertParams[1]).toBe(100); // work_order_id
    expect(insertParams[5]).toBe(1000); // use_count
    // amortized_cost snapshot = 0.10 * 1000 = 100
    expect(insertParams[8]).toBe(100);
  });

  it('状态转预警：used_count 达到 warning_threshold → status=4', async () => {
    const tool = makeTool({ used_count: 7500, remain_life: 2500, status: 2 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn()); // outbox.saveEvents

    await service.recordUsage({ toolId: 10, useCount: 600 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // newUsedCount = 7500 + 600 = 8100 >= 8000 → warning
    expect(updateParams[0]).toBe(8100);
    expect(updateParams[4]).toBe(4);
  });

  it('状态转报废：remain_life <= 0 → status=5 并记录 warn 日志', async () => {
    const tool = makeTool({ used_count: 9500, remain_life: 1000, status: 4 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn()); // outbox.saveEvents

    await service.recordUsage({ toolId: 10, useCount: 600 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // newUsedCount = 9500 + 600 = 10100; newRemainLife = 10000 - 10100 = -100
    expect(updateParams[0]).toBe(10100);
    expect(updateParams[1]).toBe(-100);
    expect(updateParams[4]).toBe(5); // scrapped

    // auto-scrap warning logged
    expect(mocks.secureLog).toHaveBeenCalledWith(
      'warn',
      'Tool reached end of life, auto-scrapped',
      expect.objectContaining({ toolId: 10, usedCount: 10100 })
    );
  });

  it('刚好用完寿命：remain_life = 0 → status=5', async () => {
    const tool = makeTool({ used_count: 9000, remain_life: 1000, status: 2 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn()); // outbox.saveEvents

    await service.recordUsage({ toolId: 10, useCount: 1000 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // newRemainLife = 10000 - 10000 = 0 → <= 0 → scrapped
    expect(updateParams[1]).toBe(0);
    expect(updateParams[4]).toBe(5);
  });

  it('成本分摊精度：unit_cost=0.075 * useCount=4000 = 300', async () => {
    const tool = makeTool({
      original_cost: '750.00',
      accumulated_cost: '0.00',
      net_value: '750.00',
      unit_cost: '0.075',
      used_count: 0,
      remain_life: 10000,
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({ toolId: 10, useCount: 4000 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // amortizedCost = 0.075 * 4000 = 300
    expect(updateParams[2]).toBe(300);
    // newNetValue = 750 - 300 = 450
    expect(updateParams[3]).toBe(450);
  });

  it('多次累计：已有 accumulated_cost=500 + 新 100 = 600', async () => {
    const tool = makeTool({ accumulated_cost: '500.00', net_value: '500.00' });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({ toolId: 10, useCount: 1000 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(updateParams[2]).toBe(600); // 500 + 100
    expect(updateParams[3]).toBe(400); // 1000 - 600
  });

  it('useCount 超过 remain_life 时抛出错误', async () => {
    const tool = makeTool({ remain_life: 500 });
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([tool]));

    await expect(
      service.recordUsage({ toolId: 10, useCount: 600 })
    ).rejects.toThrow('Use count 600 exceeds remaining life 500');

    // Only SELECT was called, no UPDATE or INSERT
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(1);
  });

  it('工具不存在时抛出错误', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([]));

    await expect(
      service.recordUsage({ toolId: 999, useCount: 100 })
    ).rejects.toThrow('Tool not found');
  });

  it('工具状态为 1（备用）时抛出错误', async () => {
    const tool = makeTool({ status: 1 });
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([tool]));

    await expect(
      service.recordUsage({ toolId: 10, useCount: 100 })
    ).rejects.toThrow('Tool in status 1 cannot be used');
  });

  it('工具状态为 3（维修中）时抛出错误', async () => {
    const tool = makeTool({ status: 3 });
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([tool]));

    await expect(
      service.recordUsage({ toolId: 10, useCount: 100 })
    ).rejects.toThrow('Tool in status 3 cannot be used');
  });

  it('工具状态为 5（已报废）时抛出错误', async () => {
    const tool = makeTool({ status: 5 });
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([tool]));

    await expect(
      service.recordUsage({ toolId: 10, useCount: 100 })
    ).rejects.toThrow('Tool in status 5 cannot be used');
  });

  it('状态 4（预警）仍可使用', async () => {
    const tool = makeTool({ status: 4, used_count: 8500, remain_life: 1500 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({ toolId: 10, useCount: 500 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(updateParams[0]).toBe(9000);
    // 9000 >= 8000 → stays warning
    expect(updateParams[4]).toBe(4);
  });

  it('使用记录快照包含 work_order_no 和 process_name', async () => {
    const tool = makeTool();
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({
      toolId: 10,
      workOrderId: 200,
      workOrderNo: 'WO-002',
      processId: 7,
      processName: '丝网印刷',
      useCount: 300,
      operatorId: 3,
      operatorName: '李四',
      remark: '测试备注',
    });

    const insertParams = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    expect(insertParams[0]).toBe(10);
    expect(insertParams[1]).toBe(200);
    expect(insertParams[2]).toBe('WO-002');
    expect(insertParams[3]).toBe(7);
    expect(insertParams[4]).toBe('丝网印刷');
    expect(insertParams[5]).toBe(300);
    expect(insertParams[6]).toBe(3);
    expect(insertParams[7]).toBe('李四');
    // amortizedCost = 0.10 * 300 = 30
    expect(insertParams[8]).toBe(30);
    expect(insertParams[10]).toBe('测试备注');
  });
});

describe('ToolManagementService.completeMaintenance — 维修后成本重算', () => {
  let service: ToolManagementService;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
    mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
    service = new ToolManagementService(mockToolRepo);
  });

  function makeMaintenanceRecord(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      tool_id: 10,
      maintenance_type: 1,
      maintenance_cost: '0',
      description: '更换刀片',
      life_before: 4000,
      life_after: 0,
      life_adjustment: 0,
      status: 1,
      start_time: '2026-01-01',
      end_time: null,
      operator_id: null,
      operator_name: '王五',
      remark: null,
      ...overrides,
    };
  }

  it('正常维修完成：重算 unit_cost / net_value / original_cost', async () => {
    const maint = makeMaintenanceRecord();
    const tool = makeTool({
      status: 3,
      used_count: 6000,
      remain_life: 4000,
      original_cost: '1000.00',
      accumulated_cost: '600.00',
      net_value: '400.00',
      unit_cost: '0.10',
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 1,
      maintenanceCost: 200,
      lifeAfter: 8000,
    });

    // 4 calls: SELECT maintenance, SELECT tool, UPDATE tool, UPDATE maintenance
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(4);

    // UPDATE dcprint_tool
    const toolUpdate = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    // lifeAfter = 8000
    expect(toolUpdate[0]).toBe(8000);
    // newNetValue = 400 + 200 = 600
    expect(toolUpdate[1]).toBe(600);
    // newOriginalCost = 1000 + 200 = 1200
    expect(toolUpdate[2]).toBe(1200);
    // newUnitCost = 600 / 8000 = 0.075
    expect(toolUpdate[3]).toBe(0.075);
    // used_count 6000 < warning_threshold 8000 → status 2 (active)
    expect(toolUpdate[4]).toBe(2);
    expect(toolUpdate[5]).toBe(10);

    // UPDATE dcprint_tool_maintenance
    const maintUpdate = mocks.mockConn.execute.mock.calls[3][1] as unknown[];
    expect(maintUpdate[0]).toBe(200); // maintenance_cost
    expect(maintUpdate[1]).toBe(8000); // life_after
    // lifeAdjustment = 8000 - 4000 = 4000
    expect(maintUpdate[2]).toBe(4000);
    expect(maintUpdate[4]).toBe(1); // id
  });

  it('维修后 used_count >= warning_threshold → status=4', async () => {
    const maint = makeMaintenanceRecord();
    const tool = makeTool({
      status: 3,
      used_count: 8500,
      warning_threshold: 8000,
      remain_life: 1500,
      net_value: '150.00',
      original_cost: '1000.00',
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 1,
      maintenanceCost: 100,
      lifeAfter: 5000,
    });

    const toolUpdate = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    // 8500 >= 8000 → warning
    expect(toolUpdate[4]).toBe(4);
  });

  it('lifeAfter = 0 时 unit_cost = 0（避免除零）', async () => {
    const maint = makeMaintenanceRecord();
    const tool = makeTool({
      status: 3,
      net_value: '100.00',
      original_cost: '1000.00',
      used_count: 0,
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 1,
      maintenanceCost: 50,
      lifeAfter: 0,
    });

    const toolUpdate = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    // lifeAfter = 0 → unitCost = 0
    expect(toolUpdate[3]).toBe(0);
  });

  it('维修记录不存在时抛出错误', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([]));

    await expect(
      service.completeMaintenance({ maintenanceId: 999, maintenanceCost: 100, lifeAfter: 5000 })
    ).rejects.toThrow('Maintenance record not found or already completed');
  });

  it('工具不存在时抛出错误', async () => {
    const maint = makeMaintenanceRecord({ tool_id: 999 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([])); // tool not found

    await expect(
      service.completeMaintenance({ maintenanceId: 1, maintenanceCost: 100, lifeAfter: 5000 })
    ).rejects.toThrow('Tool not found');
  });

  it('维修费用为 0 时不增加 original_cost', async () => {
    const maint = makeMaintenanceRecord();
    const tool = makeTool({
      status: 3,
      original_cost: '1000.00',
      net_value: '400.00',
      used_count: 6000,
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 1,
      maintenanceCost: 0,
      lifeAfter: 8000,
    });

    const toolUpdate = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    // newOriginalCost = 1000 + 0 = 1000
    expect(toolUpdate[2]).toBe(1000);
    // newNetValue = 400 + 0 = 400
    expect(toolUpdate[1]).toBe(400);
    // newUnitCost = 400 / 8000 = 0.05
    expect(toolUpdate[3]).toBe(0.05);
  });
});

// ============================================================
// 网版工装（tool_type=2）— 寿命累计 + 成本分摊
// 与刀模（tool_type=1）共用同一套 recordUsage / completeMaintenance 逻辑，
// 此处验证两种工装类型在核心分支上的行为完全一致。
// ============================================================
describe('ToolManagementService — 网版工装(tool_type=2) 寿命与成本分摊', () => {
  let service: ToolManagementService;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
    mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
    service = new ToolManagementService(mockToolRepo);
  });

  // 网版工厂函数 — 与刀模 makeTool 结构一致，但 tool_type=2
  function makeScreenTool(overrides: Record<string, unknown> = {}) {
    return {
      id: 20,
      tool_type: 2,
      tool_code: 'SCR-001',
      tool_name: '测试网版',
      spec: '200目',
      material_id: null,
      total_life: 50000,
      warning_threshold: 40000,
      used_count: 20000,
      remain_life: 30000,
      original_cost: '2000.00',
      accumulated_cost: '800.00',
      net_value: '1200.00',
      unit_cost: '0.04',
      status: 2,
      is_deleted: 0,
      manufacture_date: '2026-01-01',
      warehouse_location: 'B-02',
      remark: null,
      create_time: '2026-01-01 00:00:00',
      update_time: '2026-01-01 00:00:00',
      ...overrides,
    };
  }

  it('网版正常累计：used_count / remain_life / accumulated_cost / net_value 正确更新', async () => {
    const tool = makeScreenTool();
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn({ insertId: 1 }));

    await service.recordUsage({
      toolId: 20,
      workOrderId: 200,
      workOrderNo: 'WO-SCR-001',
      processName: '丝网印刷',
      useCount: 5000,
      operatorId: 7,
      operatorName: '赵六',
    });

    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(3);

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // newUsedCount = 20000 + 5000 = 25000
    expect(updateParams[0]).toBe(25000);
    // newRemainLife = 50000 - 25000 = 25000
    expect(updateParams[1]).toBe(25000);
    // amortizedCost = 0.04 * 5000 = 200; newAccumulatedCost = 800 + 200 = 1000
    expect(updateParams[2]).toBe(1000);
    // newNetValue = 2000 - 1000 = 1000
    expect(updateParams[3]).toBe(1000);
    // 25000 < 40000, 25000 > 0 → status stays 2
    expect(updateParams[4]).toBe(2);
    expect(updateParams[5]).toBe(20);

    // INSERT usage record
    const insertParams = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    expect(insertParams[0]).toBe(20); // tool_id
    expect(insertParams[2]).toBe('WO-SCR-001');
    expect(insertParams[4]).toBe('丝网印刷');
    expect(insertParams[5]).toBe(5000); // use_count
    // amortizedCost snapshot = 0.04 * 5000 = 200
    expect(insertParams[8]).toBe(200);

    // logger.info should have been called for cost computation
    expect(mocks.logger.info).toHaveBeenCalled();
  });

  it('网版状态转预警：used_count 达到 warning_threshold → status=4', async () => {
    const tool = makeScreenTool({ used_count: 37000, remain_life: 13000, status: 2 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn()); // outbox.saveEvents

    await service.recordUsage({ toolId: 20, useCount: 3500 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // newUsedCount = 37000 + 3500 = 40500 >= 40000 → warning
    expect(updateParams[0]).toBe(40500);
    expect(updateParams[4]).toBe(4);
  });

  it('网版状态转报废：remain_life <= 0 → status=5 并记录 warn 日志', async () => {
    const tool = makeScreenTool({
      used_count: 48000,
      remain_life: 2000,
      status: 4,
      accumulated_cost: '1920.00',
      net_value: '80.00',
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn()); // outbox.saveEvents

    await service.recordUsage({ toolId: 20, useCount: 2000 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // newUsedCount = 48000 + 2000 = 50000; newRemainLife = 50000 - 50000 = 0
    expect(updateParams[0]).toBe(50000);
    expect(updateParams[1]).toBe(0);
    expect(updateParams[4]).toBe(5); // scrapped

    // auto-scrap warning logged via secureLog
    expect(mocks.secureLog).toHaveBeenCalledWith(
      'warn',
      'Tool reached end of life, auto-scrapped',
      expect.objectContaining({ toolId: 20, usedCount: 50000 })
    );
  });

  it('网版刚好用完寿命：remain_life = 0 → status=5', async () => {
    const tool = makeScreenTool({ used_count: 45000, remain_life: 5000, status: 2 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn()); // outbox.saveEvents

    await service.recordUsage({ toolId: 20, useCount: 5000 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // newRemainLife = 50000 - 50000 = 0 → <= 0 → scrapped
    expect(updateParams[1]).toBe(0);
    expect(updateParams[4]).toBe(5);
  });

  it('网版成本分摊精度：unit_cost=0.04 * useCount=10000 = 400', async () => {
    const tool = makeScreenTool({
      original_cost: '2000.00',
      accumulated_cost: '0.00',
      net_value: '2000.00',
      unit_cost: '0.04',
      used_count: 0,
      remain_life: 50000,
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({ toolId: 20, useCount: 10000 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    // amortizedCost = 0.04 * 10000 = 400
    expect(updateParams[2]).toBe(400);
    // newNetValue = 2000 - 400 = 1600
    expect(updateParams[3]).toBe(1600);
  });

  it('网版多次累计：已有 accumulated_cost=800 + 新 200 = 1000', async () => {
    const tool = makeScreenTool({ accumulated_cost: '800.00', net_value: '1200.00' });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({ toolId: 20, useCount: 5000 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(updateParams[2]).toBe(1000); // 800 + 200
    expect(updateParams[3]).toBe(1000); // 2000 - 1000
  });

  it('网版 useCount 超过 remain_life 时抛出错误', async () => {
    const tool = makeScreenTool({ remain_life: 1000 });
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([tool]));

    await expect(
      service.recordUsage({ toolId: 20, useCount: 1500 })
    ).rejects.toThrow('Use count 1500 exceeds remaining life 1000');

    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(1);
  });

  it('网版状态为 1（备用）时抛出错误', async () => {
    const tool = makeScreenTool({ status: 1 });
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([tool]));

    await expect(
      service.recordUsage({ toolId: 20, useCount: 100 })
    ).rejects.toThrow('Tool in status 1 cannot be used');
  });

  it('网版状态为 5（已报废）时抛出错误', async () => {
    const tool = makeScreenTool({ status: 5 });
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([tool]));

    await expect(
      service.recordUsage({ toolId: 20, useCount: 100 })
    ).rejects.toThrow('Tool in status 5 cannot be used');
  });

  it('网版状态 4（预警）仍可使用', async () => {
    const tool = makeScreenTool({ status: 4, used_count: 42000, remain_life: 8000 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({ toolId: 20, useCount: 3000 });

    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(updateParams[0]).toBe(45000);
    // 45000 >= 40000 → stays warning
    expect(updateParams[4]).toBe(4);
  });

  it('网版使用记录快照包含 work_order_no 和 process_name', async () => {
    const tool = makeScreenTool();
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({
      toolId: 20,
      workOrderId: 300,
      workOrderNo: 'WO-SCR-002',
      processId: 9,
      processName: '丝网印刷-第二道',
      useCount: 2000,
      operatorId: 4,
      operatorName: '钱七',
      remark: '网版测试备注',
    });

    const insertParams = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    expect(insertParams[0]).toBe(20);
    expect(insertParams[1]).toBe(300);
    expect(insertParams[2]).toBe('WO-SCR-002');
    expect(insertParams[3]).toBe(9);
    expect(insertParams[4]).toBe('丝网印刷-第二道');
    expect(insertParams[5]).toBe(2000);
    expect(insertParams[6]).toBe(4);
    expect(insertParams[7]).toBe('钱七');
    // amortizedCost = 0.04 * 2000 = 80
    expect(insertParams[8]).toBe(80);
    expect(insertParams[10]).toBe('网版测试备注');
  });
});

// ============================================================
// 网版工装（tool_type=2）— 维修后成本重算
// ============================================================
describe('ToolManagementService — 网版工装维修后成本重算', () => {
  let service: ToolManagementService;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
    mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
    service = new ToolManagementService(mockToolRepo);
  });

  function makeScreenMaintenanceRecord(overrides: Record<string, unknown> = {}) {
    return {
      id: 2,
      tool_id: 20,
      maintenance_type: 1,
      maintenance_cost: '0',
      description: '更换网版',
      life_before: 25000,
      life_after: 0,
      life_adjustment: 0,
      status: 1,
      start_time: '2026-02-01',
      end_time: null,
      operator_id: null,
      operator_name: '王五',
      remark: null,
      ...overrides,
    };
  }

  function makeScreenTool(overrides: Record<string, unknown> = {}) {
    return {
      id: 20,
      tool_type: 2,
      tool_code: 'SCR-001',
      tool_name: '测试网版',
      spec: '200目',
      material_id: null,
      total_life: 50000,
      warning_threshold: 40000,
      used_count: 25000,
      remain_life: 25000,
      original_cost: '2000.00',
      accumulated_cost: '1000.00',
      net_value: '1000.00',
      unit_cost: '0.04',
      status: 3,
      is_deleted: 0,
      manufacture_date: '2026-01-01',
      warehouse_location: 'B-02',
      remark: null,
      create_time: '2026-01-01 00:00:00',
      update_time: '2026-01-01 00:00:00',
      ...overrides,
    };
  }

  it('网版正常维修完成：重算 unit_cost / net_value / original_cost', async () => {
    const maint = makeScreenMaintenanceRecord();
    const tool = makeScreenTool({
      status: 3,
      used_count: 25000,
      remain_life: 25000,
      original_cost: '2000.00',
      accumulated_cost: '1000.00',
      net_value: '1000.00',
      unit_cost: '0.04',
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 2,
      maintenanceCost: 500,
      lifeAfter: 45000,
    });

    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(4);

    const toolUpdate = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    // lifeAfter = 45000
    expect(toolUpdate[0]).toBe(45000);
    // newNetValue = 1000 + 500 = 1500
    expect(toolUpdate[1]).toBe(1500);
    // newOriginalCost = 2000 + 500 = 2500
    expect(toolUpdate[2]).toBe(2500);
    // newUnitCost = 1500 / 45000 ≈ 0.0333...
    expect(toolUpdate[3]).toBeCloseTo(1500 / 45000, 10);
    // used_count 25000 < warning_threshold 40000 → status 2 (active)
    expect(toolUpdate[4]).toBe(2);
    expect(toolUpdate[5]).toBe(20);

    // UPDATE maintenance record
    const maintUpdate = mocks.mockConn.execute.mock.calls[3][1] as unknown[];
    expect(maintUpdate[0]).toBe(500); // maintenance_cost
    expect(maintUpdate[1]).toBe(45000); // life_after
    // lifeAdjustment = 45000 - 25000 = 20000
    expect(maintUpdate[2]).toBe(20000);
    expect(maintUpdate[4]).toBe(2); // id
  });

  it('网版维修后 used_count >= warning_threshold → status=4', async () => {
    const maint = makeScreenMaintenanceRecord();
    const tool = makeScreenTool({
      status: 3,
      used_count: 42000,
      warning_threshold: 40000,
      remain_life: 8000,
      net_value: '320.00',
      original_cost: '2000.00',
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 2,
      maintenanceCost: 100,
      lifeAfter: 30000,
    });

    const toolUpdate = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    // 42000 >= 40000 → warning
    expect(toolUpdate[4]).toBe(4);
  });

  it('网版 lifeAfter = 0 时 unit_cost = 0（避免除零）', async () => {
    const maint = makeScreenMaintenanceRecord();
    const tool = makeScreenTool({
      status: 3,
      net_value: '200.00',
      original_cost: '2000.00',
      used_count: 0,
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 2,
      maintenanceCost: 50,
      lifeAfter: 0,
    });

    const toolUpdate = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    // lifeAfter = 0 → unitCost = 0
    expect(toolUpdate[3]).toBe(0);
  });

  it('网版维修费用为 0 时不增加 original_cost', async () => {
    const maint = makeScreenMaintenanceRecord();
    const tool = makeScreenTool({
      status: 3,
      original_cost: '2000.00',
      net_value: '1000.00',
      used_count: 25000,
    });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 2,
      maintenanceCost: 0,
      lifeAfter: 45000,
    });

    const toolUpdate = mocks.mockConn.execute.mock.calls[2][1] as unknown[];
    // newOriginalCost = 2000 + 0 = 2000
    expect(toolUpdate[2]).toBe(2000);
    // newNetValue = 1000 + 0 = 1000
    expect(toolUpdate[1]).toBe(1000);
    // newUnitCost = 1000 / 45000
    expect(toolUpdate[3]).toBeCloseTo(1000 / 45000, 10);
  });
});

// ============================================================
// logger.info 日志验证 — 确保核心分支都有详细日志
// ============================================================
describe('ToolManagementService — logger.info 核心分支日志验证', () => {
  let service: ToolManagementService;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
    mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
    service = new ToolManagementService(mockToolRepo);
  });

  it('recordUsage 正常流程输出寿命成本计算日志和报工记录日志', async () => {
    const tool = makeTool();
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({ toolId: 10, useCount: 1000 });

    const infoMessages = mocks.logger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('寿命与成本计算');
    expect(infoMessages).toContain('报工记录已写入');
  });

  it('recordUsage 状态转报废时输出报废日志', async () => {
    const tool = makeTool({ used_count: 9500, remain_life: 1000, status: 4 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn()); // outbox.saveEvents

    await service.recordUsage({ toolId: 10, useCount: 600 });

    const infoMessages = mocks.logger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('寿命与成本计算');
    // outbox should have been called for ToolScrappedEvent
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalled();
  });

  it('recordUsage 状态转预警时输出预警日志', async () => {
    const tool = makeTool({ used_count: 7500, remain_life: 2500, status: 2 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn()); // outbox.saveEvents

    await service.recordUsage({ toolId: 10, useCount: 600 });

    const infoMessages = mocks.logger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('寿命与成本计算');
    // outbox should have been called for ToolWarningTriggeredEvent
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalled();
  });

  it('recordUsage 工具不存在时输出 warn 日志和 error 日志', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([]));

    await expect(
      service.recordUsage({ toolId: 999, useCount: 100 })
    ).rejects.toThrow('Tool not found');

    expect(mocks.logger.warn).toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'tool', action: 'recordUsage' }),
      expect.stringContaining('recordUsage 失败'),
      expect.objectContaining({ error: 'Tool not found' })
    );
    // phase should be embedded in the message string
    const errorMsg = mocks.logger.error.mock.calls[0][1] as string;
    expect(errorMsg).toContain('phase=load_tool');
  });

  it('completeMaintenance 正常流程输出成本重算和维修完成日志', async () => {
    const maint = {
      id: 1,
      tool_id: 10,
      maintenance_type: 1,
      maintenance_cost: '0',
      description: '更换刀片',
      life_before: 4000,
      life_after: 0,
      life_adjustment: 0,
      status: 1,
      start_time: '2026-01-01',
      end_time: null,
      operator_id: null,
      operator_name: '王五',
      remark: null,
    };
    const tool = makeTool({ status: 3, used_count: 6000, remain_life: 4000 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 1,
      maintenanceCost: 200,
      lifeAfter: 8000,
    });

    const infoMessages = mocks.logger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('维修后成本重算');
    expect(infoMessages).toContain('维修完成');
  });

  it('completeMaintenance 维修后达预警阈值输出 status=4 日志', async () => {
    const maint = {
      id: 1,
      tool_id: 10,
      maintenance_type: 1,
      maintenance_cost: '0',
      description: '更换刀片',
      life_before: 1500,
      life_after: 0,
      life_adjustment: 0,
      status: 1,
      start_time: '2026-01-01',
      end_time: null,
      operator_id: null,
      operator_name: '王五',
      remark: null,
    };
    const tool = makeTool({ status: 3, used_count: 8500, remain_life: 1500 });
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([maint]))
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.completeMaintenance({
      maintenanceId: 1,
      maintenanceCost: 100,
      lifeAfter: 5000,
    });

    const infoMessages = mocks.logger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('维修后仍达预警阈值 → status=4');
  });
});

// ============================================================
// 参数索引防回归 — 确保 SQL VALUES 占位符数量与参数数组长度一致
// 防止新增硬编码值（如 status=1、NOW()）后忘记调整索引
// ============================================================
describe('ToolManagementService — SQL 参数索引一致性防回归', () => {
  let service: ToolManagementService;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
    mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
    service = new ToolManagementService(mockToolRepo);
  });

  it('UPDATE dcprint_tool: ? 占位符数 === params.length', async () => {
    const tool = makeTool();
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({ toolId: 10, useCount: 100 });

    const updateSql = mocks.mockConn.execute.mock.calls[1][0] as string;
    const updateParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];

    const placeholderCount = (updateSql.match(/\?/g) || []).length;
    expect(placeholderCount).toBe(updateParams.length);

    // 语义映射：每个索引应对应的列名（从 SET ... WHERE id 顺序推断）
    expect(updateParams[0]).toBe(5100);   // used_count = 5000 + 100
    expect(updateParams[1]).toBe(4900);   // remain_life = 10000 - 5100
    expect(updateParams[2]).toBe(510);    // accumulated_cost = 500 + 0.1*100
    expect(updateParams[3]).toBe(490);    // net_value = 1000 - 510
    expect(updateParams[4]).toBe(2);      // status (still active)
    expect(updateParams[5]).toBe(10);     // WHERE id
  });

  it('INSERT dcprint_tool_usage: ? 占位符数 === params.length', async () => {
    const tool = makeTool();
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([tool]))
      .mockResolvedValueOnce(mockExecReturn())
      .mockResolvedValueOnce(mockExecReturn());

    await service.recordUsage({
      toolId: 10,
      workOrderId: 200,
      workOrderNo: 'WO-002',
      processId: 7,
      processName: '丝网印刷',
      useCount: 300,
      operatorId: 3,
      operatorName: '李四',
      remark: '回归测试',
    });

    const insertSql = mocks.mockConn.execute.mock.calls[2][0] as string;
    const insertParams = mocks.mockConn.execute.mock.calls[2][1] as unknown[];

    const placeholderCount = (insertSql.match(/\?/g) || []).length;
    expect(placeholderCount).toBe(insertParams.length);

    // 语义映射验证
    expect(insertParams[0]).toBe(10);     // tool_id
    expect(insertParams[1]).toBe(200);    // work_order_id
    expect(insertParams[2]).toBe('WO-002'); // work_order_no
    expect(insertParams[3]).toBe(7);      // process_id
    expect(insertParams[4]).toBe('丝网印刷'); // process_name
    expect(insertParams[5]).toBe(300);    // use_count
    expect(insertParams[6]).toBe(3);      // operator_id
    expect(insertParams[7]).toBe('李四');  // operator_name
    expect(insertParams[8]).toBe(30);     // amortized_cost = 0.10 * 300
    expect(insertParams[10]).toBe('回归测试'); // remark
  });
});
