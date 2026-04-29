import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

/**
 * 获取BOM详情
 * GET /api/orders/bom/{id}
 */
export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  if (!id || isNaN(parseInt(id))) {
    return errorResponse('无效的BOM ID', 400, 400);
  }

  const bomId = parseInt(id);

  // 查询BOM主表
  const bomHeader = await query(
    `SELECT 
       bh.id, bh.bom_no, bh.product_id, bh.product_code, bh.product_name, bh.product_spec,
       bh.version, bh.is_default, bh.status, bh.unit, bh.base_qty,
       bh.total_material_count, bh.total_cost, bh.remark,
       bh.create_time, bh.update_time, bh.audit_time, bh.publish_time,
       CASE bh.status
         WHEN 10 THEN '草稿'
         WHEN 20 THEN '已审核'
         WHEN 30 THEN '已发布'
         WHEN 90 THEN '已停用'
       END as status_name
     FROM bom_header bh
     WHERE bh.id = ? AND bh.deleted = 0`,
    [bomId]
  );

  if ((bomHeader as any[]).length === 0) {
    return errorResponse('BOM不存在', 404, 404);
  }

  // 查询BOM明细
  const bomLines = await query(
    `SELECT 
       bl.id, bl.line_no, bl.material_id, bl.material_code, bl.material_name, bl.material_spec,
       bl.unit, bl.consumption_qty, bl.loss_rate, bl.actual_qty, bl.unit_cost, bl.total_cost,
       bl.material_type, bl.is_key_material, bl.position_no, bl.process_seq, bl.process_name, bl.remark
     FROM bom_line bl
     WHERE bl.bom_id = ?
     ORDER BY bl.line_no`,
    [bomId]
  );

  // 查询版本历史
  const versionHistory = await query(
    `SELECT 
       version, change_type, change_content, change_reason, operator_name, operate_time
     FROM bom_version_history
     WHERE bom_id = ?
     ORDER BY operate_time DESC`,
    [bomId]
  );

  // 查询替代料
  const alternatives = await query(
    `SELECT 
       ba.bom_line_id, ba.priority, ba.material_code as alt_material_code, 
       ba.material_name as alt_material_name, ba.conversion_rate
     FROM bom_alternative ba
     WHERE ba.bom_id = ? AND ba.is_enabled = 1`,
    [bomId]
  );

  return successResponse({
    header: (bomHeader as any[])[0],
    lines: bomLines,
    version_history: versionHistory,
    alternatives,
  });
}, '获取BOM详情失败');
