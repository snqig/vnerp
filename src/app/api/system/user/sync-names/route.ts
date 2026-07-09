import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(
  async (_request: NextRequest, _userInfo) => {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, message: 'Not available in production' },
        { status: 403 }
      );
    }

    try {
      const users: Loose = await query(
        'SELECT u.id, u.username, u.real_name AS old_name, e.name AS employee_name FROM sys_user u JOIN sys_employee e ON e.employee_no COLLATE utf8mb4_unicode_ci = u.username WHERE u.deleted = 0 AND e.name IS NOT NULL AND CAST(e.name AS BINARY) != CAST(u.real_name AS BINARY)'
      );

      let updated = 0;
      for (const user of users) {
        await execute('UPDATE sys_user SET real_name = ? WHERE id = ?', [
          user.employee_name,
          user.id,
        ]);
        updated++;
      }

      return NextResponse.json({
        success: true,
        message: `同步完成，更新了 ${updated} 条记录`,
        details: users.map((u: Loose) => ({
          id: u.id,
          username: u.username,
          old_name: u.old_name,
          new_name: u.employee_name,
        })),
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: (error as Error).message },
        { status: 500 }
      );
    }
  },
  { logTitle: '同步用户姓名', logType: 'system' }
);
