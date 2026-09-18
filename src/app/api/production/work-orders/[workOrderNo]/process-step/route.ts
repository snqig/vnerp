import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ProcessStepStateMachine } from '@/domain/production/value-objects/WorkOrderStateMachine';
import type { DbRow } from '@/types/db';

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
const VALID_STATUSES: StepStatus[] = ['pending', 'in_progress', 'completed', 'skipped', 'failed'];

interface StepRow {
  id: number;
  work_order_id: number;
  step_no: number;
  step_name: string;
  process_type: string;
  status: string;
  start_time: Date | null;
  end_time: Date | null;
  remark: string | null;
}

function mapStep(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    stepNo: row.step_no,
    stepName: row.step_name,
    processType: row.process_type,
    status: row.status,
    startTime: row.start_time ? String(row.start_time) : null,
    endTime: row.end_time ? String(row.end_time) : null,
    remark: row.remark || '',
  };
}

async function getDefaultRouteId(): Promise<number> {
  const def = (await query(
    'SELECT id FROM prd_process_route WHERE deleted = 0 AND is_default = 1 LIMIT 1'
  )) as DbRow[];
  return def[0] ? (def[0].id as number) : 1;
}

// 惰性播种：若该工单尚无工序步骤，则按工艺路线（process_id 或默认路线）生成实例步骤
// 并发/StrictMode 双跑下，同一工单的 ensureSteps 可能被并发调用，
// 而原防重仅靠 SELECT COUNT(*) 在并发下会全部读到 0 → 重复插入步骤。
// 用 module-level Promise 锁把同 work_order_id 的 ensureSteps 串行化，
// 保证同一工单的“查重+插入”只执行一次（配合已清理的历史冗余数据，彻底防复发）。
const ensureLocks = new Map<number, Promise<void>>();

async function ensureSteps(workOrderId: number, processId: number | null, woStatus: string) {
  const running = ensureLocks.get(workOrderId);
  if (running) return running;
  const p = (async () => {
    const existing = (await query(
      'SELECT COUNT(*) c FROM prod_work_order_process_step WHERE work_order_id = ? AND deleted = 0',
      [workOrderId]
    )) as DbRow[];
    if (existing[0].c > 0) return;

    const routeId = processId || (await getDefaultRouteId());
    const steps = (await query(
      'SELECT step_seq, step_name, step_type, standard_time, equipment_type FROM prd_process_route_step WHERE route_id = ? ORDER BY step_seq ASC',
      [routeId]
    )) as DbRow[];
    if (!steps.length) return;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const processType = s.step_type === 2 ? 'inspection' : 'production';
      let status: StepStatus = 'pending';
      let startTime: Date | null = null;
      let endTime: Date | null = null;
      if (woStatus === 'completed') {
        status = 'completed';
        startTime = new Date();
        endTime = new Date();
      } else if (woStatus === 'producing' && i === 0) {
        status = 'in_progress';
        startTime = new Date();
      }
      try {
        await execute(
          `INSERT INTO prod_work_order_process_step
            (work_order_id, step_no, step_name, process_type, estimated_duration, equipment_id, status, start_time, end_time, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            workOrderId,
            s.step_seq,
            s.step_name,
            processType,
            s.standard_time || null,
            s.equipment_type || null,
            status,
            startTime,
            endTime,
          ]
        );
      } catch (insertErr: unknown) {
        // 数据库层唯一索引 uk_wo_step_active 兜底：即使 per-工单串行锁在
        // 进程重启的竞态窗口失效，重复插入也会被唯一索引拦下。忽略该冲突，
        // 保证 ensureSteps 幂等、不因并发重复而抛 500。
        const code = (insertErr as { code?: string; errno?: number })?.code;
        const errno = (insertErr as { errno?: number })?.errno;
        if (code === 'ER_DUP_ENTRY' || errno === 1062) continue;
        throw insertErr;
      }
    }
  })();
  ensureLocks.set(workOrderId, p);
  try {
    await p;
  } finally {
    ensureLocks.delete(workOrderId);
  }
  return p;
}

async function resolveWorkOrderNo(
  request: NextRequest,
  context?: { params?: { workOrderNo?: string } | Promise<{ workOrderNo?: string }> }
): Promise<string> {
  // Next 16 动态路由 params 为 Promise；await 兼容 Promise 与旧版对象两种形态，再以 URL 兜底
  const fromParams = context?.params
    ? (await (context.params as Promise<{ workOrderNo?: string }>)).workOrderNo
    : undefined;
  return Promise.resolve(fromParams || new URL(request.url).pathname.split('/').pop() || '');
}

export const GET = withPermission(
  async (request: NextRequest, _userInfo: unknown, context?: { params?: { workOrderNo?: string } | Promise<{ workOrderNo?: string }> }) => {
    const workOrderNo = await resolveWorkOrderNo(request, context);
    if (!workOrderNo) return commonErrors.badRequest('缺少工单号');

    const woRows = (await query(
      'SELECT id, status, process_id FROM prod_work_order WHERE work_order_no = ? AND deleted = 0',
      [workOrderNo]
    )) as DbRow[];
    if (!woRows.length) return commonErrors.notFound('工单不存在');

    const row = woRows[0];
    await ensureSteps(row.id as number, (row.process_id as number | null) ?? null, row.status as string);

    const steps = (await query(
      'SELECT * FROM prod_work_order_process_step WHERE work_order_id = ? AND deleted = 0 ORDER BY step_no ASC',
      [row.id]
    )) as DbRow[];

    return successResponse({ list: steps.map(mapStep), workOrderNo });
  },
  { errorMessage: '获取工序进度失败' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo: unknown, context?: { params?: { workOrderNo?: string } | Promise<{ workOrderNo?: string }> }) => {
    const workOrderNo = await resolveWorkOrderNo(request, context);
    if (!workOrderNo) return commonErrors.badRequest('缺少工单号');

    const body = await request.json();
    const { stepId, status } = body as { stepId?: number; status?: string };
    if (!stepId || !status) return commonErrors.badRequest('缺少 stepId 或 status');
    if (!VALID_STATUSES.includes(status as StepStatus)) {
      return errorResponse(`非法的工序状态: ${status}`, 400, 400);
    }

    const stepRows = (await query(
      'SELECT * FROM prod_work_order_process_step WHERE id = ? AND deleted = 0',
      [stepId]
    )) as DbRow[];
    if (!stepRows.length) return commonErrors.notFound('工序步骤不存在');

    const step = stepRows[0] as unknown as StepRow;
    if (!ProcessStepStateMachine.canTransition(step.status as StepStatus, status as StepStatus)) {
      return errorResponse(
        `工序状态不允许从"${step.status}"流转到"${status}"`,
        400,
        400
      );
    }

    let startTime = step.start_time;
    let endTime = step.end_time;
    if (status === 'in_progress' && !startTime) startTime = new Date();
    if (status === 'completed') endTime = new Date();
    if (status === 'pending') {
      startTime = null;
      endTime = null;
    }

    await execute(
      'UPDATE prod_work_order_process_step SET status = ?, start_time = ?, end_time = ?, update_time = NOW() WHERE id = ?',
      [status, startTime, endTime, stepId]
    );

    const updated = (await query(
      'SELECT * FROM prod_work_order_process_step WHERE id = ?',
      [stepId]
    )) as DbRow[];

    return successResponse(mapStep(updated[0]), '工序状态已更新');
  },
  { logTitle: '更新工序进度', logType: 'production' }
);
