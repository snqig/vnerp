import { NextRequest } from 'next/server';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import { runAllFixes, fixRequestItemMaterialId, fixAttendanceEmpId, fixInventoryBatchConsistency } from '@/lib/services/data-fix-tool';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { fixType } = body;

  if (fixType === 'all') {
    const results = await runAllFixes();
    return successResponse(results, '脏数据修复完成');
  }

  switch (fixType) {
    case 'request_material_id':
      return successResponse(await fixRequestItemMaterialId(), '请购单物料ID修复完成');
    case 'attendance_emp_id':
      return successResponse(await fixAttendanceEmpId(), '考勤员工ID修复完成');
    case 'inventory_batch':
      return successResponse(await fixInventoryBatchConsistency(), '库存批次一致性修复完成');
    default:
      return errorResponse('未知的修复类型', 400);
  }
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const results = await runAllFixes();
  return successResponse(results, '脏数据巡检修复完成');
});
