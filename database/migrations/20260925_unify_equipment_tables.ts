import type { Connection } from 'mysql2/promise';

/**
 * Migration: 统一设备管理表结构，补充新功能表
 *
 * P0: 废弃 eq_ 前缀旧表，为 eqp_ 表补充缺失字段
 * P1: 新增备件管理（eqp_spare_part / eqp_spare_issue）
 * P1: 新增点检管理（eqp_inspection）
 */

export async function up(conn: Connection): Promise<void> {
  // ===================== P0: 废弃 eq_ 旧表 =====================
  const oldTables = [
    'eq_equipment',
    'eq_maintenance_plan',
    'eq_maintenance_record',
  ];
  for (const tbl of oldTables) {
    try {
      const [rows]: any = await conn.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tbl]
      );
      if ((rows as any[]).length > 0) {
        const newName = `${tbl}_deprecated`;
        await conn.query(`RENAME TABLE ${tbl} TO ${newName}`);
      }
    } catch {
      // 表不存在，忽略
    }
  }

  // ===================== P0: 为 eqp_equipment 补充缺失字段 =====================
  const eqpEquipmentCols = [
    { name: 'model', type: "VARCHAR(100) DEFAULT NULL COMMENT '型号规格'" },
    { name: 'manufacturer', type: "VARCHAR(100) DEFAULT NULL COMMENT '制造商'" },
    { name: 'workshop', type: "VARCHAR(50) DEFAULT NULL COMMENT '车间名称（冗余字段，便于查询）'" },
    { name: 'purchase_date', type: 'DATE DEFAULT NULL COMMENT "购置日期"' },
    { name: 'install_date', type: 'DATE DEFAULT NULL COMMENT "安装日期"' },
    { name: 'purchase_price', type: "DECIMAL(12,2) DEFAULT 0.00 COMMENT '购置价格'" },
    { name: 'expected_life_years', type: 'INT DEFAULT 10 COMMENT "预计使用年限（年）"' },
    { name: 'cumulative_run_hours', type: "DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计运行时长（小时）'" },
    { name: 'cumulative_print_count', type: 'BIGINT DEFAULT 0 COMMENT "累计产量"' },
  ];

  for (const col of eqpEquipmentCols) {
    try {
      await conn.query(
        `ALTER TABLE eqp_equipment ADD COLUMN ${col.name} ${col.type}`,
        []
      );
    } catch {
      // 列已存在，忽略
    }
  }

  // ===================== P0: 为 eqp_maintenance_plan 补充缺失字段 =====================
  const planCols = [
    { name: 'plan_name', type: "VARCHAR(100) NOT NULL COMMENT '计划名称'" },
    { name: 'estimated_hours', type: "DECIMAL(5,2) DEFAULT 4.00 COMMENT '预计耗时（小时）'" },
    { name: 'estimated_cost', type: "DECIMAL(10,2) DEFAULT 0.00 COMMENT '预计费用'" },
    { name: 'lead_days', type: 'INT DEFAULT 7 COMMENT "提前提醒天数"' },
    { name: 'checklist', type: 'JSON DEFAULT NULL COMMENT "检查项目清单（JSON 数组）"' },
    { name: 'last_executed_date', type: 'DATE DEFAULT NULL COMMENT "上次执行日期"' },
    { name: 'next_execute_date', type: 'DATE DEFAULT NULL COMMENT "下次执行日期"' },
    { name: 'create_by', type: 'BIGINT UNSIGNED DEFAULT NULL COMMENT "创建人"' },
    { name: 'update_by', type: 'BIGINT UNSIGNED DEFAULT NULL COMMENT "更新人"' },
    { name: 'create_time', type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { name: 'update_time', type: "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
  ];

  for (const col of planCols) {
    try {
      await conn.query(
        `ALTER TABLE eqp_maintenance_plan ADD COLUMN ${col.name} ${col.type}`,
        []
      );
    } catch {
      // 列已存在，忽略
    }
  }

  // ===================== P0: 为 eqp_maintenance_record 补充缺失字段 =====================
  const recordCols = [
    { name: 'maintenance_date', type: "DATE NOT NULL COMMENT '维保日期'" },
    { name: 'technician_name', type: "VARCHAR(50) DEFAULT NULL COMMENT '技术员姓名'" },
    { name: 'run_hours_before', type: "DECIMAL(10,2) DEFAULT NULL COMMENT '维保前运行时长'" },
    { name: 'run_hours_after', type: "DECIMAL(10,2) DEFAULT NULL COMMENT '维保后运行时长'" },
    { name: 'description', type: 'TEXT DEFAULT NULL COMMENT "维保内容描述"' },
    { name: 'parts_replaced', type: 'JSON DEFAULT NULL COMMENT "更换配件清单（JSON 数组）"' },
    { name: 'result', type: "VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '维保结果：completed/partial/failed'" },
    { name: 'status', type: 'TINYINT NOT NULL DEFAULT 1 COMMENT "状态：1=已完成 2=进行中 3=已取消"' },
    { name: 'create_by', type: 'BIGINT UNSIGNED DEFAULT NULL COMMENT "创建人"' },
    { name: 'update_by', type: 'BIGINT UNSIGNED DEFAULT NULL COMMENT "更新人"' },
    { name: 'create_time', type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { name: 'update_time', type: "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
  ];

  for (const col of recordCols) {
    try {
      await conn.query(
        `ALTER TABLE eqp_maintenance_record ADD COLUMN ${col.name} ${col.type}`,
        []
      );
    } catch {
      // 列已存在，忽略
    }
  }

  // ===================== P1: 创建备件表 eqp_spare_part =====================
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS eqp_spare_part (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '备件ID',
        part_code VARCHAR(50) NOT NULL COMMENT '备件编码',
        part_name VARCHAR(100) NOT NULL COMMENT '备件名称',
        specification VARCHAR(200) DEFAULT NULL COMMENT '规格型号',
        unit VARCHAR(20) DEFAULT '个' COMMENT '单位',
        stock_qty INT DEFAULT 0 COMMENT '当前库存数量',
        safety_stock INT DEFAULT 0 COMMENT '安全库存阈值',
        unit_price DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价（元）',
        supplier_id BIGINT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
        location VARCHAR(100) DEFAULT NULL COMMENT '存放位置',
        status TINYINT DEFAULT 1 COMMENT '状态：1=正常 0=停用',
        remark TEXT DEFAULT NULL COMMENT '备注',
        deleted TINYINT DEFAULT 0 COMMENT '软删除：0=正常 1=已删除',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_spare_part_code (part_code),
        KEY idx_spare_status (status),
        KEY idx_spare_supplier (supplier_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备备件表'
    `, []);
  } catch {
    // 表已存在，忽略
  }

  // ===================== P1: 创建备件领用记录表 eqp_spare_issue =====================
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS eqp_spare_issue (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '领用记录ID',
        issue_no VARCHAR(50) NOT NULL COMMENT '领用单号',
        spare_part_id BIGINT UNSIGNED NOT NULL COMMENT '备件ID',
        equipment_id BIGINT UNSIGNED DEFAULT NULL COMMENT '设备ID',
        quantity INT NOT NULL DEFAULT 1 COMMENT '领用数量',
        applicant_id BIGINT UNSIGNED DEFAULT NULL COMMENT '领用人ID',
        applicant_name VARCHAR(50) DEFAULT NULL COMMENT '领用人姓名',
        issue_date DATE NOT NULL COMMENT '领用日期',
        reason VARCHAR(200) DEFAULT NULL COMMENT '领用原因',
        status TINYINT DEFAULT 1 COMMENT '状态：1=待确认 2=已确认 3=已撤销',
        remark TEXT DEFAULT NULL COMMENT '备注',
        deleted TINYINT DEFAULT 0 COMMENT '软删除：0=正常 1=已删除',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_spare_issue_no (issue_no),
        KEY idx_spare_issue_part (spare_part_id),
        KEY idx_spare_issue_equipment (equipment_id),
        KEY idx_spare_issue_date (issue_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='备件领用记录表'
    `, []);
  } catch {
    // 表已存在，忽略
  }

  // ===================== P1: 创建设备点检表 eqp_inspection =====================
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS eqp_inspection (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '点检记录ID',
        inspection_no VARCHAR(50) NOT NULL COMMENT '点检单号',
        equipment_id BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
        inspection_type TINYINT NOT NULL COMMENT '类型：1=日检 2=周检 3=月检',
        inspector_id BIGINT UNSIGNED DEFAULT NULL COMMENT '点检人ID',
        inspector_name VARCHAR(50) DEFAULT NULL COMMENT '点检人姓名',
        inspection_date DATE NOT NULL COMMENT '点检日期',
        items JSON NOT NULL COMMENT '点检项目及结果（JSON 数组）',
        result TINYINT DEFAULT 1 COMMENT '结果：1=正常 2=异常',
        abnormal_desc TEXT DEFAULT NULL COMMENT '异常描述',
        status TINYINT DEFAULT 1 COMMENT '状态：1=待执行 2=已完成 3=已跳过',
        remark TEXT DEFAULT NULL COMMENT '备注',
        deleted TINYINT DEFAULT 0 COMMENT '软删除：0=正常 1=已删除',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_inspection_no (inspection_no),
        KEY idx_inspection_equipment (equipment_id),
        KEY idx_inspection_date (inspection_date),
        KEY idx_inspection_type (inspection_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备点检记录表'
    `, []);
  } catch {
    // 表已存在，忽略
  }
}

export async function down(conn: Connection): Promise<void> {
  // 恢复被重命名的旧表
  const deprecatedTables = [
    ['eq_equipment_deprecated', 'eq_equipment'],
    ['eq_maintenance_plan_deprecated', 'eq_maintenance_plan'],
    ['eq_maintenance_record_deprecated', 'eq_maintenance_record'],
  ];
  for (const [oldName, newName] of deprecatedTables) {
    try {
      await conn.query(`RENAME TABLE ${oldName} TO ${newName}`);
    } catch {
      // 表不存在，忽略
    }
  }

  // 注意：新增表（备件、点检）和新增列不在 down 中回滚，保留数据
}
