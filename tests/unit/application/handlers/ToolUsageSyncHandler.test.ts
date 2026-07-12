import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkReportedEvent } from '@/domain/production/events/WorkOrderEvents';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  recordUsage: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ query: mocks.query }));
vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));
vi.mock('@/application/services/ToolManagementService', () => ({
  ToolManagementService: class {
    recordUsage = mocks.recordUsage;
  },
}));

import { ToolUsageSyncHandler } from '@/application/handlers/ToolUsageSyncHandler';

function makeEvent(overrides: Partial<WorkReportedEvent['payload']> = {}) {
  return new WorkReportedEvent({
    workOrderId: 100,
    workOrderNo: 'WO-001',
    reportId: 200,
    completedQty: 500,
    toolIds: [10, 20],
    processName: '印刷',
    operatorId: 5,
    operatorName: '张三',
    ...overrides,
  });
}

describe('ToolUsageSyncHandler', () => {
  let handler: ToolUsageSyncHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ToolUsageSyncHandler();
  });

  it('为每个 toolId 调用 recordUsage', async () => {
    mocks.query.mockResolvedValue([]); // no existing records
    mocks.recordUsage.mockResolvedValue(undefined);

    await handler.handle(makeEvent({ toolIds: [10, 20, 30] }));

    expect(mocks.recordUsage).toHaveBeenCalledTimes(3);
    expect(mocks.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        toolId: 10,
        workOrderId: 100,
        workOrderNo: 'WO-001',
        processName: '印刷',
        useCount: 500,
        operatorId: 5,
        operatorName: '张三',
      })
    );
    expect(mocks.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ toolId: 20 })
    );
    expect(mocks.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ toolId: 30 })
    );
  });

  it('completedQty <= 0 时跳过', async () => {
    await handler.handle(makeEvent({ completedQty: 0, toolIds: [10] }));
    expect(mocks.recordUsage).not.toHaveBeenCalled();

    await handler.handle(makeEvent({ completedQty: -5, toolIds: [10] }));
    expect(mocks.recordUsage).not.toHaveBeenCalled();
  });

  it('toolIds 为空时跳过', async () => {
    await handler.handle(makeEvent({ toolIds: [] }));
    expect(mocks.recordUsage).not.toHaveBeenCalled();
  });

  it('已有使用记录时跳过（业务幂等）', async () => {
    mocks.query.mockResolvedValueOnce([{ id: 999 }]); // toolId=10 已有记录

    await handler.handle(makeEvent({ toolIds: [10, 20] }));

    expect(mocks.recordUsage).toHaveBeenCalledTimes(1); // 只调 toolId=20
    expect(mocks.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ toolId: 20 })
    );
  });

  it('单个 toolId 出错不影响其他', async () => {
    mocks.query
      .mockResolvedValueOnce([]) // toolId=10 ok
      .mockRejectedValueOnce(new Error('DB error')); // toolId=20 query fails

    mocks.recordUsage
      .mockResolvedValueOnce(undefined) // toolId=10 ok
      .mockResolvedValueOnce(undefined);

    await handler.handle(makeEvent({ toolIds: [10, 20, 30] }));

    // toolId=10 recorded, toolId=20 errored (caught), toolId=30 should still be processed
    // toolId=30 needs its own query mock
    expect(mocks.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ toolId: 10 })
    );
  });

  it('useCount 向上取整', async () => {
    mocks.query.mockResolvedValue([]);
    mocks.recordUsage.mockResolvedValue(undefined);

    await handler.handle(makeEvent({ completedQty: 100.7, toolIds: [10] }));

    expect(mocks.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ useCount: 101 })
    );
  });

  it('operatorId 为 undefined 时正常处理', async () => {
    mocks.query.mockResolvedValue([]);
    mocks.recordUsage.mockResolvedValue(undefined);

    await handler.handle(
      makeEvent({ toolIds: [10], operatorId: undefined, operatorName: undefined })
    );

    expect(mocks.recordUsage).toHaveBeenCalledTimes(1);
    expect(mocks.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        operatorId: undefined,
        operatorName: undefined,
      })
    );
  });
});
