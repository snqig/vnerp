import { bigint, datetime, decimal, index, int, mysqlTable, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const dcprintInkColor = mysqlTable(
  'dcprint_ink_color',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    colorCode: varchar('color_code', { length: 50 }).notNull(),
    colorName: varchar('color_name', { length: 100 }).notNull(),
    colorSeries: varchar('color_series', { length: 50 }),
    baseInkType: varchar('base_ink_type', { length: 50 }),
    pantoneCode: varchar('pantone_code', { length: 50 }),
    remark: text('remark'),
    status: tinyint('status').default(1),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    colorCodeIdx: uniqueIndex('uk_color_code').on(table.colorCode),
    statusIdx: index('idx_ink_color_status').on(table.status),
  })
);

export const dcprintInkFormulaVersion = mysqlTable(
  'dcprint_ink_formula_version',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    colorId: bigint('color_id', { mode: 'number', unsigned: true }).notNull(),
    versionNo: varchar('version_no', { length: 20 }).notNull(),
    versionName: varchar('version_name', { length: 100 }),
    status: tinyint('status').default(1),
    changeReason: text('change_reason'),
    sourceVersionId: bigint('source_version_id', { mode: 'number', unsigned: true }),
    processNote: text('process_note'),
    totalWeight: decimal('total_weight', { precision: 10, scale: 3 }),
    unit: varchar('unit', { length: 10 }).default('kg'),
    shelfLifeHours: int('shelf_life_hours').default(168),
    theoreticalCost: decimal('theoretical_cost', { precision: 12, scale: 4 }),
    costSnapshotTime: datetime('cost_snapshot_time'),
    costCalcStatus: tinyint('cost_calc_status').default(0),
    costWarning: varchar('cost_warning', { length: 255 }),
    activateBy: bigint('activate_by', { mode: 'number', unsigned: true }),
    activateTime: datetime('activate_time'),
    cancelBy: bigint('cancel_by', { mode: 'number', unsigned: true }),
    cancelReason: text('cancel_reason'),
    cancelTime: datetime('cancel_time'),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    colorIdIdx: index('idx_formula_color').on(table.colorId),
    versionNoIdx: index('idx_formula_version_no').on(table.versionNo),
    statusIdx: index('idx_formula_status').on(table.status),
    colorVersionUk: uniqueIndex('uk_color_version').on(table.colorId, table.versionNo),
  })
);

export const dcprintInkFormulaItem = mysqlTable(
  'dcprint_ink_formula_item',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
    versionId: bigint('version_id', { mode: 'number', unsigned: true }).notNull(),
    materialId: bigint('material_id', { mode: 'number', unsigned: true }),
    materialCode: varchar('material_code', { length: 50 }).notNull(),
    materialName: varchar('material_name', { length: 100 }).notNull(),
    inkType: varchar('ink_type', { length: 20 }),
    brand: varchar('brand', { length: 100 }),
    ratio: decimal('ratio', { precision: 8, scale: 4 }).default('0'),
    weight: decimal('weight', { precision: 10, scale: 3 }),
    unit: varchar('unit', { length: 10 }).default('kg'),
    addOrder: int('add_order').default(0),
    processRemark: varchar('process_remark', { length: 255 }),
    sort: int('sort').default(0),
    isBase: tinyint('is_base').default(0),
    snapshotUnitCost: decimal('snapshot_unit_cost', { precision: 12, scale: 4 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    versionIdIdx: index('idx_item_version').on(table.versionId),
  })
);

export type DcprintInkColor = typeof dcprintInkColor.$inferSelect;
export type DcprintInkFormulaVersion = typeof dcprintInkFormulaVersion.$inferSelect;
export type DcprintInkFormulaItem = typeof dcprintInkFormulaItem.$inferSelect;