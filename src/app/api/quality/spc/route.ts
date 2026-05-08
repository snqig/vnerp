import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';
import { query, transaction } from '@/lib/db';
import { calculateXbarRChart, calculatePareto, calculatePChart, getSPCDataFromDB } from '@/lib/spc-analysis';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'xbar-r') {
    const materialId = parseInt(searchParams.get('material_id') || '0');
    const inspectionType = searchParams.get('inspection_type') || 'PQC';
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30*86400000).toISOString().slice(0, 10);
    const endDate = searchParams.get('end_date') || new Date().toISOString().slice(0, 10);
    const subgroupSize = parseInt(searchParams.get('subgroup_size') || '5');

    if (!materialId) return errorResponse('请提供物料ID', 400, 400);

    const spcData = await transaction(async (conn) => {
      return await getSPCDataFromDB(conn, materialId, inspectionType, startDate, endDate, subgroupSize);
    });

    if (spcData.length === 0) return successResponse({ message: '无足够数据生成控制图' });

    const chart = calculateXbarRChart(spcData);
    return successResponse(chart);
  }

  if (action === 'pareto') {
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30*86400000).toISOString().slice(0, 10);
    const endDate = searchParams.get('end_date') || new Date().toISOString().slice(0, 10);
    const materialId = searchParams.get('material_id');

    let whereClause = "WHERE DATE(create_time) BETWEEN ? AND ?";
    const params: any[] = [startDate, endDate];
    if (materialId) {
      whereClause += " AND material_id = ?";
      params.push(parseInt(materialId));
    }

    const defects: any = await query(
      `SELECT defect_type, COUNT(*) as count FROM qc_unqualified ${whereClause} GROUP BY defect_type ORDER BY count DESC`,
      params
    );

    const pareto = calculatePareto(defects.map((d: any) => ({
      defect_type: d.defect_type || '未分类',
      count: Number(d.count)
    })));

    return successResponse(pareto);
  }

  if (action === 'p-chart') {
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30*86400000).toISOString().slice(0, 10);
    const endDate = searchParams.get('end_date') || new Date().toISOString().slice(0, 10);
    const materialId = searchParams.get('material_id');

    let whereClause = "WHERE inspection_date BETWEEN ? AND ?";
    const params: any[] = [startDate, endDate];
    if (materialId) {
      whereClause += " AND material_id = ?";
      params.push(parseInt(materialId));
    }

    const data: any = await query(
      `SELECT DATE(inspection_date) as period, COUNT(*) as inspected, SUM(CASE WHEN inspection_result = 2 THEN 1 ELSE 0 END) as defective FROM qc_inspection ${whereClause} GROUP BY DATE(inspection_date) ORDER BY period`,
      params
    );

    const pChart = calculatePChart(data.map((d: any) => ({
      period: d.period,
      inspected: Number(d.inspected),
      defective: Number(d.defective)
    })));

    return successResponse(pChart);
  }

  return errorResponse('未知操作，支持: xbar-r, pareto, p-chart', 400, 400);
});
