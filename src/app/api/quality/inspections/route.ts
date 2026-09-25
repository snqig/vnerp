import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/** 质检类型 → 来源类型兜底映射（qc_inspection.source_type 可能为空） */
const TYPE_TO_SOURCE: Record<number, string> = {
  1: 'incoming',
  2: 'process',
  3: 'final',
  4: 'shipment',
};

/**
 * 质检单下拉数据源：仅返回已关联有效物料且未删除的质检记录，
 * 供「新增不合格品处理单」选择检验单号并自动带出物料/来源信息。
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get('keyword') || '').trim();
  const pageSize = Math.min(Number(searchParams.get('pageSize') || 200), 500);

  let where = 'WHERE qi.deleted = 0';
  const params: SqlValue[] = [];
  if (keyword) {
    where += ' AND (qi.inspection_no LIKE ? OR m.material_code LIKE ? OR m.material_name LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }

  const rows = await query(
    `SELECT qi.id, qi.inspection_no, qi.inspection_type, qi.source_type, qi.source_no,
            qi.material_id, qi.batch_no, qi.unqualified_qty, qi.inspection_result,
            m.material_code, m.material_name
       FROM qc_inspection qi
       JOIN inv_material m ON m.id = qi.material_id AND m.deleted = 0
       ${where}
      ORDER BY qi.inspection_date DESC, qi.id DESC
      LIMIT ?`,
    [...params, pageSize]
  );

  const list = rows.map((r: Record<string, unknown>) => {
    const inspectionType = Number(r.inspection_type);
    return {
      id: Number(r.id),
      inspection_no: r.inspection_no as string,
      inspection_type: Number.isFinite(inspectionType) ? inspectionType : null,
      source_type:
        (r.source_type as string) || TYPE_TO_SOURCE[inspectionType] || 'other',
      source_no: (r.source_no as string) || (r.inspection_no as string),
      material_id: Number(r.material_id),
      batch_no: (r.batch_no as string) || null,
      unqualified_qty: Number(r.unqualified_qty || 0),
      material_code: r.material_code as string,
      material_name: r.material_name as string,
    };
  });

  return successResponse({ list, total: list.length });
}, { logTitle: '查询质检单下拉数据' });
