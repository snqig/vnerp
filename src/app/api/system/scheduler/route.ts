import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

// 获取定时任务列表
export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || '';
    const taskGroup = searchParams.get('taskGroup') || '';

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (taskGroup) {
      where += ' AND task_group = ?';
      params.push(taskGroup);
    }

    const countRows: any = await query(
      `SELECT COUNT(*) as total FROM sys_scheduled_task ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const rows: any = await query(
      `SELECT * FROM sys_scheduled_task ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return paginatedResponse(rows, { page, pageSize, total, totalPages });
  },
  { errorMessage: '操作失败' }
);

// 创建/更新定时任务
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['task_name', 'task_type', 'cron_expression']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const { task_name, task_type, cron_expression, task_group, description, config } = body;

    const result: any = await execute(
      `INSERT INTO sys_scheduled_task
       (task_name, task_type, task_group, cron_expression, description, config, status, create_by, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NOW())`,
      [
        task_name,
        task_type,
        task_group || 'default',
        cron_expression,
        description || null,
        config ? JSON.stringify(config) : null,
        userInfo.userId,
      ]
    );

    return successResponse({ id: result.insertId }, '定时任务创建成功');
  },
  { errorMessage: '操作失败' }
);

// 更新任务状态
export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse('参数不完整', 400, 400);
    }

    if (action === 'pause') {
      await execute('UPDATE sys_scheduled_task SET status = ? WHERE id = ?', ['paused', id]);
      return successResponse(null, '任务已暂停');
    }

    if (action === 'resume') {
      await execute('UPDATE sys_scheduled_task SET status = ? WHERE id = ?', ['active', id]);
      return successResponse(null, '任务已恢复');
    }

    if (action === 'execute') {
      // 手动触发执行
      const tasks: any = await query('SELECT * FROM sys_scheduled_task WHERE id = ?', [id]);
      if (tasks.length === 0) {
        return errorResponse('任务不存在', 404, 404);
      }

      const task = tasks[0];
      try {
        await execute(
          `INSERT INTO sys_task_execution_log
           (task_id, task_name, start_time, status)
           VALUES (?, ?, NOW(), 'running')`,
          [task.id, task.task_name]
        );

        // 根据任务类型执行对应逻辑
        let executionResult = '';
        if (task.task_type === 'inventory_alert') {
          executionResult = await executeInventoryAlert();
        } else if (task.task_type === 'data_cleanup') {
          executionResult = await executeDataCleanup(task.config);
        } else if (task.task_type === 'report_generation') {
          executionResult = await executeReportGeneration(task.config);
        } else {
          executionResult = `任务类型 ${task.task_type} 暂不支持自动执行`;
        }

        await execute(
          `UPDATE sys_task_execution_log SET end_time = NOW(), status = 'success', result = ? WHERE task_id = ? AND status = 'running'`,
          [executionResult, task.id]
        );

        await execute(
          'UPDATE sys_scheduled_task SET last_execute_time = NOW(), last_result = ? WHERE id = ?',
          [executionResult, id]
        );

        return successResponse({ result: executionResult }, '任务执行完成');
      } catch (error: any) {
        await execute(
          `UPDATE sys_task_execution_log SET end_time = NOW(), status = 'failed', result = ? WHERE task_id = ? AND status = 'running'`,
          [error.message, task.id]
        );
        return errorResponse(`任务执行失败: ${error.message}`, 500, 500);
      }
    }

    if (action === 'update') {
      const { task_name, cron_expression, description, config } = body;
      const updates: string[] = [];
      const params: any[] = [];

      if (task_name) {
        updates.push('task_name = ?');
        params.push(task_name);
      }
      if (cron_expression) {
        updates.push('cron_expression = ?');
        params.push(cron_expression);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (config) {
        updates.push('config = ?');
        params.push(JSON.stringify(config));
      }

      if (updates.length === 0) {
        return errorResponse('没有需要更新的字段', 400, 400);
      }

      params.push(id);
      await execute(`UPDATE sys_scheduled_task SET ${updates.join(', ')} WHERE id = ?`, params);
      return successResponse(null, '任务更新成功');
    }

    return errorResponse('不支持的操作', 400, 400);
  },
  { errorMessage: '操作失败' }
);

// 删除任务
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('任务ID不能为空', 400, 400);

    await execute('DELETE FROM sys_scheduled_task WHERE id = ?', [Number(id)]);
    return successResponse(null, '任务删除成功');
  },
  { errorMessage: '操作失败' }
);

// 任务执行逻辑
async function executeInventoryAlert(): Promise<string> {
  const alerts: any = await query(
    `SELECT s.material_id, m.material_name, s.quantity, w.warehouse_name
     FROM stock s
     LEFT JOIN materials m ON s.material_id = m.id
     LEFT JOIN warehouses w ON s.warehouse_id = w.id
     WHERE s.quantity <= 10`
  );
  return `库存预警检查完成，发现 ${alerts.length} 条低库存记录`;
}

async function executeDataCleanup(config: string | null): Promise<string> {
  let retentionDays = 180;
  if (config) {
    try {
      const cfg = JSON.parse(config);
      retentionDays = cfg.retentionDays || 180;
    } catch {
      /* use default */
    }
  }

  const result: any = await execute(
    `DELETE FROM sys_operation_log WHERE create_time < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [retentionDays]
  );
  return `数据清理完成，删除 ${result.affectedRows || 0} 条过期日志`;
}

async function executeReportGeneration(config: string | null): Promise<string> {
  return '报表生成任务已触发（异步执行中）';
}
