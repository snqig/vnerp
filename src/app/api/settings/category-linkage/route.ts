import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

/**
 * 物料分类 ↔ 仓库分类 联动校验
 *
 * 修复记录（本次）：
 *   原实现查询 `SELECT ..., category_type, ... FROM inv_material_category`，
 *   但 category_type 这一列在整个 database/ 目录（权威 schema + 全部迁移）中
 *   【根本不存在】，因此本接口 GET 必定抛 Unknown column 并返回 500。
 *
 *   分类表本身没有"类型"字段，但物料表 inv_material.material_type 是真实存在的
 *   （1-原材料 2-半成品 3-成品 4-辅料 5-包材）。现改为按分类下【物料类型分布】
 *   推断该分类的主导类型，再据此匹配首选仓库分类。语义保持不变，且基于真实数据。
 */

interface LinkageItem {
  material_category_id: number;
  material_category_code: string;
  material_category_name: string;
  material_category_type: number | null;
  material_category_type_name: string;
  material_count: number;
  warehouse_category_id: number | null;
  warehouse_category_code: string | null;
  warehouse_category_name: string | null;
  linkage_status: 'linked' | 'unlinked' | 'mismatch' | 'unknown';
  issue?: string;
}

const MATERIAL_TYPE_NAMES: Record<number, string> = {
  1: '原材料',
  2: '半成品',
  3: '成品',
  4: '辅料',
  5: '包材',
  6: '油墨',
};

const TYPE_WAREHOUSE_MAPPING: Record<number, { preferred_prefix: string; preferred_name: string }> =
  {
    1: { preferred_prefix: 'WH-CAT-RAW', preferred_name: '原材料仓' },
    2: { preferred_prefix: 'WH-CAT-WIP', preferred_name: '半成品仓' },
    3: { preferred_prefix: 'WH-CAT-FG', preferred_name: '成品仓' },
    4: { preferred_prefix: 'WH-CAT-AUX', preferred_name: '辅料仓' },
    5: { preferred_prefix: 'WH-CAT-PKG', preferred_name: '包材仓' },
    6: { preferred_prefix: 'WH-CAT-INK', preferred_name: '油墨仓' },
  };

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const results: LinkageItem[] = [];
  const summary = {
    total_material_categories: 0,
    linked: 0,
    unlinked: 0,
    mismatch: 0,
    unknown: 0,
  };

  try {
    const materialCategories = (await query(
      `SELECT id, category_code, category_name, parent_id, status
         FROM inv_material_category
        WHERE deleted = 0 AND status = 1
        ORDER BY sort_order ASC, id ASC`
    )) as DbRow[];

    // 分类下的物料类型分布：用于推断该分类的主导物料类型
    const typeDistribution = (await query(
      `SELECT category_id, material_type, COUNT(*) AS cnt
         FROM inv_material
        WHERE deleted = 0 AND category_id IS NOT NULL AND material_type IS NOT NULL
        GROUP BY category_id, material_type`
    )) as DbRow[];

    const dominantType = new Map<number, { type: number; cnt: number; total: number }>();
    for (const row of typeDistribution) {
      const cid = Number(row.category_id);
      const cnt = Number(row.cnt);
      const prev = dominantType.get(cid);
      if (!prev) {
        dominantType.set(cid, { type: Number(row.material_type), cnt, total: cnt });
      } else {
        prev.total += cnt;
        if (cnt > prev.cnt) {
          prev.type = Number(row.material_type);
          prev.cnt = cnt;
        }
      }
    }

    const warehouseCategories = (await query(
      `SELECT id, code, name, status FROM sys_warehouse_category WHERE deleted = 0 AND status = 1`
    )) as DbRow[];

    summary.total_material_categories = materialCategories.length;

    for (const mc of materialCategories) {
      const dom = dominantType.get(Number(mc.id));
      const categoryType = dom ? dom.type : null;
      const typeName = categoryType !== null ? MATERIAL_TYPE_NAMES[categoryType] || ts('k_1lpnuh4') : ts('k_1lpnuh4');
      const preferred = categoryType !== null ? TYPE_WAREHOUSE_MAPPING[categoryType] : undefined;

      const item: LinkageItem = {
        material_category_id: Number(mc.id),
        material_category_code: mc.category_code,
        material_category_name: mc.category_name,
        material_category_type: categoryType,
        material_category_type_name: typeName,
        material_count: dom ? dom.total : 0,
        warehouse_category_id: null,
        warehouse_category_code: null,
        warehouse_category_name: null,
        linkage_status: 'unknown',
      };

      // 分类下没有任何物料时无法推断类型，不武断判定为"未关联"
      if (!preferred) {
        item.linkage_status = 'unknown';
        item.issue = `分类"${mc.category_name}"下暂无物料（或物料未设置类型），无法推断应关联的仓库分类`;
        summary.unknown++;
        results.push(item);
        continue;
      }

      const linkedWh =
        warehouseCategories.find(
          (wh: DbRow) =>
            String(wh.code || '').startsWith(preferred.preferred_prefix) ||
            String(wh.name || '').includes(preferred.preferred_name)
        ) || null;

      if (!linkedWh) {
        item.linkage_status = 'unlinked';
        item.issue = `物料分类"${mc.category_name}"（主导类型：${typeName}）未找到对应的仓库分类"${preferred.preferred_name}"`;
        summary.unlinked++;
      } else {
        item.warehouse_category_id = Number(linkedWh.id);
        item.warehouse_category_code = linkedWh.code;
        item.warehouse_category_name = linkedWh.name;
        item.linkage_status = 'linked';
        summary.linked++;
      }

      results.push(item);
    }
  } catch (e) {
    return errorResponse(`联动校验查询失败: ${(e as Error).message}`, 500);
  }

  return successResponse({
    summary,
    items: results,
    type_mapping: TYPE_WAREHOUSE_MAPPING,
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { materialCategoryId, warehouseCategoryId } = body;

    if (!materialCategoryId || !warehouseCategoryId) {
      return errorResponse(ts('k_y3xn9l'), 400);
    }

    const mc = (await query(
      `SELECT id, category_code, category_name FROM inv_material_category WHERE id = ? AND deleted = 0`,
      [materialCategoryId]
    )) as DbRow[];

    if (mc.length === 0) {
      return errorResponse(ts('k_1f1qg13'), 404);
    }

    const wh = (await query(
      `SELECT id, code, name FROM sys_warehouse_category WHERE id = ? AND deleted = 0`,
      [warehouseCategoryId]
    )) as DbRow[];

    if (wh.length === 0) {
      return errorResponse(ts('k_lojzv'), 404);
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
