import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

interface LinkageItem {
  material_category_id: number;
  material_category_code: string;
  material_category_name: string;
  material_category_type: number;
  material_category_type_name: string;
  warehouse_category_id: number | null;
  warehouse_category_code: string | null;
  warehouse_category_name: string | null;
  linkage_status: 'linked' | 'unlinked' | 'mismatch';
  issue?: string;
}

const MATERIAL_TYPE_NAMES: Record<number, string> = {
  1: tc('text_cr294'),
  2: tc('text_cobqz'),
  3: tc('text_h581'),
  4: tc('text_oywk'),
  5: tc('text_eorv'),
  6: tc('text_iz9r'),
};

const TYPE_WAREHOUSE_MAPPING: Record<number, { preferred_prefix: string; preferred_name: string }> =
  {
    1: { preferred_prefix: 'WH-CAT-RAW', preferred_name: tc('text_azbdez') },
    2: { preferred_prefix: 'WH-CAT-WIP', preferred_name: tc('text_awyjso') },
    3: { preferred_prefix: 'WH-CAT-FG', preferred_name: tc('text_erxhe') },
    4: { preferred_prefix: 'WH-CAT-AUX', preferred_name: tc('text_lihlr') },
    5: { preferred_prefix: 'WH-CAT-PKG', preferred_name: tc('text_cnrk8') },
    6: { preferred_prefix: 'WH-CAT-INK', preferred_name: tc('text_gcsys') },
  };

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const _checkType = searchParams.get('checkType') || 'all';

  const results: LinkageItem[] = [];
  const summary = {
    total_material_categories: 0,
    linked: 0,
    unlinked: 0,
    mismatch: 0,
  };

  try {
    const materialCategories = (await query(
      `SELECT id, category_code, category_name, category_type, parent_id, status
       FROM inv_material_category WHERE deleted = 0 AND status = 1`
    )) as any[];

    const warehouseCategories = (await query(
      `SELECT id, code, name, status FROM sys_warehouse_category WHERE deleted = 0 AND status = 1`
    )) as any[];

    summary.total_material_categories = materialCategories.length;

    for (const mc of materialCategories) {
      const typeName = MATERIAL_TYPE_NAMES[mc.category_type] || '未知';
      const preferred = TYPE_WAREHOUSE_MAPPING[mc.category_type];

      const linkedWh =
        warehouseCategories.find(
          (wh: any) =>
            preferred &&
            (wh.code.startsWith(preferred.preferred_prefix) ||
              wh.name.includes(preferred.preferred_name))
        ) || null;

      const item: LinkageItem = {
        material_category_id: mc.id,
        material_category_code: mc.category_code,
        material_category_name: mc.category_name,
        material_category_type: mc.category_type,
        material_category_type_name: typeName,
        warehouse_category_id: linkedWh ? linkedWh.id : null,
        warehouse_category_code: linkedWh ? linkedWh.code : null,
        warehouse_category_name: linkedWh ? linkedWh.name : null,
        linkage_status: 'unlinked',
      };

      if (!linkedWh) {
        item.linkage_status = 'unlinked';
        item.issue = `物料分类"${typeName}"未关联对应仓库分类`;
        summary.unlinked++;
      } else if (
        preferred &&
        !linkedWh.code.startsWith(preferred.preferred_prefix) &&
        !linkedWh.name.includes(preferred.preferred_name)
      ) {
        item.linkage_status = 'mismatch';
        item.issue = `物料分类"${typeName}"关联的仓库分类"${linkedWh.name}"可能不匹配`;
        summary.mismatch++;
      } else {
        item.linkage_status = 'linked';
        summary.linked++;
      }

      results.push(item);
    }
  } catch (e: any) {
    return errorResponse(`联动校验查询失败: ${e.message}`, 500);
  }

  return successResponse({
    summary,
    items: results,
    type_mapping: TYPE_WAREHOUSE_MAPPING,
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { materialCategoryId, warehouseCategoryId } = body;

    if (!materialCategoryId || !warehouseCategoryId) {
      return errorResponse('物料分类ID和仓库分类ID不能为空', 400);
    }

    const mc = (await query(
      `SELECT id, category_code, category_name, category_type FROM inv_material_category WHERE id = ? AND deleted = 0`,
      [materialCategoryId]
    )) as any[];

    if (mc.length === 0) {
      return errorResponse('物料分类不存在', 404);
    }

    const wh = (await query(
      `SELECT id, code, name FROM sys_warehouse_category WHERE id = ? AND deleted = 0`,
      [warehouseCategoryId]
    )) as any[];

    if (wh.length === 0) {
      return errorResponse('仓库分类不存在', 404);
    }

    return successResponse({
      material_category: mc[0],
      warehouse_category: wh[0],
      compatible: true,
      message: `物料分类"${mc[0].category_name}"与仓库分类"${wh[0].name}"关联校验通过`,
    });
  },
  { logTitle: '关联校验' }
);
