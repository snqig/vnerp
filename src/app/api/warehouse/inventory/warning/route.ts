import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-response';
import { getNegativeStockWarnings } from '@/lib/inventory-sync';

// 获取库存预警列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const warnings = await getNegativeStockWarnings();

  const critical = warnings.filter((w) => w.warningLevel === 'critical');
  const lowStock = warnings.filter((w) => w.warningLevel === 'warning');

  return successResponse(
    {
      warnings,
      summary: {
        total: warnings.length,
        critical: critical.length,
        warning: lowStock.length,
      },
      criticalList: critical,
      warningList: lowStock,
    },
    '获取库存预警成功'
  );
});
