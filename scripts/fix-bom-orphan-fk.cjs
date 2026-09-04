/**
 * 修复 bom_material 孤儿外键导致的 errno=1215 死结（幂等，可重复执行）
 *
 * 根因：
 *   bom_line.material_id        = int          (signed)
 *   bom_alternative.material_id = int unsigned
 *   两列都挂着指向 bom_material(id) 的孤儿 FK，而 bom_material 表本身不存在。
 *   因此无论把 bom_material.id 定义成 signed 还是 unsigned，
 *   总有一侧类型不匹配 -> CREATE TABLE 报 errno=1215。
 *
 * 修法：
 *   1. 删除两条孤儿 FK
 *   2. 把 bom_line.material_id 统一成 int unsigned（与 bom_alternative 对齐）
 *   3. 创建 bom_material（id int unsigned）
 *   4. 重建两条 FK
 */
const mysql = require('mysql2/promise');

const CONN = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

const log = (...a) => console.log(...a);

async function main() {
  const conn = await mysql.createConnection(CONN);
  const steps = [];

  const hasTable = async (t) => {
    const [r] = await conn.query(
      'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',
      [t]
    );
    return r.length > 0;
  };
  const fkExists = async (table, name) => {
    const [r] = await conn.query(
      `SELECT 1 FROM information_schema.TABLE_COLUMNS WHERE 1=0`
    ).catch(() => [[]]);
    const [r2] = await conn.query(
      `SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [table, name]
    );
    return r2.length > 0;
  };
  const idxExists = async (table, name) => {
    const [r] = await conn.query(
      `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?`,
      [table, name]
    );
    return r.length > 0;
  };
  const step = async (label, fn) => {
    try {
      const msg = await fn();
      steps.push(`✅ ${label}${msg ? ' — ' + msg : ''}`);
    } catch (e) {
      steps.push(`⚠️ ${label} 跳过: ${e.message}`);
    }
  };

  // 1. 删除孤儿 FK
  await step('DROP FK fk_bom_line_material', async () => {
    if (!(await fkExists('bom_line', 'fk_bom_line_material'))) return '不存在';
    await conn.query('ALTER TABLE bom_line DROP FOREIGN KEY fk_bom_line_material');
    return '已删除';
  });
  await step('DROP FK fk_bom_alt_material', async () => {
    if (!(await fkExists('bom_alternative', 'fk_bom_alt_material'))) return '不存在';
    await conn.query('ALTER TABLE bom_alternative DROP FOREIGN KEY fk_bom_alt_material');
    return '已删除';
  });

  // 2. 统一 material_id 类型 -> int unsigned
  await step('统一 bom_line.material_id 为 int unsigned', async () => {
    const [c] = await conn.query(
      `SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bom_line' AND COLUMN_NAME='material_id'`
    );
    if (!c.length) return '列不存在，跳过';
    if (c[0].COLUMN_TYPE === 'int unsigned') return '已是 int unsigned';
    await conn.query(
      'ALTER TABLE bom_line MODIFY COLUMN material_id INT UNSIGNED NULL COMMENT "物料ID"'
    );
    return `${c[0].COLUMN_TYPE} -> int unsigned`;
  });

  // 3. 创建 bom_material
  await step('创建 bom_material', async () => {
    if (await hasTable('bom_material')) return '已存在';
    await conn.query(`
      CREATE TABLE bom_material (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
        material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
        material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
        material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
        material_type ENUM('RAW','SEMI','FINISHED','SUB','PKG','OTHER') DEFAULT 'RAW' COMMENT '物料类型',
        category_id INT UNSIGNED DEFAULT NULL COMMENT '分类ID',
        category_name VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
        unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
        unit_cost DECIMAL(14,4) DEFAULT 0 COMMENT '参考成本',
        safety_stock DECIMAL(14,3) DEFAULT 0 COMMENT '安全库存',
        default_supplier_id INT UNSIGNED DEFAULT NULL COMMENT '默认供应商ID',
        default_supplier_name VARCHAR(100) DEFAULT NULL COMMENT '默认供应商',
        shelf_life_days INT UNSIGNED DEFAULT NULL COMMENT '保质期',
        is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
        remark TEXT DEFAULT NULL COMMENT '备注',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
        UNIQUE KEY uk_material_code (material_code),
        INDEX idx_material_name (material_name),
        INDEX idx_material_type (material_type),
        INDEX idx_category (category_id),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料基础信息表'
    `);
    return '已创建';
  });

  // 4. 重建 FK（先补索引）
  await step('补 idx_bom_line_material 索引', async () => {
    if (await idxExists('bom_line', 'idx_bom_line_material')) return '已存在';
    await conn.query('ALTER TABLE bom_line ADD INDEX idx_bom_line_material (material_id)');
    return '已添加';
  });
  await step('补 idx_bom_alt_material 索引', async () => {
    if (await idxExists('bom_alternative', 'idx_bom_alt_material')) return '已存在';
    await conn.query(
      'ALTER TABLE bom_alternative ADD INDEX idx_bom_alt_material (material_id)'
    );
    return '已添加';
  });
  await step('重建 FK fk_bom_line_material', async () => {
    if (await fkExists('bom_line', 'fk_bom_line_material')) return '已存在';
    await conn.query(
      'ALTER TABLE bom_line ADD CONSTRAINT fk_bom_line_material FOREIGN KEY (material_id) REFERENCES bom_material(id)'
    );
    return '已建立';
  });
  await step('重建 FK fk_bom_alt_material', async () => {
    if (await fkExists('bom_alternative', 'fk_bom_alt_material')) return '已存在';
    await conn.query(
      'ALTER TABLE bom_alternative ADD CONSTRAINT fk_bom_alt_material FOREIGN KEY (material_id) REFERENCES bom_material(id)'
    );
    return '已建立';
  });

  // 5. 校验
  const [orphan] = await conn.query(
    `SELECT kcu.CONSTRAINT_NAME, kcu.TABLE_NAME, kcu.REFERENCED_TABLE_NAME
     FROM information_schema.KEY_COLUMN_USAGE kcu
     LEFT JOIN information_schema.TABLES t
       ON t.TABLE_SCHEMA=kcu.TABLE_SCHEMA AND t.TABLE_NAME=kcu.REFERENCED_TABLE_NAME
     WHERE kcu.TABLE_SCHEMA=DATABASE()
       AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
       AND t.TABLE_NAME IS NULL`
  );

  await conn.end();

  log('\n===== bom_material 孤儿外键修复 =====');
  steps.forEach((s) => log('  ' + s));
  log('\n剩余孤儿外键（指向不存在的表）:');
  if (orphan.length === 0) log('  （无）');
  else orphan.forEach((o) => log(`  ${o.TABLE_NAME}.${o.CONSTRAINT_NAME} -> ${o.REFERENCED_TABLE_NAME}`));
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
