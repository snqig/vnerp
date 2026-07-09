/**
 * @module 生产排程增强模块
 * @description 提供基于颜色工序依赖关系的生产排程功能，支持设备自动匹配、时间槽查找、优先级排序和甘特图数据生成。
 *   排程算法按顺序为每个工单的每道颜色工序分配合适的设备，考虑设备类型匹配、可用时间槽、工序依赖关系和工单优先级。
 */

import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { CalcParamService } from '@/lib/calc-param-service';

/**
 * 设备接口
 * @description 表示一台生产设备的基本信息和工作能力
 */
export interface Equipment {
  /** 设备 ID */
  id: number;
  /** 设备编码 */
  equipment_code: string;
  /** 设备名称 */
  equipment_name: string;
  /** 设备类型 */
  equipment_type: string;
  /** 所属车间 */
  workshop: string;
  /** 每小时产能 */
  capacity_per_hour: number;
  /** 设备当前状态 */
  status: string;
  /** 最大颜色数 */
  max_colors: number;
  /** 换线准备时间（分钟） */
  setup_time_minutes: number;
}

/**
 * 颜色工序接口
 * @description 表示生产工单中某一颜色/工艺的工序信息及各道工序之间的依赖关系
 */
export interface ColorSequence {
  /** 工序序号 */
  seq_no: number;
  /** 颜色名称 */
  color_name: string;
  /** 网版 ID */
  screen_plate_id: number;
  /** 油墨配方 ID */
  ink_formula_id: number;
  /** 预估工时（小时） */
  estimated_duration_hours: number;
  /** 所需设备类型 */
  equipment_type_required: string;
  /** 依赖的前置工序序号，无依赖时为 undefined */
  depends_on_seq?: number;
}

/**
 * 带颜色工序的工单接口
 * @description 表示一个包含多道颜色工序的生产工单，用于排程计算
 */
export interface WorkOrderWithColors {
  /** 工单 ID */
  id: number;
  /** 工单编号 */
  work_order_no: string;
  /** 产品 ID */
  product_id: number;
  /** 产品名称 */
  product_name: string;
  /** 计划生产数量 */
  plan_qty: number;
  /** 颜色工序列表 */
  color_sequences: ColorSequence[];
  /** 优先级：urgent > high > normal > low */
  priority: string;
  /** 截止日期 */
  deadline: string;
}

/**
 * 排程时间槽接口
 * @description 表示某设备在某个时间段内的排程使用情况
 */
export interface ScheduleSlot {
  /** 设备 ID */
  equipment_id: number;
  /** 设备名称 */
  equipment_name: string;
  /** 日期 */
  date: string;
  /** 开始小时（0-23） */
  hour_start: number;
  /** 结束小时（0-23） */
  hour_end: number;
  /** 可用产能 */
  available_capacity: number;
  /** 已排程的工单列表 */
  scheduled_orders: Array<{
    /** 工单 ID */
    work_order_id: number;
    /** 工单编号 */
    work_order_no: string;
    /** 颜色工序序号 */
    color_seq_no: number;
    /** 排程数量 */
    qty: number;
    /** 开始时间（小时） */
    start_hour: number;
    /** 结束时间（小时） */
    end_hour: number;
  }>;
}

/**
 * 增强排程结果接口
 * @description 表示单个工单的完整排程结果，包含每道工序的排程详情、整体时间范围和冲突信息
 */
export interface SchedulingResultEnhanced {
  /** 工单 ID */
  work_order_id: number;
  /** 工单编号 */
  work_order_no: string;
  /** 颜色工序排程详情的数组 */
  color_sequences: Array<{
    /** 工序序号 */
    seq_no: number;
    /** 颜色名称 */
    color_name: string;
    /** 分配的设别 ID */
    equipment_id: number;
    /** 设备名称 */
    equipment_name: string;
    /** 开始时间（ISO 8601） */
    start_time: string;
    /** 结束时间（ISO 8601） */
    end_time: string;
    /** 持续时长（小时） */
    duration_hours: number;
    /** 排程状态 */
    status: 'scheduled' | 'conflict' | 'unscheduled';
  }>;
  /** 整体开始时间（第一道已排程工序的开始时间） */
  overall_start: string;
  /** 整体结束时间（最后一道已排程工序的结束时间） */
  overall_end: string;
  /** 冲突列表 */
  conflicts: Array<{
    /** 冲突工序序号 */
    seq_no: number;
    /** 冲突原因 */
    reason: string;
  }>;
}

const WORKING_HOURS_PER_DAY_DEFAULT = 8;
const DAYS_AHEAD_DEFAULT = 30;

/**
 * 获取可用设备列表
 * @description 从数据库查询当前状态为可用（current_status = 1）的设备信息
 * @param workshop - 可选，按车间筛选设备
 * @returns 可用设备数组
 * @throws 数据库查询异常
 */
export async function getAvailableEquipment(workshop?: string): Promise<Equipment[]> {
  const defaultMaxColors = await CalcParamService.getInt('schedule.default_max_colors', 4);
  const defaultSetupTime = await CalcParamService.getInt('schedule.default_setup_time_minutes', 30);
  let sql = `
    SELECT id, equipment_code, equipment_name, equipment_type, workshop,
           rated_capacity as capacity_per_hour, current_status as status,
           ? as max_colors, ? as setup_time_minutes
    FROM eqp_equipment
    WHERE current_status = 1
  `;
  const params: any[] = [defaultMaxColors, defaultSetupTime];
  if (workshop) {
    sql += ' AND workshop = ?';
    params.push(workshop);
  }
  sql += ' ORDER BY workshop, equipment_type, equipment_code';

  const rows: any = await query(sql, params);
  return rows;
}

/**
 * 获取工单的颜色工序列表
 * @description 从数据库查询指定工单关联的颜色工序信息，按工序序号排序
 * @param workOrderId - 工单 ID
 * @returns 颜色工序数组，按 seq_no 升序排列
 * @throws 数据库查询异常
 */
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

/**
 * 按颜色依赖关系计算排程
 * @description 排程算法核心：为工单的每道颜色工序依次分配合适的设备。
 *   算法流程：
 *   1. 按颜色工序序号遍历；
 *   2. 筛选匹配工序所需设备类型的可用设备；
 *   3. 若无匹配设备，标记为 conflict；
 *   4. 若工序有依赖的前序工序，从前序结束时间开始；
 *   5. 计算实际工期（基于工单数量和设备产能）；
 *   6. 在适配设备中搜索最早可用时间槽；
 *   7. 将新排程位置加入已存在排程列表避免重叠；
 *   8. 记录每道工序的排程结果和冲突信息。
 *
 * @param workOrder - 待排程的工单（包含颜色工序信息）
 * @param equipmentList - 可用设备列表
 * @param existingSchedules - 已有排程记录，用于避免时间冲突
 * @param startDate - 排程起始日期，默认为当前日期
 * @returns 排程结果，包含每道工序的状态、时间安排和冲突
 */
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
        const matchingTypes = typeMap[colorSeq.equipment_type_required.toLowerCase()] || [
          colorSeq.equipment_type_required,
        ];
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

/**
 * 查找设备的最早可用时间槽
 * @description 在指定日期范围内搜索设备上连续可用且时长满足要求的时间段。
 *   工作时段和搜索范围由 sys_calc_param 配置（默认 8:00-16:00，搜索 30 天）。
 * @param equipment - 目标设备
 * @param existingSchedules - 已有排程记录
 * @param afterTime - 搜索起始时间
 * @param durationHours - 需要的连续时长（小时）
 * @returns 找到的时间槽起止时间，未找到返回 null
 * @private
 */
function findEarliestSlot(
  equipment: Equipment,
  existingSchedules: ScheduleSlot[],
  afterTime: Date,
  durationHours: number
): { start: Date; end: Date } | null {
  const candidateStart = new Date(afterTime);
  const maxSearchDays = CalcParamService.getCachedInt(
    'schedule.search_days_ahead',
    DAYS_AHEAD_DEFAULT
  );

  for (let day = 0; day < maxSearchDays; day++) {
    const dateStr = candidateStart.toISOString().split('T')[0];
    const daySchedules = existingSchedules.filter(
      (s) => s.equipment_id === equipment.id && s.date === dateStr
    );

    const workStart = CalcParamService.getCachedInt('schedule.work_start_hour', 8);
    const workEnd =
      workStart +
      CalcParamService.getCachedInt(
        'schedule.working_hours_per_day',
        WORKING_HOURS_PER_DAY_DEFAULT
      );

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

/**
 * 批量自动排程工单
 * @description 为多个工单批量执行排程计算。处理流程：
 *   1. 获取所有可用设备；
 *   2. 逐个加载工单信息及颜色工序；
 *   3. 无颜色工序的工单自动添加默认工序；
 *   4. 按优先级（urgent > high > normal > low）和截止日期排序；
 *   5. 依次为每个工单调用 calculateScheduleWithColorDependencies 进行排程。
 *
 * @param workOrderIds - 待排程的工单 ID 数组
 * @param options - 排程选项
 * @param options.startDate - 排程起始日期（ISO 字符串），默认为当前日期
 * @param options.respectDeadline - 是否按截止日期排序，默认为 true
 * @param options.priorityWeight - 优先级权重（预留参数）
 * @returns 所有工单的排程结果数组
 */
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

/**
 * 保存排程结果到数据库
 * @description 在事务中批量保存排程结果：
 *   1. 将已排程的工序写入 prd_schedule_detail 表（使用 UPSERT 处理重复键）；
 *   2. 更新工单状态为 'producing'。
 *
 * @param result - 排程结果
 * @returns 保存成功返回 true，失败时记录错误日志并返回 false
 */
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

/**
 * 生成甘特图数据
 * @description 将排程结果转换为前端甘特图可视化所需的数据格式。
 *   将每条工序的起止时间转换为相对于日期范围起点的偏移天数和持续天数。
 *
 * @param results - 排程结果数组
 * @param dateRange - 甘特图显示的时间范围
 * @param dateRange.start - 起始日期
 * @param dateRange.end - 结束日期
 * @returns 甘特图数据结构，每条工单包含产品名称和工序时间列表
 * @example
 * const ganttData = generateGanttData(scheduleResults, {
 *   start: new Date('2026-07-01'),
 *   end: new Date('2026-07-31')
 * });
 */
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
  const _totalDays = (dateRange.end.getTime() - startTime) / (1000 * 60 * 60 * 24);

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
