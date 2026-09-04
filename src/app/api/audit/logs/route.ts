import { getTranslations } from 'next-intl/server';

;
/**
 * 审计日志API路由
 * 功能：提供操作日志、登录日志、库存流水、财务流水的查询接口
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  queryOperateLogs,
  queryLoginLogs,
  queryStockFlows,
  queryFinanceFlows,
  generateAuditReport as _generateAuditReport,
} from '@/lib/audit-logger';

// ============================================================
// 操作日志查询
// ============================================================

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);

  const moduleName = searchParams.get('module') || undefined;
  const type = searchParams.get('type') || undefined;
  const username = searchParams.get('username') || undefined;
  const status = searchParams.get('status');
  const startTime = searchParams.get('startTime') || undefined;
  const endTime = searchParams.get('endTime') || undefined;
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const logType = searchParams.get('logType') || 'operate'; // operate/login/stock/finance

  switch (logType) {
    case 'operate': {
      const result = await queryOperateLogs({
        module: moduleName,
        type,
        username,
        status: status ? Number(status) : undefined,
        startTime,
        endTime,
        page,
        pageSize,
      });
      return successResponse(result, ts('k_16t9utu'));
    }

    case 'login': {
      const result = await queryLoginLogs({
        username,
        status: status ? Number(status) : undefined,
        startTime,
        endTime,
        page,
        pageSize,
      });
      return successResponse(result, ts('k_urgu67'));
    }

    case 'stock': {
      const result = await queryStockFlows({
        businessType: searchParams.get('businessType') || undefined,
        warehouseId: searchParams.get('warehouseId')
          ? Number(searchParams.get('warehouseId'))
          : undefined,
        materialId: searchParams.get('materialId')
          ? Number(searchParams.get('materialId'))
          : undefined,
        productId: searchParams.get('productId')
          ? Number(searchParams.get('productId'))
          : undefined,
        sourceNo: searchParams.get('sourceNo') || undefined,
        startTime,
        endTime,
        page,
        pageSize,
      });
      return successResponse(result, ts('k_vvh005'));
    }

    case 'finance': {
      const result = await queryFinanceFlows({
        type: searchParams.get('financeType') || undefined,
        customerId: searchParams.get('customerId')
          ? Number(searchParams.get('customerId'))
          : undefined,
        supplierId: searchParams.get('supplierId')
          ? Number(searchParams.get('supplierId'))
          : undefined,
        voucherNo: searchParams.get('voucherNo') || undefined,
        period: searchParams.get('period') || undefined,
        startTime,
        endTime,
        page,
        pageSize,
      });
      return successResponse(result, ts('k_1uo49ij'));
    }

    default:
      return errorResponse(ts('k_vip79a'), 400, 400);
  }
});
