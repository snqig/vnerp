import { getTranslations } from 'next-intl/server';

;
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
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { fixType } = body;

    if (fixType === 'all') {
      const results = await runAllFixes();
      return successResponse(results, ts('k_4rpqgl'));
    }

    switch (fixType) {
      case 'request_material_id':
        return successResponse(await fixRequestItemMaterialId(), ts('k_1a3772u'));
      case 'attendance_emp_id':
        return successResponse(await fixAttendanceEmpId(), ts('k_ctl9vh'));
      case 'inventory_batch':
        return successResponse(await fixInventoryBatchConsistency(), ts('k_1smhd4'));
      case 'expired_batches':
        return successResponse(await fixExpiredBatches(), ts('k_1637gb2'));
      default:
        return errorResponse(ts('k_rypwjr'), 400);
    }
  },
  { logTitle: '修复脏数据', logType: 'system' }
);

export const GET = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'scan';

    // GET 仅允许只读巡检，禁止触发任何数据修复（写操作），避免爬虫/预取误执行变更
    if (mode !== 'scan') {
      return errorResponse(ts('k_15ttl6s'), 405);
    }

    const ghostResults = await scanGhostData();
    return successResponse(ghostResults, ts('k_ftsarg'));
  },
  { logTitle: '巡检脏数据', logType: 'system' }
);
