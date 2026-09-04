import { t } from '@/lib/server-translate';
import { getTranslations } from 'next-intl/server';

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
  id: number | null | undefined,
  opts: AssertExistsOptions
): Promise<DbRow> {
  if (id == null || !Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest(`指定的${opts.label}ID非法：${id}`);
  }
  const idColumn = opts.idColumn ?? 'id';
  const softDelete =
    opts.softDeleteColumn === null ? '' : ` AND ${opts.softDeleteColumn ?? 'deleted'} = 0`;
  const selectCols = opts.nameColumn ? `${idColumn}, ${opts.nameColumn}` : idColumn;

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
export async function assertWarehouseExists(id: number | null | undefined): Promise<DbRow> {
  const ts = await getTranslations('Common');
  return assertEntityExists(id, {
    table: 'inv_warehouse',
    label: ts('k_bq2r6r'),
    nameColumn: 'warehouse_name',
  });
}

/** 物料存在性断言；返回行含 material_name。 */
export async function assertMaterialExists(id: number | null | undefined): Promise<DbRow> {
  const ts = await getTranslations('Common');
  return assertEntityExists(id, {
    table: 'inv_material',
    label: ts('k_1h2cbqf'),
    nameColumn: 'material_name',
  });
}

/**
 * 物料存在性断言（按物料编码 material_code 查）。
 * 部分业务（打样单等）以「物料编码」而非「物料ID」引用主数据，
 * 故提供按编码查重的变体，逻辑与 assertEntityExists 一致（只读 + 软删过滤）。
 */
export async function assertMaterialByCode(code: string | null | undefined): Promise<DbRow> {
  const ts = await getTranslations('Common');
  if (!code || typeof code !== 'string' || code.trim() === '') {
    throw AppError.badRequest(ts('k_he5703'));
  }
  const rows = (await query(
    `SELECT material_code, material_name FROM inv_material WHERE material_code = ? AND deleted = 0 LIMIT 1`,
    [code]
  )) as DbRow[];
  if (rows.length === 0) {
    throw AppError.badRequest(`指定的物料编码不存在或已删除：${code}`);
  }
  return rows[0];
}

/** 供应商存在性断言；返回行含 supplier_name。 */
export async function assertSupplierExists(id: number | null | undefined): Promise<DbRow> {
  const ts = await getTranslations('Common');
  return assertEntityExists(id, {
    table: 'pur_supplier',
    label: ts('k_1x7qpl0'),
    nameColumn: 'supplier_name',
  });
}

/** 客户存在性断言（crm_customer，sal_order.customer_id 引用目标）。 */
export async function assertCustomerExists(id: number | null | undefined): Promise<DbRow> {
  const ts = await getTranslations('Common');
  return assertEntityExists(id, {
    table: 'crm_customer',
    label: ts('k_ush9hy'),
    nameColumn: 'customer_name',
  });
}

/** 销售订单存在性断言（sal_order，退货单/发货单的 order_id 引用目标）。 */
export async function assertSalesOrderExists(id: number | null | undefined): Promise<DbRow> {
  const ts = await getTranslations('Common');
  return assertEntityExists(id, {
    table: 'sal_order',
    label: ts('k_m6144y'),
    nameColumn: 'order_no',
  });
}

/** 发货单存在性断言（sal_delivery，退货单的 delivery_id 引用目标）。 */
export async function assertDeliveryExists(id: number | null | undefined): Promise<DbRow> {
  const ts = await getTranslations('Common');
  return assertEntityExists(id, {
    table: 'sal_delivery',
    label: ts('k_54mzy4'),
    nameColumn: 'delivery_no',
  });
}

/** 生产工单存在性断言（prod_work_order，领料/报工/完工单的 work_order_id 引用目标）。 */
export async function assertWorkOrderExists(id: number | null | undefined): Promise<DbRow> {
  const ts = await getTranslations('Common');
  return assertEntityExists(id, {
    table: 'prod_work_order',
    label: ts('k_1h58b1'),
    nameColumn: 'work_order_no',
  });
}

/**
 * 物料「可分切性」约束断言（#21 分切物料类型限制）。
 *
 * 与上面"存在性"断言互补：存在性管「在不在」，本函数管「能不能分切」。
 * 列 `inv_material.is_splittable` 表达是否允许分切（白名单分类 FILM/PAPER/PKG/RAW
 * 由迁移初始化为 1，主数据可手动覆盖）。
 *
 * @param material 调用方已查出的物料行（事务内请用 conn.query 取，保证同源）。
 *                 传 undefined/null → 视为物料不存在，拦截。
 *                 is_splittable 为 0 / null / undefined → 拦截并明确提示。
 * @throws AppError.badRequest(400) 不可分切时。
 */
export interface SplittableMaterialInput {
  id?: number | string;
  materialName?: string;
  isSplittable?: number | null;
}

export function assertMaterialSplittable(
  material: SplittableMaterialInput | undefined | null
): void {
  const ts = t;
  if (!material) {
    throw AppError.badRequest(ts('k_1a8clbk'));
  }
  const flag = material.isSplittable;
  if (!flag) {
    const name = material.materialName || `ID=${material.id ?? ts('k_1lpnuh4')}`;
    throw AppError.badRequest(
      `该物料【${name}】不允许分切（仅薄膜/纸张/包装/原材料等卷材类物料允许分切）`
    );
  }
}

/**
 * 批量物料存在性校验（单次往返）。
 * 自动去重，并过滤 material_id<=0（自由录入物料允许为 0，不查主数据）。
 * 任一物料不存在/已删除 → 抛 400，并列出缺失的 ID（最多 10 个）。
 */
export async function assertAllMaterialsExist(ids: (number | null | undefined)[]): Promise<void> {
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
    const preview = missing.slice(0, 10).join(', ');
    const more = missing.length > 10 ? ` 等 ${missing.length} 项` : '';
    throw AppError.badRequest(`以下物料不存在或已删除：${preview}${more}`);
  }
}
