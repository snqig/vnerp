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
    
    // 查询 dcprint 相关菜单
    console.log('=== DCPrint 菜单 ===');
    const [menus] = await connection.query(
      'SELECT id, parent_id, menu_name, menu_code, menu_type, icon, path, permission, sort_order, status FROM sys_menu WHERE menu_code LIKE ? ORDER BY parent_id, sort_order',
      ['dcprint%']
    );
    
    if (menus.length === 0) {
      console.log('❌ 没有找到 DCPrint 菜单');
    } else {
      menus.forEach(menu => {
        console.log(`ID: ${menu.id}, 父ID: ${menu.parent_id}, 名称: ${menu.menu_name}, 代码: ${menu.menu_code}, 类型: ${menu.menu_type === 1 ? '目录' : '菜单'}, 图标: ${menu.icon || '无'}, 路径: ${menu.path || '无'}, 权限: ${menu.permission}`);
      });
    }
    
    // 查询角色菜单关联
    console.log('\n=== 角色菜单权限 ===');
    const [roleMenus] = await connection.query(
      `SELECT rm.role_id, r.role_name, rm.menu_id, m.menu_name 
       FROM sys_role_menu rm 
       JOIN sys_role r ON rm.role_id = r.id 
       JOIN sys_menu m ON rm.menu_id = m.id 
       WHERE m.menu_code LIKE ?`,
      ['dcprint%']
    );
    
    if (roleMenus.length === 0) {
      console.log('❌ 没有找到角色菜单关联');
    } else {
      roleMenus.forEach(rm => {
        console.log(`角色: ${rm.role_name} (ID: ${rm.role_id}) -> 菜单: ${rm.menu_name} (ID: ${rm.menu_id})`);
      });
    }
    
    // 查询所有菜单（用于对比）
    console.log('\n=== 所有启用的菜单 ===');
    const [allMenus] = await connection.query(
      'SELECT id, parent_id, menu_name, menu_code, menu_type, icon, path FROM sys_menu WHERE status = 1 ORDER BY parent_id, sort_order LIMIT 20'
    );
    
    allMenus.forEach(menu => {
      const indent = menu.parent_id === 0 ? '' : '  ';
      const type = menu.menu_type === 1 ? '[目录]' : '[菜单]';
      console.log(`${indent}${type} ${menu.menu_name} (${menu.menu_code}) - ${menu.path || '无路径'}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
