import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import type { DbRow } from '@/types/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

// 从 user-agent 中粗略提取操作系统名称
function parseOS(ua?: string | null): string {
  if (!ua) return '-';
  if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6\.1/i.test(ua)) return 'Windows 7';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return '-';
}

export const GET = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 20);
    const userName = searchParams.get('userName') || '';
    const status = searchParams.get('status') || '';

    let where = 'WHERE 1=1';
    const params: SqlValue[] = [];
    if (userName) {
      where += ' AND username LIKE ?';
      params.push('%' + userName + '%');
    }
    if (status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }

    const countSql = 'SELECT COUNT(*) as total FROM sys_login_log ' + where;
    const totalRows = await query(countSql, params);
    const total = totalRows[0]?.total || 0;

    const rows = await query(
      'SELECT id, username as user_name, create_time as login_time, ip as ipaddr, location as login_location, user_agent as browser, login_type, status, error_msg as msg FROM sys_login_log ' +
        where +
        ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
      [...params, pageSize, (page - 1) * pageSize]
    );

    const list = (rows as DbRow[]).map((r) => ({ ...r, os: parseOS(r.browser as string | null) }));

    return successResponse({ list, total, page, pageSize });
  },
  { logTitle: '获取登录日志', logType: 'system' }
);

export const DELETE = withPermission(
  async (_request: NextRequest, _userInfo) => {
    await query('TRUNCATE TABLE sys_login_log');
    return successResponse(null, '清空成功');
  },
  { logTitle: '清空登录日志', logType: 'system' }
);
