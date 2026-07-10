import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleOrderApplicationService } from '@/application/services/SampleOrderApplicationService';
import { MysqlSampleOrderRepository } from '@/infrastructure/repositories/MysqlSampleOrderRepository';

const service = new SampleOrderApplicationService(new MysqlSampleOrderRepository());

export const PUT = withPermission(
  async (request: NextRequest, userInfo: Loose) => {
    const body = await request.json();
    const { id, action, reason, salesOrderId } = body;

    if (!id || !action) {
      return errorResponse('缺少必填参数: id, action', 400, 400);
    }

    const userId = userInfo.id;

    try {
      switch (action) {
        case 'submit':
          await service.submitOrder(id, userId);
          break;
        case 'startProduction':
          await service.startProduction(id, userId);
          break;
        case 'complete':
          await service.completeOrder(id, userId);
          break;
        case 'confirm':
          await service.confirmOrder(id, userId);
          break;
        case 'convert':
          if (!salesOrderId) {
            return errorResponse('转大货需要提供 salesOrderId', 400, 400);
          }
          await service.convertOrder(id, salesOrderId, userId);
          break;
        case 'cancel':
          await service.cancelOrder(id, reason || '手动作废', userId);
          break;
        default:
          return errorResponse(`不支持的操作: ${action}`, 400, 400);
      }

      return successResponse({ id, action }, `操作成功`);
    } catch (err: Loose) {
      return errorResponse(err.message || '操作失败', 400, 400);
    }
  },
  { logTitle: '打样单状态变更' }
);
