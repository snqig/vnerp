/**
 * 测试登录API
 */

import { query } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function testLogin() {
  console.log('测试登录功能...\n');

  try {
    // 1. 检查用户是否存在
    const username = 'admin';
    const password = 'admin123';

    console.log(`1. 查询用户: ${username}`);
    const users = await query(
      `SELECT id, username, password, real_name, status
       FROM sys_user WHERE username = ? AND deleted = 0`,
      [username]
    );

    if (users.length === 0) {
      console.error('❌ 用户不存在');
      return;
    }

    const user = users[0];
    console.log(`✓ 找到用户: ${user.username} (${user.real_name})`);
    console.log(`  状态: ${user.status === 1 ? '启用' : '禁用'}`);

    // 2. 验证密码
    console.log('\n2. 验证密码...');
    const isValid = await bcrypt.compare(password, user.password);
    console.log(`  密码验证: ${isValid ? '✓ 成功' : '❌ 失败'}`);

    // 3. 查询用户角色
    console.log('\n3. 查询用户角色...');
    const roles = await query(
      `SELECT r.id, r.role_code, r.role_name
       FROM sys_user_role ur
       JOIN sys_role r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.status = 1`,
      [user.id]
    );
    console.log(`  角色数量: ${roles.length}`);
    (roles as any[]).forEach((r: any) => {
      console.log(`    - ${r.role_code} (${r.role_name})`);
    });

    // 4. 查询权限
    console.log('\n4. 查询用户权限...');
    if (roles.length > 0) {
      const roleIds = (roles as any[]).map((r: any) => r.id);
      const placeholders = roleIds.map(() => '?').join(',');
      const perms = await query(
        `SELECT DISTINCT m.permission
         FROM sys_menu m
         JOIN sys_role_menu rm ON m.id = rm.menu_id
         WHERE rm.role_id IN (${placeholders})
         AND m.permission IS NOT NULL AND m.permission != ''`,
        roleIds
      );
      console.log(`  权限数量: ${perms.length}`);
    }

    console.log('\n✓ 登录测试通过！');

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error);
  }
}

testLogin();
