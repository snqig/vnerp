import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env.local') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
};

async function fixAdminRole() {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('数据库连接成功\n');

    // 1. 查找 admin 用户
    const [adminUsers] = await connection.execute(
      'SELECT id, username FROM sys_user WHERE username = ?',
      ['admin']
    );

    if (!Array.isArray(adminUsers) || adminUsers.length === 0) {
      console.log('❌ 未找到 admin 用户');
      return;
    }

    const adminId = (adminUsers as any[])[0].id;
    console.log(`找到 admin 用户，ID: ${adminId}`);

    // 2. 查找超级管理员角色
    const [superAdminRoles] = await connection.execute(
      'SELECT id, role_code, role_name FROM sys_role WHERE role_code = ?',
      ['super_admin']
    );

    let roleId: number;

    if (!Array.isArray(superAdminRoles) || superAdminRoles.length === 0) {
      console.log('未找到超级管理员角色，创建新角色...');
      
      // 创建超级管理员角色
      const [insertRoleResult] = await connection.execute(
        `INSERT INTO sys_role (role_code, role_name, description, data_scope, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['super_admin', '超级管理员', '拥有所有权限', 'all', 1]
      );
      
      roleId = (insertRoleResult as any).insertId;
      console.log(`✅ 创建超级管理员角色，ID: ${roleId}`);
    } else {
      roleId = (superAdminRoles as any[])[0].id;
      console.log(`找到超级管理员角色，ID: ${roleId}`);
    }

    // 3. 检查 admin 是否已有该角色
    const [existingUserRole] = await connection.execute(
      'SELECT id FROM sys_user_role WHERE user_id = ? AND role_id = ?',
      [adminId, roleId]
    );

    if (Array.isArray(existingUserRole) && existingUserRole.length > 0) {
      console.log('admin 用户已拥有超级管理员角色');
    } else {
      // 4. 为 admin 用户分配角色
      await connection.execute(
        'INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)',
        [adminId, roleId]
      );
      console.log('✅ 已为 admin 用户分配超级管理员角色');
    }

    // 5. 为超级管理员角色分配所有菜单权限
    const [allMenus] = await connection.execute(
      'SELECT id FROM sys_menu WHERE status = 1'
    );

    // 先删除该角色的所有菜单关联，避免重复
    await connection.execute(
      'DELETE FROM sys_role_menu WHERE role_id = ?',
      [roleId]
    );

    // 插入所有菜单权限
    const menuIds = (allMenus as any[]).map(m => m.id);
    for (const menuId of menuIds) {
      await connection.execute(
        'INSERT INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)',
        [roleId, menuId]
      );
    }

    console.log(`✅ 已为超级管理员角色分配 ${menuIds.length} 个菜单权限`);

    // 6. 验证修复结果
    console.log('\n=== 验证修复结果 ===');
    const [userRoles] = await connection.execute(
      `SELECT r.id, r.role_code, r.role_name
       FROM sys_user_role ur
       JOIN sys_role r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [adminId]
    );
    console.log('admin 用户角色:', userRoles);

    const [roleMenus] = await connection.execute(
      `SELECT COUNT(*) as count FROM sys_role_menu WHERE role_id = ?`,
      [roleId]
    );
    console.log('角色菜单权限数:', roleMenus);

    console.log('\n✅ 修复完成！请刷新浏览器页面。');

  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAdminRole();
