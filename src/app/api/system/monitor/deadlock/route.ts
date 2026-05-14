import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndErrorHandler } from '@/lib/api-auth';
import { DeadlockMonitor } from '@/infrastructure/monitoring/DeadlockMonitor';

export const GET = withAuthAndErrorHandler(
  async (request: NextRequest) => {
    const result = await DeadlockMonitor.checkDeadlocks();
    return successResponse(result);
  },
  { permission: 'system:monitor:view' }
);

export const POST = withAuthAndErrorHandler(
  async (request: NextRequest) => {
    const body = await request.json();

    if (body.action === 'kill-transaction') {
      if (!body.trxId) {
        return errorResponse('缺少事务ID (trxId)', 400, 400);
      }
      const killed = await DeadlockMonitor.killLongTransaction(body.trxId);
      if (killed) {
        return successResponse(null, `事务 ${body.trxId} 已终止`);
      }
      return errorResponse(`事务 ${body.trxId} 不存在或已结束`, 404, 404);
    }

    return errorResponse('Unknown action. Use kill-transaction', 400, 400);
  },
  { permission: 'system:monitor:manage' }
);
