import { query, execute } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';
import type { NextRequest } from 'next/server';

async function tableExists(name: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return (rows as any[]).length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return (rows as any[]).length > 0;
}

async function constraintExists(name: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?`,
    [name]
  );
  return (rows as any[]).length > 0;
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return (rows as any[]).length > 0;
}

async function addConstraintSafe(sql: string, constraintName: string): Promise<string> {
  if (await constraintExists(constraintName)) {
    return `Already exists: ${constraintName}`;
  }
  try {
    await execute(sql);
    return `Added: ${constraintName}`;
  } catch (e: any) {
    return `Failed ${constraintName}: ${e.message}`;
  }
}

async function addIndexSafe(table: string, indexName: string, columns: string): Promise<string> {
  if (await indexExists(table, indexName)) {
    return `Already exists: index ${indexName}`;
  }
  try {
    await execute(`CREATE INDEX ${indexName} ON ${table} (${columns})`);
    return `Added index: ${indexName}`;
  } catch (e: any) {
    return `Failed index ${indexName}: ${e.message}`;
  }
}

async function addColumnSafe(table: string, column: string, definition: string): Promise<string> {
  if (await columnExists(table, column)) {
    return `Already exists: ${table}.${column}`;
  }
  try {
    await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return `Added: ${table}.${column}`;
  } catch (e: any) {
    return `Failed ${table}.${column}: ${e.message}`;
  }
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const step = searchParams.get('step') || 'all';
  const results: string[] = [];

  await execute('SET FOREIGN_KEY_CHECKS = 0');

  // ============================================================
  // 【1】BOM 体系外键
  // ============================================================
  if (step === 'all' || step === '1') {
    results.push('===== 【1】BOM 体系外键 =====');

    if (await tableExists('bom_line')) {
      results.push(await addConstraintSafe(
        `ALTER TABLE bom_line ADD CONSTRAINT fk_bom_line_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE`,
        'fk_bom_line_header'
      ));
      results.push(await addConstraintSafe(
        `ALTER TABLE bom_line ADD CONSTRAINT fk_bom_line_material FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT`,
        'fk_bom_line_material'
      ));
    }

    if (await tableExists('bom_alternative')) {
      results.push(await addConstraintSafe(
        `ALTER TABLE bom_alternative ADD CONSTRAINT fk_bom_alt_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE`,
        'fk_bom_alt_header'
      ));
      results.push(await addConstraintSafe(
        `ALTER TABLE bom_alternative ADD CONSTRAINT fk_bom_alt_line FOREIGN KEY (bom_line_id) REFERENCES bom_line(id) ON DELETE CASCADE`,
        'fk_bom_alt_line'
      ));
      results.push(await addConstraintSafe(
        `ALTER TABLE bom_alternative ADD CONSTRAINT fk_bom_alt_material FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT`,
        'fk_bom_alt_material'
      ));
    }

    if (await tableExists('bom_version_history')) {
      results.push(await addConstraintSafe(
        `ALTER TABLE bom_version_history ADD CONSTRAINT fk_bom_history_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE`,
        'fk_bom_history_header'
      ));
    }
  }

  // ============================================================
  // 【2】油墨外键
  // ============================================================
  if (step === 'all' || step === '2') {
    results.push('===== 【2】油墨外键 =====');

    if (await tableExists('base_ink')) {
      if (await columnExists('base_ink', 'supplier_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE base_ink ADD CONSTRAINT fk_base_ink_supplier FOREIGN KEY (supplier_id) REFERENCES pur_supplier(id) ON DELETE SET NULL`,
          'fk_base_ink_supplier'
        ));
      }
    }
  }

  // ============================================================
  // 【3】网版外键
  // ============================================================
  if (step === 'all' || step === '3') {
    results.push('===== 【3】网版外键 =====');

    if (await tableExists('prd_screen_plate')) {
      if (await columnExists('prd_screen_plate', 'customer_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE prd_screen_plate ADD CONSTRAINT fk_screen_plate_customer FOREIGN KEY (customer_id) REFERENCES mdm_customer(id) ON DELETE SET NULL`,
          'fk_screen_plate_customer'
        ));
      }
      if (await columnExists('prd_screen_plate', 'warehouse_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE prd_screen_plate ADD CONSTRAINT fk_screen_plate_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) ON DELETE SET NULL`,
          'fk_screen_plate_warehouse'
        ));
      }
      if (await columnExists('prd_screen_plate', 'location_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE prd_screen_plate ADD CONSTRAINT fk_screen_plate_location FOREIGN KEY (location_id) REFERENCES inv_location(id) ON DELETE SET NULL`,
          'fk_screen_plate_location'
        ));
      }
    }
  }

  // ============================================================
  // 【4】库存标签外键
  // ============================================================
  if (step === 'all' || step === '4') {
    results.push('===== 【4】库存标签外键 =====');

    if (await tableExists('inv_material_label')) {
      if (await columnExists('inv_material_label', 'parent_label_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_parent FOREIGN KEY (parent_label_id) REFERENCES inv_material_label(id) ON DELETE SET NULL`,
          'fk_label_parent'
        ));
      }
      if (await columnExists('inv_material_label', 'warehouse_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) ON DELETE SET NULL`,
          'fk_label_warehouse'
        ));
      }
      if (await columnExists('inv_material_label', 'location_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_location FOREIGN KEY (location_id) REFERENCES inv_location(id) ON DELETE SET NULL`,
          'fk_label_location'
        ));
      }
      if (await columnExists('inv_material_label', 'ink_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_ink FOREIGN KEY (ink_id) REFERENCES base_ink(id) ON DELETE SET NULL`,
          'fk_label_ink'
        ));
      }
    }

    if (await tableExists('prd_process_card')) {
      if (await columnExists('prd_process_card', 'main_label_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE prd_process_card ADD CONSTRAINT fk_process_card_main_label FOREIGN KEY (main_label_id) REFERENCES inv_material_label(id) ON DELETE SET NULL`,
          'fk_process_card_main_label'
        ));
      }
    }
  }

  // ============================================================
  // 【5】用户与部门外键
  // ============================================================
  if (step === 'all' || step === '5') {
    results.push('===== 【5】用户与部门外键 =====');

    if (await tableExists('sys_user')) {
      if (await columnExists('sys_user', 'department_id')) {
        results.push(await addConstraintSafe(
          `ALTER TABLE sys_user ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES sys_department(id) ON DELETE SET NULL`,
          'fk_user_department'
        ));
      }
    }
  }

  // ============================================================
  // 【6】索引补充
  // ============================================================
  if (step === 'all' || step === '6') {
    results.push('===== 【6】索引补充 =====');

    results.push(await addIndexSafe('bom_line', 'idx_bom_line_material_id', 'material_id'));
    results.push(await addIndexSafe('base_ink', 'idx_base_ink_supplier_id', 'supplier_id'));
    results.push(await addIndexSafe('prd_screen_plate', 'idx_prd_screen_plate_customer_id', 'customer_id'));
    results.push(await addIndexSafe('prd_screen_plate', 'idx_prd_screen_plate_plate_code', 'plate_code'));
    results.push(await addIndexSafe('inv_material_label', 'idx_inv_material_label_parent_id', 'parent_label_id'));
    results.push(await addIndexSafe('inv_material_label', 'idx_inv_material_label_label_no', 'label_no'));
    results.push(await addIndexSafe('inv_material_label', 'idx_inv_material_label_material_code', 'material_code'));
    results.push(await addIndexSafe('prd_process_card', 'idx_prd_process_card_main_label', 'main_label_id'));
    results.push(await addIndexSafe('sys_user', 'idx_sys_user_department_id', 'department_id'));
  }

  // ============================================================
  // 【7】网版表字段优化
  // ============================================================
  if (step === 'all' || step === '7') {
    results.push('===== 【7】网版表字段优化 =====');

    if (await tableExists('prd_screen_plate')) {
      results.push(await addColumnSafe('prd_screen_plate', 'plate_code', "VARCHAR(50) NULL UNIQUE COMMENT '网版编号'"));
      results.push(await addColumnSafe('prd_screen_plate', 'mesh_count', "INT NULL COMMENT '网目数'"));
      results.push(await addColumnSafe('prd_screen_plate', 'mesh_material', "VARCHAR(30) NULL COMMENT '丝网材质'"));
      results.push(await addColumnSafe('prd_screen_plate', 'size', "VARCHAR(50) NULL COMMENT '网版尺寸'"));
      results.push(await addColumnSafe('prd_screen_plate', 'tension_value', "DECIMAL(6,2) NULL COMMENT '张力值(N/cm)'"));
      results.push(await addColumnSafe('prd_screen_plate', 'tension_date', "DATETIME NULL COMMENT '最后测张力时间'"));
      results.push(await addColumnSafe('prd_screen_plate', 'status', "VARCHAR(20) NULL DEFAULT 'New' COMMENT '状态'"));
      results.push(await addColumnSafe('prd_screen_plate', 'life_count', "INT UNSIGNED NULL DEFAULT 0 COMMENT '已印刷次数'"));
      results.push(await addColumnSafe('prd_screen_plate', 'max_life_count', "INT UNSIGNED NULL DEFAULT 800 COMMENT '最大寿命'"));
      results.push(await addColumnSafe('prd_screen_plate', 'reclaim_count', "INT UNSIGNED NULL DEFAULT 0 COMMENT '已再生次数'"));
      results.push(await addColumnSafe('prd_screen_plate', 'exposure_date', "DATETIME NULL COMMENT '曝光日期'"));
      results.push(await addColumnSafe('prd_screen_plate', 'last_used_date', "DATETIME NULL COMMENT '最后使用日期'"));
      results.push(await addColumnSafe('prd_screen_plate', 'last_clean_date', "DATETIME NULL COMMENT '最后清洗日期'"));
      results.push(await addColumnSafe('prd_screen_plate', 'last_reclaim_date', "DATETIME NULL COMMENT '最后再生日期'"));
      results.push(await addColumnSafe('prd_screen_plate', 'scrap_reason', "VARCHAR(200) NULL COMMENT '报废原因'"));
      results.push(await addColumnSafe('prd_screen_plate', 'storage_location', "VARCHAR(100) NULL COMMENT '存放位置'"));
      results.push(await addColumnSafe('prd_screen_plate', 'frame_type', "VARCHAR(30) NULL COMMENT '框类型'"));
    }
  }

  // ============================================================
  // 【8】网版生命周期历史表
  // ============================================================
  if (step === 'all' || step === '8') {
    results.push('===== 【8】网版生命周期历史表 =====');

    if (!(await tableExists('screen_plate_history'))) {
      await execute(`
        CREATE TABLE screen_plate_history (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          screen_plate_id BIGINT UNSIGNED NOT NULL,
          action VARCHAR(50) NOT NULL COMMENT 'Created/Exposed/Printed/Cleaned/Reclaimed/Scrapped/TensionAdjusted',
          tension_value DECIMAL(6,2) NULL,
          life_increment INT DEFAULT 0,
          remark TEXT NULL,
          operator_id BIGINT UNSIGNED NULL,
          operator_name VARCHAR(50) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (screen_plate_id) REFERENCES prd_screen_plate(id) ON DELETE CASCADE,
          INDEX idx_screen_plate_action (screen_plate_id, action),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网版生命周期历史记录表'
      `);
      results.push('Created screen_plate_history');
    } else {
      results.push('Already exists: screen_plate_history');
    }
  }

  // ============================================================
  // 【9】油墨耗用表
  // ============================================================
  if (step === 'all' || step === '9') {
    results.push('===== 【9】油墨耗用表 =====');

    if (!(await tableExists('ink_usage'))) {
      await execute(`
        CREATE TABLE ink_usage (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          work_order_id BIGINT UNSIGNED NULL COMMENT '工单ID',
          screen_plate_id BIGINT UNSIGNED NULL COMMENT '网版ID',
          ink_id BIGINT UNSIGNED NOT NULL COMMENT '油墨ID',
          ink_code VARCHAR(50) NULL COMMENT '油墨编码',
          ink_name VARCHAR(100) NULL COMMENT '油墨名称',
          usage_qty DECIMAL(18,4) NOT NULL COMMENT '耗用数量',
          unit VARCHAR(20) NULL COMMENT '单位',
          usage_date DATETIME NOT NULL COMMENT '耗用日期',
          operator_id BIGINT UNSIGNED NULL COMMENT '操作人ID',
          operator_name VARCHAR(50) NULL COMMENT '操作人姓名',
          remark TEXT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted TINYINT DEFAULT 0,
          FOREIGN KEY (ink_id) REFERENCES base_ink(id) ON DELETE RESTRICT,
          FOREIGN KEY (screen_plate_id) REFERENCES prd_screen_plate(id) ON DELETE SET NULL,
          INDEX idx_work_order_id (work_order_id),
          INDEX idx_screen_plate_id (screen_plate_id),
          INDEX idx_ink_id (ink_id),
          INDEX idx_usage_date (usage_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨耗用记录表'
      `);
      results.push('Created ink_usage');
    } else {
      results.push('Already exists: ink_usage');
    }
  }

  await execute('SET FOREIGN_KEY_CHECKS = 1');

  return successResponse(results, '外键补充完成');
});
