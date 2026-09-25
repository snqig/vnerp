import { getTranslations } from 'next-intl/server';
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse, errorResponse, logOperation } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  confirmOutboundTx,
  cancelOutboundTx,
  type OutboundConfirmResult,
  type OutboundCancelResult,
  type TranslateFn,
} from '@/lib/warehouse/outbound-confirm.service';

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const tc = await getTranslations('Common');
    const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, remark } = body;
    // 操作人优先用前端传值，缺失时从 JWT 兜底
    const operatorId = body.operatorId ?? userInfo.userId;
    const operatorName = body.operatorName || userInfo.realName || userInfo.username;

    if (!id) {
      return errorResponse(ts('k_1ddnsve'), 400);
    }

    // 事务内错误经 txCtl 载体显式带出：在 .catch 回调里直接 return 会被丢弃，导致 NOT_FOUND 变 200 假成功
    const txCtl: { error: ReturnType<typeof errorResponse> | null } = { error: null };

    const result = await transaction(async (connection) => {
      return await confirmOutboundTx(connection, {
        id,
        remark,
        operatorId,
        operatorName: operatorName || null,
        t: ts as TranslateFn,
      });
    }).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      // i18n 翻译值可能自带前缀，防御性剥离重复前缀；经 txCtl 显式带出
      if (msg.startsWith('NOT_FOUND:')) {
        txCtl.error = errorResponse(msg.replace(/^(NOT_FOUND:)+/, ''), 404);
        return null;
      }
      if (msg.startsWith('BAD_REQUEST:')) {
        txCtl.error = errorResponse(msg.replace(/^(BAD_REQUEST:)+/, ''), 400);
        return null;
      }
      throw error;
    });

    if (txCtl.error) return txCtl.error;
    if (!result) return errorResponse(ts('k_1ddnsve'), 500);

    await logOperation({
      title: tc('confirmIssue'),
      oper_name: operatorName,
      oper_type: 'warehouse',
      oper_method: 'POST',
      oper_url: '/api/warehouse/outbound/confirm',
      oper_param: JSON.stringify({ id, operatorId }),
      oper_result: `出库单确认成功，扣减${result?.deductionDetails.length ?? 0}个批次`,
      status: 1,
    });

    return successResponse(
      {
        orderId: id,
        deductionDetails: result?.deductionDetails ?? [],
        totalDeductedBatches: result?.deductionDetails.length ?? 0,
      },
      ts('k_1k441j5')
    );
  },
  { errorMessage: '确认出库失败' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, remark } = body;
    // 操作人优先用前端传值，缺失时从 JWT 兜底
    const operatorId = body.operatorId ?? userInfo.userId;
    const operatorName = body.operatorName || userInfo.realName || userInfo.username;

    if (!id) {
      return errorResponse(ts('k_1ddnsve'), 400);
    }

    // 同 POST：错误 Response 经 txCtl 载体显式带出，避免 404 变 200 假成功
    const txCtl: { error: ReturnType<typeof errorResponse> | null } = { error: null };

    const result = await transaction(async (connection) => {
      return await cancelOutboundTx(connection, {
        id,
        remark,
        operatorId,
        operatorName: operatorName || null,
        t: ts as TranslateFn,
      });
    }).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      // i18n 翻译值可能自带前缀，防御性剥离重复前缀；经 txCtl 显式带出
      if (msg.startsWith('NOT_FOUND:')) {
        txCtl.error = errorResponse(msg.replace(/^(NOT_FOUND:)+/, ''), 404);
        return null;
      }
      if (msg.startsWith('BAD_REQUEST:')) {
        txCtl.error = errorResponse(msg.replace(/^(BAD_REQUEST:)+/, ''), 400);
        return null;
      }
      throw error;
    });

    if (txCtl.error) return txCtl.error;
    if (!result) return errorResponse(ts('k_1ddnsve'), 500);

    await logOperation({
      title: ts('k_1pv4eum'),
      oper_name: operatorName,
      oper_type: 'warehouse',
      oper_method: 'PUT',
      oper_url: '/api/warehouse/outbound/confirm',
      oper_param: JSON.stringify({ id, operatorId }),
      oper_result: `出库单 ${result?.orderNo ?? ''} 撤销成功，库存已恢复`,
      status: 1,
    });

    return successResponse(
      { orderId: id, orderNo: result?.orderNo ?? '', status: 'pending' },
      ts('k_10s3gya')
    );
  },
  { errorMessage: '撤销出库失败' }
);
