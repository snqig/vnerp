const mysql = require('mysql2/promise');

async function analyzeDatabaseRelations() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  console.log('=== 数据库表关系分析 ===\n');

  // 获取所有表
  const [tables] = await connection.execute(`
    SELECT TABLE_NAME, TABLE_COMMENT, TABLE_ROWS
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'vnerpdacahng'
    ORDER BY TABLE_NAME
  `);

  console.log(`共有 ${tables.length} 张表\n`);

  // 获取所有外键关系
  const [foreignKeys] = await connection.execute(`
    SELECT
      TABLE_NAME,
      COLUMN_NAME,
      REFERENCED_TABLE_NAME,
      REFERENCED_COLUMN_NAME,
      CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'vnerpdacahng'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, CONSTRAINT_NAME
  `);

  console.log(`共有 ${foreignKeys.length} 个外键关系\n`);

  // 获取所有表的列信息
  const tableColumns = {};
  for (const table of tables) {
    const [columns] = await connection.execute(`
      SELECT
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_KEY,
        COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'vnerpdacahng'
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [table.TABLE_NAME]);

    tableColumns[table.TABLE_NAME] = columns;
  }

  // 分析逻辑关联（基于字段名匹配）
  const logicalRelations = [];

  for (const table of tables) {
    const tableName = table.TABLE_NAME;
    const columns = tableColumns[tableName];

    for (const col of columns) {
      const colName = col.COLUMN_NAME.toLowerCase();

      // 检查是否是可能的关联字段（以 _id 结尾但不是主键）
      if (colName.endsWith('_id') && col.COLUMN_KEY !== 'PRI') {
        // 提取可能的表名
        const possibleTable = colName.replace('_id', '');

        // 查找匹配的表
        const matchedTable = tables.find(t =>
          t.TABLE_NAME.toLowerCase() === possibleTable ||
          t.TABLE_NAME.toLowerCase() === possibleTable + 's' ||
          t.TABLE_NAME.toLowerCase() === 'sys_' + possibleTable ||
          t.TABLE_NAME.toLowerCase() === 'sys_' + possibleTable + 's'
        );

        if (matchedTable) {
          logicalRelations.push({
            fromTable: tableName,
            fromColumn: col.COLUMN_NAME,
            toTable: matchedTable.TABLE_NAME,
            toColumn: 'id',
            type: 'logical'
          });
        }
      }
    }
  }

  // 输出结果
  const result = {
    tables: tables.map(t => ({
      name: t.TABLE_NAME,
      comment: t.TABLE_COMMENT || '',
      rows: t.TABLE_ROWS
    })),
    foreignKeys: foreignKeys.map(fk => ({
      fromTable: fk.TABLE_NAME,
      fromColumn: fk.COLUMN_NAME,
      toTable: fk.REFERENCED_TABLE_NAME,
      toColumn: fk.REFERENCED_COLUMN_NAME,
      constraint: fk.CONSTRAINT_NAME,
      type: 'foreign_key'
    })),
    logicalRelations: logicalRelations,
    tableColumns: tableColumns
  };

  // 按模块分组表
  const modules = {};
  for (const table of tables) {
    const name = table.TABLE_NAME;
    let module = 'other';

    if (name.startsWith('sys_')) module = 'system';
    else if (name.includes('order') || name.includes('quotation')) module = 'order';
    else if (name.includes('product') || name.includes('material')) module = 'product';
    else if (name.includes('customer') || name.includes('supplier')) module = 'partner';
    else if (name.includes('production') || name.includes('process')) module = 'production';
    else if (name.includes('inventory') || name.includes('stock')) module = 'inventory';
    else if (name.includes('finance') || name.includes('payment')) module = 'finance';
    else if (name.includes('sample') || name.includes('standard')) module = 'sample';

    if (!modules[module]) modules[module] = [];
    modules[module].push({
      name: name,
      comment: table.TABLE_COMMENT || '',
      rows: table.TABLE_ROWS
    });
  }

  result.modules = modules;

  console.log('\n=== 模块分组 ===');
  for (const [module, tables] of Object.entries(modules)) {
    console.log(`\n[${module}] - ${tables.length} 张表`);
    tables.slice(0, 5).forEach(t => console.log(`  - ${t.name}: ${t.comment || '无注释'}`));
    if (tables.length > 5) console.log(`  ... 还有 ${tables.length - 5} 张表`);
  }

  console.log('\n=== 外键关系 ===');
  foreignKeys.forEach(fk => {
    console.log(`${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
  });

  console.log('\n=== 逻辑关联关系 ===');
  logicalRelations.slice(0, 20).forEach(rel => {
    console.log(`${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn} (逻辑关联)`);
  });
  if (logicalRelations.length > 20) {
    console.log(`... 还有 ${logicalRelations.length - 20} 个逻辑关联`);
  }

  await connection.end();

  return result;
}

analyzeDatabaseRelations()
  .then(result => {
    // 输出 JSON 结果到文件
    const fs = require('fs');
    fs.writeFileSync(
      'd:/dcprint/erp-project/scripts/db-relations.json',
      JSON.stringify(result, null, 2),
      'utf8'
    );
    console.log('\n结果已保存到 scripts/db-relations.json');
  })
  .catch(console.error);
