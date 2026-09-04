import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { WorkflowEngine } from '@/application/workflow/WorkflowEngine';
import type { DbRow } from '@/types/db';

const workflowEngine = new WorkflowEngine();

// 执行审批操作
export const POST = withPermission(
  async (request: NextRequest, user: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { instanceId, taskId, action, comment } = body;

    if (!instanceId || !taskId || !action) {
      return errorResponse(ts('k_1jhw5lg'), 400, 400);
    }

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse(ts('k_19dupyx'), 400, 400);
    }

    try {
      const result = await workflowEngine.processApproval({
        instanceId: parseInt(instanceId),
        taskId: parseInt(taskId),
        approverId: user.userId,
        action,
        comment,
      });

      if (!result.success) {
        return errorResponse(result.message, 400, 400);
      }

      return successResponse(
        {
          instanceId: parseInt(instanceId),
          taskId: parseInt(taskId),
          action,
          message: result.message,
          nextNode: result.nextNode,
        },
        result.message
      );
    } catch (error) {
      return errorResponse(ts('k_r1v0zd') + (error as Error).message, 500, 500);
    }
  },
  { logTitle: '执行审批操作' }
);

// 获取审批详情
export const GET = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get('instanceId');
  const sourceType = searchParams.get('sourceType');
  const sourceId = searchParams.get('sourceId');

  if (!instanceId && !(sourceType && sourceId)) {
    return errorResponse(ts('k_11ms3jh'), 400, 400);
  }

  let instance;
  if (instanceId) {
    const rows = (await query('SELECT * FROM wf_approval_instance WHERE id = ?', [
      instanceId,
    ])) as DbRow[];
    instance = rows[0];
  } else {
    const rows = (await query(
      'SELECT * FROM wf_approval_instance WHERE source_type = ? AND source_id = ?',
      [sourceType, sourceId]
    )) as DbRow[];
    instance = rows[0];
  }

  if (!instance) {
    return errorResponse(ts('k_gewfjb'), 404, 404);
  }

  // 获取任务列表
  const tasks = (await query(
    `SELECT t.*, u.real_name as approver_real_name
     FROM wf_approval_task t
     LEFT JOIN sys_user u ON t.approver_id = u.id
     WHERE t.instance_id = ?
     ORDER BY t.create_time ASC`,
    [instance.id]
  )) as DbRow[];

  // 获取流程配置
  const workflow: unknown = (await query('SELECT * FROM wf_workflow_config WHERE id = ?', [
    instance.workflow_id,
  ])) as DbRow[];

  const nodes =
    workflow.length > 0
      ? await query('SELECT * FROM wf_workflow_node WHERE workflow_id = ? ORDER BY node_order', [
          workflow[0].id,
        ])
      : [];

  return successResponse(
    {
      instance: {
        id: instance.id,
        workflowId: instance.workflow_id,
        workflowName: instance.workflow_name,
        sourceType: instance.source_type,
        sourceId: instance.source_id,
        sourceNo: instance.source_no,
        currentNodeName: instance.current_node_name,
        status: instance.status,
        initiatorName: instance.initiator_name,
        amount: instance.amount,
        createTime: instance.create_time,
        completeTime: instance.complete_time,
      },
      workflow:
        workflow.length > 0
          ? {
              id: workflow[0].id,
              name: workflow[0].workflow_name,
              nodes: nodes.map((n: DbRow) => ({
                id: n.id,
                name: n.node_name,
                type: n.node_type,
                order: n.node_order,
                approverType: n.approver_type,
                approverNames: n.approver_names,
                approvalMode: n.approval_mode,
              })),
            }
          : null,
      tasks: tasks.map((t: DbRow) => ({
        id: t.id,
        nodeId: t.node_id,
        nodeName: t.node_name,
        approverId: t.approver_id,
        approverName: t.approver_name,
        approverRealName: t.approver_real_name,
        status: t.status,
        action: t.action,
        comment: t.comment,
        actionTime: t.action_time,
        createTime: t.create_time,
      })),
    },
    ts('k_1ql9z8u')
  );
});
