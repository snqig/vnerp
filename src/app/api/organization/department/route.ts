import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute, queryOne, SqlValue } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
import { numericFilter } from '@/lib/query-filter';

interface Department {
  id?: number;
  dept_code: string;
  dept_name: string;
  /** 顶级部门在库中为 NULL；0 会违反外键约束，仅作前端旧默认值兼容 */
  parent_id?: number | null;
  leader_id?: number;
  sort_order?: number;
  status?: number;
  create_time?: string;
  update_time?: string;
}

/**
 * 归一 parent_id：顶级部门在库中以 NULL 表示。
 *
 * `sys_department.parent_id` 建有外键 `fk_sys_department_parent` → `sys_department(id)`，
 * 而表中不存在 id = 0 的行，写入 0 会被 MySQL 以 errno 1452（ER_NO_REFERENCED_ROW_2）拒绝。
 * 旧实现写的是 `body.parent_id ?? 0`，因此任何「顶级部门」的新建与编辑都必定失败。
 * 这里把 0 / '0' / '' / null / undefined / 非正数一律归一为 null，其余转成正整数。
 */
function normalizeParentId(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '' || raw === 0 || raw === '0') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

/**
 * 判断 candidateId 是否是 ancestorId 自身或其后代。
 *
 * 用途：编辑部门时禁止把上级设成自己或自己的下级。一旦成环，
 * 前端 buildDepartmentTree 既不会把环上的节点当根、又挂不到任何父节点下，
 * 整棵子树会从列表里静默消失，且在界面上再也修不回来。
 */
async function isSelfOrDescendant(candidateId: number, ancestorId: number): Promise<boolean> {
  let cursor: number | null = candidateId;
  const visited = new Set<number>();
  while (cursor !== null && !visited.has(cursor)) {
    if (cursor === ancestorId) return true;
    visited.add(cursor);
    // 显式标注返回类型：row 的类型会与 cursor 形成循环推断，TS 无法自证（TS7022）
    const row: { parent_id: number | null } | null = await queryOne<{
      parent_id: number | null;
    }>(
      'SELECT parent_id FROM sys_department WHERE id = ?',
      [cursor]
    );
    cursor = row?.parent_id ?? null;
  }
  return false;
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = numericFilter(searchParams.get('status'));
  const page = parseInt(searchParams.get('page') || '1');
  // 部门是「树形主数据」：前端要拿全量在客户端建树，任何一页截断都会让整棵子树消失。
  // 历史上部门只有 14 个、默认 pageSize=20 尚能覆盖；重建为 24 个之后，
  // settings/user、purchase/request、hr/salary、hr/employee 等消费方都不传 pageSize，
  // 会各自静默少 4 个部门。故把默认值放宽到 500，并设上限防滥用。
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '500') || 500, 1), 2000);
  const withLeaderOptions = searchParams.get('withLeaderOptions') === '1';

  let where = 'WHERE d.deleted = 0';
  const values: SqlValue[] = [];

  if (keyword) {
    where += ' AND (dept_name LIKE ? OR dept_code LIKE ?)';
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status !== undefined) {
    where += ' AND status = ?';
    values.push(status);
  }

  const countResult = await query(`SELECT COUNT(*) as total FROM sys_department d ${where}`, values);
  const total = (countResult as DbRow[])[0]?.total || 0;

  const departments = await query<Department>(
    `SELECT d.id, d.dept_code, d.dept_name, d.parent_id, d.leader_id, d.sort_order, d.status, d.phone, d.email, d.create_time, d.update_time, e.name as leader_name
     FROM sys_department d
     LEFT JOIN sys_employee e ON d.leader_id = e.id
     ${where} ORDER BY (d.parent_id IS NULL) DESC, d.parent_id ASC, d.sort_order ASC, d.id ASC LIMIT ? OFFSET ?`,
    [...values, pageSize, (page - 1) * pageSize]
  );

  // 负责人候选项随部门接口一起下发：部门管理走 ORG_DEPARTMENT 权限，
  // 而员工列表接口 /api/organization/employee 走 ORG_EMPLOYEE —— 只授前者权限的账号
  // 会读不到员工列表，负责人下拉永远空白。放在这里可保证「能管部门 = 能选负责人」。
  // 仅当显式传 withLeaderOptions=1 时附加，默认响应结构保持不变（不干扰其它消费方）。
  const leaderOptions = withLeaderOptions
    ? await query<{
        id: number;
        name: string;
        employee_no: string;
        position: string | null;
        status: number | null;
        dept_name: string | null;
      }>(
        `SELECT e.id, e.name, e.employee_no, e.position, e.status,
                COALESCE(d.dept_name, e.dept_name) AS dept_name
           FROM sys_employee e
           LEFT JOIN sys_department d ON d.id = e.dept_id AND d.deleted = 0
          WHERE e.deleted = 0
          ORDER BY (e.status IN (1, 2)) DESC, e.name ASC`
      )
    : null;

  return successResponse({
    list: departments,
    total,
    page,
    pageSize,
    ...(leaderOptions ? { leaderOptions } : {}),
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body: Department = await request.json();

    const validation = validateRequestBody(body, ['dept_code', 'dept_name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM sys_department WHERE dept_code = ? AND deleted = 0',
      [body.dept_code]
    );

    if (existing) {
      return errorResponse(ts('k_12asp1i'), 409, 409);
    }

    const result = await execute(
      `INSERT INTO sys_department (dept_code, dept_name, parent_id, leader_id, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.dept_code,
        body.dept_name,
        normalizeParentId(body.parent_id),
        body.leader_id ?? null,
        body.sort_order ?? 0,
        body.status ?? 1,
      ]
    );

    return successResponse({ id: result.insertId }, ts('k_1cw6qfp'));
  },
  { logTitle: '创建部门' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body: Department = await request.json();
    const { id } = body;

    if (!id) {
      return commonErrors.badRequest(ts('k_fv8gwq'));
    }

    const validation = validateRequestBody(body, ['dept_code', 'dept_name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const existingDept = await queryOne<{ id: number; dept_code: string }>(
      'SELECT id, dept_code FROM sys_department WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!existingDept) {
      return commonErrors.notFound(ts('k_1tab01s'));
    }

    // 仅在「要把编码改成另一个值」时才做重名校验。
    // 存量数据中 dept_code 本就存在重复（DEPT001 同时挂在 管理部(1) 与 总经办(11)，
    // DEPT002 / DEPT005 / DEPT006 同理），若对「编码未变」的编辑也做校验，
    // 这 8 个部门会永远无法保存（返回 409「部门编码已存在」）。
    // 重复编码本身属主数据治理问题，不在本接口内静默合并，仅记录并放行未改码的编辑。
    if (body.dept_code !== existingDept.dept_code) {
      const codeExists = await queryOne<{ id: number }>(
        'SELECT id FROM sys_department WHERE dept_code = ? AND id != ? AND deleted = 0',
        [body.dept_code, id]
      );

      if (codeExists) {
        return errorResponse(ts('k_12asp1i'), 409, 409);
      }
    }

    const normalizedParentId = normalizeParentId(body.parent_id);
    if (normalizedParentId !== null && (await isSelfOrDescendant(normalizedParentId, id))) {
      return errorResponse('上级部门不能是自身或其下级部门', 400, 400);
    }

    const result = await execute(
      `UPDATE sys_department SET dept_code = ?, dept_name = ?, parent_id = ?, leader_id = ?, sort_order = ?, status = ? WHERE id = ? AND deleted = 0`,
      [
        body.dept_code,
        body.dept_name,
        normalizedParentId,
        body.leader_id ?? null,
        body.sort_order ?? 0,
        body.status ?? 1,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return commonErrors.notFound(ts('k_1tab01s'));
    }

    return successResponse(null, ts('k_1iy4ubo'));
  },
  { logTitle: '更新部门' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest(ts('k_fv8gwq'));
    }

    const deptId = parseInt(id);

    const existingDept = await queryOne<{ id: number }>(
      'SELECT id FROM sys_department WHERE id = ? AND deleted = 0',
      [deptId]
    );

    if (!existingDept) {
      return commonErrors.notFound(ts('k_1tab01s'));
    }

    const hasChildren = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM sys_department WHERE parent_id = ? AND deleted = 0',
      [deptId]
    );

    if (hasChildren && hasChildren.count > 0) {
      return errorResponse(ts('k_tntb8n'), 409, 409);
    }

    const hasEmployees = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM sys_employee WHERE dept_id = ?',
      [deptId]
    );

    if (hasEmployees && hasEmployees.count > 0) {
      return errorResponse(ts('k_7c7kji'), 409, 409);
    }

    await execute('UPDATE sys_department SET deleted = 1 WHERE id = ?', [deptId]);

    return successResponse(null, tc('deptDeleted'));
  },
  { logTitle: '删除部门' }
);
