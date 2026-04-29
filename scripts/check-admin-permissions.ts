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

async function checkAdminPermissions() {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('数据库连接成功\n');

    // 1. 查找 admin 用户
    console.log('=== 1. 查找 admin 用户 ===');
    const [adminUsers] = await connection.execute(
      'SELECT id, username, real_name, status FROM sys_user WHERE username = ?',
      ['admin']
    );
    console.log('Admin 用户:', adminUsers);

    if (!Array.isArray(adminUsers) || adminUsers.length === 0) {
      console.log('❌ 未找到 admin 用户');
      return;
    }

    const adminId = (adminUsers as any[])[0].id;
    console.log(`Admin ID: ${adminId}\n`);

    // 2. 查找 admin 用户的角色
    console.log('=== 2. 查找 admin 用户角色 ===');
    const [userRoles] = await connection.execute(
      `SELECT r.id, r.role_code, r.role_name, r.status
       FROM sys_user_role ur
       JOIN sys_role r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [adminId]
    );
    console.log('用户角色:', userRoles);

    if (!Array.isArray(userRoles) || userRoles.length === 0) {
      console.log('❌ admin 用户没有分配角色\n');
    } else {
      const roleIds = (userRoles as any[]).map(r => r.id);
      console.log(`角色 IDs: ${roleIds}\n`);

      // 3. 查找角色-菜单关联
      console.log('=== 3. 查找角色-菜单关联 ===');
      const placeholders = roleIds.map(() => '?').join(',');
      const [roleMenus] = await connection.execute(
        `SELECT rm.role_id, rm.menu_id, m.menu_name, m.menu_code
         FROM sys_role_menu rm
         JOIN sys_menu m ON rm.menu_id = m.id
         WHERE rm.role_id IN (${placeholders})`,
        roleIds
      );
      console.log('角色菜单关联:', roleMenus);
      console.log(`共 ${(roleMenus as any[]).length} 个菜单关联\n`);
    }

    // 4. 查找所有可用菜单
    console.log('=== 4. 查找所有可用菜单 ===');
    const [allMenus] = await connection.execute(
      `SELECT id, menu_name, menu_code, menu_type, parent_id, status, is_visible
       FROM sys_menu
       WHERE status = 1
       ORDER BY parent_id, sort_order`
    );
    console.log('所有可用菜单:', allMenus);
    console.log(`共 ${(allMenus as any[]).length} 个菜单\n`);

    // 5. 检查 sys_role_menu 表是否有数据
    console.log('=== 5. 检查 sys_role_menu 表数据量 ===');
    const [roleMenuCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM sys_role_menu'
    );
    console.log('角色菜单关联总数:', roleMenuCount);

    // 6. 检查 sys_user_role 表是否有数据
    console.log('=== 6. 检查 sys_user_role 表数据量 ===');
    const [userRoleCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM sys_user_role'
    );
    console.log('用户角色关联总数:', userRoleCount);

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAdminPermissions();
