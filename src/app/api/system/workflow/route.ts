import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { WorkflowEngine } from '@/application/workflow/WorkflowEngine';

const workflowEngine = new WorkflowEngine();

// 获取所有审批流程配置
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const moduleType = searchParams.get('module'); // 模块: sales_order, purchase_order, etc.
  const isActive = searchParams.get('isActive');

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (moduleType) {
    whereClause += ' AND module_type = ?';
    params.push(moduleType);
  }

  if (isActive !== null) {
    whereClause += ' AND is_active = ?';
    params.push(isActive === 'true' ? 1 : 0);
  }

  const workflows = (await query(
    `SELECT * FROM wf_workflow_config ${whereClause} ORDER BY priority DESC, create_time DESC`,
    params
  )) as any[];

  const result = await Promise.all(
    (workflows as any[]).map(async (wf: any) => {
      const nodes = (await query(
        'SELECT * FROM wf_workflow_node WHERE workflow_id = ? ORDER BY node_order',
        [wf.id]
      )) as any[];
      return { ...wf, nodes };
    })
  );

  return successResponse({ list: result }, '获取审批流程配置成功');
});

// 创建审批流程配置
export const POST = withPermission(async (request: NextRequest, user: UserInfo) => {
  const body = await request.json();
  const { workflowName, moduleType, description, nodes, isActive = false, priority = 0 } = body;

  if (!workflowName || !moduleType) {
    return errorResponse('流程名称和模块类型不能为空', 400, 400);
  }

  if (!nodes || nodes.length === 0) {
    return errorResponse('至少需要配置一个审批节点', 400, 400);
  }

  // 创建流程配置
  const result: any = await execute(
    `INSERT INTO wf_workflow_config (
      workflow_name, module_type, description, is_active, priority,
      create_by, create_time, update_time, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
    [workflowName, moduleType, description || null, isActive ? 1 : 0, priority, user.userId]
  );

  const workflowId = result.insertId;

  // 创建节点配置
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    await execute(
      `INSERT INTO wf_workflow_node (
        workflow_id, node_name, node_type, node_order,
        approver_type, approver_ids, approver_names,
        approval_mode, auto_pass_hours, is_required, remark,
        create_time, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [
        workflowId,
        node.nodeName,
        node.nodeType, // start, approve, cc, end
        i + 1,
        node.approverType, // single, multi, role, department_head
        JSON.stringify(node.approverIds || []),
        node.approverNames || '',
        node.approvalMode || 'and', // and: 会签, or: 或签
        node.autoPassHours || 0,
        node.isRequired !== false ? 1 : 0,
        node.remark || null,
      ]
    );
  }

  return successResponse(
    {
      workflowId,
      workflowName,
    },
    '审批流程创建成功'
  );
});

// 更新审批流程配置
export const PUT = withPermission(async (request: NextRequest, user: UserInfo) => {
  const body = await request.json();
  const { workflowId, workflowName, description, nodes, isActive, priority } = body;

  if (!workflowId) {
    return errorResponse('流程ID不能为空', 400, 400);
  }

  // 更新流程配置
  await execute(
    `UPDATE wf_workflow_config SET
      workflow_name = COALESCE(?, workflow_name),
      description = COALESCE(?, description),
      is_active = COALESCE(?, is_active),
      priority = COALESCE(?, priority),
      update_time = NOW()
    WHERE id = ? AND deleted = 0`,
    [
      workflowName || null,
      description || null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      priority || null,
      workflowId,
    ]
  );

  // 如果有节点配置，更新节点
  if (nodes && nodes.length > 0) {
    // 删除旧节点
    await execute('DELETE FROM wf_workflow_node WHERE workflow_id = ?', [workflowId]);

    // 创建新节点
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      await execute(
        `INSERT INTO wf_workflow_node (
          workflow_id, node_name, node_type, node_order,
          approver_type, approver_ids, approver_names,
          approval_mode, auto_pass_hours, is_required, remark,
          create_time, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [
          workflowId,
          node.nodeName,
          node.nodeType,
          i + 1,
          node.approverType,
          JSON.stringify(node.approverIds || []),
          node.approverNames || '',
          node.approvalMode || 'and',
          node.autoPassHours || 0,
          node.isRequired !== false ? 1 : 0,
          node.remark || null,
        ]
      );
    }
  }

  return successResponse({ workflowId }, '审批流程更新成功');
});

// 删除审批流程配置
export const DELETE = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return errorResponse('流程ID不能为空', 400, 400);
  }

  // 检查是否有正在进行的审批实例
  const activeInstances = (await query(
    'SELECT COUNT(*) as count FROM wf_approval_instance WHERE workflow_id = ? AND status IN (1, 2)',
    [workflowId]
  )) as any[];

  if (activeInstances[0]?.count > 0) {
    return errorResponse('该流程有正在进行的审批实例，无法删除', 400, 400);
  }

  // 软删除
  await execute('UPDATE wf_workflow_config SET deleted = 1, update_time = NOW() WHERE id = ?', [
    workflowId,
  ]);

  return successResponse(null, '审批流程删除成功');
});
