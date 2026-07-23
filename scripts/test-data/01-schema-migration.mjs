/**
 * VNERP 测试数据 - 阶段一步骤 2/4：Schema 迁移脚本
 *
 * 幂等执行：创建缺失的 HR 表 + 为采购/销售订单表添加多币种本位币列
 *
 * 用法: node scripts/test-data/01-schema-migration.mjs
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Snqig521223',
  database: process.env.DB_NAME || 'vnerpdacahng',
  charset: 'utf8mb4',
  multipleStatements: true,
};

// ── 工具函数 ──────────────────────────────────────────────
async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1`,
    [conn.config.database, table]
  );
  return rows.length > 0;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1`,
    [conn.config.database, table, column]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    console.log(`  [skip] ${table}.${column} 已存在`);
    return;
  }
  await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  [ok]   ${table}.${column} 已添加`);
}

async function createTableIfNotExists(conn, table, ddl) {
  if (await tableExists(conn, table)) {
    console.log(`  [skip] 表 ${table} 已存在`);
    return;
  }
  await conn.query(ddl);
  console.log(`  [ok]   表 ${table} 已创建`);
}

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  // ═══ 1. 创建缺失的 HR 表 ═══
  console.log('━━━ 步骤 1: 创建 HR 计件相关表 ━━━');

  await createTableIfNotExists(conn, 'hr_salary_standard', `
    CREATE TABLE hr_salary_standard (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      position_code varchar(50) NOT NULL COMMENT '岗位代码',
      skill_level int DEFAULT 1 COMMENT '技能等级',
      base_salary decimal(10,2) DEFAULT '0.00' COMMENT '基本工资',
      piece_rate_type varchar(20) DEFAULT NULL COMMENT '计件类型',
      performance_base decimal(10,2) DEFAULT '0.00' COMMENT '绩效基数',
      allowance_night decimal(10,2) DEFAULT '0.00' COMMENT '夜班补贴',
      allowance_high_temp decimal(10,2) DEFAULT '0.00' COMMENT '高温补贴',
      effective_date date NOT NULL COMMENT '生效日期',
      factory_id bigint unsigned DEFAULT NULL COMMENT '工厂ID',
      status tinyint DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
      remark text,
      create_time datetime DEFAULT CURRENT_TIMESTAMP,
      update_time datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted tinyint DEFAULT 0,
      PRIMARY KEY (id),
      INDEX idx_ss_position (position_code),
      INDEX idx_ss_effective (effective_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='HR薪资标准表'
  `);

  await createTableIfNotExists(conn, 'hr_piece_rate', `
    CREATE TABLE hr_piece_rate (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      process_code varchar(50) NOT NULL COMMENT '工序代码',
      product_type varchar(50) DEFAULT NULL COMMENT '产品类型',
      unit_price decimal(10,4) NOT NULL DEFAULT '0.0000' COMMENT '计件单价',
      unit varchar(20) DEFAULT '件' COMMENT '单位',
      quality_threshold decimal(5,2) DEFAULT '0.00' COMMENT '质量阈值',
      effective_date date NOT NULL COMMENT '生效日期',
      factory_id bigint unsigned DEFAULT NULL COMMENT '工厂ID',
      status tinyint DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
      remark text,
      create_time datetime DEFAULT CURRENT_TIMESTAMP,
      update_time datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted tinyint DEFAULT 0,
      PRIMARY KEY (id),
      INDEX idx_pr_process (process_code),
      INDEX idx_pr_product (product_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='HR计件单价表'
  `);

  await createTableIfNotExists(conn, 'hr_piece_work_detail', `
    CREATE TABLE hr_piece_work_detail (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      employee_id bigint unsigned NOT NULL COMMENT '员工ID',
      work_date date NOT NULL COMMENT '工作日期',
      process_code varchar(50) NOT NULL COMMENT '工序代码',
      product_code varchar(50) DEFAULT NULL COMMENT '产品代码',
      quantity int DEFAULT 0 COMMENT '合格数量',
      defective_quantity int DEFAULT 0 COMMENT '不合格数量',
      unit_price decimal(10,4) NOT NULL DEFAULT '0.0000' COMMENT '计件单价',
      amount decimal(10,2) DEFAULT NULL COMMENT '计件金额',
      machine_id varchar(50) DEFAULT NULL COMMENT '机台号',
      mes_sync_id varchar(50) DEFAULT NULL COMMENT 'MES同步ID',
      sync_status tinyint DEFAULT 0 COMMENT '同步状态',
      remark text,
      create_time datetime DEFAULT CURRENT_TIMESTAMP,
      update_time datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_pw_emp_date (employee_id, work_date),
      INDEX idx_pw_date (work_date),
      INDEX idx_pw_process (process_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='HR计件明细表'
  `);

  // ═══ 2. 为采购订单表添加多币种本位币列 ═══
  console.log('\n━━━ 步骤 2: 为采购订单表添加 base_* 列 ━━━');

  await addColumnIfMissing(conn, 'pur_purchase_order', 'base_total_amount',
    "decimal(18,4) DEFAULT '0.0000' NOT NULL COMMENT '本位币合计金额'");
  await addColumnIfMissing(conn, 'pur_purchase_order', 'base_tax_amount',
    "decimal(18,4) DEFAULT '0.0000' NOT NULL COMMENT '本位币税额'");
  await addColumnIfMissing(conn, 'pur_purchase_order', 'base_grand_total',
    "decimal(18,4) DEFAULT '0.0000' NOT NULL COMMENT '本位币价税合计'");

  // ═══ 3. 为采购订单明细表添加 base_* 列 ═══
  console.log('\n━━━ 步骤 3: 为采购订单明细表添加 base_* 列 ━━━');

  await addColumnIfMissing(conn, 'pur_purchase_order_line', 'base_unit_price',
    "decimal(18,4) DEFAULT '0.0000' NOT NULL COMMENT '本位币单价'");
  await addColumnIfMissing(conn, 'pur_purchase_order_line', 'base_amount',
    "decimal(18,4) DEFAULT '0.0000' NOT NULL COMMENT '本位币金额'");
  await addColumnIfMissing(conn, 'pur_purchase_order_line', 'base_tax_amount',
    "decimal(18,4) DEFAULT '0.0000' NOT NULL COMMENT '本位币税额'");
  await addColumnIfMissing(conn, 'pur_purchase_order_line', 'base_line_total',
    "decimal(18,4) DEFAULT '0.0000' NOT NULL COMMENT '本位币价税合计'");

  // ═══ 4. 为销售订单表添加 base_* 列 ═══
  console.log('\n━━━ 步骤 4: 为销售订单表添加 base_* 列 ━━━');

  await addColumnIfMissing(conn, 'sal_order', 'base_total_amount',
    "decimal(18,4) DEFAULT '0.0000' COMMENT '本位币合计金额'");
  await addColumnIfMissing(conn, 'sal_order', 'base_tax_amount',
    "decimal(18,4) DEFAULT '0.0000' COMMENT '本位币税额'");
  await addColumnIfMissing(conn, 'sal_order', 'base_grand_total',
    "decimal(18,4) DEFAULT '0.0000' COMMENT '本位币价税合计'");

  // ═══ 5. 为入库明细表添加 base_* 列 ═══
  console.log('\n━━━ 步骤 5: 为入库明细表添加 base_* 列 ━━━');

  await addColumnIfMissing(conn, 'inv_inbound_item', 'base_unit_price',
    "decimal(18,4) DEFAULT '0.0000' COMMENT '本位币单价'");
  await addColumnIfMissing(conn, 'inv_inbound_item', 'base_amount',
    "decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额'");

  console.log('\n✅ Schema 迁移完成');
  await conn.end();
}

main().catch((e) => {
  console.error('❌ 迁移失败:', e.message);
  process.exit(1);
});
