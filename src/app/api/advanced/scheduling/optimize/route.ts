import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { GeneticScheduler, ProductionJob } from '@/lib/production-planning/genetic-scheduler';

export const POST = withPermission(async (request: NextRequest) => {
  const { machineIds, horizonDays = 7 } = await request.json();

  const workOrders = await query<{
    id: number;
    work_order_no: string;
    quantity: number;
    plan_start_date: string;
    plan_end_date: string;
    priority: string;
  }>(
    `SELECT id, work_order_no, quantity, plan_start_date, plan_end_date, priority
     FROM prod_work_order
     WHERE status IN ('pending', 'confirmed', 'producing') AND deleted = 0
       AND plan_start_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
     ORDER BY FIELD(priority, 'urgent', 'high', 'normal', 'low'), plan_start_date ASC`,
    [horizonDays]
  );

  if (workOrders.length === 0) {
    return successResponse({
      jobs: [],
      makespan: 0,
      lateness: 0,
      cost: 0,
      message: '没有待排产的工单',
    });
  }

  // 工单不直接关联设备，从工单ID派生虚拟机台，capacity 默认480件/班
  const machines = machineIds
    ? machineIds.map((id: number) => ({ id, capacity: 480 }))
    : [{ id: 1, capacity: 480 }];

  const priorityScore: Record<string, number> = { urgent: 1, high: 2, normal: 3, low: 4 };
  const jobs: ProductionJob[] = workOrders.map((wo, idx) => ({
    jobId: idx + 1,
    workOrderId: wo.id,
    machineId: machines[0].id,
    duration: Math.max(30, Math.round(Number(wo.quantity) / machines[0].capacity * 60)),
    dueDate: new Date(wo.plan_end_date || Date.now() + 7 * 86400000),
    priority: priorityScore[wo.priority] || 3,
    setupTime: 30,
  }));

  const scheduler = new GeneticScheduler(jobs, machines);
  const schedule = await scheduler.optimize();

  return successResponse({
    workOrderCount: workOrders.length,
    ...schedule,
    jobs: schedule.jobs.map((item) => ({
      workOrderId: item.job.workOrderId,
      machineId: item.job.machineId,
      startTime: item.startTime.toISOString(),
      endTime: item.endTime.toISOString(),
      duration: item.job.duration,
    })),
  });
});
