import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 库存预警推送 API
 *
 * 支持站内信、邮件推送库存预警通知
 * 可配置预警规则和推送方式
 */

// 获取预警推送配置
export const GET = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'config';

    if (type === 'config') {
      // 获取推送配置
      const configs: any = await query(
        'SELECT * FROM sys_config WHERE config_group = ? ORDER BY sort_order',
        ['inventory_alert']
      );
      return successResponse({ configs });
    }

    if (type === 'notifications') {
      // 获取预警通知列表
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '20');
      const unreadOnly = searchParams.get('unread') === 'true';

      let where = 'WHERE n.type = ?';
      const params: any[] = ['inventory_alert'];

      if (unreadOnly) {
        where += ' AND n.is_read = 0';
      }

      // 优先显示当前用户的通知
      where += ' AND (n.user_id = ? OR n.user_id IS NULL)';
      params.push(userInfo.userId);

      const countRows: any = await query(
        `SELECT COUNT(*) as total FROM sys_notification n ${where}`,
        params
      );
      const total = countRows[0]?.total || 0;

      const rows: any = await query(
        `SELECT n.* FROM sys_notification n ${where}
         ORDER BY n.create_time DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize]
      );

      return successResponse({ list: rows, total, page, pageSize });
    }

    if (type === 'rules') {
      // 获取预警规则
      const rules: any = await query('SELECT * FROM inv_alert_rule WHERE deleted = 0 ORDER BY id');
      return successResponse({ rules });
    }

    return errorResponse('无效的查询类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);

// 创建/更新预警规则 或 手动触发推送
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { action } = body;

    if (action === 'push') {
      // 手动触发预警推送
      return await triggerAlertPush(userInfo);
    }

    if (action === 'create_rule') {
      // 创建预警规则
      const {
        rule_name,
        material_id,
        warehouse_id,
        alert_type,
        threshold,
        notify_method,
        notify_users,
      } = body;

      if (!rule_name || !alert_type || threshold === undefined) {
        return errorResponse('规则名称、预警类型和阈值不能为空', 400, 400);
      }

      const result: any = await execute(
        `INSERT INTO inv_alert_rule
         (rule_name, material_id, warehouse_id, alert_type, threshold, notify_method, notify_users, enabled, create_by, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
        [
          rule_name,
          material_id || null,
          warehouse_id || null,
          alert_type,
          threshold,
          notify_method || 'in_app',
          notify_users || null,
          userInfo.userId,
        ]
      );

      return successResponse({ id: result.insertId }, '预警规则创建成功');
    }

    if (action === 'mark_read') {
      // 标记通知已读
      const { notification_ids } = body;
      if (!notification_ids || !Array.isArray(notification_ids)) {
        return errorResponse('通知ID列表不能为空', 400, 400);
      }
      await execute(`UPDATE sys_notification SET is_read = 1, read_time = NOW() WHERE id IN (?)`, [
        notification_ids.join(','),
      ]);
      return successResponse(null, '已标记为已读');
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);

// 更新预警规则
export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();
    const { id, rule_name, alert_type, threshold, notify_method, notify_users, enabled } = body;

    if (!id) {
      return errorResponse('规则ID不能为空', 400, 400);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (rule_name !== undefined) {
      updates.push('rule_name = ?');
      params.push(rule_name);
    }
    if (alert_type !== undefined) {
      updates.push('alert_type = ?');
      params.push(alert_type);
    }
    if (threshold !== undefined) {
      updates.push('threshold = ?');
      params.push(threshold);
    }
    if (notify_method !== undefined) {
      updates.push('notify_method = ?');
      params.push(notify_method);
    }
    if (notify_users !== undefined) {
      updates.push('notify_users = ?');
      params.push(notify_users);
    }
    if (enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return errorResponse('没有需要更新的字段', 400, 400);
    }

    updates.push('update_time = NOW()');
    params.push(id);

    await execute(`UPDATE inv_alert_rule SET ${updates.join(', ')} WHERE id = ?`, params);

    return successResponse(null, '预警规则更新成功');
  },
  { errorMessage: '操作失败' }
);

// 触发预警推送
async function triggerAlertPush(userInfo: UserInfo) {
  // 查询所有低于安全库存的物料
  const alerts: any = await query(
    `SELECT s.material_id, s.warehouse_id, s.quantity, m.material_name, m.material_code, m.safety_stock, m.unit,
            w.warehouse_name
     FROM stock s
     LEFT JOIN materials m ON s.material_id = m.id
     LEFT JOIN warehouses w ON s.warehouse_id = w.id
     WHERE s.quantity <= COALESCE(m.safety_stock, 0) AND s.quantity >= 0 AND m.safety_stock > 0`
  );

  if (alerts.length === 0) {
    return successResponse({ alertCount: 0 }, tc('text_dh7pir'));
  }

  // 获取需要通知的用户（仓库管理员和系统管理员）
  const notifyUsers: any = await query(
    `SELECT u.id, u.real_name, u.email FROM sys_user u
     WHERE u.status = 1 AND (u.role_id IN (SELECT id FROM sys_role WHERE role_key IN ('admin', 'warehouse_manager')) OR u.id = ?)`,
    [userInfo.userId]
  );

  let pushCount = 0;

  for (const alert of alerts) {
    const title = `库存预警：${alert.material_name} 库存不足`;
    const content = `物料 ${alert.material_code}(${alert.material_name}) 在仓库 ${alert.warehouse_name} 的当前库存为 ${alert.quantity} ${alert.unit || ''}，低于安全库存 ${alert.safety_stock} ${alert.unit || ''}，请及时补货。`;

    for (const user of notifyUsers) {
      await execute(
        `INSERT INTO sys_notification (type, title, content, user_id, is_read, create_time)
         VALUES (?, ?, ?, ?, 0, NOW())`,
        ['inventory_alert', title, content, user.id]
      );
      pushCount++;
    }
  }

  return successResponse(
    {
      alertCount: alerts.length,
      pushCount,
      alerts: alerts.map((a: any) => ({
        material_code: a.material_code,
        material_name: a.material_name,
        warehouse_name: a.warehouse_name,
        quantity: a.quantity,
        safety_stock: a.safety_stock,
        unit: a.unit,
      })),
    },
    `已推送 ${alerts.length} 条库存预警`
  );
}
