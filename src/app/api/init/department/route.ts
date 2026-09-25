import { NextRequest } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { query, transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  DEPARTMENT_CATALOG,
  DEPARTMENT_CATALOG_SIZE,
  LEVEL1_DEPARTMENT_CODES,
  syncCanonicalDepartments,
} from '@/lib/department-catalog';

// 部门接口
interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
  /** 树根为 NULL —— 库里没有 id = 0 的行，写 0 会被外键 fk_sys_department_parent 拒绝 */
  parent_id: number | null;
  sort_order: number;
  status: number;
  deleted: number;
}

// 部门树节点（显式建模，避免 JsonObject 式松散类型）
interface DepartmentTreeNode {
  id: number;
  dept_code: string;
  dept_name: string;
  parent_id: number | null;
  sort_order: number;
  status: number;
  children: DepartmentTreeNode[];
}

/**
 * 组装部门树。
 *
 * 注意树根判定是 `parent_id === null` 而非 `=== 0`：
 * 历史实现用 0 当根哨兵，既与库中实际数据（NULL）不符，也让 buildTree 永远返回空数组。
 */
function buildDepartmentTree(
  departments: Department[],
  parentId: number | null = null
): DepartmentTreeNode[] {
  return departments
    .filter((dept) => dept.parent_id === parentId)
    .map((dept) => ({
      id: dept.id,
      dept_code: dept.dept_code,
      dept_name: dept.dept_name,
      parent_id: dept.parent_id,
      sort_order: dept.sort_order,
      status: dept.status,
      children: buildDepartmentTree(departments, dept.id),
    }));
}

/** 读取当前存活部门（树序：树根 → 一级 → 二级 → 各自 sort_order） */
async function loadLiveDepartments(): Promise<Department[]> {
  return query<Department>(
    'SELECT id, dept_code, dept_name, parent_id, sort_order, status, deleted' +
      ' FROM sys_department WHERE deleted = 0' +
      ' ORDER BY parent_id IS NULL DESC, parent_id, sort_order, id'
  );
}

/** 层级统计：树根 / 部 / 科·室·车间 */
function summarizeLevels(departments: Department[]) {
  const rootIds = new Set(
    departments.filter((dept) => dept.parent_id === null).map((dept) => dept.id)
  );
  return {
    total: departments.length,
    root: rootIds.size,
    level1: departments.filter((dept) => dept.parent_id !== null && rootIds.has(dept.parent_id))
      .length,
    level2: departments.filter((dept) => dept.parent_id !== null && !rootIds.has(dept.parent_id))
      .length,
    active: departments.filter((dept) => dept.status === 1).length,
  };
}

/**
 * POST - 把 sys_department 收敛到规范部门树（总经办 > 7 个部 > 16 个科/室/车间）。
 *
 * 相对旧实现修掉三处硬伤（旧实现在本仓库必然失败或造成数据事故）：
 *   1. 旧实现先 `DELETE FROM sys_department` 硬删全表再重建 —— 会立刻打断
 *      sys_employee.dept_id 的引用（内存里 11 名员工的部门归属瞬间悬空）。
 *      现改为按 dept_code 幂等 upsert，命中既有行**原地 UPDATE**，保住自增 id。
 *   2. 旧实现一级部门写 `parent_id: 0`，而库中没有 id = 0 的行，
 *      外键 fk_sys_department_parent 会以 errno 1452 拒绝整批写入。
 *   3. 旧实现内联了一份「管理部 / 打样中心 / 模切 / 商标 / 其他 / 采购 / 仓库」
 *      的旧结构，与库里真实结构、与 init/settings-seed 内联的又是第三份。
 *      现统一从 @/lib/department-catalog 取 —— 全站一份真相源。
 *
 * 清洗：默认把「不在目录内」的存活部门软删（deleted=1，可回滚）；
 *      传 `?prune=0` 可关闭，仅做补齐不动存量。
 */
export const POST = withPermission(
  async (request: NextRequest) => {
    const ts = await getTranslations('Common');
    const prune = new URL(request.url).searchParams.get('prune') !== '0';

    const sync = await transaction(async (connection) =>
      syncCanonicalDepartments(connection, { prune })
    );

    const finalDepts = await loadLiveDepartments();

    return successResponse(
      {
        list: finalDepts,
        tree: buildDepartmentTree(finalDepts),
        count: finalDepts.length,
        catalog: {
          total: DEPARTMENT_CATALOG_SIZE,
          level1Count: LEVEL1_DEPARTMENT_CODES.length,
          level2Count: DEPARTMENT_CATALOG_SIZE - LEVEL1_DEPARTMENT_CODES.length - 1,
          codes: DEPARTMENT_CATALOG.map((node) => node.dept_code),
        },
        sync,
      },
      ts('k_z1dcny')
    );
  },
  { errorMessage: '初始化部门数据失败' }
);

// GET - 获取当前部门数据（只读，不产生副作用）
export const GET = withPermission(
  async (_request: NextRequest) => {
    const depts = await loadLiveDepartments();

    return successResponse({
      list: depts,
      tree: buildDepartmentTree(depts),
      stats: summarizeLevels(depts),
    });
  },
  { errorMessage: '获取部门数据失败' }
);

