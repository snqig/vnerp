import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  runAllFixes,
  fixRequestItemMaterialId,
  fixAttendanceEmpId,
  fixInventoryBatchConsistency,
  fixExpiredBatches,
  scanGhostData,
} from '@/lib/services/data-fix-tool';

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
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
      case 'expired_batches':
        return successResponse(await fixExpiredBatches(), '过期批次标记完成');
      default:
        return errorResponse('未知的修复类型', 400);
    }
  },
  { logTitle: '修复脏数据', logType: 'system' }
);

export const GET = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'scan';

    // GET 仅允许只读巡检，禁止触发任何数据修复（写操作），避免爬虫/预取误执行变更
    if (mode !== 'scan') {
      return errorResponse('巡检接口仅支持只读模式 (?mode=scan)，数据修复请改用 POST', 405);
    }

    const ghostResults = await scanGhostData();
    return successResponse(ghostResults, '幽灵数据巡检完成');
  },
  { logTitle: '巡检脏数据', logType: 'system' }
);
