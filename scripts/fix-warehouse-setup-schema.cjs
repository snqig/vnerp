// 修复 /api/warehouse + setup 列表页字段缺失：
// setup 页渲染 nature / includeInCalculation / capacity / usedCapacity / manager，
// 但 inv_warehouse 仅有 manager_id + warehouse_type，缺少上述列。
// 本脚本幂等追加列（仅 ADD COLUMN，不影响既有数据）。
const mysql = require('mysql2/promise');
const CFG = { host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };

async function colExists(c, table, col) {
  const [r] = await c.query(
    'SELECT COUNT(*) c FROM information_schema.columns WHERE table_schema="vnerpdacahng" AND table_name=? AND column_name=?',
    [table, col]
  );
  return r[0].c > 0;
}
async function addCol(c, table, col, def) {
  if (await colExists(c, table, col)) { console.log(`  skip ${table}.${col} (exists)`); return; }
  await c.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  console.log(`  added ${table}.${col}`);
}

(async () => {
  const c = await mysql.createConnection(CFG);
  try {
    console.log('inv_warehouse:');
    await addCol(c, 'inv_warehouse', 'nature', "VARCHAR(50) DEFAULT '' COMMENT '仓库性质(自有/租赁/外协)'");
    await addCol(c, 'inv_warehouse', 'include_in_calculation', "TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否计入核算 1是 0否'");
    await addCol(c, 'inv_warehouse', 'capacity', "DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '仓库容量'");
    await addCol(c, 'inv_warehouse', 'used_capacity', "DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '已用容量'");
    console.log('ALL DONE');
  } catch (e) {
    console.log('ERR', e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
