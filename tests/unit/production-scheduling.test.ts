import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculatePriorityScore,
  suggestScheduleDates,
  checkMaterialAvailability,
  SchedulableWorkOrder,
  SchedulingResult,
} from '@/lib/production-scheduling';

function createWorkOrder(overrides: Partial<SchedulableWorkOrder> = {}): SchedulableWorkOrder {
  return {
    id: 1,
    work_order_no: 'WO-001',
    order_no: 'ORD-001',
    customer_name: 'Test Customer',
    product_name: 'Test Product',
    quantity: 100,
    unit: '个',
    priority: 'normal',
    status: 'pending',
    plan_start_date: null,
    plan_end_date: null,
    bom_id: null,
    create_time: new Date().toISOString(),
    ...overrides,
  };
}

describe('calculatePriorityScore', () => {
  it('urgent priority with material ready scores higher than normal priority without material', () => {
    const urgentReady = createWorkOrder({ priority: 'urgent' });
    const normalNotReady = createWorkOrder({ priority: 'normal', customer_name: '' });
    const scoreUrgent = calculatePriorityScore(urgentReady, true);
    const scoreNormal = calculatePriorityScore(normalNotReady, false);
    expect(scoreUrgent).toBeGreaterThan(scoreNormal);
  });

  it('older work orders get higher age bonus', () => {
    const oldOrder = createWorkOrder({
      create_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newOrder = createWorkOrder({ create_time: new Date().toISOString() });
    const scoreOld = calculatePriorityScore(oldOrder, true);
    const scoreNew = calculatePriorityScore(newOrder, true);
    expect(scoreOld).toBeGreaterThan(scoreNew);
  });

  it('work order with customer_name gets bonus', () => {
    const withCustomer = createWorkOrder({ customer_name: 'Acme Corp' });
    const withoutCustomer = createWorkOrder({ customer_name: '' });
    const scoreWith = calculatePriorityScore(withCustomer, true);
    const scoreWithout = calculatePriorityScore(withoutCustomer, true);
    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it('minimum score is >= 0', () => {
    const lowOrder = createWorkOrder({
      priority: 'low',
      customer_name: '',
      create_time: new Date().toISOString(),
    });
    const score = calculatePriorityScore(lowOrder, false);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('maximum score is <= 100', () => {
    const highOrder = createWorkOrder({
      priority: 'urgent',
      customer_name: 'VIP Customer',
      create_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const score = calculatePriorityScore(highOrder, true);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('material ready does NOT affect priority score (strategy A)', () => {
    const order = createWorkOrder({ priority: 'normal' });
    const scoreReady = calculatePriorityScore(order, true);
    const scoreNotReady = calculatePriorityScore(order, false);
    // 策略A：缺料只标记，不参与优先级评分
    expect(scoreReady).toBe(scoreNotReady);
  });
});

describe('suggestScheduleDates', () => {
  it('basic scheduling without conflicts', () => {
    const workOrder = createWorkOrder({ quantity: 100 });
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: [],
      startDate: '2025-06-02',
    });
    expect(result.suggested_start_date).toBe('2025-06-02');
    expect(result.conflicts).toEqual([]);
  });

  it('weekend skipping moves Saturday to Monday', () => {
    const workOrder = createWorkOrder({ quantity: 100 });
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: [],
      startDate: '2025-06-07',
    });
    expect(result.suggested_start_date).toBe('2025-06-09');
  });

  it('weekend skipping moves Sunday to Monday', () => {
    const workOrder = createWorkOrder({ quantity: 100 });
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: [],
      startDate: '2025-06-08',
    });
    expect(result.suggested_start_date).toBe('2025-06-09');
  });

  it('conflict detection pushes start date forward (capacity model, Q=1000)', () => {
    const workOrder = createWorkOrder({ quantity: 1000 });
    const existing: SchedulingResult[] = [
      {
        work_order_id: 2,
        work_order_no: 'WO-002',
        suggested_start_date: '2025-06-02',
        suggested_end_date: '2025-06-04',
        priority_score: 80,
        material_ready: true,
        material_shortages: [],
        conflicts: [],
      },
    ];
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: existing,
      startDate: '2025-06-02',
      capacityPerHour: 50,
      workingHoursPerDay: 8,
    });
    // Q=1000, 日产能=400 → 3天，与已有排产冲突，应被推后
    expect(result.suggested_start_date).not.toBe('2025-06-02');
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('no conflicts when scheduled after existing', () => {
    const workOrder = createWorkOrder({ quantity: 100 });
    const existing: SchedulingResult[] = [
      {
        work_order_id: 2,
        work_order_no: 'WO-002',
        suggested_start_date: '2025-06-02',
        suggested_end_date: '2025-06-04',
        priority_score: 80,
        material_ready: true,
        material_shortages: [],
        conflicts: [],
      },
    ];
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: existing,
      startDate: '2025-06-09',
    });
    expect(result.conflicts).toEqual([]);
  });

  it('uses current date as default start date', () => {
    const workOrder = createWorkOrder({ quantity: 100 });
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: [],
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resultDate = new Date(result.suggested_start_date);
    resultDate.setHours(0, 0, 0, 0);
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
  });

  it('end date is after start date for multi-day work', () => {
    const workOrder = createWorkOrder({ quantity: 1000 });
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: [],
      startDate: '2025-06-02',
      capacityPerHour: 50, // 日产能 400，1000件 → 3天
    });
    expect(result.suggested_end_date >= result.suggested_start_date).toBe(true);
  });

  it('capacity-based formula: Q=100, capacity=50/h, 8h/day → 1 day', () => {
    const workOrder = createWorkOrder({ quantity: 100 });
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: [],
      startDate: '2025-06-02',
      capacityPerHour: 50,
      workingHoursPerDay: 8,
    });
    // 日产能 = 50 * 8 = 400，100 / 400 = 0.25 → ceil = 1天
    expect(result.suggested_start_date).toBe(result.suggested_end_date);
  });

  it('capacity-based formula: Q=1000, capacity=50/h, 8h/day → 3 days', () => {
    const workOrder = createWorkOrder({ quantity: 1000 });
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: [],
      startDate: '2025-06-02',
      capacityPerHour: 50,
      workingHoursPerDay: 8,
    });
    // 日产能 = 400，1000 / 400 = 2.5 → ceil = 3天
    const startDate = new Date(result.suggested_start_date);
    const endDate = new Date(result.suggested_end_date);
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(2); // 从周一到周三，跨度2天
  });

  it('capacity-based formula: Q=1 → 1 day minimum', () => {
    const workOrder = createWorkOrder({ quantity: 1 });
    const result = suggestScheduleDates({
      workOrder,
      existingSchedule: [],
      startDate: '2025-06-02',
      capacityPerHour: 1,
      workingHoursPerDay: 8,
    });
    expect(result.suggested_start_date).toBe(result.suggested_end_date);
  });
});

// ─── P0-P3: 齐套查询 status 修复 ─────────────────────────────────────────────
describe('checkMaterialAvailability (P0-P3)', () => {
  const mockQuery = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@/lib/db', () => ({
      query: (...args: unknown[]) => mockQuery(...args),
    }));
  });

  it('SQL should use status = 1 (numeric), not status = \'normal\' (string)', async () => {
    // Re-import after mock setup
    const mod = await import('@/lib/production-scheduling');

    mockQuery
      .mockResolvedValueOnce([{ id: 1, bom_id: 10, quantity: 100 }]) // work order
      .mockResolvedValueOnce([
        { material_id: 1, material_name: '原料A', consumption_qty: 0.5, loss_rate: 5 },
      ]) // BOM lines
      .mockResolvedValueOnce([{ total_available: 100 }]); // inventory

    await mod.checkMaterialAvailability({ workOrderId: 1, warehouseId: 1 });

    const inventorySql = mockQuery.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('inv_inventory_batch')
    );
    expect(inventorySql).toBeDefined();
    expect(inventorySql![0]).toContain('status = 1');
    expect(inventorySql![0]).not.toContain("status = 'normal'");
  });
});
