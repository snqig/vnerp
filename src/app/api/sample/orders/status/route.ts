import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleOrderApplicationService } from '@/application/services/SampleOrderApplicationService';
import { MysqlSampleOrderRepository } from '@/infrastructure/repositories/MysqlSampleOrderRepository';
import { logger, generateTraceId } from '@/lib/logger';
import { UserInfo } from '@/lib/auth';
import type { DbRow } from '@/types/db';

const service = new SampleOrderApplicationService(new MysqlSampleOrderRepository());

export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'PUT_status', traceId, userId: userInfo.userId };
    const body = await request.json();
    const { id, action, reason, salesOrderId } = body;

    if (!id || !action) {
      return errorResponse(ts('k_a46a63'), 400, 400);
    }

    const userId = userInfo.userId;
    logger.info(ctx, ts('k_eblrpl'), { id, action, reason, salesOrderId });

    try {
      switch (action) {
        case 'submit':
          await service.submitOrder(Number(id ?? 0), userId);
          break;
        case 'startProduction':
          await service.startProduction(Number(id ?? 0), userId);
          break;
        case 'complete':
          await service.completeOrder(Number(id ?? 0), userId);
          break;
        case 'confirm':
          await service.confirmOrder(Number(id ?? 0), userId);
          break;
        case 'convert': {
          let targetSalesOrderId = salesOrderId;
          if (!targetSalesOrderId) {
            // T305: Auto-generate sales order from sample
            targetSalesOrderId = await service.createSalesOrderFromSample(Number(id ?? 0), userId);
          }
          await service.convertOrder(Number(id ?? 0), Number(targetSalesOrderId ?? 0), userId);
          break;
        }
        case 'cancel':
          await service.cancelOrder(Number(id ?? 0), reason || ts('k_fponfn'), userId);
          break;
        default:
          return errorResponse(`不支持的操作: ${action}`, 400, 400);
      }

      logger.info(ctx, ts('k_2xqych'), { id, action });
      return successResponse({ id, action }, ts('k_d209xt'));
    } catch (err) {
      logger.error(ctx, ts('k_q5fh6e'), { id, action, error: err instanceof Error ? err.message : String(err) });
      return errorResponse((err instanceof Error ? err.message : String(err)) || ts('k_ydow7a'), 400, 400);
    }
  },
  { logTitle: '打样单状态变更' }
);
