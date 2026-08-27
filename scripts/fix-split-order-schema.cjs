// 修复 /api/warehouse/split-order 500：该完整功能依赖 split_order / split_order_detail 两张表，
// 以及 inv_inventory_batch.width/length/batch_type、inv_material.width 列，但真实库均缺失。
// 本脚本幂等创建表 + 追加缺失列（仅 ADD COLUMN，不影响已有数据）。
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
    await c.query(`
      CREATE TABLE IF NOT EXISTS split_order (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        split_no VARCHAR(50) NOT NULL COMMENT '分切单号',
        split_date DATE DEFAULT NULL COMMENT '分切日期',
        parent_batch_id BIGINT UNSIGNED DEFAULT NULL COMMENT '母料批次ID',
        material_id BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID',
        material_name VARCHAR(100) DEFAULT NULL,
        warehouse_id BIGINT UNSIGNED DEFAULT NULL,
        out_qty DECIMAL(18,4) DEFAULT 0 COMMENT '良品出库量',
        total_waste DECIMAL(18,4) DEFAULT 0 COMMENT '损耗量',
        status TINYINT DEFAULT 0 COMMENT '0草稿 1已审核 3已作废',
        remark VARCHAR(500) DEFAULT NULL,
        operator_id BIGINT UNSIGNED DEFAULT NULL,
        operator_name VARCHAR(50) DEFAULT NULL,
        create_by BIGINT UNSIGNED DEFAULT NULL,
        total_cost DECIMAL(18,4) DEFAULT 0,
        audit_time DATETIME DEFAULT NULL,
        auditor_id BIGINT UNSIGNED DEFAULT NULL,
        auditor_name VARCHAR(50) DEFAULT NULL,
        version INT UNSIGNED DEFAULT 0,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted TINYINT DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uk_split_no (split_no),
        KEY idx_parent_batch (parent_batch_id),
        KEY idx_material (material_id),
        KEY idx_split_date (split_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分切单(大料分小料)'
    `);
    console.log('split_order: created/exists');

    await c.query(`
      CREATE TABLE IF NOT EXISTS split_order_detail (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        split_id BIGINT UNSIGNED DEFAULT NULL,
        pieces INT DEFAULT 1 COMMENT '件数',
        qty_per_piece DECIMAL(18,4) DEFAULT 0 COMMENT '每件数量',
        total_qty DECIMAL(18,4) DEFAULT 0 COMMENT '该明细总数量',
        width DECIMAL(18,2) DEFAULT 0 COMMENT '宽幅',
        is_waste TINYINT DEFAULT 0 COMMENT '是否损耗 0良品 1损耗',
        remark VARCHAR(255) DEFAULT NULL,
        child_batch_id BIGINT UNSIGNED DEFAULT NULL COMMENT '审核后生成的子批ID',
        child_batch_no VARCHAR(50) DEFAULT NULL,
        allocated_cost DECIMAL(18,4) DEFAULT 0 COMMENT '分摊成本',
        PRIMARY KEY (id),
        KEY idx_split (split_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分切单明细'
    `);
    console.log('split_order_detail: created/exists');

    console.log('inv_inventory_batch:');
    await addCol(c, 'inv_inventory_batch', 'width', "DECIMAL(18,2) DEFAULT NULL COMMENT '宽幅'");
    await addCol(c, 'inv_inventory_batch', 'length', "DECIMAL(18,2) DEFAULT NULL COMMENT '长度'");
    await addCol(c, 'inv_inventory_batch', 'batch_type', "TINYINT DEFAULT 0 COMMENT '0普通 1子批'");

    console.log('inv_material:');
    await addCol(c, 'inv_material', 'width', "DECIMAL(18,2) DEFAULT NULL COMMENT '宽幅'");

    // inv_inventory_log 存在 CHRONIC 迁移缺口：代码库至少有 3 种 INSERT 形态（old/trans/operation）
    // 引用了约 13 个真实表没有的列。一次性补齐（均为可空 ADD COLUMN，不破坏既有读写）。
    console.log('inv_inventory_log (补齐被各 route 写入但缺失的列):');
    await addCol(c, 'inv_inventory_log', 'batch_no', "VARCHAR(50) DEFAULT NULL COMMENT '批次号'");
    await addCol(c, 'inv_inventory_log', 'trans_type', "VARCHAR(20) DEFAULT NULL COMMENT '交易类型'");
    await addCol(c, 'inv_inventory_log', 'quantity', "DECIMAL(18,4) DEFAULT NULL COMMENT '变动数量'");
    await addCol(c, 'inv_inventory_log', 'before_qty', "DECIMAL(18,4) DEFAULT NULL COMMENT '变动前数量'");
    await addCol(c, 'inv_inventory_log', 'after_qty', "DECIMAL(18,4) DEFAULT NULL COMMENT '变动后数量'");
    await addCol(c, 'inv_inventory_log', 'unit', "VARCHAR(20) DEFAULT NULL COMMENT '单位'");
    await addCol(c, 'inv_inventory_log', 'source_type', "VARCHAR(50) DEFAULT NULL COMMENT '来源类型'");
    await addCol(c, 'inv_inventory_log', 'source_no', "VARCHAR(50) DEFAULT NULL COMMENT '来源单号'");
    await addCol(c, 'inv_inventory_log', 'operation_type', "TINYINT DEFAULT NULL COMMENT '操作类型 1入 2出 3损耗'");
    await addCol(c, 'inv_inventory_log', 'operation_qty', "DECIMAL(18,4) DEFAULT NULL COMMENT '操作数量'");
    await addCol(c, 'inv_inventory_log', 'business_type', "VARCHAR(50) DEFAULT NULL COMMENT '业务类型'");
    await addCol(c, 'inv_inventory_log', 'business_no', "VARCHAR(50) DEFAULT NULL COMMENT '业务单号'");
    await addCol(c, 'inv_inventory_log', 'operator_id', "BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人ID'");

    console.log('ALL DONE');
  } catch (e) {
    console.log('ERR', e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
