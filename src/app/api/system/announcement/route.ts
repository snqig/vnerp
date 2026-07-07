import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 系统公告 API
 */

// 获取公告列表
export const GET = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'published';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (type === 'published') {
      where += ' AND a.status = ? AND (a.expire_time IS NULL OR a.expire_time > NOW())';
      params.push('published');
    } else if (type === 'draft') {
      where += ' AND a.status = ?';
      params.push('draft');
    } else if (type === 'all') {
      // 管理员查看所有
    }

    const countRows: any = await query(
      `SELECT COUNT(*) as total FROM sys_announcement a ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const rows: any = await query(
      `SELECT a.*, u.real_name as creator_name,
              (SELECT COUNT(*) FROM sys_announcement_read r WHERE r.announcement_id = a.id) as read_count,
              (SELECT COUNT(*) FROM sys_announcement_read r WHERE r.announcement_id = a.id AND r.user_id = ?) as is_read
       FROM sys_announcement a
       LEFT JOIN sys_user u ON a.create_by = u.id
       ${where}
       ORDER BY a.is_top DESC, a.priority DESC, a.publish_time DESC
       LIMIT ? OFFSET ?`,
      [userInfo.userId, ...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  },
  { errorMessage: '操作失败' }
);

// 创建/发布公告
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['title', 'content']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const { title, content, type, priority, is_top, publish_time, expire_time, status } = body;

    const result: any = await execute(
      `INSERT INTO sys_announcement
       (title, content, type, priority, is_top, publish_time, expire_time, status, create_by, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title, content, type || 'info', priority || 0,
        is_top ? 1 : 0,
        publish_time || (status === 'published' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null),
        expire_time || null,
        status || 'draft',
        userInfo.userId,
      ]
    );

    return successResponse({ id: result.insertId }, '公告创建成功');
  },
  { errorMessage: '操作失败' }
);

// 更新公告
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return errorResponse('公告ID不能为空', 400, 400);
    }

    if (action === 'publish') {
      await execute(
        `UPDATE sys_announcement SET status = 'published', publish_time = NOW(), update_time = NOW() WHERE id = ?`,
        [id]
      );
      return successResponse(null, '公告已发布');
    }

    if (action === 'read') {
      // 标记已读
      await execute(
        `INSERT IGNORE INTO sys_announcement_read (announcement_id, user_id, read_time) VALUES (?, ?, NOW())`,
        [id, userInfo.userId]
      );
      return successResponse(null, '已标记已读');
    }

    // 通用更新
    const { title, content, type, priority, is_top, expire_time, status } = body;
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (is_top !== undefined) { updates.push('is_top = ?'); params.push(is_top ? 1 : 0); }
    if (expire_time !== undefined) { updates.push('expire_time = ?'); params.push(expire_time); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return errorResponse('没有需要更新的字段', 400, 400);
    }

    updates.push('update_time = NOW()');
    params.push(id);

    await execute(
      `UPDATE sys_announcement SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return successResponse(null, '公告更新成功');
  },
  { errorMessage: '操作失败' }
);

// 删除公告
export const DELETE = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('公告ID不能为空', 400, 400);
    }

    await execute('DELETE FROM sys_announcement_read WHERE announcement_id = ?', [Number(id)]);
    await execute('DELETE FROM sys_announcement WHERE id = ?', [Number(id)]);

    return successResponse(null, '公告已删除');
  },
  { errorMessage: '操作失败' }
);
