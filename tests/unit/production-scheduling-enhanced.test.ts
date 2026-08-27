import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateScheduleWithColorDependencies,
  getAvailableEquipment,
  autoScheduleWorkOrders,
  saveScheduleResult,
  type Equipment,
  type WorkOrderWithColors,
  type ScheduleSlot,
  type SchedulingResultEnhanced,
} from '@/lib/production-scheduling-enhanced';

vi.mock('@/lib/calc-param-service', () => ({
  CalcParamService: {
    getInt: vi.fn().mockResolvedValue(4),
    getCachedInt: vi.fn().mockImplementation((key: string, defaultVal: number) => {
      if (key === 'schedule.search_days_ahead') return 30;
      if (key === 'schedule.work_start_hour') return 8;
      if (key === 'schedule.working_hours_per_day') return 8;
      return defaultVal;
    }),
  },
}));

const mockQuery = vi.fn();
const mockTransaction = vi.fn();
const mockSecureLog = vi.fn();

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (...args: unknown[]) => mockTransaction(...args),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: (...args: unknown[]) => mockSecureLog(...args),
}));

function createEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 1,
    equipment_code: 'PR-001',
    equipment_name: '印刷机1号',
    equipment_type: '1',
    workshop: 'printing',
    capacity_per_hour: 100,
    status: '1',
    max_colors: 4,
    setup_time_minutes: 30,
    ...overrides,
  };
}

function createWorkOrder(overrides: Partial<WorkOrderWithColors> = {}): WorkOrderWithColors {
  return {
    id: 1,
    work_order_no: 'WO-001',
    product_id: 100,
    product_name: '测试产品',
    plan_qty: 100,
    color_sequences: [
      {
        seq_no: 1,
        color_name: '黑色',
        screen_plate_id: 1,
        ink_formula_id: 1,
        estimated_duration_hours: 2,
        equipment_type_required: 'printing',
      },
    ],
    priority: 'normal',
    deadline: '2025-12-31',
    ...overrides,
  };
}

describe('calculateScheduleWithColorDependencies', () => {
  let equipmentList: Equipment[];
  let existingSchedules: ScheduleSlot[];

  beforeEach(() => {
    equipmentList = [
      createEquipment({ id: 1, equipment_code: 'PR-001', equipment_name: '印刷机1号' }),
      createEquipment({ id: 2, equipment_code: 'PR-002', equipment_name: '印刷机2号', workshop: 'printing' }),
    ];
    existingSchedules = [];
  });

  it('should schedule single color sequence successfully', () => {
    const workOrder = createWorkOrder();
    const startDate = new Date('2025-06-02T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipmentList,
      existingSchedules,
      startDate
    );

    expect(result.work_order_id).toBe(1);
    expect(result.work_order_no).toBe('WO-001');
    expect(result.color_sequences).toHaveLength(1);
    expect(result.color_sequences[0].status).toBe('scheduled');
    expect(result.color_sequences[0].equipment_id).toBeGreaterThan(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('should handle multiple color sequences with dependency', () => {
    const workOrder = createWorkOrder({
      plan_qty: 100,
      color_sequences: [
        {
          seq_no: 1,
          color_name: '黑色',
          screen_plate_id: 1,
          ink_formula_id: 1,
          estimated_duration_hours: 2,
          equipment_type_required: 'printing',
        },
        {
          seq_no: 2,
          color_name: '红色',
          screen_plate_id: 2,
          ink_formula_id: 2,
          estimated_duration_hours: 2,
          equipment_type_required: 'printing',
          depends_on_seq: 1,
        },
      ],
    });
    const startDate = new Date('2025-06-02T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipmentList,
      existingSchedules,
      startDate
    );

    expect(result.color_sequences).toHaveLength(2);
    expect(result.color_sequences[0].status).toBe('scheduled');
    expect(result.color_sequences[1].status).toBe('scheduled');

    const seq1End = new Date(result.color_sequences[0].end_time);
    const seq2Start = new Date(result.color_sequences[1].start_time);
    expect(seq2Start.getTime()).toBeGreaterThanOrEqual(seq1End.getTime());
  });

  it('should return conflict when no suitable equipment', () => {
    const workOrder = createWorkOrder({
      color_sequences: [
        {
          seq_no: 1,
          color_name: '特殊色',
          screen_plate_id: 1,
          ink_formula_id: 1,
          estimated_duration_hours: 4,
          equipment_type_required: 'nonexistent_type',
        },
      ],
    });
    const startDate = new Date('2025-06-02T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipmentList,
      existingSchedules,
      startDate
    );

    expect(result.color_sequences).toHaveLength(1);
    expect(result.color_sequences[0].status).toBe('conflict');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].reason).toContain('无可用设备类型');
  });

  it('should schedule on any day including weekends', () => {
    const workOrder = createWorkOrder();
    const startDate = new Date('2025-06-07T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipmentList,
      existingSchedules,
      startDate
    );

    expect(result.color_sequences).toHaveLength(1);
    expect(result.color_sequences[0].status).toBe('scheduled');
  });

  it('should calculate duration based on quantity and capacity', () => {
    const workOrder = createWorkOrder({ plan_qty: 200 });
    const startDate = new Date('2025-06-02T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipmentList,
      existingSchedules,
      startDate
    );

    expect(result.color_sequences[0].duration_hours).toBeGreaterThan(0);
  });

  it('should set overall_start and overall_end correctly', () => {
    const workOrder = createWorkOrder();
    const startDate = new Date('2025-06-02T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipmentList,
      existingSchedules,
      startDate
    );

    expect(result.overall_start).toBeTruthy();
    expect(result.overall_end).toBeTruthy();
    const start = new Date(result.overall_start);
    const end = new Date(result.overall_end);
    expect(end.getTime()).toBeGreaterThanOrEqual(start.getTime());
  });

  it('should avoid time conflicts with existing schedules', () => {
    const equipment = createEquipment({ id: 1 });
    existingSchedules.push({
      equipment_id: 1,
      equipment_name: '印刷机1号',
      date: '2025-06-02',
      hour_start: 8,
      hour_end: 16,
      crosses_day: false,
      available_capacity: 100,
      scheduled_orders: [],
    });

    const workOrder = createWorkOrder();
    const startDate = new Date('2025-06-02T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      [equipment],
      existingSchedules,
      startDate
    );

    if (result.color_sequences[0].status === 'scheduled') {
      const scheduledStart = new Date(result.color_sequences[0].start_time);
      expect(scheduledStart.getDate()).not.toBe(2);
    }
  });

  it('should handle work order with no color sequences', () => {
    const workOrder = createWorkOrder({ color_sequences: [] });
    const startDate = new Date('2025-06-02T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipmentList,
      existingSchedules,
      startDate
    );

    expect(result.color_sequences).toHaveLength(0);
    expect(result.overall_start).toBe('');
    expect(result.overall_end).toBe('');
  });

  it('Q=200, capacity=100/h → duration_hours=2（旧公式会算出8）', () => {
    const workOrder = createWorkOrder({ plan_qty: 200 });
    const startDate = new Date('2025-06-02T08:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipmentList,
      existingSchedules,
      startDate
    );

    // 新公式：max(1, ceil(200/100)) = 2 小时
    // 旧公式：ceil(200/100)*2*2 = 8 小时
    expect(result.color_sequences[0].duration_hours).toBe(2);
    expect(result.color_sequences[0].duration_hours).not.toBe(8);
  });

  it('跨天时段重叠检测正确', () => {
    const equipment = createEquipment({ id: 1, capacity_per_hour: 100 });

    // 已有跨天排程：23:00~次日02:00
    existingSchedules.push({
      equipment_id: 1,
      equipment_name: '印刷机1号',
      date: '2025-06-02',
      hour_start: 23,
      hour_end: 2,
      crosses_day: true,
      available_capacity: 100,
      scheduled_orders: [],
    });

    const workOrder = createWorkOrder({ plan_qty: 100 });
    const startDate = new Date('2025-06-02T23:00:00');

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      [equipment],
      existingSchedules,
      startDate
    );

    expect(result.color_sequences[0].status).toBe('scheduled');
    if (result.color_sequences[0].status === 'scheduled') {
      const startTime = new Date(result.color_sequences[0].start_time);
      // 不能落在跨天时段（23:00~02:00），应推至次日02:00后
      expect(startTime.getHours()).toBeGreaterThanOrEqual(2);
    }
  });

  it('ScheduleSlot 应包含 crosses_day 字段', () => {
    const equipment = createEquipment({ id: 1, capacity_per_hour: 100 });
    const workOrder = createWorkOrder({ plan_qty: 100 });
    const startDate = new Date('2025-06-02T08:00:00');

    calculateScheduleWithColorDependencies(
      workOrder,
      [equipment],
      existingSchedules,
      startDate
    );

    const slot = existingSchedules[existingSchedules.length - 1];
    expect(slot).toHaveProperty('crosses_day');
    expect(typeof slot.crosses_day).toBe('boolean');
  });
});

describe('getAvailableEquipment regression', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([
      {
        id: 1,
        equipment_code: 'PR-001',
        equipment_name: '印刷机1号',
        equipment_type: 1,
        workshop: 1,
        capacity_per_hour: 100,
        status: 1,
        max_colors: 4,
        setup_time_minutes: 30,
      },
    ]);
  });

  it('SQL query should NOT reference nonexistent workshop column', async () => {
    await getAvailableEquipment();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sqlArg = mockQuery.mock.calls[0][0];
    expect(sqlArg).toContain('workshop_id as workshop');
    expect(sqlArg).not.toMatch(/SELECT id, equipment_code, equipment_name, equipment_type, workshop,/);
    expect(sqlArg).toContain('current_status = 1');
    expect(sqlArg).toContain('deleted = 0');
  });

  it('should return equipment with numeric status from tinyint', async () => {
    const result = await getAvailableEquipment();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(1);
  });
});

describe('calculateScheduleWithColorDependencies status matching', () => {
  it('should match equipment status when DB returns numeric tinyint', () => {
    const workOrder = createWorkOrder();
    const startDate = new Date('2025-06-02T08:00:00');

    const equipment: Equipment[] = [
      {
        ...createEquipment(),
        status: '1',
      },
    ];

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipment,
      [],
      startDate
    );

    expect(result.conflicts).toHaveLength(0);
    expect(result.color_sequences[0].status).toBe('scheduled');
  });

  it('should NOT match equipment with status 3 (maintenance)', () => {
    const workOrder = createWorkOrder();
    const startDate = new Date('2025-06-02T08:00:00');

    const equipment: Equipment[] = [
      {
        ...createEquipment(),
        status: '3',
      },
    ];

    const result = calculateScheduleWithColorDependencies(
      workOrder,
      equipment,
      [],
      startDate
    );

    expect(result.conflicts).toHaveLength(1);
    expect(result.color_sequences[0].status).toBe('conflict');
  });
});

describe('autoScheduleWorkOrders status filter', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('should only query work orders with status pending or confirmed', async () => {
    mockQuery.mockResolvedValue([
      {
        id: 1,
        work_order_no: 'WO-001',
        product_name: 'Test Product',
        quantity: 100,
        priority: 'normal',
        plan_end_date: '2025-12-31',
        deadline: '2025-12-31',
      },
    ]);

    await autoScheduleWorkOrders([1], { startDate: '2025-06-02' });

    const workOrderQuery = mockQuery.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('prod_work_order') &&
        call[0].includes('status IN')
    );
    expect(workOrderQuery).toBeDefined();
    expect(workOrderQuery![0]).toContain("status IN ('pending', 'confirmed')");
  });
});

describe('saveScheduleResult regression', () => {
  beforeEach(() => {
    mockTransaction.mockReset();
  });

  it('should create prd_schedule record before prd_schedule_detail', async () => {
    const executedSqls: string[] = [];
    const connMock = {
      execute: vi.fn().mockImplementation((sql: string) => {
        executedSqls.push(sql);
        if (sql.includes('INSERT INTO prd_schedule')) {
          return Promise.resolve([{ insertId: 100 }]);
        }
        if (sql.includes('prod_work_order') && sql.includes('SELECT')) {
          return Promise.resolve([{ product_name: 'Test Product', quantity: 100, priority: 'normal' }]);
        }
        if (sql.includes('eqp_equipment') && sql.includes('SELECT')) {
          return Promise.resolve([{ workshop_id: null, code: null }]);
        }
        return Promise.resolve([]);
      }),
    };

    mockTransaction.mockImplementation(async (cb: (conn: typeof connMock) => Promise<unknown>) => {
      await cb(connMock as never);
    });

    const result: SchedulingResultEnhanced = {
      work_order_id: 1,
      work_order_no: 'WO-001',
      color_sequences: [
        {
          seq_no: 1,
          color_name: '黑色',
          equipment_id: 1,
          equipment_name: '印刷机1号',
          start_time: '2025-06-02T08:00:00.000Z',
          end_time: '2025-06-02T12:00:00.000Z',
          duration_hours: 4,
          status: 'scheduled',
        },
      ],
      overall_start: '2025-06-02T08:00:00.000Z',
      overall_end: '2025-06-02T12:00:00.000Z',
      conflicts: [],
    };

    await saveScheduleResult(result);

    expect(connMock.execute).toHaveBeenCalled();
    const allCalls = executedSqls.map((s) => s.trim());

    const hasScheduleInsert = allCalls.some(
      (s) => s.startsWith('INSERT INTO prd_schedule ')
    );
    expect(hasScheduleInsert).toBe(true);

    const detailInsertIdx = allCalls.findIndex((s) =>
      s.startsWith('INSERT INTO prd_schedule_detail')
    );
    const scheduleInsertIdx = allCalls.findIndex(
      (s) => s.startsWith('INSERT INTO prd_schedule ')
    );

    expect(scheduleInsertIdx).toBeGreaterThan(-1);
    expect(detailInsertIdx).toBeGreaterThan(-1);
    expect(scheduleInsertIdx).toBeLessThan(detailInsertIdx);

    const scheduleInsertSql = allCalls[scheduleInsertIdx];
    expect(scheduleInsertSql).toContain('work_order_id');
    expect(scheduleInsertSql).toContain('planned_start');
    expect(scheduleInsertSql).toContain('planned_end');
    expect(scheduleInsertSql).toContain('status');
  });
});
