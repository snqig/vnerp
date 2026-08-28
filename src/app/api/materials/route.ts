import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
import {
  resolveCategoryByCode,
  getCategoryIdWithDescendants,
  getCategoryRules,
  isCategoryRequiredOnBusiness,
} from '@/lib/category-validation';

/**
 * 业务侧物料查询（采购申请、领料、外协、批次等页面的物料选择源）
 *
 * 修复记录（本次）：
 *   原实现只有 keyword 一个筛选条件，采购等业务无法按【物料分类】筛选，
 *   也不返回分类信息——分类维护得再规范，业务侧也用不上。
 *
 *   现以【分类编码 categoryCode】为主查询键（编码业务语义稳定，
 *   自增 id 跨环境不稳定），并且：
 *     - 编码不存在/已停用/格式非法 → 返回 400 + 明确中文提示，
 *       而不是静默忽略条件把全量物料倒给用户（原行为最危险的地方）；
 *     - 父分类会自动带出全部子分类；
 *     - 每行返回 category_code / category_name，未归类的行标记出来。
 */

interface MaterialRow {
  id: number;
  material_code: string;
  material_name: string;
  specification: string | null;
  unit: string | null;
  purchase_price: number | null;
  sale_price: number | null;
  material_type: string | null;
  category_id: number | null;
  category_code: string | null;
  category_name: string | null;
  // #21 分切物料类型限制：是否允许分切（主数据可手动覆盖）
  is_splittable: number | null;
}

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const pageSize = parseInt(searchParams.get('pageSize') || '100');
  const page = parseInt(searchParams.get('page') || '1');
  const keyword = searchParams.get('keyword');
  const categoryCode = (searchParams.get('categoryCode') || '').trim();
  const categoryIdParam = searchParams.get('categoryId');
  // uncategorized=1 用于运维排查"哪些物料还没归类"
  const onlyUncategorized = searchParams.get('uncategorized') === '1';

  const where: string[] = ['m.deleted = 0'];
  const values: SqlValue[] = [];

  // —— 主查询键：分类编码 ——
  let resolvedCategory: { id: number; name: string; code: string } | null = null;
  if (categoryCode) {
    const resolved = await resolveCategoryByCode('material', categoryCode);
    if (!resolved.ok) {
      // 关键：不静默降级为"无筛选"，直接把原因告诉调用方
      return errorResponse(resolved.message || '物料分类编码无效', 400, 400);
    }
    resolvedCategory = {
      id: resolved.categoryId!,
      name: resolved.categoryName!,
      code: categoryCode,
    };
    const ids = await getCategoryIdWithDescendants('material', resolved.categoryId!);
    where.push(`m.category_id IN (${ids.map(() => '?').join(',')})`);
    values.push(...ids);
  } else if (categoryIdParam) {
    const cid = Number(categoryIdParam);
    if (!Number.isInteger(cid) || cid <= 0) {
      return errorResponse('物料分类ID非法', 400, 400);
    }
    const ids = await getCategoryIdWithDescendants('material', cid);
    where.push(`m.category_id IN (${ids.map(() => '?').join(',')})`);
    values.push(...ids);
  }

  if (onlyUncategorized) {
    where.push('(m.category_id IS NULL OR c.id IS NULL)');
  }

  if (keyword) {
    where.push('(m.material_code LIKE ? OR m.material_name LIKE ?)');
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  const whereSql = where.join(' AND ');
  const fromSql = `
    FROM inv_material m
    LEFT JOIN inv_material_category c
           ON c.id = m.category_id AND c.deleted = 0
  `;

  const offset = (page - 1) * pageSize;
  const list = await query<MaterialRow>(
    `SELECT
       m.id, m.material_code, m.material_name, m.specification, m.unit,
       m.purchase_price, m.sale_price, m.material_type, m.category_id,
       c.category_code, c.category_name, m.is_splittable
     ${fromSql}
     WHERE ${whereSql}
     ORDER BY m.id DESC
     LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );

  const countResult = (await query(
    `SELECT COUNT(*) as total ${fromSql} WHERE ${whereSql}`,
    values
  )) as DbRow[];
  const total = countResult[0]?.total || 0;

  // 未归类物料在当前结果里的数量，供前端直接提示
  const uncategorizedInPage = list.filter((m) => !m.category_id || !m.category_code).length;
  const rules = await getCategoryRules('material');
  const categoryRequired = await isCategoryRequiredOnBusiness();

  return successResponse({
    list,
    total,
    page,
    pageSize,
    category: resolvedCategory,
    categoryRequired,
    uncategorizedInPage,
    categoryHint:
      uncategorizedInPage > 0
        ? `当前结果中有 ${uncategorizedInPage} 个物料未设置物料分类${
            categoryRequired ? '，无法用于业务单据' : '，建议先归类'
          }`
        : null,
    rules: {
      code_pattern: rules.codePattern,
      code_pattern_desc: rules.codePatternDesc,
    },
  });
});
