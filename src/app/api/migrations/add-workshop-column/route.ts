import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function addColumnIfNotExists(table: string, column: string, definition: string) {
  const result = await query(`
    SELECT COUNT(*) as cnt FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = '${table}' 
    AND COLUMN_NAME = '${column}'
  `);
  
  if (result[0]?.cnt === 0) {
    await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
  }
  return false;
}

async function createTableIfNotExists(sql: string) {
  try {
    await query(sql);
    return true;
  } catch (e) {
    return false;
  }
}

export async function POST() {
  try {
    const results: string[] = [];

    const prdSchedule = await addColumnIfNotExists(
      'prd_schedule', 
      'workshop', 
      "VARCHAR(50) NULL COMMENT '车间: die_cut-模切, trademark-商标'"
    );
    if (prdSchedule) {
      results.push('已添加 workshop 字段到 prd_schedule 表');
    } else {
      results.push('prd_schedule 表 workshop 字段已存在');
    }

    await addColumnIfNotExists(
      'eqp_equipment', 
      'workshop', 
      "VARCHAR(50) NULL COMMENT '所属车间'"
    );
    results.push('已添加/确认 eqp_equipment workshop 字段');

    await addColumnIfNotExists(
      'eqp_equipment', 
      'capacity_per_hour', 
      'DECIMAL(10,2) DEFAULT 100 COMMENT "每小时产能"'
    );
    results.push('已添加/确认 eqp_equipment capacity_per_hour 字段');

    await addColumnIfNotExists(
      'eqp_equipment', 
      'max_colors', 
      'INT DEFAULT 1 COMMENT "最大支持色数"'
    );
    results.push('已添加/确认 eqp_equipment max_colors 字段');

    await addColumnIfNotExists(
      'eqp_equipment', 
      'setup_time_minutes', 
      'INT DEFAULT 30 COMMENT "换型准备时间"'
    );
    results.push('已添加/确认 eqp_equipment setup_time_minutes 字段');

    const colorSeqExists = await query(`
       SELECT COUNT(*) as cnt FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'prd_work_order_color_seq'
    `);
    if (colorSeqExists[0]?.cnt === 0) {
      await query(`
        CREATE TABLE IF NOT EXISTS prd_work_order_color_seq (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          work_order_id BIGINT UNSIGNED COMMENT '工单ID',
          seq_no INT NOT NULL COMMENT '色序号',
          color_name VARCHAR(50) COMMENT '颜色名称',
          screen_plate_id BIGINT UNSIGNED COMMENT '网版ID',
          ink_formula_id BIGINT UNSIGNED COMMENT '油墨配方ID',
          estimated_duration_hours DECIMAL(8,2) COMMENT '预计耗时(小时)',
          equipment_type_required VARCHAR(50) COMMENT '所需设备类型',
          depends_on_seq INT COMMENT '依赖工序',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted TINYINT DEFAULT 0,
          PRIMARY KEY (id),
          KEY idx_work_order (work_order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单色序表'
      `);
      results.push('已创建 prd_work_order_color_seq 表');
    } else {
      results.push('prd_work_order_color_seq 表已存在');
    }

    const scheduleDetailExists = await query(`
      SELECT COUNT(*) as cnt FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'prd_schedule_detail'
    `);
    if (scheduleDetailExists[0]?.cnt === 0) {
      await query(`
        CREATE TABLE IF NOT EXISTS prd_schedule_detail (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          schedule_id BIGINT UNSIGNED COMMENT '排程ID',
          work_order_id BIGINT UNSIGNED COMMENT '工单ID',
          color_seq_no INT COMMENT '色序号',
          color_name VARCHAR(50) COMMENT '颜色名称',
          equipment_id BIGINT UNSIGNED COMMENT '设备ID',
          equipment_name VARCHAR(100) COMMENT '设备名称',
          planned_start DATETIME COMMENT '计划开始时间',
          planned_end DATETIME COMMENT '计划结束时间',
          actual_start DATETIME COMMENT '实际开始时间',
          actual_end DATETIME COMMENT '实际结束时间',
          duration_hours DECIMAL(8,2) COMMENT '预计耗时(小时)',
          status TINYINT DEFAULT 1 COMMENT '状态: 1-待排, 2-已排, 3-生产中, 4-已完成',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted TINYINT DEFAULT 0,
          PRIMARY KEY (id),
          KEY idx_schedule (schedule_id),
          KEY idx_work_order (work_order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排程明细表'
      `);
      results.push('已创建 prd_schedule_detail 表');
    } else {
      results.push('prd_schedule_detail 表已存在');
    }

    return NextResponse.json({ 
      success: true, 
      message: results.join('; ')
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
