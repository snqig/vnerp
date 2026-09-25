import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
  });

  console.log('=== P1 UI 字段对齐验证 ===\n');

  // inv_outbound_item
  const [cols1] = await conn.execute(
    "SHOW COLUMNS FROM inv_outbound_item"
  );
  const filter1 = ['width', 'is_raw_material'];
  console.log('inv_outbound_item:');
  for (const c of (cols1 as any[])) {
    if (filter1.includes(c.Field)) {
      console.log(`  ${c.Field}: ${c.Type} nullable=${c.Null === 'YES'}`);
    }
  }

  // prd_die_template
  const [cols2] = await conn.execute(
    "SHOW COLUMNS FROM prd_die_template"
  );
  const filter2 = ['category', 'tags'];
  console.log('\nprd_die_template:');
  for (const c of (cols2 as any[])) {
    if (filter2.includes(c.Field)) {
      console.log(`  ${c.Field}: ${c.Type} nullable=${c.Null === 'YES'}`);
    }
  }

  // prd_standard_card
  const [cols3] = await conn.execute(
    "SHOW COLUMNS FROM prd_standard_card"
  );
  const filter3 = ['template_category', 'tags'];
  console.log('\nprd_standard_card:');
  for (const c of (cols3 as any[])) {
    if (filter3.includes(c.Field)) {
      console.log(`  ${c.Field}: ${c.Type} nullable=${c.Null === 'YES'}`);
    }
  }

  // prod_work_order 验证
  const [woCount] = await conn.execute(
    'SELECT COUNT(*) as cnt FROM prod_work_order WHERE deleted = 0'
  );
  console.log(`\nprod_work_order 记录数: ${(woCount as any[])[0].cnt}`);

  await conn.end();
  console.log('\n✅ 所有 P1 字段对齐验证完成');
}

main().catch((e) => {
  console.error('❌ 验证失败:', e.message);
  process.exit(1);
});
