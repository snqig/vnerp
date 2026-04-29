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

// 模拟 API 的菜单树构建函数
function buildMenuTree(menus: any[], parentId: number = 0): any[] {
  const tree: any[] = [];

  for (const menu of menus) {
    if (menu.parent_id === parentId) {
      const children = buildMenuTree(menus, menu.id);
      const menuItem = {
        id: menu.id,
        name: menu.menu_name,
        code: menu.menu_code,
        type: menu.menu_type,
        icon: menu.icon,
        path: menu.path,
        component: menu.component,
        permission: menu.permission,
        sortOrder: menu.sort_order,
        children: children.length > 0 ? children : undefined,
      };
      tree.push(menuItem);
    }
  }

  return tree;
}

async function testMenusAPI() {
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

    const userId = (adminUsers as any[])[0].id;
    console.log(`Admin 用户 ID: ${userId}\n`);

    // 2. 查询用户角色（与 API 完全一致）
    console.log('=== 2. 查询用户角色 ===');
    const userRoles = await connection.execute(
      `SELECT r.id, r.role_code, r.role_name, r.data_scope
       FROM sys_user_role ur
       JOIN sys_role r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.status = 1`,
      [userId]
    );
    console.log('用户角色查询结果:', userRoles);
    console.log('角色数量:', (userRoles as any[]).length);

    if ((userRoles as any[]).length === 0) {
      console.log('❌ 用户没有角色，API 会返回空菜单\n');
      return;
    }

    const roleIds = (userRoles as any[]).map((r: any) => r.id);
    console.log(`角色 IDs: ${roleIds}\n`);

    // 3. 查询菜单（与 API 完全一致）
    console.log('=== 3. 查询角色菜单 ===');
    const placeholders = roleIds.map(() => '?').join(',');
    const menus = await connection.execute(
      `SELECT DISTINCT m.*
       FROM sys_menu m
       JOIN sys_role_menu rm ON m.id = rm.menu_id
       WHERE rm.role_id IN (${placeholders})
       AND m.status = 1
       AND m.is_visible = 1
       ORDER BY m.sort_order ASC, m.id ASC`,
      roleIds
    );
    console.log('菜单查询结果数量:', (menus as any[]).length);
    console.log('菜单数据:', menus);

    // 4. 构建菜单树
    console.log('\n=== 4. 构建菜单树 ===');
    const menuTree = buildMenuTree(menus as any[]);
    console.log('菜单树结构:', JSON.stringify(menuTree, null, 2));
    console.log(`\n顶层菜单数量: ${menuTree.length}`);

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testMenusAPI();
