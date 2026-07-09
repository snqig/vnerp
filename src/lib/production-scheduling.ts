import { query } from '@/lib/db';

export interface SchedulableWorkOrder {
  id: number;
  work_order_no: string;
  order_no: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit: string;
  priority: string;
  status: string;
  plan_start_date: string | null;
  plan_end_date: string | null;
  bom_id: number | null;
  create_time: string;
}

export interface SchedulingResult {
  work_order_id: number;
  work_order_no: string;
  suggested_start_date: string;
  suggested_end_date: string;
  priority_score: number;
  material_ready: boolean;
  material_shortages: Array<{
    material_id: number;
    material_name: string;
    required_qty: number;
    available_qty: number;
    shortage: number;
  }>;
  conflicts: Array<{
    conflict_type: string;
    description: string;
  }>;
}

export interface CapacityLoad {
  date: string;
  totalOrders: number;
  totalQuantity: number;
  loadPercentage: number;
  orders: Array<{
    work_order_no: string;
    product_name: string;
    quantity: number;
    priority: string;
  }>;
}

const URGENCY_SCORES: Record<string, number> = {
  urgent: 100,
  high: 75,
  normal: 50,
  low: 25,
};

const DEFAULT_DAILY_CAPACITY = 1000;
const DEFAULT_ESTIMATED_DAYS_PER_UNIT = 0.5;
const DEFAULT_WORKING_HOURS_PER_DAY = 8;

function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function skipWeekends(date: Date): Date {
  const result = new Date(date);
  while (isWeekend(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function addWorkingDays(startDate: Date, days: number): Date {
  const current = new Date(startDate);
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    if (!isWeekend(current)) {
      added++;
    }
  }
  return current;
}

export function calculatePriorityScore(
  workOrder: SchedulableWorkOrder,
  materialReady: boolean
): number {
  const urgencyScore = URGENCY_SCORES[workOrder.priority] ?? 50;

  const customerScore = workOrder.customer_name ? 10 : 0;

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(workOrder.create_time).getTime()) / (1000 * 60 * 60 * 24)
  );
  const ageScore = Math.min(daysSinceCreation * 2, 30);

  const materialScore = materialReady ? 20 : -10;

  const rawScore = urgencyScore + customerScore + ageScore + materialScore;

  const minPossible = 15;
  const maxPossible = 160;

  const normalizedScore = ((rawScore - minPossible) / (maxPossible - minPossible)) * 100;

  return Math.round(Math.max(0, Math.min(100, normalizedScore)) * 100) / 100;
}

export function suggestScheduleDates(params: {
  workOrder: SchedulableWorkOrder;
  existingSchedule: SchedulingResult[];
  estimatedDaysPerUnit?: number;
  workingHoursPerDay?: number;
  startDate?: string;
}): {
  suggested_start_date: string;
  suggested_end_date: string;
  conflicts: Array<{ conflict_type: string; description: string }>;
} {
  const {
    workOrder,
    existingSchedule,
    estimatedDaysPerUnit = DEFAULT_ESTIMATED_DAYS_PER_UNIT,
    startDate,
  } = params;

  const conflicts: Array<{ conflict_type: string; description: string }> = [];

  let start = startDate ? new Date(startDate) : new Date();
  start = skipWeekends(start);
  start.setHours(0, 0, 0, 0);

  const estimatedDays = Math.max(1, Math.ceil(workOrder.quantity * estimatedDaysPerUnit));

  const sortedSchedule = [...existingSchedule].sort(
    (a, b) =>
      new Date(a.suggested_start_date).getTime() - new Date(b.suggested_start_date).getTime()
  );

  let end = estimatedDays > 1 ? addWorkingDays(start, estimatedDays - 1) : new Date(start);

  let resolved = false;
  let maxIterations = sortedSchedule.length + 1;

  while (!resolved && maxIterations > 0) {
    resolved = true;
    maxIterations--;

    for (const scheduled of sortedSchedule) {
      const scheduledStart = new Date(scheduled.suggested_start_date);
      const scheduledEnd = new Date(scheduled.suggested_end_date);

      if (start <= scheduledEnd && end >= scheduledStart) {
        conflicts.push({
          conflict_type: 'schedule_overlap',
          description: `与工单 ${scheduled.work_order_no} 时间冲突 (${formatDateStr(scheduledStart)} ~ ${formatDateStr(scheduledEnd)})`,
        });

        start = addDays(scheduledEnd, 1);
        start = skipWeekends(start);
        end = estimatedDays > 1 ? addWorkingDays(start, estimatedDays - 1) : new Date(start);
        resolved = false;
        break;
      }
    }
  }

  return {
    suggested_start_date: formatDateStr(start),
    suggested_end_date: formatDateStr(end),
    conflicts,
  };
}

export async function checkMaterialAvailability(params: {
  workOrderId: number;
  warehouseId: number;
}): Promise<{
  available: boolean;
  shortages: Array<{
    material_id: number;
    material_name: string;
    required_qty: number;
    available_qty: number;
    shortage: number;
  }>;
}> {
  const { workOrderId, warehouseId } = params;

  const workOrders = await query<Loose>(
    `SELECT id, bom_id, quantity FROM prod_work_order WHERE id = ? AND deleted = 0`,
    [workOrderId]
  );

  if (!workOrders || workOrders.length === 0) {
    throw new Error(`工单不存在: ID ${workOrderId}`);
  }

  const workOrder = workOrders[0];

  if (!workOrder.bom_id) {
    return { available: true, shortages: [] };
  }

  const bomLines = await query<Loose>(
    `SELECT material_id, material_name, consumption_qty, loss_rate
     FROM bom_line WHERE bom_id = ?`,
    [workOrder.bom_id]
  );

  if (!bomLines || bomLines.length === 0) {
    return { available: true, shortages: [] };
  }

  const shortages: Array<{
    material_id: number;
    material_name: string;
    required_qty: number;
    available_qty: number;
    shortage: number;
  }> = [];

  for (const line of bomLines) {
    const lossRate = Number(line.loss_rate || 0) / 100;
    const requiredQty = Number(line.consumption_qty) * Number(workOrder.quantity) * (1 + lossRate);

    const inventoryResult = await query<Loose>(
      `SELECT COALESCE(SUM(available_qty), 0) as total_available
       FROM inv_inventory_batch
       WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 AND status = 'normal'`,
      [line.material_id, warehouseId]
    );

    const availableQty = Number(inventoryResult[0]?.total_available || 0);

    if (availableQty < requiredQty) {
      shortages.push({
        material_id: Number(line.material_id),
        material_name: line.material_name,
        required_qty: Math.round(requiredQty * 1000) / 1000,
        available_qty: Math.round(availableQty * 1000) / 1000,
        shortage: Math.round((requiredQty - availableQty) * 1000) / 1000,
      });
    }
  }

  return {
    available: shortages.length === 0,
    shortages,
  };
}

export async function autoSchedule(params: {
  workOrderIds?: number[];
  warehouseId?: number;
  startDate?: string;
  workingHoursPerDay?: number;
}): Promise<SchedulingResult[]> {
  const {
    workOrderIds,
    warehouseId,
    startDate,
    workingHoursPerDay = DEFAULT_WORKING_HOURS_PER_DAY,
  } = params;

  let sql = `
    SELECT id, work_order_no, order_no, customer_name, product_name,
           quantity, unit, priority, status, plan_start_date, plan_end_date,
           bom_id, create_time
    FROM prod_work_order
    WHERE deleted = 0 AND status IN ('pending', 'confirmed')
  `;
  const queryParams: Loose[] = [];

  if (workOrderIds && workOrderIds.length > 0) {
    const placeholders = workOrderIds.map(() => '?').join(',');
    sql += ` AND id IN (${placeholders})`;
    queryParams.push(...workOrderIds);
  }

  sql += ` ORDER BY FIELD(priority, 'urgent', 'high', 'normal', 'low'), create_time ASC`;

  const workOrders = await query<SchedulableWorkOrder>(sql, queryParams);

  if (!workOrders || workOrders.length === 0) {
    return [];
  }

  const sortedByPriority = [...workOrders].sort((a, b) => {
    const scoreA = calculatePriorityScore(a, true);
    const scoreB = calculatePriorityScore(b, true);
    return scoreB - scoreA;
  });

  const results: SchedulingResult[] = [];

  for (const wo of sortedByPriority) {
    let materialReady = true;
    let materialShortages: SchedulingResult['material_shortages'] = [];

    if (wo.bom_id && warehouseId) {
      const availability = await checkMaterialAvailability({
        workOrderId: wo.id,
        warehouseId,
      });
      materialReady = availability.available;
      materialShortages = availability.shortages;
    }

    const priorityScore = calculatePriorityScore(wo, materialReady);

    const dateSuggestion = suggestScheduleDates({
      workOrder: wo,
      existingSchedule: results,
      workingHoursPerDay,
      startDate,
    });

    results.push({
      work_order_id: wo.id,
      work_order_no: wo.work_order_no,
      suggested_start_date: dateSuggestion.suggested_start_date,
      suggested_end_date: dateSuggestion.suggested_end_date,
      priority_score: priorityScore,
      material_ready: materialReady,
      material_shortages: materialShortages,
      conflicts: dateSuggestion.conflicts,
    });
  }

  results.sort((a, b) => b.priority_score - a.priority_score);

  return results;
}

export async function getCapacityLoad(params: {
  startDate: string;
  endDate: string;
}): Promise<CapacityLoad[]> {
  const { startDate, endDate } = params;

  const workOrders = await query<Loose>(
    `SELECT work_order_no, product_name, quantity, priority,
            plan_start_date, plan_end_date
     FROM prod_work_order
     WHERE deleted = 0
       AND status IN ('pending', 'confirmed', 'producing')
       AND plan_start_date IS NOT NULL
       AND plan_end_date IS NOT NULL
       AND plan_start_date <= ?
       AND plan_end_date >= ?`,
    [endDate, startDate]
  );

  const loadMap = new Map<string, CapacityLoad>();

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    if (isWeekend(d)) continue;

    const dateStr = formatDateStr(d);
    loadMap.set(dateStr, {
      date: dateStr,
      totalOrders: 0,
      totalQuantity: 0,
      loadPercentage: 0,
      orders: [],
    });
  }

  for (const wo of workOrders) {
    const woStart = new Date(wo.plan_start_date);
    const woEnd = new Date(wo.plan_end_date);

    for (
      let d = new Date(Math.max(woStart.getTime(), start.getTime()));
      d <= woEnd && d <= end;
      d = addDays(d, 1)
    ) {
      if (isWeekend(d)) continue;

      const dateStr = formatDateStr(d);
      const load = loadMap.get(dateStr);

      if (load) {
        load.totalOrders += 1;
        load.totalQuantity += Number(wo.quantity);
        load.orders.push({
          work_order_no: wo.work_order_no,
          product_name: wo.product_name,
          quantity: Number(wo.quantity),
          priority: wo.priority,
        });
      }
    }
  }

  for (const load of loadMap.values()) {
    load.loadPercentage = Math.round((load.totalQuantity / DEFAULT_DAILY_CAPACITY) * 10000) / 100;
  }

  return Array.from(loadMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
