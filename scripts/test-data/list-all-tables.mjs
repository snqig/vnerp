import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

async function main() {
  const c = await mysql.createConnection(DB_CONFIG);
  
  // 获取所有表
  const [tables] = await c.execute("SHOW TABLES");
  const tableNames = tables.map(r => Object.values(r)[0]);
  
  console.log('=== vnerpdacahng 数据库所有表 ===');
  console.log(`总计: ${tableNames.length} 张表\n`);
  
  // 按模块分类
  const categories = {};
  for (const t of tableNames) {
    const prefix = t.split('_')[0];
    if (!categories[prefix]) categories[prefix] = [];
    categories[prefix].push(t);
  }
  
  for (const [prefix, tbls] of Object.entries(categories)) {
    console.log(`--- ${prefix} (${tbls.length}张) ---`);
    tbls.forEach(t => console.log(`  ${t}`));
    console.log();
  }
  
  // 统计已有数据的表
  console.log('=== 已有数据的表 ===');
  for (const t of tableNames) {
    try {
      const [cnt] = await c.execute(`SELECT COUNT(*) c FROM \`${t}\` WHERE deleted=0 OR deleted IS NULL`);
      if (cnt[0].c > 0) {
        console.log(`  ${t}: ${cnt[0].c} 条`);
      }
    } catch(e) {
      // 忽略错误
    }
  }
  
  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
