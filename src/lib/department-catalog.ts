import type { DbConnection, DbResultSetHeader } from '@/types/db';
import { logger } from '@/lib/logger';
/**
 * 部门主数据目录 —— 全站唯一真相源
 *
 * 背景：部门结构曾在 4 个地方各写一份硬编码副本（settings-seed、init/department、
 * hr/attendance 下拉、以及库里的实际数据），彼此早已漂移。2026-09-21 按用户口径
 * 统一为「总经办 > 部 > 科/室/车间」三层（1 + 7 + 16 = 24 个部门）后，
 * 任何需要「部门应该长什么样」的地方都必须从这里取，不得再内联常量。
 *
 * 两个刻意的设计决定：
 *   1. 层级用 **dept_code 的父子编码** 表达，而不是自增 id。
 *      自增 id 取决于落库顺序，跨库/重放不可复现；dept_code 是业务编码，稳定可读。
 *   2. 部门名是**业务主数据**，不是界面文案，所以这里是中文字面量，
 *      不走 next-intl。历史上就是把它塞进 i18n key 才出现的漂移
 *      （例如同一个 DEPT001 在不同语言下成了「管理部 / 总经办」）。
 *      真正的多语言展示应在读取端按 dept_code 映射，而不是让库里的名字随语言变。
 */

/** 目录节点：上级用 parent_code 表达，树根为 null */
export interface DepartmentCatalogNode {
  dept_code: string;
  dept_name: string;
  parent_code: string | null;
  sort_order: number;
}

/**
 * 规范部门树（已按「父在子前」拓扑排序，syncCanonicalDepartments 依赖这一顺序解析 parent_id）。
 * 与迁移 database/migrations/20260921_department_restructure.sql 保持一致。
 */
export const DEPARTMENT_CATALOG: readonly DepartmentCatalogNode[] = [
  // ── 树根 ──
  { dept_code: 'DEPT001', dept_name: '总经办', parent_code: null, sort_order: 1 },

  // ── 业务部 ──
  { dept_code: 'DEPT002', dept_name: '业务部', parent_code: 'DEPT001', sort_order: 1 },
  { dept_code: 'DEPT00201', dept_name: '销售科', parent_code: 'DEPT002', sort_order: 1 },
  { dept_code: 'DEPT00202', dept_name: '客服科', parent_code: 'DEPT002', sort_order: 2 },

  // ── 生产部 ──
  { dept_code: 'DEPT003', dept_name: '生产部', parent_code: 'DEPT001', sort_order: 2 },
  { dept_code: 'DEPT00301', dept_name: '生产计划科', parent_code: 'DEPT003', sort_order: 1 },
  { dept_code: 'DEPT00302', dept_name: '模切车间', parent_code: 'DEPT003', sort_order: 2 },
  { dept_code: 'DEPT00303', dept_name: '商标车间', parent_code: 'DEPT003', sort_order: 3 },

  // ── 工程技术部 ──
  { dept_code: 'DEPT004', dept_name: '工程技术部', parent_code: 'DEPT001', sort_order: 3 },
  { dept_code: 'DEPT00401', dept_name: '技术科', parent_code: 'DEPT004', sort_order: 1 },
  { dept_code: 'DEPT00402', dept_name: '工程科', parent_code: 'DEPT004', sort_order: 2 },

  // ── 品质部 ──
  { dept_code: 'DEPT005', dept_name: '品质部', parent_code: 'DEPT001', sort_order: 4 },
  { dept_code: 'DEPT00501', dept_name: '来料检验科', parent_code: 'DEPT005', sort_order: 1 },
  { dept_code: 'DEPT00502', dept_name: '制程检验科', parent_code: 'DEPT005', sort_order: 2 },
  { dept_code: 'DEPT00503', dept_name: '出货检验科', parent_code: 'DEPT005', sort_order: 3 },

  // ── 供应链部 ──
  { dept_code: 'DEPT006', dept_name: '供应链部', parent_code: 'DEPT001', sort_order: 5 },
  { dept_code: 'DEPT00601', dept_name: '采购科', parent_code: 'DEPT006', sort_order: 1 },
  { dept_code: 'DEPT00602', dept_name: '仓储科', parent_code: 'DEPT006', sort_order: 2 },

  // ── 财务部 ──
  { dept_code: 'DEPT007', dept_name: '财务部', parent_code: 'DEPT001', sort_order: 6 },
  { dept_code: 'DEPT00701', dept_name: '会计科', parent_code: 'DEPT007', sort_order: 1 },
  { dept_code: 'DEPT00702', dept_name: '出纳科', parent_code: 'DEPT007', sort_order: 2 },

  // ── 行政人事部 ──
  { dept_code: 'DEPT008', dept_name: '行政人事部', parent_code: 'DEPT001', sort_order: 7 },
  { dept_code: 'DEPT00801', dept_name: '行政科', parent_code: 'DEPT008', sort_order: 1 },
  { dept_code: 'DEPT00802', dept_name: '人事科', parent_code: 'DEPT008', sort_order: 2 },
] as const;

/** 规范部门总数（1 + 7 + 16 = 24） */
export const DEPARTMENT_CATALOG_SIZE = DEPARTMENT_CATALOG.length;

/** 一级部门（部）的 dept_code 集合 —— 「一级 = 部」口径的机读表达 */
export const LEVEL1_DEPARTMENT_CODES: readonly string[] = DEPARTMENT_CATALOG.filter(
  (node) => node.parent_code === DEPARTMENT_CATALOG[0].dept_code
).map((node) => node.dept_code);

/** 同步结果统计 */
export interface SyncDepartmentResult {
  /** 目录节点总数 */
  total: number;
  /** 新建行数 */
  inserted: number;
  /** 命中既有行并纠正（含从软删状态复活）的行数 */
  updated: number;
  /** 被软删的「目录外」行数（仅 prune=true 时非零） */
  pruned: number;
}

interface DepartmentRow {
  id: number;
  dept_code: string | null;
  dept_name: string | null;
  deleted: number;
}

/**
 * 把 sys_department 收敛到 DEPARTMENT_CATALOG。
 *
 * 幂等：可重复执行，第二次起 inserted=0 且不产生任何行。
 * 非破坏：按 dept_code 命中既有行后**原地 UPDATE**（保住自增 id，
 *        因此 sys_employee.dept_id 等外部引用不会被改指向），
 *        绝不 DELETE —— 历史实现 `DELETE FROM sys_department` 会连带孤儿化员工。
 *
 * @param conn   事务内连接（调用方负责事务边界）
 * @param prune  true 时把「不在目录内」的存活部门软删（deleted=1），默认 false
 */
export async function syncCanonicalDepartments(
  conn: DbConnection,
  options: { prune?: boolean } = {}
): Promise<SyncDepartmentResult> {
  const rows = (await conn.query<DepartmentRow[]>(
    'SELECT id, dept_code, dept_name, deleted FROM sys_department ORDER BY id'
  ))[0] as DepartmentRow[];

  // dept_code → 候选行（同码多行时优先存活行，其次最小 id）
  const byCode = new Map<string, DepartmentRow>();
  const duplicates: DepartmentRow[] = [];
  for (const row of rows) {
    const code = row.dept_code;
    if (!code) continue;
    const prev = byCode.get(code);
    if (!prev) {
      byCode.set(code, row);
      continue;
    }
    const prevLive = prev.deleted === 0;
    const curLive = row.deleted === 0;
    if (curLive && !prevLive) {
      duplicates.push(prev);
      byCode.set(code, row);
    } else {
      duplicates.push(row);
    }
  }

  const idByCode = new Map<string, number>();
  let inserted = 0;
  let updated = 0;

  for (const node of DEPARTMENT_CATALOG) {
    const parentId =
      node.parent_code === null ? null : (idByCode.get(node.parent_code) ?? null);
    const existing = byCode.get(node.dept_code);

    if (existing) {
      idByCode.set(node.dept_code, existing.id);
      // 名字/层级/排序或存活状态任一不符才写，避免无意义 UPDATE 刷新 update_time
      const drift =
        existing.dept_name !== node.dept_name ||
        existing.deleted !== 0 ||
        (await needsParentFix(conn, existing.id, parentId));
      if (drift) {
        await conn.execute(
          `UPDATE sys_department
              SET dept_code = ?, dept_name = ?, parent_id = ?, sort_order = ?,
                  status = 1, deleted = 0, update_time = NOW()
            WHERE id = ?`,
          [node.dept_code, node.dept_name, parentId, node.sort_order, existing.id]
        );
        updated++;
      }
    } else {
      const [header] = await conn.execute<DbResultSetHeader>(
        'INSERT INTO sys_department (dept_code, dept_name, parent_id, sort_order, status, create_time, update_time, deleted) VALUES (?, ?, ?, ?, 1, NOW(), NOW(), 0)',
        [node.dept_code, node.dept_name, parentId, node.sort_order]
      );
      const newId = Number((header as DbResultSetHeader).insertId);
      idByCode.set(node.dept_code, newId);
      inserted++;
    }
  }

  let pruned = 0;
  if (options.prune) {
    const keep = new Set(DEPARTMENT_CATALOG.map((node) => node.dept_code));
    for (const row of [...rows, ...duplicates]) {
      if (row.deleted !== 0) continue;
      if (row.dept_code && keep.has(row.dept_code) && byCode.get(row.dept_code)?.id === row.id) {
        continue;
      }
      await conn.execute(
        "UPDATE sys_department SET deleted = 1, update_time = NOW() WHERE id = ?",
        [row.id]
      );
      pruned++;
    }
  }

  const result: SyncDepartmentResult = {
    total: DEPARTMENT_CATALOG_SIZE,
    inserted,
    updated,
    pruned,
  };
  logger.info({ module: 'DepartmentCatalog', action: 'syncCanonicalDepartments', ...result },
    '部门目录同步完成');
  return result;
}

/** 该部门当前 parent_id 是否与目标不一致（单独查一次，换取「无需变更就不写」的精度） */
async function needsParentFix(
  conn: DbConnection,
  id: number,
  parentId: number | null
): Promise<boolean> {
  const rows = (await conn.query<{ parent_id: number | null }[]>(
    'SELECT parent_id FROM sys_department WHERE id = ?',
    [id]
  ))[0] as { parent_id: number | null }[];
  const current = rows[0]?.parent_id ?? null;
  return current !== parentId;
}

