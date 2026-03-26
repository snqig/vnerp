const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('正在连接MySQL数据库...');
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'Snqig521223',
      database: 'vnerpdacahng',
      charset: 'utf8mb4',
    });

    console.log('✓ 数据库连接成功\n');

    // 查询标准卡表数据
    console.log('查询 prd_standard_card 表...');
    const [rows] = await connection.execute(
      'SELECT id, card_no, customer_name, product_name, status FROM prd_standard_card WHERE deleted = 0 LIMIT 5'
    );

    console.log(`✓ 查询成功，找到 ${rows.length} 条数据\n`);

    if (rows.length > 0) {
      console.log('数据示例:');
      rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.card_no} - ${row.customer_name} - ${row.product_name}`);
      });
    }

    await connection.end();
    console.log('\n✓ 测试完成');
  } catch (error) {
    console.error('\n✗ 测试失败:');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
