import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { invalidateCache } from '@/lib/api-cache';

interface ChangeRequest {
  id?: number;
  module: string;
  config_key: string;
  old_value: string;
  new_value: string;
  change_type: 'create' | 'update' | 'delete';
  reason: string;
  applicant_id: number;
  applicant_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approver_id?: number;
  approver_name?: string;
  approve_time?: string;
  create_time?: string;
}

const APPROVAL_REQUIRED_MODULES = ['单据编码规则', '审批规则', '仓库管理规则', '生产与品质规则'];

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const moduleName = searchParams.get('module') || 'all';

  let sql = `SELECT * FROM sys_config_change_request WHERE 1=1`;
  const params: any[] = [];

  if (status !== 'all') {
    sql += ` AND status = ?`;
    params.push(status);
  }

  if (moduleName !== 'all') {
    sql += ` AND module = ?`;
    params.push(moduleName);
  }

  sql += ` ORDER BY create_time DESC`;

  try {
    const rows = await query(sql, params);
    return successResponse(rows);
  } catch {
    return successResponse([]);
  }
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body: ChangeRequest = await request.json();

    if (!body.module || !body.config_key || !body.new_value) {
      return errorResponse('模块、配置键和新值不能为空', 400);
    }

    const needsApproval = APPROVAL_REQUIRED_MODULES.includes(body.module);

    if (needsApproval) {
      try {
        await execute(
          `INSERT INTO sys_config_change_request
          (module, config_key, old_value, new_value, change_type, reason, applicant_id, applicant_name, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [
            body.module,
            body.config_key,
            body.old_value || '',
            body.new_value,
            body.change_type || 'update',
            body.reason || '',
            body.applicant_id || 0,
            body.applicant_name || '未知',
          ]
        );
      } catch {
        await execute(
          `CREATE TABLE IF NOT EXISTS sys_config_change_request (
          id INT AUTO_INCREMENT PRIMARY KEY,
          module VARCHAR(100) NOT NULL,
          config_key VARCHAR(200) NOT NULL,
          old_value TEXT,
          new_value TEXT NOT NULL,
          change_type VARCHAR(20) DEFAULT 'update',
          reason TEXT,
          applicant_id INT DEFAULT 0,
          applicant_name VARCHAR(100),
          status VARCHAR(20) DEFAULT 'pending',
          approver_id INT,
          approver_name VARCHAR(100),
          approve_time DATETIME,
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_status (status),
          INDEX idx_module (module)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        );

        await execute(
          `INSERT INTO sys_config_change_request
          (module, config_key, old_value, new_value, change_type, reason, applicant_id, applicant_name, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [
            body.module,
            body.config_key,
            body.old_value || '',
            body.new_value,
            body.change_type || 'update',
            body.reason || '',
            body.applicant_id || 0,
            body.applicant_name || '未知',
          ]
        );
      }

      return successResponse({ needsApproval: true }, '变更已提交，等待审批');
    }

    return successResponse({ needsApproval: false }, '变更无需审批，可直接生效');
  },
  { logTitle: '创建变更请求' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, action, approver_id, approver_name } = body;

    if (!id || !action) {
      return errorResponse('变更请求ID和操作类型不能为空', 400);
    }

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse('操作类型无效，仅支持approve/reject', 400);
    }

    const rows = (await query(
      `SELECT * FROM sys_config_change_request WHERE id = ? AND status = 'pending'`,
      [id]
    )) as any[];

    if (rows.length === 0) {
      return errorResponse('变更请求不存在或已处理', 404);
    }

    const changeRequest = rows[0];
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await execute(
      `UPDATE sys_config_change_request
     SET status = ?, approver_id = ?, approver_name = ?, approve_time = NOW()
     WHERE id = ?`,
      [newStatus, approver_id || 0, approver_name || '未知', id]
    );

    if (action === 'approve') {
      try {
        await execute(
          `UPDATE sys_system_config SET config_value = ?, update_time = NOW()
         WHERE config_key = ?`,
          [changeRequest.new_value, changeRequest.config_key]
        );
        await invalidateCache('api:settings');
      } catch {
        // 配置表可能不存在，忽略
      }
    }

    return successResponse(
      { id, status: newStatus },
      action === 'approve' ? '变更已审批通过并生效' : '变更已驳回'
    );
  },
  { logTitle: '审批变更请求' }
);
