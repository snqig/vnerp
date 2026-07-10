import { describe, it, expect } from 'vitest';
import {
  calculatePriorityScore,
  suggestScheduleDates,
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

  it('material ready adds score compared to not ready', () => {
    const order = createWorkOrder({ priority: 'normal' });
    const scoreReady = calculatePriorityScore(order, true);
    const scoreNotReady = calculatePriorityScore(order, false);
    expect(scoreReady).toBeGreaterThan(scoreNotReady);
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

  it('conflict detection pushes start date forward', () => {
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
      startDate: '2025-06-02',
    });
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
    });
    expect(result.suggested_end_date >= result.suggested_start_date).toBe(true);
  });
});
