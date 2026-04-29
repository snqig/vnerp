import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

async function safeAlterTable(tableName: string, sql: string) {
  try {
    await execute(sql);
    return { table: tableName, status: 'altered' };
  } catch (e: any) {
    if (e.message?.includes('Duplicate column')) {
      return { table: tableName, status: 'skipped', reason: 'column already exists' };
    }
    return { table: tableName, status: 'error', message: e.message };
  }
}

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

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN asset_type VARCHAR(20) DEFAULT 'die' COMMENT '资产类型: die/flexo_plate/screen_mesh' AFTER template_name`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN layout_type VARCHAR(20) DEFAULT 'single_row' COMMENT '布局类型: single_row/multi_row' AFTER asset_type`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN pieces_per_impression INT DEFAULT 1 COMMENT '单次冲切/印刷出件数' AFTER layout_type`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN cumulative_impressions INT DEFAULT 0 COMMENT '累计使用次数(impressions)' AFTER pieces_per_impression`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN max_impressions INT DEFAULT 0 COMMENT '最大使用寿命阈值' AFTER cumulative_impressions`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN warning_threshold DECIMAL(5,2) DEFAULT 80.00 COMMENT '预警比例(%)' AFTER max_impressions`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN maintenance_interval INT DEFAULT 8000 COMMENT '保养间隔次数' AFTER warning_threshold`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN maintenance_count INT DEFAULT 0 COMMENT '已保养次数' AFTER maintenance_interval`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN last_maintenance_impressions INT DEFAULT 0 COMMENT '上次保养时累计次数' AFTER maintenance_count`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN last_maintenance_date DATE COMMENT '上次保养日期' AFTER last_maintenance_impressions`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN last_used_date DATE COMMENT '最后使用日期' AFTER last_maintenance_date`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价(元)' AFTER last_used_date`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN die_status VARCHAR(30) DEFAULT 'available' COMMENT '生命周期状态: available/in_use/maintenance_needed/re_rule_needed/scrap' AFTER unit_price`
  ));

  results.push(await safeAlterTable('prd_die_template',
    `ALTER TABLE prd_die_template ADD COLUMN qr_code VARCHAR(100) COMMENT '二维码编码' AFTER die_status`
  ));

  results.push(await safeCreateTable('prd_die_usage_log',
    `CREATE TABLE IF NOT EXISTS prd_die_usage_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      die_id BIGINT UNSIGNED NOT NULL COMMENT '刀模/网版ID',
      die_code VARCHAR(50) COMMENT '刀模编码',
      work_report_id BIGINT UNSIGNED COMMENT '报工记录ID',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单号',
      process_name VARCHAR(50) COMMENT '工序名称',
      impressions INT DEFAULT 0 COMMENT '本次使用次数',
      cumulative_after INT COMMENT '使用后累计次数',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员',
      equipment_id BIGINT UNSIGNED COMMENT '设备ID',
      usage_date DATE COMMENT '使用日期',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_die_id (die_id),
      KEY idx_work_report (work_report_id),
      KEY idx_work_order (work_order_id),
      KEY idx_usage_date (usage_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刀模/网版使用记录表'`
  ));

  results.push(await safeCreateTable('prd_die_maintenance',
    `CREATE TABLE IF NOT EXISTS prd_die_maintenance (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      maintenance_no VARCHAR(50) NOT NULL COMMENT '保养单号',
      die_id BIGINT UNSIGNED NOT NULL COMMENT '刀模/网版ID',
      die_code VARCHAR(50) COMMENT '刀模编码',
      maintenance_type VARCHAR(30) DEFAULT 'routine' COMMENT '保养类型: routine/grinding/re_rule/replace',
      impressions_before INT COMMENT '保养前累计次数',
      impressions_after INT COMMENT '保养后累计次数(重置)',
      maintenance_date DATE COMMENT '保养日期',
      next_maintenance_date DATE COMMENT '下次保养日期',
      cost DECIMAL(12,2) DEFAULT 0 COMMENT '保养费用',
      technician_id BIGINT UNSIGNED COMMENT '保养人员ID',
      technician_name VARCHAR(50) COMMENT '保养人员',
      status TINYINT DEFAULT 1 COMMENT '1-待保养 2-保养中 3-已完成',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_maintenance_no (maintenance_no),
      KEY idx_die_id (die_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刀模/网版保养记录表'`
  ));

  try {
    await execute(
      `UPDATE prd_die_template SET cumulative_impressions = current_usage, max_impressions = max_usage WHERE cumulative_impressions = 0 AND current_usage > 0`
    );
    results.push({ action: 'migrate_data', status: 'done', detail: 'migrated current_usage to cumulative_impressions' });
  } catch (e: any) {
    results.push({ action: 'migrate_data', status: 'error', message: e.message });
  }

  try {
    await execute(
      `UPDATE prd_die_template SET die_status = CASE
        WHEN status = 4 THEN 'scrap'
        WHEN status = 3 THEN 're_rule_needed'
        WHEN status = 2 THEN 'maintenance_needed'
        ELSE 'available'
      END
      WHERE die_status = 'available' AND status IN (2, 3, 4)`
    );
    results.push({ action: 'migrate_status', status: 'done', detail: 'migrated old status to die_status' });
  } catch (e: any) {
    results.push({ action: 'migrate_status', status: 'error', message: e.message });
  }

  try {
    await execute(
      `UPDATE prd_die_template SET asset_type = CASE
        WHEN template_type = 2 THEN 'screen_mesh'
        ELSE 'die'
      END
      WHERE asset_type = 'die'`
    );
    results.push({ action: 'migrate_asset_type', status: 'done' });
  } catch (e: any) {
    results.push({ action: 'migrate_asset_type', status: 'error', message: e.message });
  }

  return successResponse(results, '刀模/网版表结构优化完成');
}, '刀模/网版表结构优化失败');
