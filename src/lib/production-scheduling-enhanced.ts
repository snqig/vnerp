import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export interface Equipment {
  id: number;
  equipment_code: string;
  equipment_name: string;
  equipment_type: string;
  workshop: string;
  capacity_per_hour: number;
  status: string;
  max_colors: number;
  setup_time_minutes: number;
}

export interface ColorSequence {
  seq_no: number;
  color_name: string;
  screen_plate_id: number;
  ink_formula_id: number;
  estimated_duration_hours: number;
  equipment_type_required: string;
  depends_on_seq?: number;
}

export interface WorkOrderWithColors {
  id: number;
  work_order_no: string;
  product_id: number;
  product_name: string;
  plan_qty: number;
  color_sequences: ColorSequence[];
  priority: string;
  deadline: string;
}

export interface ScheduleSlot {
  equipment_id: number;
  equipment_name: string;
  date: string;
  hour_start: number;
  hour_end: number;
  available_capacity: number;
  scheduled_orders: Array<{
    work_order_id: number;
    work_order_no: string;
    color_seq_no: number;
    qty: number;
    start_hour: number;
    end_hour: number;
  }>;
}

export interface SchedulingResultEnhanced {
  work_order_id: number;
  work_order_no: string;
  color_sequences: Array<{
    seq_no: number;
    color_name: string;
    equipment_id: number;
    equipment_name: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    status: 'scheduled' | 'conflict' | 'unscheduled';
  }>;
  overall_start: string;
  overall_end: string;
  conflicts: Array<{
    seq_no: number;
    reason: string;
  }>;
}

const WORKING_HOURS_PER_DAY = 8;
const DAYS_AHEAD = 30;

export async function getAvailableEquipment(workshop?: string): Promise<Equipment[]> {
  let sql = `
    SELECT id, equipment_code, equipment_name, equipment_type, workshop,
           rated_capacity as capacity_per_hour, current_status as status, 4 as max_colors, 30 as setup_time_minutes
    FROM eqp_equipment
    WHERE current_status = 1
  `;
  const params: any[] = [];
  if (workshop) {
    sql += ' AND workshop = ?';
    params.push(workshop);
  }
  sql += ' ORDER BY workshop, equipment_type, equipment_code';

  const rows: any = await query(sql, params);
  return rows;
}

export async function getWorkOrderColorSequences(workOrderId: number): Promise<ColorSequence[]> {
  const rows: any = await query(
    `SELECT seq_no, color_name, screen_plate_id, ink_formula_id,
            estimated_duration_hours, equipment_type_required, depends_on_seq
     FROM prd_work_order_color_seq
     WHERE work_order_id = ? AND deleted = 0
     ORDER BY seq_no`,
    [workOrderId]
  );
  return rows;
}

export function calculateScheduleWithColorDependencies(
  workOrder: WorkOrderWithColors,
  equipmentList: Equipment[],
  existingSchedules: ScheduleSlot[],
  startDate: Date = new Date()
): SchedulingResultEnhanced {
  const result: SchedulingResultEnhanced = {
    work_order_id: workOrder.id,
    work_order_no: workOrder.work_order_no,
    color_sequences: [],
    overall_start: '',
    overall_end: '',
    conflicts: [],
  };

  let currentTime = new Date(startDate);
  currentTime.setHours(8, 0, 0, 0);

  for (const colorSeq of workOrder.color_sequences) {
    const suitableEquipment = equipmentList.filter((eq) => {
      // 设备类型映射：字符串类型到数字类型的匹配
      let typeMatch = false;
      if (typeof colorSeq.equipment_type_required === 'string') {
        // 如果工序要求的是字符串类型，映射到数字类型
        const typeMap: Record<string, number[]> = {
          printing: [1],
          die_cutting: [3],
          inspection: [4],
          drying: [5],
          plate_making: [5],
        };
        const matchingTypes = typeMap[colorSeq.equipment_type_required.toLowerCase()] || [colorSeq.equipment_type_required];
        typeMatch = matchingTypes.includes(Number(eq.equipment_type));
      } else {
        // 如果工序要求的是数字类型，直接匹配
        typeMatch = eq.equipment_type === colorSeq.equipment_type_required;
      }
      
      // 状态匹配：'1' 表示可用
      const statusMatch = eq.status === '1';
      
      return typeMatch && statusMatch;
    });

    if (suitableEquipment.length === 0) {
      result.conflicts.push({
        seq_no: colorSeq.seq_no,
        reason: `无可用设备类型: ${colorSeq.equipment_type_required}`,
      });
      result.color_sequences.push({
        seq_no: colorSeq.seq_no,
        color_name: colorSeq.color_name,
        equipment_id: 0,
        equipment_name: '无可用设备',
        start_time: '',
        end_time: '',
        duration_hours: colorSeq.estimated_duration_hours,
        status: 'conflict',
      });
      continue;
    }

    if (colorSeq.depends_on_seq) {
      const prevSeq = result.color_sequences.find((s) => s.seq_no === colorSeq.depends_on_seq);
      if (prevSeq && prevSeq.end_time) {
        currentTime = new Date(prevSeq.end_time);
      }
    }

    const durationHours = Math.max(
      1,
      Math.ceil(
        (workOrder.plan_qty / (suitableEquipment[0].capacity_per_hour || 100)) *
          colorSeq.estimated_duration_hours
      )
    );

    let bestEquipment = suitableEquipment[0];
    let earliestStart = new Date(currentTime);
    let foundSlot = false;

    for (const equipment of suitableEquipment) {
      const slot = findEarliestSlot(equipment, existingSchedules, currentTime, durationHours);
      if (slot && (!foundSlot || slot.start < earliestStart)) {
        earliestStart = slot.start;
        bestEquipment = equipment;
        foundSlot = true;
      }
    }

    if (!foundSlot) {
      result.conflicts.push({
        seq_no: colorSeq.seq_no,
        reason: '无法在计划时间内找到可用时间槽',
      });
      result.color_sequences.push({
        seq_no: colorSeq.seq_no,
        color_name: colorSeq.color_name,
        equipment_id: bestEquipment.id,
        equipment_name: bestEquipment.equipment_name,
        start_time: '',
        end_time: '',
        duration_hours: durationHours,
        status: 'unscheduled',
      });
      continue;
    }

    const endTime = new Date(earliestStart);
    endTime.setHours(endTime.getHours() + durationHours);

    result.color_sequences.push({
      seq_no: colorSeq.seq_no,
      color_name: colorSeq.color_name,
      equipment_id: bestEquipment.id,
      equipment_name: bestEquipment.equipment_name,
      start_time: earliestStart.toISOString(),
      end_time: endTime.toISOString(),
      duration_hours: durationHours,
      status: 'scheduled',
    });

    existingSchedules.push({
      equipment_id: bestEquipment.id,
      equipment_name: bestEquipment.equipment_name,
      date: earliestStart.toISOString().split('T')[0],
      hour_start: earliestStart.getHours(),
      hour_end: endTime.getHours(),
      available_capacity: bestEquipment.capacity_per_hour,
      scheduled_orders: [
        {
          work_order_id: workOrder.id,
          work_order_no: workOrder.work_order_no,
          color_seq_no: colorSeq.seq_no,
          qty: workOrder.plan_qty,
          start_hour: earliestStart.getHours(),
          end_hour: endTime.getHours(),
        },
      ],
    });

    currentTime = new Date(endTime);
  }

  if (result.color_sequences.length > 0) {
    const scheduledSeqs = result.color_sequences.filter((s) => s.status === 'scheduled');
    if (scheduledSeqs.length > 0) {
      result.overall_start = scheduledSeqs[0].start_time;
      result.overall_end = scheduledSeqs[scheduledSeqs.length - 1].end_time;
    }
  }

  return result;
}

function findEarliestSlot(
  equipment: Equipment,
  existingSchedules: ScheduleSlot[],
  afterTime: Date,
  durationHours: number
): { start: Date; end: Date } | null {
  const candidateStart = new Date(afterTime);
  const maxSearchDays = DAYS_AHEAD;

  for (let day = 0; day < maxSearchDays; day++) {
    const dateStr = candidateStart.toISOString().split('T')[0];
    const daySchedules = existingSchedules.filter(
      (s) => s.equipment_id === equipment.id && s.date === dateStr
    );

    const workStart = 8;
    const workEnd = 8 + WORKING_HOURS_PER_DAY;

    for (
      let hour = Math.max(workStart, candidateStart.getHours());
      hour <= workEnd - durationHours;
      hour++
    ) {
      const slotStart = new Date(candidateStart);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + durationHours, 0, 0, 0);

      const hasConflict = daySchedules.some((s) => {
        const sStart = s.hour_start;
        const sEnd = s.hour_end;
        return hour < sEnd && hour + durationHours > sStart;
      });

      if (!hasConflict) {
        return { start: slotStart, end: slotEnd };
      }
    }

    candidateStart.setDate(candidateStart.getDate() + 1);
    candidateStart.setHours(workStart, 0, 0, 0);
  }

  return null;
}

export async function autoScheduleWorkOrders(
  workOrderIds: number[],
  options?: {
    startDate?: string;
    respectDeadline?: boolean;
    priorityWeight?: number;
  }
): Promise<SchedulingResultEnhanced[]> {
  const startDate = options?.startDate ? new Date(options.startDate) : new Date();
  const respectDeadline = options?.respectDeadline ?? true;

  const equipmentList = await getAvailableEquipment();
  const existingSchedules: ScheduleSlot[] = [];

  const workOrders: WorkOrderWithColors[] = [];
  for (const woId of workOrderIds) {
    const rows: any = await query(
      `SELECT id, work_order_no, product_name, quantity, priority, plan_end_date as deadline
       FROM prod_work_order WHERE id = ? AND deleted = 0`,
      [woId]
    );
    if (rows.length === 0) continue;

    const wo = rows[0];
    const colorSeqs = await getWorkOrderColorSequences(woId);

    workOrders.push({
      id: wo.id,
      work_order_no: wo.work_order_no,
      product_id: wo.id,
      product_name: wo.product_name,
      plan_qty: Number(wo.quantity) || 0,
      color_sequences:
        colorSeqs.length > 0
          ? colorSeqs
          : [
              {
                seq_no: 1,
                color_name: '默认工序',
                screen_plate_id: 0,
                ink_formula_id: 0,
                estimated_duration_hours: 4,
                equipment_type_required: 'printing',
              },
            ],
      priority: wo.priority || 'normal',
      deadline: wo.deadline,
    });
  }

  workOrders.sort((a, b) => {
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    if (priorityDiff !== 0) return priorityDiff;

    if (respectDeadline && a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return 0;
  });

  const results: SchedulingResultEnhanced[] = [];
  for (const wo of workOrders) {
    const result = calculateScheduleWithColorDependencies(
      wo,
      equipmentList,
      existingSchedules,
      startDate
    );
    results.push(result);

    secureLog('info', '自动排程完成', {
      workOrderNo: wo.work_order_no,
      colorSeqCount: wo.color_sequences.length,
      scheduledCount: result.color_sequences.filter((s) => s.status === 'scheduled').length,
      conflictCount: result.conflicts.length,
    });
  }

  return results;
}

export async function saveScheduleResult(result: SchedulingResultEnhanced): Promise<boolean> {
  try {
    await transaction(async (conn) => {
      for (const seq of result.color_sequences) {
        if (seq.status !== 'scheduled') continue;

        await conn.execute(
          `INSERT INTO prd_schedule_detail (
            work_order_id, color_seq_no, equipment_id,
            planned_start, planned_end, duration_hours, status
          ) VALUES (?, ?, ?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            equipment_id = VALUES(equipment_id),
            planned_start = VALUES(planned_start),
            planned_end = VALUES(planned_end),
            duration_hours = VALUES(duration_hours)`,
          [
            result.work_order_id,
            seq.seq_no,
            seq.equipment_id,
            seq.start_time,
            seq.end_time,
            seq.duration_hours,
          ]
        );
      }

      await conn.execute(`UPDATE prod_work_order SET status = 'producing' WHERE id = ?`, [
        result.work_order_id,
      ]);
    });

    return true;
  } catch (error: any) {
    secureLog('error', '保存排程结果失败', {
      error: error.message,
      workOrderId: result.work_order_id,
    });
    return false;
  }
}

export function generateGanttData(
  results: SchedulingResultEnhanced[],
  dateRange: { start: Date; end: Date }
): Array<{
  work_order_no: string;
  product_name: string;
  color_sequences: Array<{
    seq_no: number;
    color_name: string;
    equipment_name: string;
    start_offset_days: number;
    duration_days: number;
    status: string;
  }>;
}> {
  const startTime = dateRange.start.getTime();
  const totalDays = (dateRange.end.getTime() - startTime) / (1000 * 60 * 60 * 24);

  return results.map((result) => {
    const woInfo: any = query(`SELECT product_name FROM prod_work_order WHERE id = ?`, [
      result.work_order_id,
    ]);

    return {
      work_order_no: result.work_order_no,
      product_name: woInfo?.[0]?.product_name || '',
      color_sequences: result.color_sequences.map((seq) => {
        const seqStart = new Date(seq.start_time).getTime();
        const seqEnd = new Date(seq.end_time).getTime();
        const startOffset = (seqStart - startTime) / (1000 * 60 * 60 * 24);
        const duration = (seqEnd - seqStart) / (1000 * 60 * 60 * 24);

        return {
          seq_no: seq.seq_no,
          color_name: seq.color_name,
          equipment_name: seq.equipment_name,
          start_offset_days: Math.max(0, startOffset),
          duration_days: Math.max(0.5, duration),
          status: seq.status,
        };
      }),
    };
  });
}
