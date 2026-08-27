'use strict';
// 受控执行 live DDL：建 7 孤儿表 + 去重 prd_work_order 重复 FK + 补 2 个 P1 缺失 FK。
// 逐条执行并报告 OK/FAIL，遇错不中断后续（但会汇总）。
const mysql = require('mysql2/promise');
const S = 'vnerpdacahng';

const stmts = [
  // ---------- 7 孤儿表（CREATE TABLE IF NOT EXISTS，幂等） ----------
  // 来自 migration 071（精确 DDL）
  `CREATE TABLE IF NOT EXISTS \`prd_work_order_bom\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`work_order_id\` BIGINT UNSIGNED NOT NULL,
    \`work_order_no\` VARCHAR(50) DEFAULT NULL,
    \`material_id\` BIGINT UNSIGNED NOT NULL,
    \`material_code\` VARCHAR(50) NOT NULL,
    \`material_name\` VARCHAR(100) NOT NULL,
    \`specification\` VARCHAR(255) DEFAULT NULL,
    \`unit\` VARCHAR(20) DEFAULT NULL,
    \`required_qty\` DECIMAL(18,4) NOT NULL,
    \`picked_qty\` DECIMAL(18,4) DEFAULT 0.0000,
    \`returned_qty\` DECIMAL(18,4) DEFAULT 0.0000,
    \`unit_cost\` DECIMAL(18,4) DEFAULT 0.0000,
    \`line_cost\` DECIMAL(18,4) DEFAULT 0.0000,
    \`item_type\` TINYINT DEFAULT 1,
    \`sort\` INT DEFAULT 0,
    \`remark\` VARCHAR(255) DEFAULT NULL,
    \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`update_time\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted\` TINYINT DEFAULT 0,
    PRIMARY KEY (\`id\`),
    KEY \`idx_work_order\` (\`work_order_id\`),
    KEY \`idx_material\` (\`material_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单 BOM 表'`,

  `CREATE TABLE IF NOT EXISTS \`sal_sample_quotation\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`sample_order_id\` BIGINT UNSIGNED NOT NULL,
    \`quotation_no\` VARCHAR(50) NOT NULL,
    \`version\` INT NOT NULL DEFAULT 1,
    \`material_cost\` DECIMAL(14,4) DEFAULT 0.0000,
    \`labor_cost\` DECIMAL(14,4) DEFAULT 0.0000,
    \`tool_cost\` DECIMAL(14,4) DEFAULT 0.0000,
    \`overhead_cost\` DECIMAL(14,4) DEFAULT 0.0000,
    \`total_cost\` DECIMAL(14,4) DEFAULT 0.0000,
    \`currency\` VARCHAR(10) DEFAULT 'CNY',
    \`exchange_rate\` DECIMAL(18,4) DEFAULT 1.0000,
    \`profit_rate\` DECIMAL(6,2) DEFAULT 20.00,
    \`quoted_price\` DECIMAL(14,4) DEFAULT 0.0000,
    \`status\` TINYINT DEFAULT 1,
    \`valid_until\` DATE DEFAULT NULL,
    \`remark\` TEXT DEFAULT NULL,
    \`create_by\` BIGINT UNSIGNED DEFAULT NULL,
    \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`update_time\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted\` TINYINT DEFAULT 0,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uk_quotation_no\` (\`quotation_no\`),
    KEY \`idx_sample_order\` (\`sample_order_id\`),
    KEY \`idx_quotation_status\` (\`status\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打样报价表'`,

  // 来自 Drizzle schema（hr.ts / trace.ts / report.ts / system.ts）
  `CREATE TABLE IF NOT EXISTS \`hr_attendance_exception\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`employee_id\` BIGINT UNSIGNED NOT NULL,
    \`exception_date\` DATE NOT NULL,
    \`exception_type\` VARCHAR(20) NOT NULL,
    \`minutes\` INT DEFAULT 0,
    \`deduction_amount\` DECIMAL(10,2) DEFAULT '0.00',
    \`status\` VARCHAR(20) DEFAULT 'pending',
    \`handler_id\` BIGINT UNSIGNED DEFAULT NULL,
    \`handle_time\` DATETIME DEFAULT NULL,
    \`remark\` TEXT,
    \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`update_time\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_ae_emp_date\` (\`employee_id\`,\`exception_date\`),
    KEY \`idx_ae_type\` (\`exception_type\`),
    KEY \`idx_ae_status\` (\`status\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤异常'`,

  `CREATE TABLE IF NOT EXISTS \`hr_employee_position\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`employee_id\` BIGINT UNSIGNED NOT NULL,
    \`position_id\` BIGINT UNSIGNED NOT NULL,
    \`is_primary\` TINYINT DEFAULT 0,
    \`start_date\` DATE DEFAULT NULL,
    \`end_date\` DATE DEFAULT NULL,
    \`status\` TINYINT DEFAULT 1,
    \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_hep_employee\` (\`employee_id\`),
    KEY \`idx_hep_position\` (\`position_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工岗位'`,

  `CREATE TABLE IF NOT EXISTS \`print_log\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`qr_id\` BIGINT UNSIGNED NOT NULL,
    \`template_id\` BIGINT UNSIGNED DEFAULT NULL,
    \`print_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`operator\` VARCHAR(50) DEFAULT NULL,
    \`paper_type\` VARCHAR(20) DEFAULT 'thermal',
    \`print_count\` INT DEFAULT 1,
    PRIMARY KEY (\`id\`),
    KEY \`idx_pl_qr\` (\`qr_id\`),
    KEY \`idx_pl_template\` (\`template_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打印日志'`,

  `CREATE TABLE IF NOT EXISTS \`report_user_config\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`report_key\` VARCHAR(50) NOT NULL,
    \`selected_fields\` JSON,
    \`selected_categories\` JSON,
    \`date_range\` JSON,
    \`view_mode\` VARCHAR(20) DEFAULT 'all',
    \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`update_time\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_ruc_user\` (\`user_id\`),
    KEY \`idx_ruc_key\` (\`report_key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报表用户配置'`,

  `CREATE TABLE IF NOT EXISTS \`sys_data_scope\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`role_id\` BIGINT UNSIGNED NOT NULL,
    \`scope_type\` VARCHAR(20) NOT NULL,
    \`target_ids\` TEXT,
    \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_data_scope_role\` (\`role_id\`),
    KEY \`idx_data_scope_type\` (\`scope_type\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据权限范围'`,

  // ---------- 去重 prd_work_order 重复 FK（保留 fk_prd_work_order_*，删除 fk_prd_wo_*） ----------
  `ALTER TABLE \`prd_work_order\` DROP FOREIGN KEY \`fk_prd_wo_material\``,
  `ALTER TABLE \`prd_work_order\` DROP FOREIGN KEY \`fk_prd_wo_sales_order\``,

  // ---------- P1 补 2 个真实缺失 FK（孤儿预检已通过：0 孤儿行） ----------
  `ALTER TABLE \`inv_inbound_order\` ADD CONSTRAINT \`fk_inv_inbound_order_po\` FOREIGN KEY (\`po_id\`) REFERENCES \`pur_purchase_order\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE \`crm_customer_analysis\` ADD CONSTRAINT \`fk_crm_customer_analysis_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`crm_customer\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
];

(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: S, multipleStatements: false });
  let ok = 0, fail = 0;
  for (const sql of stmts) {
    const tag = sql.trim().split(/\s+/).slice(0, 3).join(' ').replace(/`/g, '');
    try {
      const [r] = await c.query(sql);
      console.log(`  OK   ${tag}  (${r && r.affectedRows !== undefined ? 'affected=' + r.affectedRows : 'done'})`);
      ok++;
    } catch (e) {
      console.log(`  FAIL ${tag}  -> ${e.code || ''} ${e.message.split('\n')[0]}`);
      fail++;
    }
  }
  await c.end();
  console.log(`\n=== DONE: ${ok} ok, ${fail} fail ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
