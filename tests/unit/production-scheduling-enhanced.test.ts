import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateScheduleWithColorDependencies,
  Equipment,
  WorkOrderWithColors,
  ScheduleSlot,
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
});
