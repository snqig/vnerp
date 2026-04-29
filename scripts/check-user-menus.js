const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
};

async function main() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');
    
    // 查询所有用户及其角色
    console.log('=== 系统用户及角色 ===');
    const [users] = await connection.query(
      `SELECT u.id, u.username, u.real_name, r.id as role_id, r.role_name
       FROM sys_user u
       LEFT JOIN sys_user_role ur ON u.id = ur.user_id
       LEFT JOIN sys_role r ON ur.role_id = r.id
       WHERE u.status = 1`
    );
    
    users.forEach(u => {
      console.log(`用户: ${u.username} (${u.real_name}) - 角色: ${u.role_name || '无'} (ID: ${u.role_id || '无'})`);
    });
    
    // 查询 dcprint 菜单的 is_visible 字段
    console.log('\n=== DCPrint 菜单详情 ===');
    const [menus] = await connection.query(
      'SELECT id, parent_id, menu_name, menu_code, menu_type, icon, path, permission, sort_order, status, is_visible FROM sys_menu WHERE menu_code LIKE ? ORDER BY parent_id, sort_order',
      ['dcprint%']
    );
    
    menus.forEach(menu => {
      console.log(`ID: ${menu.id}, 名称: ${menu.menu_name}, 代码: ${menu.menu_code}, 可见: ${menu.is_visible}, 状态: ${menu.status}`);
    });
    
    // 查询角色菜单关联
    console.log('\n=== 角色菜单权限详情 ===');
    const [roleMenus] = await connection.query(
      `SELECT r.id as role_id, r.role_name, m.id as menu_id, m.menu_name, m.menu_code
       FROM sys_role_menu rm
       JOIN sys_role r ON rm.role_id = r.id
       JOIN sys_menu m ON rm.menu_id = m.id
       WHERE m.menu_code LIKE 'dcprint%'
       ORDER BY r.id, m.id`
    );
    
    roleMenus.forEach(rm => {
      console.log(`角色: ${rm.role_name} (ID: ${rm.role_id}) -> 菜单: ${rm.menu_name} (ID: ${rm.menu_id})`);
    });
    
    // 检查 admin 用户的具体权限
    console.log('\n=== Admin 用户 (ID: 1) 的菜单权限 ===');
    const [adminMenus] = await connection.query(
      `SELECT DISTINCT m.*
       FROM sys_menu m
       JOIN sys_role_menu rm ON m.id = rm.menu_id
       JOIN sys_user_role ur ON rm.role_id = ur.role_id
       WHERE ur.user_id = 1
       AND m.status = 1
       AND m.is_visible = 1
       AND m.menu_code LIKE 'dcprint%'
       ORDER BY m.parent_id, m.sort_order`
    );
    
    if (adminMenus.length === 0) {
      console.log('❌ Admin 用户没有 DCPrint 菜单权限');
    } else {
      adminMenus.forEach(menu => {
        console.log(`✅ ${menu.menu_name} (${menu.menu_code})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
