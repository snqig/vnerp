import { getTranslations } from 'next-intl/server';

;
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import type { NextRequest } from 'next/server';

import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
async function tableExists(name: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return (rows as DbRow[]).length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return (rows as DbRow[]).length > 0;
}

async function constraintExists(name: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?`,
    [name]
  );
  return (rows as DbRow[]).length > 0;
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return (rows as DbRow[]).length > 0;
}

async function addConstraintSafe(sql: string, constraintName: string): Promise<string> {
  if (await constraintExists(constraintName)) {
    return `Already exists: ${constraintName}`;
  }
  try {
    await execute(sql);
    return `Added: ${constraintName}`;
  } catch (e) {
    return `Failed ${constraintName}: ${(e as Error).message}`;
  }
}

async function addIndexSafe(table: string, indexName: string, columns: string): Promise<string> {
  if (await indexExists(table, indexName)) {
    return `Already exists: index ${indexName}`;
  }
  try {
    await execute(`CREATE INDEX ${indexName} ON ${table} (${columns})`);
    return `Added index: ${indexName}`;
  } catch (e) {
    return `Failed index ${indexName}: ${(e as Error).message}`;
  }
}

async function addColumnSafe(table: string, column: string, definition: string): Promise<string> {
  if (await columnExists(table, column)) {
    return `Already exists: ${table}.${column}`;
  }
  try {
    await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return `Added: ${table}.${column}`;
  } catch (e) {
    return `Failed ${table}.${column}: ${(e as Error).message}`;
  }
}

export const GET = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const step = searchParams.get('step') || 'all';
  const results: string[] = [];

  await execute('SET FOREIGN_KEY_CHECKS = 0');

  // ============================================================
  // 【1】BOM 体系外键
  // ============================================================
  if (step === 'all' || step === '1') {
    results.push(ts('k_fqu10t'));

    if (await tableExists('bom_line')) {
      results.push(
        await addConstraintSafe(
          `ALTER TABLE bom_line ADD CONSTRAINT fk_bom_line_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE`,
          'fk_bom_line_header'
        )
      );
      results.push(
        await addConstraintSafe(
          `ALTER TABLE bom_line ADD CONSTRAINT fk_bom_line_material FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT`,
          'fk_bom_line_material'
        )
      );
    }

    if (await tableExists('bom_alternative')) {
      results.push(
        await addConstraintSafe(
          `ALTER TABLE bom_alternative ADD CONSTRAINT fk_bom_alt_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE`,
          'fk_bom_alt_header'
        )
      );
      results.push(
        await addConstraintSafe(
          `ALTER TABLE bom_alternative ADD CONSTRAINT fk_bom_alt_line FOREIGN KEY (bom_line_id) REFERENCES bom_line(id) ON DELETE CASCADE`,
          'fk_bom_alt_line'
        )
      );
      results.push(
        await addConstraintSafe(
          `ALTER TABLE bom_alternative ADD CONSTRAINT fk_bom_alt_material FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT`,
          'fk_bom_alt_material'
        )
      );
    }

    if (await tableExists('bom_version_history')) {
      results.push(
        await addConstraintSafe(
          `ALTER TABLE bom_version_history ADD CONSTRAINT fk_bom_history_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE`,
          'fk_bom_history_header'
        )
      );
    }
  }

  // ============================================================
  // 【2】油墨外键
  // ============================================================
  if (step === 'all' || step === '2') {
    results.push(ts('k_7hg613'));

    if (await tableExists('base_ink')) {
      if (await columnExists('base_ink', 'supplier_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE base_ink ADD CONSTRAINT fk_base_ink_supplier FOREIGN KEY (supplier_id) REFERENCES pur_supplier(id) ON DELETE SET NULL`,
            'fk_base_ink_supplier'
          )
        );
      }
    }
  }

  // ============================================================
  // 【3】网版外键
  // ============================================================
  if (step === 'all' || step === '3') {
    results.push(ts('k_1k841ii'));

    if (await tableExists('prd_screen_plate')) {
      if (await columnExists('prd_screen_plate', 'customer_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE prd_screen_plate ADD CONSTRAINT fk_screen_plate_customer FOREIGN KEY (customer_id) REFERENCES mdm_customer(id) ON DELETE SET NULL`,
            'fk_screen_plate_customer'
          )
        );
      }
      if (await columnExists('prd_screen_plate', 'warehouse_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE prd_screen_plate ADD CONSTRAINT fk_screen_plate_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) ON DELETE SET NULL`,
            'fk_screen_plate_warehouse'
          )
        );
      }
      if (await columnExists('prd_screen_plate', 'location_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE prd_screen_plate ADD CONSTRAINT fk_screen_plate_location FOREIGN KEY (location_id) REFERENCES inv_location(id) ON DELETE SET NULL`,
            'fk_screen_plate_location'
          )
        );
      }
    }
  }

  // ============================================================
  // 【4】库存标签外键
  // ============================================================
  if (step === 'all' || step === '4') {
    results.push(ts('k_f6q4we'));

    if (await tableExists('inv_material_label')) {
      if (await columnExists('inv_material_label', 'parent_label_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_parent FOREIGN KEY (parent_label_id) REFERENCES inv_material_label(id) ON DELETE SET NULL`,
            'fk_label_parent'
          )
        );
      }
      if (await columnExists('inv_material_label', 'warehouse_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) ON DELETE SET NULL`,
            'fk_label_warehouse'
          )
        );
      }
      if (await columnExists('inv_material_label', 'location_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_location FOREIGN KEY (location_id) REFERENCES inv_location(id) ON DELETE SET NULL`,
            'fk_label_location'
          )
        );
      }
      if (await columnExists('inv_material_label', 'ink_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_ink FOREIGN KEY (ink_id) REFERENCES base_ink(id) ON DELETE SET NULL`,
            'fk_label_ink'
          )
        );
      }
    }

    if (await tableExists('prd_process_card')) {
      if (await columnExists('prd_process_card', 'main_label_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE prd_process_card ADD CONSTRAINT fk_process_card_main_label FOREIGN KEY (main_label_id) REFERENCES inv_material_label(id) ON DELETE SET NULL`,
            'fk_process_card_main_label'
          )
        );
      }
    }
  }

  // ============================================================
  // 【5】用户与部门外键
  // ============================================================
  if (step === 'all' || step === '5') {
    results.push(ts('k_xr0guw'));

    if (await tableExists('sys_user')) {
      if (await columnExists('sys_user', 'department_id')) {
        results.push(
          await addConstraintSafe(
            `ALTER TABLE sys_user ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES sys_department(id) ON DELETE SET NULL`,
            'fk_user_department'
          )
        );
      }
    }
  }

  // ============================================================
  // 【6】索引补充
  // ============================================================
  if (step === 'all' || step === '6') {
    results.push(ts('k_1dzpcsh'));

    results.push(await addIndexSafe('bom_line', 'idx_bom_line_material_id', 'material_id'));
    results.push(await addIndexSafe('base_ink', 'idx_base_ink_supplier_id', 'supplier_id'));
    results.push(
      await addIndexSafe('prd_screen_plate', 'idx_prd_screen_plate_customer_id', 'customer_id')
    );
    results.push(
      await addIndexSafe('prd_screen_plate', 'idx_prd_screen_plate_plate_code', 'plate_code')
    );
    results.push(
      await addIndexSafe(
        'inv_material_label',
        'idx_inv_material_label_parent_id',
        'parent_label_id'
      )
    );
    results.push(
      await addIndexSafe('inv_material_label', 'idx_inv_material_label_label_no', 'label_no')
    );
    results.push(
      await addIndexSafe(
        'inv_material_label',
        'idx_inv_material_label_material_code',
        'material_code'
      )
    );
    results.push(
      await addIndexSafe('prd_process_card', 'idx_prd_process_card_main_label', 'main_label_id')
    );
    results.push(await addIndexSafe('sys_user', 'idx_sys_user_department_id', 'department_id'));
  }

  // ============================================================
  // 【7】网版表字段优化
  // ============================================================
  if (step === 'all' || step === '7') {
    results.push(ts('k_w7vnq2'));

    if (await tableExists('prd_screen_plate')) {
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'plate_code',
          ts('k_1jj5r8d')
        )
      );
      results.push(
        await addColumnSafe('prd_screen_plate', 'mesh_count', ts('k_f1um5'))
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'mesh_material',
          ts('k_1lz36g0')
        )
      );
      results.push(
        await addColumnSafe('prd_screen_plate', 'size', ts('k_13zvnnh'))
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'tension_value',
          ts('k_1oyzu2m')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'tension_date',
          ts('k_1ghneus')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'status',
          ts('k_5tdzuj')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'life_count',
          ts('k_1vx78u0')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'max_life_count',
          ts('k_4yhwvr')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'reclaim_count',
          ts('k_1ezy90v')
        )
      );
      results.push(
        await addColumnSafe('prd_screen_plate', 'exposure_date', ts('k_qjyp4w'))
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'last_used_date',
          ts('k_ckqbzd')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'last_clean_date',
          ts('k_11vikss')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'last_reclaim_date',
          ts('k_135qs4c')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'scrap_reason',
          ts('k_1omvrdo')
        )
      );
      results.push(
        await addColumnSafe(
          'prd_screen_plate',
          'storage_location',
          ts('k_1lp2285')
        )
      );
      results.push(
        await addColumnSafe('prd_screen_plate', 'frame_type', ts('k_izwmzo'))
      );
    }
  }

  // ============================================================
  // 【8】网版生命周期历史表
  // ============================================================
  if (step === 'all' || step === '8') {
    results.push(ts('k_1jfh8p6'));

    if (!(await tableExists('screen_plate_history'))) {
      await execute(ts('k_10lvcx'));
      results.push('Created screen_plate_history');
    } else {
      results.push('Already exists: screen_plate_history');
    }
  }

  // ============================================================
  // 【9】油墨耗用表
  // ============================================================
  if (step === 'all' || step === '9') {
    results.push(ts('k_62q0b3'));

    if (!(await tableExists('ink_usage'))) {
      await execute(ts('k_v9uxuo'));
      results.push('Created ink_usage');
    } else {
      results.push('Already exists: ink_usage');
    }
  }

  await execute('SET FOREIGN_KEY_CHECKS = 1');

  return successResponse(results, ts('k_wtl10b'));
});
