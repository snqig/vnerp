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
    
    // 查询 admin 角色的 ID
    const [adminRole] = await connection.query(
      "SELECT id, role_name FROM sys_role WHERE role_code = 'admin' OR role_name LIKE '%admin%' LIMIT 1"
    );
    
    if (adminRole.length === 0) {
      console.log('❌ 没有找到 admin 角色');
      return;
    }
    
    const adminRoleId = adminRole[0].id;
    console.log(`找到 admin 角色: ID = ${adminRoleId}, 名称 = ${adminRole[0].role_name}`);
    
    // 为 admin 角色添加 DCPrint 菜单权限
    console.log('\n正在为 admin 角色添加 DCPrint 菜单权限...');
    
    const [result] = await connection.query(
      `INSERT INTO sys_role_menu (role_id, menu_id)
       SELECT ?, id FROM sys_menu WHERE menu_code LIKE 'dcprint%'
       ON DUPLICATE KEY UPDATE role_id = role_id`,
      [adminRoleId]
    );
    
    console.log(`✅ 已为 admin 角色 (ID: ${adminRoleId}) 添加 DCPrint 菜单权限`);
    
    // 验证
    const [verify] = await connection.query(
      `SELECT m.menu_name, m.menu_code
       FROM sys_role_menu rm
       JOIN sys_menu m ON rm.menu_id = m.id
       WHERE rm.role_id = ? AND m.menu_code LIKE 'dcprint%'
       ORDER BY m.sort_order`,
      [adminRoleId]
    );
    
    console.log('\n=== Admin 角色现在拥有的 DCPrint 菜单 ===');
    verify.forEach(menu => {
      console.log(`✅ ${menu.menu_name} (${menu.menu_code})`);
    });
    
    console.log('\n🎉 修复完成！请刷新页面或重新登录以查看菜单');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
