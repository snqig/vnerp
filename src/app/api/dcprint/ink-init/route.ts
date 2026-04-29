import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

async function safeCreateTable(tableName: string, sql: string) {
  try {
    await execute(sql);
    return { table: tableName, status: 'created' };
  } catch (e: any) {
    return { table: tableName, status: 'error', message: e.message };
  }
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const results: any[] = [];

  results.push(await safeCreateTable('ink_formula', `
    CREATE TABLE IF NOT EXISTS ink_formula (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      formula_no VARCHAR(50) NOT NULL COMMENT '配方编号',
      formula_name VARCHAR(200) NOT NULL COMMENT '配方名称',
      pantone_code VARCHAR(50) COMMENT 'Pantone色号',
      color_name VARCHAR(100) COMMENT '颜色名称',
      color_code VARCHAR(50) COMMENT '颜色代码',
      ink_type VARCHAR(20) DEFAULT 'solvent' COMMENT '油墨类型: solvent/uv/water',
      base_ink_type VARCHAR(50) COMMENT '基墨类型',
      total_weight DECIMAL(10,3) COMMENT '配方总重量',
      unit VARCHAR(10) DEFAULT 'kg' COMMENT '单位',
      shelf_life_hours INT DEFAULT 168 COMMENT '保质期(小时)',
      status TINYINT DEFAULT 1 COMMENT '1-草稿 2-已审核 3-已停用',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_formula_no (formula_no),
      KEY idx_color_name (color_name),
      KEY idx_pantone (pantone_code),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨配方表'
  `));

  results.push(await safeCreateTable('ink_formula_item', `
    CREATE TABLE IF NOT EXISTS ink_formula_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      formula_id BIGINT UNSIGNED NOT NULL COMMENT '配方ID',
      sort_order INT DEFAULT 0 COMMENT '排序',
      ink_id BIGINT UNSIGNED COMMENT '原墨ID',
      ink_code VARCHAR(50) COMMENT '原墨编码',
      ink_name VARCHAR(100) COMMENT '原墨名称',
      ink_type VARCHAR(20) COMMENT '原墨类型',
      brand VARCHAR(100) COMMENT '品牌',
      ratio_percent DECIMAL(8,4) COMMENT '配比百分比',
      weight DECIMAL(10,3) COMMENT '重量',
      unit VARCHAR(10) DEFAULT 'kg' COMMENT '单位',
      is_base TINYINT DEFAULT 0 COMMENT '是否基墨',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_formula_id (formula_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨配方明细表'
  `));

  results.push(await safeCreateTable('ink_formula_workorder', `
    CREATE TABLE IF NOT EXISTS ink_formula_workorder (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      formula_id BIGINT UNSIGNED NOT NULL COMMENT '配方ID',
      workorder_id BIGINT UNSIGNED COMMENT '工单ID',
      workorder_no VARCHAR(50) COMMENT '工单号',
      status TINYINT DEFAULT 1 COMMENT '1-有效',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_formula_workorder (formula_id, workorder_id),
      KEY idx_workorder_no (workorder_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨配方与工单关联表'
  `));

  results.push(await safeCreateTable('ink_dispatch', `
    CREATE TABLE IF NOT EXISTS ink_dispatch (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      dispatch_no VARCHAR(50) NOT NULL COMMENT '配料单号',
      batch_no VARCHAR(50) COMMENT '专色墨批次号',
      workorder_id BIGINT UNSIGNED COMMENT '工单ID',
      workorder_no VARCHAR(50) COMMENT '工单号',
      formula_id BIGINT UNSIGNED COMMENT '配方ID',
      formula_no VARCHAR(50) COMMENT '配方编号',
      color_name VARCHAR(100) COMMENT '颜色名称',
      color_code VARCHAR(50) COMMENT '颜色代码',
      pantone_code VARCHAR(50) COMMENT 'Pantone色号',
      total_weight DECIMAL(10,3) COMMENT '配方总重',
      unit VARCHAR(10) DEFAULT 'kg' COMMENT '单位',
      tare_weight DECIMAL(10,3) DEFAULT 0 COMMENT '皮重',
      net_weight DECIMAL(10,3) COMMENT '净重',
      gross_weight DECIMAL(10,3) COMMENT '毛重',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员',
      machine_id BIGINT UNSIGNED COMMENT '机台ID',
      machine_name VARCHAR(100) COMMENT '机台名称',
      status TINYINT DEFAULT 1 COMMENT '1-配料中 2-已称重 3-已确认 4-已使用',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_dispatch_no (dispatch_no),
      KEY idx_batch_no (batch_no),
      KEY idx_workorder (workorder_no),
      KEY idx_formula (formula_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨调色配料表'
  `));

  results.push(await safeCreateTable('ink_dispatch_item', `
    CREATE TABLE IF NOT EXISTS ink_dispatch_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      dispatch_id BIGINT UNSIGNED NOT NULL COMMENT '配料单ID',
      sort_order INT DEFAULT 0 COMMENT '排序',
      source_type VARCHAR(20) DEFAULT 'fresh' COMMENT '来源类型: fresh/surplus',
      source_batch_no VARCHAR(50) COMMENT '原墨批次号',
      source_label_no VARCHAR(50) COMMENT '原墨标签号',
      ink_id BIGINT UNSIGNED COMMENT '原墨ID',
      ink_code VARCHAR(50) COMMENT '原墨编码',
      ink_name VARCHAR(100) COMMENT '原墨名称',
      ink_type VARCHAR(20) COMMENT '原墨类型',
      brand VARCHAR(100) COMMENT '品牌',
      formula_weight DECIMAL(10,3) COMMENT '配方重量',
      actual_weight DECIMAL(10,3) COMMENT '实际重量',
      unit VARCHAR(10) DEFAULT 'kg' COMMENT '单位',
      is_surplus TINYINT DEFAULT 0 COMMENT '是否余墨',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_dispatch_id (dispatch_id),
      KEY idx_source_batch (source_batch_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨配料明细表'
  `))

  results.push(await safeCreateTable('ink_usage', `
    CREATE TABLE IF NOT EXISTS ink_usage (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      usage_no VARCHAR(50) NOT NULL COMMENT '使用记录号',
      usage_type VARCHAR(20) NOT NULL COMMENT '类型: requisition/machine_load/consumption/return/scrap',
      batch_no VARCHAR(50) COMMENT '油墨批次号',
      qr_code VARCHAR(100) COMMENT '二维码',
      workorder_id BIGINT UNSIGNED COMMENT '工单ID',
      workorder_no VARCHAR(50) COMMENT '工单号',
      formula_id BIGINT UNSIGNED COMMENT '配方ID',
      formula_no VARCHAR(50) COMMENT '配方编号',
      color_name VARCHAR(100) COMMENT '颜色名称',
      weight DECIMAL(10,3) NOT NULL COMMENT '重量',
      unit VARCHAR(10) DEFAULT 'kg' COMMENT '单位',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员',
      machine_id BIGINT UNSIGNED COMMENT '机台ID',
      machine_name VARCHAR(100) COMMENT '机台名称',
      location_id BIGINT UNSIGNED COMMENT '库位ID',
      location_name VARCHAR(100) COMMENT '库位名称',
      status TINYINT DEFAULT 1 COMMENT '1-有效',
      remark TEXT COMMENT '备注',
      usage_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '使用时间',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_usage_no (usage_no),
      KEY idx_batch_no (batch_no),
      KEY idx_workorder (workorder_no),
      KEY idx_usage_type (usage_type),
      KEY idx_usage_time (usage_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨使用记录表'
  `));

  try {
    const [cols]: any = await execute("SHOW COLUMNS FROM ink_opening_record LIKE 'workorder_id'");
    if (cols.length === 0) {
      await execute("ALTER TABLE ink_opening_record ADD COLUMN workorder_id BIGINT UNSIGNED COMMENT '工单ID' AFTER remark");
      await execute("ALTER TABLE ink_opening_record ADD COLUMN workorder_no VARCHAR(50) COMMENT '工单号' AFTER workorder_id");
      results.push({ table: 'ink_opening_record', action: 'add_columns', columns: ['workorder_id', 'workorder_no'] });
    }
  } catch (e: any) {
    results.push({ table: 'ink_opening_record', action: 'add_columns', status: 'error', message: e.message });
  }

  try {
    const [cols]: any = await execute("SHOW COLUMNS FROM inv_inventory_batch LIKE 'inspection_id'");
    if (cols.length === 0) {
      await execute("ALTER TABLE inv_inventory_batch ADD COLUMN inspection_id BIGINT UNSIGNED COMMENT '检验记录ID' AFTER status");
      results.push({ table: 'inv_inventory_batch', action: 'add_column', column: 'inspection_id' });
    }
  } catch (e: any) {
    results.push({ table: 'inv_inventory_batch', action: 'add_column', status: 'error', message: e.message });
  }

  try {
    const [cols]: any = await execute("SHOW COLUMNS FROM inv_scan_log LIKE 'batch_no'");
    if (cols.length === 0) {
      await execute("ALTER TABLE inv_scan_log ADD COLUMN batch_no VARCHAR(50) COMMENT '批次号' AFTER sn");
      results.push({ table: 'inv_scan_log', action: 'add_column', column: 'batch_no' });
    }
  } catch (e: any) {
    results.push({ table: 'inv_scan_log', action: 'add_column', status: 'error', message: e.message });
  }

  return successResponse(results, '油墨管理相关表初始化完成');
});
