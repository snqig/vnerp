import { getTranslations } from 'next-intl/server';
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
import { resolveCategoryByCode } from '@/lib/category-validation';

interface ImportItem {
  material_code: string;
  material_name: string;
  specification?: string | null;
  category_code: string;
  material_type?: number;
  unit?: string | null;
  brand?: string | null;
  is_splittable?: number;
  remark?: string | null;
}

/**
 * POST /api/materials/import
 *
 * 批量导入物料主数据（对接「12 类用途分类」体系）。
 * 请求体：{ items: ImportItem[], mode?: 'skip' | 'update' }
 *   - 按 category_code 解析为 inv_material_category.id（支持 C01..C12 及二级 C01-01）
 *   - material_type 缺省 1（原材料）；分类由 category_id 表达用途细分
 *   - mode='skip'（默认）：material_code 已存在则跳过；'update'：覆盖可写字段
 * 返回：{ inserted, updated, skipped, failed, errors }
 */
export const POST = withPermission(
  async (request: NextRequest) => {
    const ts = await getTranslations('Common');
    let body: { items?: ImportItem[]; mode?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse(ts('k_1t9r8nc') || '请求体不是合法 JSON', 400, 400);
    }

    const items = body.items;
    const mode = body.mode === 'update' ? 'update' : 'skip';
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse('items 必须为非空数组', 400, 400);
    }
    if (items.length > 1000) {
      return errorResponse('单次导入不超过 1000 条', 400, 400);
    }

    const inserted: number[] = [];
    const updated: number[] = [];
    const skipped: string[] = [];
    const failed: { material_code: string; reason: string }[] = [];

    await transaction(async (connection) => {
      for (const it of items) {
        const code = (it.material_code || '').trim();
        const name = (it.material_name || '').trim();
        const catCode = (it.category_code || '').trim();
        if (!code || !name) {
          failed.push({ material_code: code || '', reason: 'material_code / material_name 不能为空' });
          continue;
        }
        if (!catCode) {
          failed.push({ material_code: code, reason: 'category_code 不能为空' });
          continue;
        }

        const resolved = await resolveCategoryByCode('material', catCode);
        if (!resolved.ok || resolved.categoryId == null) {
          failed.push({ material_code: code, reason: resolved.message || `分类码 ${catCode} 无法解析` });
          continue;
        }

        const existing = (await connection.query(
          'SELECT id FROM inv_material WHERE material_code = ? AND deleted = 0 LIMIT 1',
          [code]
        )) as DbRow[];
        const existId = existing.length ? Number(existing[0].id) : null;

        const values = [
          name,
          it.specification ?? null,
          resolved.categoryId,
          it.material_type && Number.isInteger(it.material_type) ? it.material_type : 1,
          it.unit ?? null,
          it.brand ?? null,
          it.is_splittable === 1 ? 1 : 0,
          it.remark ?? null,
        ];

        if (existId && mode === 'skip') {
          skipped.push(code);
          continue;
        }

        if (existId && mode === 'update') {
          await connection.execute(
            `UPDATE inv_material SET
               material_name = ?, specification = ?, category_id = ?, material_type = ?,
               unit = ?, brand = ?, is_splittable = ?, remark = ?, update_time = NOW()
             WHERE id = ? AND deleted = 0`,
            [...values, existId]
          );
          updated.push(existId);
          continue;
        }

        const [res] = (await connection.execute(
          `INSERT INTO inv_material
            (material_code, material_name, specification, category_id, material_type, unit, brand, is_splittable, remark, status, create_time, update_time, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), 0)`,
          [code, ...values]
        )) as unknown as [{ insertId: number }, unknown];
        inserted.push(res.insertId);
      }
    });

    return successResponse({
      inserted: inserted.length,
      updated: updated.length,
      skipped: skipped.length,
      failed: failed.length,
      errors: failed.slice(0, 50),
    });
  },
  { errorMessage: '批量导入物料失败' }
);
