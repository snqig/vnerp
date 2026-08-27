/**
 * 分类校验共享模块（物料分类 / 仓库分类）
 *
 * 背景：
 *   系统设置里定义了分类编码规则（^MAT-CAT-\d{3,}$ / ^WH-CAT-\d{3,}$）与最大层级，
 *   但此前这套规则：
 *     1) 硬编码在 settings/category-rules 路由的常量里，不可配置；
 *     2) 校验器自身查询了错误的列名（code/name → 实际是 category_code/category_name），
 *        异常被 catch 吞成 warning，导致规则从未真正执行过；
 *     3) 录入端（base-data/material-category 等）完全不读这套规则。
 *
 * 本模块是唯一的规则真相源：从 sys_calc_param 读取（迁移 074 落库），
 * 供录入端、规则校验页、业务查询端共用。
 *
 * 拦截策略（迁移 074 可配）：
 *   - category.enforce_on_create = true  → 新增不合规直接拒绝
 *   - category.enforce_on_update = false → 编辑仅提示，避免锁死存量不合规数据
 */
import { query } from '@/lib/db';
import type { DbRow } from '@/types/db';
import { CalcParamService } from '@/lib/calc-param-service';

export type CategoryType = 'material' | 'warehouse';

/** 各分类表的真实物理结构（列名以 live 库权威 schema 为准，勿臆测） */
interface CategoryTableMeta {
  table: string;
  codeColumn: string;
  nameColumn: string;
  /** 该表是否有 parent_id 列（仓库分类表为单层，没有） */
  hasParent: boolean;
  label: string;
}

export const CATEGORY_TABLE_META: Record<CategoryType, CategoryTableMeta> = {
  material: {
    table: 'inv_material_category',
    codeColumn: 'category_code',
    nameColumn: 'category_name',
    hasParent: true,
    label: '物料分类',
  },
  warehouse: {
    table: 'sys_warehouse_category',
    codeColumn: 'code',
    nameColumn: 'name',
    // sys_warehouse_category 无 parent_id 列，此前 category-rules 查询它是 bug 来源之一
    hasParent: false,
    label: '仓库分类',
  },
};

export interface CategoryRules {
  codePattern: string;
  codePatternDesc: string;
  maxDepth: number;
  statusValues: number[];
  enforceOnCreate: boolean;
  enforceOnUpdate: boolean;
}

/** 代码内置兜底值：DB 不可用时静默降级，与迁移 074 的种子保持一致 */
const FALLBACK_RULES: Record<CategoryType, Omit<CategoryRules, 'enforceOnCreate' | 'enforceOnUpdate'>> = {
  material: {
    codePattern: '^MAT-CAT-\\d{3,}$',
    codePatternDesc: 'MAT-CAT-XXX（3位以上数字）',
    maxDepth: 4,
    statusValues: [0, 1],
  },
  warehouse: {
    codePattern: '^WH-CAT-\\d{3,}$',
    codePatternDesc: 'WH-CAT-XXX（3位以上数字）',
    maxDepth: 3,
    statusValues: [0, 1],
  },
};

/**
 * 读取分类规则（优先 sys_calc_param，DB 不可用时用兜底值）。
 */
export async function getCategoryRules(type: CategoryType): Promise<CategoryRules> {
  const fb = FALLBACK_RULES[type];
  const [codePattern, codePatternDesc, maxDepth, enforceOnCreate, enforceOnUpdate] =
    await Promise.all([
      CalcParamService.getString(`category.${type}.code_pattern`, fb.codePattern),
      CalcParamService.getString(`category.${type}.code_pattern_desc`, fb.codePatternDesc),
      CalcParamService.getInt(`category.${type}.max_depth`, fb.maxDepth),
      CalcParamService.getBoolean('category.enforce_on_create', true),
      CalcParamService.getBoolean('category.enforce_on_update', false),
    ]);

  return {
    codePattern,
    codePatternDesc,
    maxDepth,
    statusValues: fb.statusValues,
    enforceOnCreate,
    enforceOnUpdate,
  };
}

/**
 * 安全构造正则。配置值可能被管理员改坏，不能让一个非法正则拖垮整个录入接口。
 */
export function safeRegExp(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

/**
 * 校验编码是否符合规则。返回 null 表示通过，否则返回中文错误信息。
 */
export function checkCodeFormat(
  code: string | undefined | null,
  rules: CategoryRules,
  label: string
): string | null {
  const value = (code ?? '').trim();
  if (!value) return `${label}编码不能为空`;

  const re = safeRegExp(rules.codePattern);
  if (!re) {
    // 规则本身配错了，属于配置问题而非用户输入问题，放行但可被上层记录
    return null;
  }
  if (!re.test(value)) {
    return `${label}编码"${value}"不符合系统设置的编码规则：${rules.codePatternDesc}`;
  }
  return null;
}

/**
 * 编码唯一性校验（含软删除过滤）。excludeId 用于编辑场景排除自身。
 */
export async function checkCodeUnique(
  type: CategoryType,
  code: string,
  excludeId?: number
): Promise<string | null> {
  const meta = CATEGORY_TABLE_META[type];
  const params: (string | number)[] = [code.trim()];
  let sql = `SELECT id FROM ${meta.table} WHERE ${meta.codeColumn} = ? AND deleted = 0`;
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';

  const rows = (await query(sql, params)) as DbRow[];
  if (rows.length > 0) {
    return `${meta.label}编码"${code.trim()}"已存在，请更换`;
  }
  return null;
}

/**
 * 父级存在性 + 层级深度校验。
 * 返回 null 表示通过；仓库分类无层级，直接放行。
 */
export async function checkParentAndDepth(
  type: CategoryType,
  parentId: number | null | undefined,
  rules: CategoryRules
): Promise<string | null> {
  const meta = CATEGORY_TABLE_META[type];
  if (!meta.hasParent) return null;
  // 顶级分类：parent_id 必须是 NULL，不能是 0（0 会撞自引用外键 fk_material_category_parent）
  if (parentId === null || parentId === undefined || Number(parentId) === 0) return null;

  const pid = Number(parentId);
  if (!Number.isInteger(pid) || pid < 0) {
    return `${meta.label}父级ID非法`;
  }

  const parentRows = (await query(
    `SELECT id, parent_id FROM ${meta.table} WHERE id = ? AND deleted = 0 LIMIT 1`,
    [pid]
  )) as DbRow[];
  if (parentRows.length === 0) {
    return `父级${meta.label}(ID=${pid})不存在或已删除`;
  }

  // 自底向上回溯计算父链深度，新增后的深度 = 父链深度 + 1
  const rows = (await query(
    `SELECT id, parent_id FROM ${meta.table} WHERE deleted = 0`
  )) as DbRow[];
  const parentMap = new Map<number, number | null>();
  for (const r of rows) {
    parentMap.set(Number(r.id), r.parent_id ? Number(r.parent_id) : null);
  }

  let depth = 1;
  let cursor: number | null = pid;
  const visited = new Set<number>();
  while (cursor !== null && cursor !== undefined) {
    if (visited.has(cursor)) {
      return `父级${meta.label}存在循环引用(ID=${cursor})，请先修复分类树`;
    }
    visited.add(cursor);
    depth++;
    cursor = parentMap.get(cursor) ?? null;
  }

  if (depth > rules.maxDepth) {
    return `新增后${meta.label}层级深度为${depth}，超过系统设置的最大层级${rules.maxDepth}`;
  }
  return null;
}

/** 状态值校验 */
export function checkStatus(status: unknown, rules: CategoryRules, label: string): string | null {
  if (status === undefined || status === null) return null;
  const s = Number(status);
  if (!rules.statusValues.includes(s)) {
    return `${label}状态值${status}非法，合法值为 ${rules.statusValues.join('/')}`;
  }
  return null;
}

export interface CategoryValidationInput {
  code?: string | null;
  parentId?: number | null;
  status?: unknown;
  /** 编辑场景传入，用于唯一性校验排除自身 */
  excludeId?: number;
}

export interface CategoryValidationResult {
  /** 是否应当阻断保存 */
  blocked: boolean;
  /** 阻断原因（blocked=true 时非空） */
  errors: string[];
  /** 不阻断但需要提示用户的问题 */
  warnings: string[];
}

/**
 * 新增分类校验（strict）：编码格式不合规按系统设置直接阻断。
 */
export async function validateCategoryForCreate(
  type: CategoryType,
  input: CategoryValidationInput
): Promise<CategoryValidationResult> {
  const meta = CATEGORY_TABLE_META[type];
  const rules = await getCategoryRules(type);
  const errors: string[] = [];
  const warnings: string[] = [];

  const formatErr = checkCodeFormat(input.code, rules, meta.label);
  if (formatErr) {
    // 空编码永远阻断；格式不符按 enforce_on_create 决定
    const isEmpty = !(input.code ?? '').trim();
    if (isEmpty || rules.enforceOnCreate) errors.push(formatErr);
    else warnings.push(formatErr);
  }

  if ((input.code ?? '').trim()) {
    const uniqueErr = await checkCodeUnique(type, String(input.code), input.excludeId);
    if (uniqueErr) errors.push(uniqueErr);
  }

  const parentErr = await checkParentAndDepth(type, input.parentId, rules);
  if (parentErr) errors.push(parentErr);

  const statusErr = checkStatus(input.status, rules, meta.label);
  if (statusErr) errors.push(statusErr);

  return { blocked: errors.length > 0, errors, warnings };
}

/**
 * 编辑分类校验（lenient）：默认不因存量编码不合规而阻断，仅提示。
 * 唯一性冲突、父级不存在、循环引用等真实数据完整性问题仍然阻断。
 */
export async function validateCategoryForUpdate(
  type: CategoryType,
  input: CategoryValidationInput
): Promise<CategoryValidationResult> {
  const meta = CATEGORY_TABLE_META[type];
  const rules = await getCategoryRules(type);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.code !== undefined && input.code !== null) {
    const formatErr = checkCodeFormat(input.code, rules, meta.label);
    if (formatErr) {
      if (rules.enforceOnUpdate) errors.push(formatErr);
      else warnings.push(formatErr);
    }
    if (String(input.code).trim()) {
      const uniqueErr = await checkCodeUnique(type, String(input.code), input.excludeId);
      if (uniqueErr) errors.push(uniqueErr);
    }
  }

  if (input.parentId !== undefined) {
    // 编辑时不能把自己挂到自己名下
    if (input.excludeId && Number(input.parentId) === Number(input.excludeId)) {
      errors.push(`${meta.label}不能将自身设为父级`);
    } else {
      const parentErr = await checkParentAndDepth(type, input.parentId, rules);
      if (parentErr) errors.push(parentErr);
    }
  }

  const statusErr = checkStatus(input.status, rules, meta.label);
  if (statusErr) errors.push(statusErr);

  return { blocked: errors.length > 0, errors, warnings };
}

/**
 * 业务侧使用：把外部传入的分类编码解析为分类ID。
 *
 * 采购/销售等业务查询以【分类编码】为主查询键（编码是业务语义稳定的，
 * 自增 id 跨环境不稳定）。编码非法或不存在时返回明确原因，由调用方提示用户，
 * 而不是静默忽略筛选条件返回全量数据。
 */
export interface ResolveCategoryResult {
  ok: boolean;
  categoryId?: number;
  categoryName?: string;
  /** ok=false 时的中文提示 */
  message?: string;
}

export async function resolveCategoryByCode(
  type: CategoryType,
  code: string
): Promise<ResolveCategoryResult> {
  const meta = CATEGORY_TABLE_META[type];
  const value = (code ?? '').trim();
  if (!value) {
    return { ok: false, message: `${meta.label}编码不能为空` };
  }

  const rows = (await query(
    `SELECT id, ${meta.codeColumn} AS code, ${meta.nameColumn} AS name, status
       FROM ${meta.table}
      WHERE ${meta.codeColumn} = ? AND deleted = 0
      LIMIT 1`,
    [value]
  )) as DbRow[];

  if (rows.length === 0) {
    const rules = await getCategoryRules(type);
    const formatErr = checkCodeFormat(value, rules, meta.label);
    // 编码连格式都不对时，给出更有指导性的提示
    if (formatErr) {
      return { ok: false, message: `${formatErr}，且系统中不存在该分类` };
    }
    return { ok: false, message: `${meta.label}编码"${value}"不存在，请先在基础数据中维护` };
  }

  const row = rows[0];
  if (Number(row.status) !== 1) {
    return { ok: false, message: `${meta.label}"${row.name}"已停用，不可用于业务单据` };
  }

  return { ok: true, categoryId: Number(row.id), categoryName: String(row.name) };
}

/**
 * 取某个分类及其全部子孙分类的 ID 集合。
 *
 * 业务侧按分类编码筛选时，用户选「原材料」通常期望连子分类一起筛出来，
 * 只按单个 category_id 精确匹配会漏掉子分类下的物料。
 */
export async function getCategoryIdWithDescendants(
  type: CategoryType,
  categoryId: number
): Promise<number[]> {
  const meta = CATEGORY_TABLE_META[type];
  if (!meta.hasParent) return [categoryId];

  const rows = (await query(
    `SELECT id, parent_id FROM ${meta.table} WHERE deleted = 0`
  )) as DbRow[];

  const childrenMap = new Map<number, number[]>();
  for (const r of rows) {
    const pid = r.parent_id ? Number(r.parent_id) : 0;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(Number(r.id));
  }

  const result: number[] = [];
  const stack: number[] = [categoryId];
  const visited = new Set<number>();
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue; // 数据脏时防死循环
    visited.add(cur);
    result.push(cur);
    for (const child of childrenMap.get(cur) ?? []) stack.push(child);
  }
  return result;
}

/** 业务单据是否强制要求物料已归类 */
export async function isCategoryRequiredOnBusiness(): Promise<boolean> {
  return CalcParamService.getBoolean('category.require_on_business', false);
}

export interface UncategorizedMaterial {
  id: number;
  material_code: string;
  material_name: string;
}

export interface MaterialCategoryCheckResult {
  /** 是否应当阻断提交（require_on_business=true 且存在未归类物料） */
  blocked: boolean;
  /** 未归类（category_id 为空或指向已删除分类）的物料 */
  uncategorized: UncategorizedMaterial[];
  /** 中文提示，无问题时为 null */
  message: string | null;
}

/**
 * 业务单据提交前检查：明细里的物料是否都已归类。
 *
 * 用户诉求「采购等业务需要物料分类，没有就提示」的落点。
 * 是否拦截由系统设置 category.require_on_business 决定（默认仅提示）。
 */
export async function checkMaterialsCategorized(
  materialIds: (number | null | undefined)[]
): Promise<MaterialCategoryCheckResult> {
  const ids = Array.from(
    new Set(
      materialIds
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0)
    )
  );

  const required = await isCategoryRequiredOnBusiness();

  if (ids.length === 0) {
    return { blocked: false, uncategorized: [], message: null };
  }

  const placeholders = ids.map(() => '?').join(',');
  const rows = (await query(
    `SELECT m.id, m.material_code, m.material_name
       FROM inv_material m
       LEFT JOIN inv_material_category c
              ON c.id = m.category_id AND c.deleted = 0
      WHERE m.id IN (${placeholders})
        AND m.deleted = 0
        AND (m.category_id IS NULL OR c.id IS NULL)`,
    ids
  )) as DbRow[];

  if (rows.length === 0) {
    return { blocked: false, uncategorized: [], message: null };
  }

  const uncategorized = rows.map((r) => ({
    id: Number(r.id),
    material_code: String(r.material_code ?? ''),
    material_name: String(r.material_name ?? ''),
  }));

  const listText = uncategorized
    .slice(0, 5)
    .map((m) => `${m.material_code}(${m.material_name})`)
    .join('、');
  const more = uncategorized.length > 5 ? ` 等 ${uncategorized.length} 项` : '';

  return {
    blocked: required,
    uncategorized,
    message: required
      ? `以下物料尚未设置物料分类，无法提交业务单据：${listText}${more}。请先在「基础数据 → 物料分类」中归类。`
      : `提示：以下物料尚未设置物料分类：${listText}${more}。建议先在「基础数据 → 物料分类」中归类，否则采购统计与成本归集会不准确。`,
  };
}
