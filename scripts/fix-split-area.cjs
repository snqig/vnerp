// 加性迁移：为 inv_inventory_batch / inv_inventory 增加 area(面积) / available_area(可用面积) 列。
// 用途：长度/尺寸类物料(宽×长)按"面积"计量库存，分切(母卷分条)时面积守恒，避免卷数虚增。
// 仅 ADD COLUMN，不改动既有 quantity(卷) 语义，幂等可复跑。
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
    console.log('inv_inventory_batch:');
    await addCol(c, 'inv_inventory_batch', 'area', 'DECIMAL(18,4) DEFAULT NULL COMMENT \'面积(宽×长×数量)，长度类物料计量用\'');
    await addCol(c, 'inv_inventory_batch', 'available_area', 'DECIMAL(18,4) DEFAULT NULL COMMENT \'可用面积\'');

    console.log('inv_inventory:');
    await addCol(c, 'inv_inventory', 'area', 'DECIMAL(18,4) DEFAULT NULL COMMENT \'面积汇总(派生自批次)\'');
    await addCol(c, 'inv_inventory', 'available_area', 'DECIMAL(18,4) DEFAULT NULL COMMENT \'可用面积汇总\'');

    console.log('ALL DONE');
  } catch (e) {
    console.log('ERR', e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
