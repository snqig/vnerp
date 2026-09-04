import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
import {
  getCategoryRules,
  validateCategoryForCreate,
  validateCategoryForUpdate,
} from '@/lib/category-validation';

/**
 * 物料分类主数据
 *
 * 修复记录（本次）：
 *   原实现 POST/PUT 完全没有校验——不校验编码非空、不校验系统设置里的编码规则、
 *   不校验唯一性（撞 UNIQUE 后把英文 Duplicate entry 直接抛给用户）、
 *   不校验层级深度，且 `parent_id || 0` 会用 0 去撞自引用外键
 *   fk_material_category_parent（0 不是合法分类 ID）。
 *
 *   现统一走 src/lib/category-validation.ts，规则来自 sys_calc_param（迁移 074）：
 *     - 新增：编码不符合规则直接拒绝（category.enforce_on_create=true）
 *     - 编辑：仅提示不拦截（category.enforce_on_update=false），避免锁死存量数据
 */

/**
 * 分类类型合法值。取值范围与前端下拉严格对齐
 * （src/app/[locale]/base-data/material-category/page.tsx 提供 1~10）：
 * 1-原材料 2-半成品 3-成品 4-辅料 5-包材 6-油墨 7-溶剂 8-网版 9-刀具 10-设备配件
 */
const CATEGORY_TYPE_LABELS: Record<number, string> = {
  1: '原材料',
  2: '半成品',
  3: '成品',
  4: '辅料',
  5: '包材',
  6: '油墨',
  7: '溶剂',
  8: '网版',
  9: '刀具',
  10: '设备配件',
};

function checkCategoryType(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const v = Number(value);
  if (!CATEGORY_TYPE_LABELS[v]) {
    const allowed = Object.entries(CATEGORY_TYPE_LABELS)
      .map(([k, label]) => `${k}-${label}`)
      .join(' / ');
    return `分类类型${value}非法，合法值为 ${allowed}`;
  }
  return null;
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 50);
  const categoryName = searchParams.get('categoryName') || '';
  const categoryCode = searchParams.get('categoryCode') || '';

  let where = 'WHERE deleted = 0';
  const params: (string | number)[] = [];
  if (categoryName) {
    where += ' AND category_name LIKE ?';
    params.push('%' + categoryName + '%');
  }
  // 分类编码是业务语义稳定的主查询键，支持精确/前缀匹配
  if (categoryCode) {
    where += ' AND category_code LIKE ?';
    params.push(categoryCode + '%');
  }

  const totalRows = await query(
    'SELECT COUNT(*) as total FROM inv_material_category ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT * FROM inv_material_category ' +
      where +
      ' ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  // 把当前生效的规则一并返回，前端可用于输入框占位符与即时提示
  const rules = await getCategoryRules('material');

  return successResponse({
    list: rows,
    total,
    page,
    pageSize,
    rules: {
      code_pattern: rules.codePattern,
      code_pattern_desc: rules.codePatternDesc,
      max_depth: rules.maxDepth,
      enforce_on_create: rules.enforceOnCreate,
      enforce_on_update: rules.enforceOnUpdate,
    },
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { category_code, category_name, parent_id, sort_order, status, category_type, remark } =
      body;

    if (!String(category_name ?? '').trim()) {
      return errorResponse(ts('k_u7qe7b'), 400);
    }

    // 前端有"分类类型"下拉，原实现完全不落库 → 用户选了等于没选
    const typeErr = checkCategoryType(category_type);
    if (typeErr) return errorResponse(typeErr, 400);

    const validation = await validateCategoryForCreate('material', {
      code: category_code,
      parentId: parent_id,
      status,
    });
    if (validation.blocked) {
      return errorResponse(validation.errors.join('；'), 400);
    }

    // parent_id 必须是 NULL 而非 0，否则会撞自引用外键
    const normalizedParentId =
      parent_id === undefined || parent_id === null || Number(parent_id) === 0
        ? null
        : Number(parent_id);

    const result = await execute(
      `INSERT INTO inv_material_category
         (category_code, category_name, parent_id, category_type, sort_order, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(category_code).trim(),
        String(category_name).trim(),
        normalizedParentId,
        category_type === undefined || category_type === null ? null : Number(category_type),
        sort_order || 0,
        status ?? 1,
        remark ?? null,
      ]
    );

    return successResponse(
      { id: result.insertId, warnings: validation.warnings },
      validation.warnings.length > 0
        ? `分类创建成功（提示：${validation.warnings.join('；')}）`
        : tc('categoryCreated')
    );
  },
  { logTitle: '创建物料分类' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      id,
      category_code,
      category_name,
      parent_id,
      sort_order,
      status,
      category_type,
      remark,
    } = body;

    if (!id) return errorResponse(ts('k_2myxfe'), 400);

    const typeErr = checkCategoryType(category_type);
    if (typeErr) return errorResponse(typeErr, 400);

    const existing = (await query(
      'SELECT id FROM inv_material_category WHERE id = ? AND deleted = 0 LIMIT 1',
      [Number(id)]
    )) as DbRow[];
    if (existing.length === 0) {
      return errorResponse(ts('k_17d0sn'), 404);
    }

    const validation = await validateCategoryForUpdate('material', {
      code: category_code,
      parentId: parent_id,
      status,
      excludeId: Number(id),
    });
    if (validation.blocked) {
      return errorResponse(validation.errors.join('；'), 400);
    }

    // 收敛为单条 UPDATE：原实现拆成 3 条独立 UPDATE，非原子且多余往返
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (category_code !== undefined) {
      sets.push('category_code = ?');
      params.push(String(category_code).trim());
    }
    if (category_name !== undefined) {
      if (!String(category_name).trim()) {
        return errorResponse(ts('k_u7qe7b'), 400);
      }
      sets.push('category_name = ?');
      params.push(String(category_name).trim());
    }
    if (parent_id !== undefined) {
      sets.push('parent_id = ?');
      params.push(Number(parent_id) === 0 || parent_id === null ? null : Number(parent_id));
    }
    if (sort_order !== undefined) {
      sets.push('sort_order = ?');
      params.push(Number(sort_order));
    }
    if (status !== undefined) {
      sets.push('status = ?');
      params.push(Number(status));
    }
    if (category_type !== undefined) {
      sets.push('category_type = ?');
      params.push(category_type === null ? null : Number(category_type));
    }
    if (remark !== undefined) {
      sets.push('remark = ?');
      params.push(remark ?? null);
    }

    if (sets.length === 0) {
      return successResponse(null, ts('k_zw023v'));
    }

    params.push(Number(id));
    await execute(
      `UPDATE inv_material_category SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`,
      params
    );

    return successResponse(
      { warnings: validation.warnings },
      validation.warnings.length > 0
        ? `更新成功（提示：${validation.warnings.join('；')}）`
        : ts('k_1795bzg')
    );
  },
  { logTitle: '更新物料分类' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_js4lo9'), 400);

    const categoryId = Number(id);

    // 软删除不会触发外键的 ON DELETE SET NULL，必须自行校验引用，
    // 否则会留下指向已删除分类的物料（脏引用）。
    const children = (await query(
      'SELECT COUNT(*) AS cnt FROM inv_material_category WHERE parent_id = ? AND deleted = 0',
      [categoryId]
    )) as DbRow[];
    if (Number(children[0]?.cnt || 0) > 0) {
      return errorResponse(`该分类下还有 ${children[0].cnt} 个子分类，请先删除或转移子分类`, 400);
    }

    const materials = (await query(
      'SELECT COUNT(*) AS cnt FROM inv_material WHERE category_id = ? AND deleted = 0',
      [categoryId]
    )) as DbRow[];
    if (Number(materials[0]?.cnt || 0) > 0) {
      return errorResponse(
        `该分类下还有 ${materials[0].cnt} 个物料在使用，请先转移物料后再删除`,
        400
      );
    }

    await execute('UPDATE inv_material_category SET deleted = 1 WHERE id = ?', [categoryId]);
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除物料分类' }
);
