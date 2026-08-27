/**
 * 引用完整性 —— 应用层存在性校验共享模块
 *
 * 背景：
 *   审计（docs/13-分析报告/引用完整性审计与整改方案_2026-08-27.md）发现：
 *   - inv_inbound_item.material_id 等明细列【没有数据库外键】，历史上已出现
 *     material_id=0 等悬空引用（无法靠 DB 兜底）。
 *   - 各业务服务里大量「SELECT xxx_name FROM 主表 WHERE id=?」只取名字、
 *     不校验存在性，仓库被软删后静默返回空串，悬空引用就此漏过。
 *
 *   本模块是【写入前存在性断言】的唯一入口，与 category-validation.ts
 *   （物料是否归类）互补：归类检查管「分类对不对」，本模块管「主数据在不在」。
 *
 *   设计原则（与分类校验一致，verify-before-act）：
 *   - 只做只读 SELECT + deleted=0 过滤，绝不在此处写库。
 *   - 不存在 → 抛 AppError.badRequest（400，前端入参非法，而不是 404 系统资源）。
 *   - DB 故障 → 直接上抛，绝不在故障下静默放行（悬空引用比一次 500 更糟）。
 *   - 返回匹配首行，调用方可复用 name 等字段，免去二次查询。
 */
import { query } from '@/lib/db';
import type { DbRow } from '@/types/db';
import { AppError } from '@/lib/error-handling';

export interface AssertExistsOptions {
  /** 物理表名（以 live 库权威 schema 为准，勿臆测） */
  table: string;
  /** 被引用列名，默认 'id' */
  idColumn?: string;
  /**
   * 软删除列名。
   *   - 不传 → 默认按 'deleted'
   *   - 传 null → 该表无软删除过滤（整行存在即有效）
   */
  softDeleteColumn?: string | null;
  /** 实体中文名，用于错误信息 */
  label: string;
  /** 返回行里欲复用的列（如 name），可选 */
  nameColumn?: string;
}

/**
 * 断言某 id 在主表中存在（含软删除过滤）。返回匹配首行。
 */
export async function assertEntityExists(
  id: number,
  opts: AssertExistsOptions
): Promise<DbRow> {
  if (!Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest(`指定的${opts.label}ID非法：${id}`);
  }
  const idColumn = opts.idColumn ?? 'id';
  const softDelete =
    opts.softDeleteColumn === null
      ? ''
      : ` AND ${opts.softDeleteColumn ?? 'deleted'} = 0`;
  const selectCols = opts.nameColumn
    ? `${idColumn}, ${opts.nameColumn}`
    : idColumn;

  const rows = (await query(
    `SELECT ${selectCols} FROM ${opts.table} WHERE ${idColumn} = ?${softDelete} LIMIT 1`,
    [id]
  )) as DbRow[];

  if (rows.length === 0) {
    throw AppError.badRequest(`指定的${opts.label}不存在或已删除（ID=${id}）`);
  }
  return rows[0];
}

/** 仓库存在性断言；返回行含 warehouse_name，可复用避免二次查询。 */
export async function assertWarehouseExists(id: number): Promise<DbRow> {
  return assertEntityExists(id, {
    table: 'inv_warehouse',
    label: '仓库',
    nameColumn: 'warehouse_name',
  });
}

/** 物料存在性断言；返回行含 material_name。 */
export async function assertMaterialExists(id: number): Promise<DbRow> {
  return assertEntityExists(id, {
    table: 'inv_material',
    label: '物料',
    nameColumn: 'material_name',
  });
}

/** 供应商存在性断言；返回行含 supplier_name。 */
export async function assertSupplierExists(id: number): Promise<DbRow> {
  return assertEntityExists(id, {
    table: 'pur_supplier',
    label: '供应商',
    nameColumn: 'supplier_name',
  });
}

/**
 * 批量物料存在性校验（单次往返）。
 * 自动去重，并过滤 material_id<=0（自由录入物料允许为 0，不查主数据）。
 * 任一物料不存在/已删除 → 抛 400，并列出缺失的 ID（最多 10 个）。
 */
export async function assertAllMaterialsExist(
  ids: (number | null | undefined)[]
): Promise<void> {
  const set = new Set<number>();
  for (const v of ids) {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0) set.add(n);
  }
  if (set.size === 0) return;

  const list = Array.from(set);
  const placeholders = list.map(() => '?').join(',');
  const rows = (await query(
    `SELECT id FROM inv_material WHERE id IN (${placeholders}) AND deleted = 0`,
    list
  )) as DbRow[];

  const found = new Set(rows.map((r) => Number(r.id)));
  const missing = list.filter((id) => !found.has(id));
  if (missing.length > 0) {
    const preview = missing
      .slice(0, 10)
      .join(', ');
    const more = missing.length > 10 ? ` 等 ${missing.length} 项` : '';
    throw AppError.badRequest(`以下物料不存在或已删除：${preview}${more}`);
  }
}
