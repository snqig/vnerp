import { NextRequest, NextResponse } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';
import bcrypt from 'bcryptjs';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const username = searchParams.get('username') || '';
  const realName = searchParams.get('realName') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE u.deleted = 0';
  const params: any[] = [];
  if (username) { where += ' AND u.username LIKE ?'; params.push('%' + username + '%'); }
  if (realName) { where += ' AND u.real_name LIKE ?'; params.push('%' + realName + '%'); }
  if (status !== '') { where += ' AND u.status = ?'; params.push(Number(status)); }

  const countSql = 'SELECT COUNT(*) as total FROM sys_user u ' + where;
  const totalRows: any = await query(countSql, params);
  const total = totalRows[0]?.total || 0;

  const dataSql = 'SELECT u.id, u.username, u.real_name, u.email, u.phone, u.department_id, u.status, u.first_login, u.create_time, d.dept_name FROM sys_user u LEFT JOIN sys_department d ON u.department_id = d.id ' + where + ' ORDER BY u.id DESC LIMIT ? OFFSET ?';
  const rows: any = await query(dataSql, [...params, pageSize, (page - 1) * pageSize]);

  for (const user of rows) {
    const roles: any = await query(
      'SELECT r.id, r.role_name, r.role_code FROM sys_user_role ur JOIN sys_role r ON ur.role_id = r.id WHERE ur.user_id = ?',
      [user.id]
    );
    user.roles = roles;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { username, password, real_name, email, phone, department_id, role_ids, status } = body;

  if (!username || !password) {
    return NextResponse.json({ success: false, message: '用户名和密码不能为空' }, { status: 400 });
  }

  const existing: any = await query('SELECT id FROM sys_user WHERE username = ? AND deleted = 0', [username]);
  if (existing && existing.length > 0) {
    return NextResponse.json({ success: false, message: '用户名已存在' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result: any = await transaction(async (conn) => {
    const [res]: any = await conn.execute(
      'INSERT INTO sys_user (username, password, real_name, email, phone, department_id, status, first_login) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [username, hashedPassword, real_name || null, email || null, phone || null, department_id || null, status ?? 1]
    );
    const userId = res.insertId;

    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      for (const roleId of role_ids) {
        await conn.execute('INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
      }
    }

    return { id: userId };
  });

  return successResponse(result, '用户创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, real_name, email, phone, department_id, role_ids, status } = body;

  if (!id) {
    return NextResponse.json({ success: false, message: '缺少用户ID' }, { status: 400 });
  }

  await transaction(async (conn) => {
    if (body.resetPwd) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      await conn.execute(
        'UPDATE sys_user SET password = ?, first_login = 1 WHERE id = ? AND deleted = 0',
        [hashedPassword, id]
      );
      return;
    }

    await conn.execute(
      'UPDATE sys_user SET real_name = ?, email = ?, phone = ?, department_id = ?, status = ? WHERE id = ? AND deleted = 0',
      [real_name || null, email || null, phone || null, department_id || null, status ?? 1, id]
    );

    if (role_ids && Array.isArray(role_ids)) {
      await conn.execute('DELETE FROM sys_user_role WHERE user_id = ?', [id]);
      for (const roleId of role_ids) {
        await conn.execute('INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)', [id, roleId]);
      }
    }
  });

  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  await execute('UPDATE sys_user SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
