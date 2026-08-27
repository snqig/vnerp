import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { AQLService } from '@/lib/aql-service';

export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const { materialId, materialName, batchNo, lotSize, inspectionType, inspectionId } =
    await request.json();

  if (!materialId || !batchNo || !lotSize) {
    return errorResponse('缺少必填参数: materialId, batchNo, lotSize', 400, 400);
  }

  // 1. Query AQL sampling plan
  const aql = new AQLService();
  const plan = await aql.getSamplingPlan(Number(lotSize));

  if (!plan) {
    return errorResponse(`未找到批量 ${lotSize} 对应的 AQL 抽样方案`, 400, 400);
  }

  // 2. Generate lab test number
  const seqResult = await query<{ seq: number }>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(lab_test_no, 10) AS UNSIGNED)), 0) + 1 as seq
     FROM qms_lab_test WHERE lab_test_no LIKE CONCAT('LAB-', DATE_FORMAT(NOW(), '%Y%m%d'), '%')`
  );
  const seq = seqResult[0]?.seq || 1;
  const labTestNo = `LAB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;

  // 3. Insert lab test record
  const result = await execute(
    `INSERT INTO qms_lab_test (lab_test_no, material_id, material_name, batch_no, inspection_type,
       sample_size, accept_qty, reject_qty, aql_level, inspection_standard, status,
       inspection_id, create_by, create_time, update_time, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW(), 0)`,
    [
      labTestNo,
      Number(materialId),
      materialName || null,
      batchNo,
      inspectionType || 'incoming',
      plan.sampleSize,
      plan.acceptQty,
      plan.rejectQty,
      plan.aqlLevel,
      'GB/T 2828.1',
      inspectionId || null,
      userInfo.userId,
    ]
  );

  return successResponse({
    labTestNo,
    sampleSize: plan.sampleSize,
    acceptQty: plan.acceptQty,
    rejectQty: plan.rejectQty,
    aqlLevel: plan.aqlLevel,
    insertId: result.insertId,
  });
});
