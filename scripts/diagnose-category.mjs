import mysql from 'mysql2/promise';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const c = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

console.log('=== 1. sys_calc_param: category.require_on_business ===');
try {
  const [p] = await c.query(
    `SELECT param_key, param_value FROM sys_calc_param WHERE param_key LIKE 'category.%'`
  );
  console.table(p);
} catch (e) {
  console.log('查询失败:', e.message);
}

console.log('\n=== 2. MAT006 的 category_id ===');
const [m] = await c.query(
  `SELECT id, material_code, material_name, category_id, deleted FROM inv_material WHERE id = 6`
);
console.table(m);

console.log('\n=== 3. inv_material_category 表是否存在 ===');
try {
  const [t] = await c.query(`SHOW TABLES LIKE 'inv_material_category'`);
  console.log('表存在:', t.length > 0);
  if (t.length > 0) {
    const [cats] = await c.query(`SELECT id, category_code, category_name, parent_id, status, deleted FROM inv_material_category LIMIT 10`);
    console.log('分类数据:');
    console.table(cats);
  }
} catch (e) {
  console.log('查询失败:', e.message);
}

console.log('\n=== 4. 模拟 checkMaterialsCategorized 查询 ===');
try {
  const [uncategorized] = await c.query(
    `SELECT m.id, m.material_code, m.material_name
       FROM inv_material m
       LEFT JOIN inv_material_category c
              ON c.id = m.category_id AND c.deleted = 0
      WHERE m.id IN (6)
        AND m.deleted = 0
        AND (m.category_id IS NULL OR c.id IS NULL)`
  );
  console.log('未归类物料数:', uncategorized.length);
  if (uncategorized.length > 0) {
    console.log('→ MAT006 未归类，如果 require_on_business=true 则出库被阻断');
    console.table(uncategorized);
  } else {
    console.log('→ MAT006 已归类，校验通过');
  }
} catch (e) {
  console.log('查询失败:', e.message);
}

await c.end();
