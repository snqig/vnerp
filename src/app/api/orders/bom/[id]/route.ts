import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

/**
 * 获取BOM详情
 * GET /api/orders/bom/{id}
 */
export const GET = withPermission(async (request: NextRequest, userInfo, context) => {
  const ts = await getTranslations('Common');
  const { id } = await context.params;

  if (!id || isNaN(parseInt(id))) {
    return errorResponse(ts('k_1h3fptg'), 400, 400);
  }

  const bomId = parseInt(id);

  // 查询BOM主表
  const bomHeader = await query(
    ts('k_7uw71j'),
    [bomId]
  );

  if ((bomHeader as DbRow[]).length === 0) {
    return errorResponse(ts('k_ksotfg'), 404, 404);
  }

  // 查询BOM明细（使用实际表列名）
  const bomLines = await query(
    `SELECT 
       bl.id, bl.line_no, bl.material_id, bl.material_code, bl.material_name, bl.material_spec,
       bl.material_unit as unit, bl.usage_qty as consumption_qty, bl.loss_rate, 
       bl.usage_qty * (1 + bl.loss_rate / 100) as actual_qty,
       bl.unit_cost, bl.total_cost, bl.remark
     FROM bom_line bl
     WHERE bl.bom_id = ?
     ORDER BY bl.line_no`,
    [bomId]
  );

  // 查询版本历史（表可能不存在，容错处理）
  let versionHistory: SqlValue[] = [];
  try {
    versionHistory = await query(
      `SELECT version, change_type, change_content, change_reason, operator_name, operate_time
       FROM bom_version_history WHERE bom_id = ? ORDER BY operate_time DESC`,
      [bomId]
    );
  } catch {
    // bom_version_history 表不存在时返回空数组
  }

  // 查询替代料（表可能不存在，容错处理）
  let alternatives: SqlValue[] = [];
  try {
    alternatives = await query(
      `SELECT bom_line_id, priority, material_code as alt_material_code, 
              material_name as alt_material_name, conversion_rate
       FROM bom_alternative WHERE bom_id = ? AND is_enabled = 1`,
      [bomId]
    );
  } catch {
    // bom_alternative 表不存在时返回空数组
  }

  return successResponse({
    header: (bomHeader as DbRow[])[0],
    lines: bomLines,
    version_history: versionHistory,
    alternatives,
  });
});
