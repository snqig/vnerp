import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { GeneticScheduler, ProductionJob } from '@/lib/production-planning/genetic-scheduler';

export const POST = withPermission(async (request: NextRequest) => {
  const { machineIds, horizonDays = 7 } = await request.json();

  const workOrders = await query<{
    id: number;
    work_order_no: string;
    machine_id: number;
    plan_qty: number;
    plan_start_date: string;
    plan_end_date: string;
    priority: number;
  }>(
    `SELECT id, work_order_no, machine_id, plan_qty, plan_start_date, plan_end_date, priority
     FROM prd_work_order WHERE status < 4 AND deleted = 0
     AND plan_start_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
     ORDER BY priority ASC, plan_start_date ASC`,
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

  const machines = machineIds
    ? machineIds.map((id: number) => ({ id, capacity: 480 }))
    : [...new Set(workOrders.map((wo) => wo.machine_id))].map((id) => ({ id, capacity: 480 }));

  const jobs: ProductionJob[] = workOrders.map((wo, idx) => ({
    jobId: idx + 1,
    workOrderId: wo.id,
    machineId: wo.machine_id,
    duration: Math.max(30, Math.round(Number(wo.plan_qty) * 0.5)),
    dueDate: new Date(wo.plan_end_date || Date.now() + 7 * 86400000),
    priority: wo.priority || 3,
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
