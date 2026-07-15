import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
});

// Step 1: 检查 category_id 字段是否已存在
const [cols] = await db.execute('SHOW COLUMNS FROM inv_warehouse LIKE "category_id"');
if (cols.length > 0) {
  console.log('category_id 字段已存在，跳过 ALTER');
} else {
  console.log('添加 category_id 字段...');
  await db.execute('ALTER TABLE inv_warehouse ADD COLUMN category_id bigint unsigned DEFAULT NULL AFTER warehouse_type');
  console.log('OK');
}

// Step 2: 按 warehouse_type 回填 category_id（type 1→cat 1, 2→2, ...）
console.log('回填 category_id...');
const [result] = await db.execute('UPDATE inv_warehouse SET category_id = warehouse_type WHERE category_id IS NULL');
console.log(`受影响行数: ${result.affectedRows}`);

// Step 3: 验证
console.log('\n验证结果:');
const [rows] = await db.execute(`
  SELECT w.id, w.warehouse_code, w.warehouse_name, w.warehouse_type, w.category_id, c.name AS category_name
  FROM inv_warehouse w
  LEFT JOIN sys_warehouse_category c ON w.category_id = c.id
  ORDER BY w.id
`);
console.table(rows);

await db.end();
