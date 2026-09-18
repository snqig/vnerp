import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { invalidateCache } from '@/lib/api-cache';
import { isSecretConfigKey, maskSecretValue } from '@/lib/config-secret';
import type { DbRow } from '@/types/db';

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
  const params: SqlValue[] = [];

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
    const rows = (await query(sql, params)) as DbRow[];
    // 凭证类键（如 sys.default.password）的旧值/新值一律脱敏（BUG-SET-006 ②）。
    // 申请单本身必须保留真实 new_value 才能在其后的审批里落库，
    // 因此只在**出口**脱敏，不改写库内数据。
    return successResponse(
      rows.map((row: DbRow) =>
        isSecretConfigKey(row.config_key)
          ? { ...row, old_value: maskSecretValue(row.old_value), new_value: maskSecretValue(row.new_value) }
          : row
      )
    );
  } catch {
    return successResponse([]);
  }
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body: ChangeRequest = await request.json();

    if (!body.module || !body.config_key || !body.new_value) {
      return errorResponse(ts('k_t2883z'), 400);
    }

    const needsApproval = APPROVAL_REQUIRED_MODULES.includes(body.module);

    if (needsApproval) {
      // 说明：原实现在 INSERT 失败时用 `CREATE TABLE IF NOT EXISTS` 在请求路径里懒建表
      // （与 system/route.ts 把翻译词条当 DDL 执行是同一类缺陷，BUG-SET-002 / 012）。
      // 表结构现由 database/migrations/079_settings_config_schema.sql 正式创建；
      // 此处不再持有 DDL，失败即抛出，不再静默降级。
      await execute(
        `INSERT INTO sys_config_change_request
          (module, config_key, old_value, new_value, change_type, reason, applicant_id, applicant_name, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          body.module,
          body.config_key,
          isSecretConfigKey(body.config_key) ? maskSecretValue(body.old_value) : body.old_value || '',
          body.new_value,
          body.change_type || 'update',
          body.reason || '',
          body.applicant_id || 0,
          body.applicant_name || ts('k_1lpnuh4'),
        ]
      );

      return successResponse({ needsApproval: true }, ts('k_pu7br7'));
    }

    return successResponse({ needsApproval: false }, ts('k_cy9qye'));
  },
  { logTitle: '创建变更请求' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action, approver_id, approver_name } = body;

    if (!id || !action) {
      return errorResponse(ts('k_1cws6ei'), 400);
    }

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse(ts('k_1mirw18'), 400);
    }

    const rows = (await query(
      `SELECT * FROM sys_config_change_request WHERE id = ? AND status = 'pending'`,
      [id]
    )) as DbRow[];

    if (rows.length === 0) {
      return errorResponse(ts('k_py70p'), 404);
    }

    const changeRequest = rows[0];
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 顺序很关键：先写配置、成功后再把申请单标记为已通过。
    // 原实现先标记 approved 再吞掉配置写入异常，会造成「审批已通过但配置未生效」的假象，
    // 且生效语句写错了表名（sys_system_config 不存在，真表为 sys_config）导致 100% 静默失败。
    if (action === 'approve') {
      await execute(
        `UPDATE sys_config SET config_value = ?, update_time = NOW()
       WHERE config_key = ?`,
        [changeRequest.new_value, changeRequest.config_key]
      );
      await invalidateCache('api:settings');
    }

    await execute(
      `UPDATE sys_config_change_request
     SET status = ?, approver_id = ?, approver_name = ?, approve_time = NOW()
     WHERE id = ?`,
      [newStatus, approver_id || 0, approver_name || ts('k_1lpnuh4'), id]
    );

    return successResponse(
      { id, status: newStatus },
      action === 'approve' ? ts('k_a0vj4x') : ts('k_1cdacvs')
    );
  },
  { logTitle: '审批变更请求' }
);
