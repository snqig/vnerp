import { query, execute, transaction, queryOne } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export interface WorkflowNode {
  id: number;
  workflow_id: number;
  node_name: string;
  node_type: 'start' | 'approve' | 'cc' | 'end';
  node_order: number;
  approver_type: 'single' | 'multi' | 'role' | 'department_head';
  approver_ids: string;
  approver_names: string;
  approval_mode: 'and' | 'or';
  auto_pass_hours: number;
  is_required: boolean;
}

export interface ApprovalInstance {
  id: number;
  workflowId: number;
  workflowName: string;
  sourceType: string;
  sourceId: number;
  sourceNo: string;
  currentNodeId: number;
  currentNodeName: string;
  status: number;
  initiatorId: number;
  initiatorName: string;
  createTime: Date;
  updateTime: Date;
}

export interface ApprovalTask {
  id: number;
  instanceId: number;
  nodeId: number;
  nodeName: string;
  approverId: number;
  approverName: string;
  status: number;
  action?: string;
  comment?: string;
  actionTime?: Date;
}

export class WorkflowEngine {
  async getWorkflowForModule(moduleType: string): Promise<any> {
    const rows = (await query(
      `SELECT * FROM wf_workflow_config 
       WHERE module_type = ? AND is_active = 1 AND deleted = 0
       ORDER BY priority DESC LIMIT 1`,
      [moduleType]
    )) as any[];

    if (rows.length === 0) {
      return null;
    }

    const workflow = rows[0];
    const nodes = (await query(
      'SELECT * FROM wf_workflow_node WHERE workflow_id = ? ORDER BY node_order',
      [workflow.id]
    )) as any[];

    return { ...workflow, nodes };
  }

  async startWorkflow(params: {
    moduleType: string;
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    initiatorId: number;
    initiatorName: string;
    amount?: number;
  }): Promise<{ instanceId: number; message: string }> {
    const { moduleType, sourceType, sourceId, sourceNo, initiatorId, initiatorName, amount } =
      params;

    const workflow = await this.getWorkflowForModule(moduleType);

    if (!workflow) {
      secureLog('warn', 'No workflow configured for module', { moduleType });
      return { instanceId: 0, message: '该模块未配置审批流程' };
    }

    const startNode = workflow.nodes.find((n: WorkflowNode) => n.node_type === 'start');
    const firstApproveNode = workflow.nodes.find((n: WorkflowNode) => n.node_type === 'approve');

    if (!firstApproveNode) {
      return { instanceId: 0, message: '审批流程配置错误，缺少审批节点' };
    }

    const instanceId = await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO wf_approval_instance (
          workflow_id, workflow_name, source_type, source_id, source_no,
          current_node_id, current_node_name, status,
          initiator_id, initiator_name, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW())`,
        [
          workflow.id,
          workflow.workflow_name,
          sourceType,
          sourceId,
          sourceNo,
          firstApproveNode.id,
          firstApproveNode.node_name,
          initiatorId,
          initiatorName,
        ]
      );

      const instId = (result as any).insertId;

      // 创建第一个审批任务
      await this.createApprovalTasks(conn, instId, firstApproveNode);

      // 如果有会签节点（multi），同时创建多个任务
      if (
        firstApproveNode.approval_mode === 'multi' ||
        firstApproveNode.approver_type === 'multi'
      ) {
        const additionalApprovers = await this.getAdditionalApprovers(firstApproveNode, amount);
        for (const approver of additionalApprovers) {
          await conn.execute(
            `INSERT INTO wf_approval_task (
              instance_id, node_id, node_name, approver_id, approver_name,
              status, create_time
            ) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
            [instId, firstApproveNode.id, firstApproveNode.node_name, approver.id, approver.name]
          );
        }
      }

      return instId;
    });

    secureLog('info', 'Workflow started', {
      instanceId,
      sourceNo,
      firstNode: firstApproveNode.node_name,
    });

    return {
      instanceId,
      message: `审批流程已启动，当前节点：${firstApproveNode.node_name}`,
    };
  }

  private async createApprovalTasks(
    conn: any,
    instanceId: number,
    node: WorkflowNode
  ): Promise<void> {
    const approverIds = JSON.parse(node.approver_ids || '[]');
    const approverNames = (node.approver_names || '').split(',').filter(Boolean);

    if (node.approver_type === 'single' && approverIds.length > 0) {
      await conn.execute(
        `INSERT INTO wf_approval_task (
          instance_id, node_id, node_name, approver_id, approver_name,
          status, create_time
        ) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [instanceId, node.id, node.node_name, approverIds[0], approverNames[0] || '审批人']
      );
    } else if (node.approver_type === 'role') {
      const roleApprovers = await this.getRoleApprovers(approverIds);
      for (const approver of roleApprovers) {
        await conn.execute(
          `INSERT INTO wf_approval_task (
            instance_id, node_id, node_name, approver_id, approver_name,
            status, create_time
          ) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
          [instanceId, node.id, node.node_name, approver.id, approver.name]
        );
      }
    } else if (node.approver_type === 'department_head') {
      const deptHead = await this.getDepartmentHead();
      if (deptHead) {
        await conn.execute(
          `INSERT INTO wf_approval_task (
            instance_id, node_id, node_name, approver_id, approver_name,
            status, create_time
          ) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
          [instanceId, node.id, node.node_name, deptHead.id, deptHead.name]
        );
      }
    }
  }

  async processApproval(params: {
    instanceId: number;
    taskId: number;
    approverId: number;
    action: 'approve' | 'reject';
    comment?: string;
  }): Promise<{ success: boolean; message: string; nextNode?: string }> {
    const { instanceId, taskId, approverId, action, comment } = params;

    const task: any = await queryOne(
      'SELECT * FROM wf_approval_task WHERE id = ? AND instance_id = ?',
      [taskId, instanceId]
    );

    if (!task) {
      return { success: false, message: '审批任务不存在' };
    }

    if (task.approver_id !== approverId) {
      return { success: false, message: '您没有该审批任务的权限' };
    }

    if (task.status !== 1) {
      return { success: false, message: '该任务已处理' };
    }

    const instance: any = await queryOne('SELECT * FROM wf_approval_instance WHERE id = ?', [
      instanceId,
    ]);

    if (!instance || instance.status !== 1) {
      return { success: false, message: '审批实例状态异常' };
    }

    const workflow: any = await queryOne('SELECT * FROM wf_workflow_config WHERE id = ?', [
      instance.workflow_id,
    ]);

    const nodes: any[] = await query(
      'SELECT * FROM wf_workflow_node WHERE workflow_id = ? ORDER BY node_order',
      [workflow.id]
    );

    if (action === 'reject') {
      await this.rejectWorkflow(instance, task, comment || '', nodes);
      return { success: true, message: '审批已驳回' };
    }

    // 审批通过
    await execute(
      `UPDATE wf_approval_task SET
        status = 2, action = 'approve', comment = ?, action_time = NOW()
      WHERE id = ?`,
      [comment || null, taskId]
    );

    // 检查是否会签模式
    const currentNode = nodes.find((n) => n.id === task.node_id);
    const nextNode = await this.getNextNode(instance, task, nodes, currentNode);

    if (nextNode) {
      await this.moveToNextNode(instance, nextNode);
      return { success: true, message: '审批通过', nextNode: nextNode.node_name };
    } else {
      await this.completeWorkflow(instance);
      return { success: true, message: '审批流程已完成' };
    }
  }

  private async rejectWorkflow(
    instance: any,
    task: any,
    comment: string,
    nodes: any[]
  ): Promise<void> {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE wf_approval_task SET
          status = 3, action = 'reject', comment = ?, action_time = NOW()
        WHERE id = ?`,
        [comment || null, task.id]
      );

      await conn.execute(
        `UPDATE wf_approval_instance SET
          status = 4, update_time = NOW()
        WHERE id = ?`,
        [instance.id]
      );

      // 查找退回节点（通常退回给提交人）
      const startNode = nodes.find((n) => n.node_type === 'start');
      if (startNode) {
        await conn.execute(
          `INSERT INTO wf_approval_task (
            instance_id, node_id, node_name, approver_id, approver_name,
            status, remark, create_time
          ) VALUES (?, ?, ?, ?, ?, 1, ?, NOW())`,
          [
            instance.id,
            startNode.id,
            startNode.node_name,
            instance.initiator_id,
            instance.initiator_name,
            `被驳回，驳回原因：${comment || '无'}`,
          ]
        );

        await conn.execute(
          `UPDATE wf_approval_instance SET
            current_node_id = ?, current_node_name = ?, status = 1, update_time = NOW()
          WHERE id = ?`,
          [startNode.id, startNode.node_name, instance.id]
        );
      }
    });

    secureLog('info', 'Workflow rejected', {
      instanceId: instance.id,
      rejectedAt: task.node_name,
    });
  }

  private async getNextNode(
    instance: any,
    currentTask: any,
    nodes: any[],
    currentNode: any
  ): Promise<any | null> {
    const currentIndex = nodes.findIndex((n) => n.id === currentNode.id);

    if (currentNode.approval_mode === 'or') {
      // 或签模式：一人通过即进入下一节点
      return nodes[currentIndex + 1] || null;
    }

    // 会签模式：检查是否所有人都已通过
    const pendingTasks: any[] = (await query(
      `SELECT COUNT(*) as count FROM wf_approval_task
       WHERE instance_id = ? AND node_id = ? AND status = 1`,
      [instance.id, currentNode.id]
    )) as any[];

    if (pendingTasks[0]?.count > 0) {
      return null; // 还有人未审批
    }

    return nodes[currentIndex + 1] || null;
  }

  private async moveToNextNode(instance: any, nextNode: any): Promise<void> {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE wf_approval_instance SET
          current_node_id = ?, current_node_name = ?, update_time = NOW()
        WHERE id = ?`,
        [nextNode.id, nextNode.node_name, instance.id]
      );

      if (nextNode.node_type === 'approve') {
        await this.createApprovalTasks(conn, instance.id, nextNode);
      } else if (nextNode.node_type === 'end') {
        await this.completeWorkflowInstance(conn, instance);
      }
    });

    secureLog('info', 'Moved to next node', {
      instanceId: instance.id,
      nextNode: nextNode.node_name,
    });
  }

  private async completeWorkflow(instance: any): Promise<void> {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE wf_approval_instance SET
          status = 3, update_time = NOW()
        WHERE id = ?`,
        [instance.id]
      );

      await this.completeWorkflowInstance(conn, instance);
    });

    secureLog('info', 'Workflow completed', { instanceId: instance.id });
  }

  private async completeWorkflowInstance(conn: any, instance: any): Promise<void> {
    await conn.execute(
      `UPDATE wf_approval_instance SET status = 3, update_time = NOW() WHERE id = ?`,
      [instance.id]
    );

    // 触发业务回调
    await this.triggerBusinessCallback(instance);
  }

  private async triggerBusinessCallback(instance: any): Promise<void> {
    try {
      if (instance.source_type === 'sales_order') {
        await execute(`UPDATE sal_order SET status = 3, audit_time = NOW() WHERE id = ?`, [
          instance.source_id,
        ]);
      } else if (instance.source_type === 'purchase_order') {
        await execute(`UPDATE pur_order SET status = 3, audit_time = NOW() WHERE id = ?`, [
          instance.source_id,
        ]);
      }
    } catch (error) {
      secureLog('error', 'Business callback failed', {
        sourceType: instance.source_type,
        sourceId: instance.source_id,
        error: String(error),
      });
    }
  }

  private async getAdditionalApprovers(
    node: WorkflowNode,
    amount?: number
  ): Promise<Array<{ id: number; name: string }>> {
    return [];
  }

  private async getRoleApprovers(roleIds: string[]): Promise<Array<{ id: number; name: string }>> {
    if (!roleIds || roleIds.length === 0) return [];

    const rows = (await query(
      `SELECT u.id, u.real_name as name FROM sys_user u
       LEFT JOIN sys_user_role ur ON u.id = ur.user_id
       WHERE ur.role_id IN (?) AND u.status = 1 LIMIT 5`,
      [roleIds]
    )) as any[];

    return rows;
  }

  private async getDepartmentHead(): Promise<{ id: number; name: string } | null> {
    const rows = (await query(
      `SELECT id, real_name as name FROM sys_user
       WHERE position LIKE '%主管%' OR position LIKE '%经理%' LIMIT 1`
    )) as any[];

    return rows.length > 0 ? rows[0] : null;
  }

  async getPendingTasks(userId: number): Promise<any[]> {
    const rows = (await query(
      `SELECT t.*, i.source_type, i.source_no, i.initiator_name, i.create_time as apply_time
       FROM wf_approval_task t
       LEFT JOIN wf_approval_instance i ON t.instance_id = i.id
       WHERE t.approver_id = ? AND t.status = 1 AND i.status = 1
       ORDER BY t.create_time DESC`,
      [userId]
    )) as any[];

    return rows;
  }

  async getApprovalHistory(sourceType: string, sourceId: number): Promise<any[]> {
    const instance: any = await queryOne(
      'SELECT id FROM wf_approval_instance WHERE source_type = ? AND source_id = ?',
      [sourceType, sourceId]
    );

    if (!instance) {
      return [];
    }

    const tasks = (await query(
      `SELECT * FROM wf_approval_task WHERE instance_id = ? ORDER BY action_time`,
      [instance.id]
    )) as any[];

    return tasks;
  }
}
