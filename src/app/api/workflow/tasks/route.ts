import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { WorkflowEngine } from '@/application/workflow/WorkflowEngine';

const workflowEngine = new WorkflowEngine();

// 获取待审批任务列表
export const GET = withPermission(
  async (request: NextRequest, user: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // pending: 待我审批, initiated: 我发起的
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (type === 'initiated') {
      // 我发起的审批
      const rows = (await query(
        `SELECT * FROM wf_approval_instance
       WHERE initiator_id = ?
       ORDER BY create_time DESC
       LIMIT ? OFFSET ?`,
        [user.userId, pageSize, (page - 1) * pageSize]
      )) as any[];

      const countResult: any = await query(
        'SELECT COUNT(*) as total FROM wf_approval_instance WHERE initiator_id = ?',
        [user.userId]
      );
      const total = countResult[0]?.total || 0;

      return successResponse(
        {
          list: rows,
          total,
          page,
          pageSize,
        },
        '获取我发起的审批成功'
      );
    }

    // 待我审批的任务
    const rows = (await query(
      `SELECT t.*, i.source_type, i.source_no, i.source_id,
            i.initiator_name, i.amount, i.create_time as apply_time,
            w.workflow_name
     FROM wf_approval_task t
     LEFT JOIN wf_approval_instance i ON t.instance_id = i.id
     LEFT JOIN wf_workflow_config w ON i.workflow_id = w.id
     WHERE t.approver_id = ? AND t.status = 1 AND i.status = 1
     ORDER BY t.create_time DESC
     LIMIT ? OFFSET ?`,
      [user.userId, pageSize, (page - 1) * pageSize]
    )) as any[];

    const countResult: any = await query(
      `SELECT COUNT(*) as total FROM wf_approval_task t
     LEFT JOIN wf_approval_instance i ON t.instance_id = i.id
     WHERE t.approver_id = ? AND t.status = 1 AND i.status = 1`,
      [user.userId]
    );
    const total = countResult[0]?.total || 0;

    return successResponse(
      {
        list: rows.map((row) => ({
          taskId: row.id,
          instanceId: row.instance_id,
          nodeName: row.node_name,
          sourceType: row.source_type,
          sourceNo: row.source_no,
          sourceId: row.source_id,
          workflowName: row.workflow_name,
          initiatorName: row.initiator_name,
          amount: row.amount,
          applyTime: row.apply_time,
          createTime: row.create_time,
        })),
        total,
        page,
        pageSize,
      },
      '获取待审批任务成功'
    );
  }
);
