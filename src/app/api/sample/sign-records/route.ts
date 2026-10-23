import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { logger, generateTraceId } from '@/lib/logger';
import { SampleSignRecordService } from '@/application/services/SampleSignRecordService';

const signService = new SampleSignRecordService();

/**
 * POST /api/sample/sign-records — 签样登记（事务：登记 + 色样档案 + delivery_status→signed）
 * body: { sample_order_id, sign_date?, customer_rep?, retained_qty?, retained_location?, remark?,
 *         colors?: [{ color_name, l_value, a_value, b_value, measure_device?, measure_date?, color_sample_url?, de_threshold? }] }
 */
export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'POST_sign_records', traceId, userId: userInfo.userId };
    const body = await request.json();
    const { sample_order_id } = body;

    if (!sample_order_id) {
      return errorResponse(ts('k_qcdlp'), 400, 400);
    }

    const colors = Array.isArray(body.colors) ? body.colors : [];
    for (const color of colors) {
      if (!color?.color_name || typeof color?.l_value !== 'number' || typeof color?.a_value !== 'number' || typeof color?.b_value !== 'number') {
        return errorResponse(ts('k_8fy2qm'), 400, 400);
      }
    }

    logger.info(ctx, 'create sample sign record', { sample_order_id, colorCount: colors.length });

    try {
      const result = await signService.createSignRecord(
        {
          sample_order_id: Number(sample_order_id),
          sign_date: body.sign_date || null,
          customer_rep: body.customer_rep || null,
          retained_qty: body.retained_qty ?? null,
          retained_location: body.retained_location || null,
          remark: body.remark || null,
          colors,
        },
        userInfo.userId
      );
      return successResponse(result, `签样登记成功：${result.signNo}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : ts('k_ydow7a');
      logger.error(ctx, 'create sample sign record failed', { error: message });
      return errorResponse(message, 400, 400);
    }
  },
  { logTitle: '打样签样登记' }
);

/** GET /api/sample/sign-records?sample_order_id= — 查询签样登记（含色样档案） */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const traceId = generateTraceId();
  const ctx = { module: 'sample', action: 'GET_sign_records', traceId };
  const { searchParams } = new URL(request.url);
  const sampleOrderId = searchParams.get('sample_order_id');

  if (!sampleOrderId) {
    return errorResponse(ts('k_qcdlp'), 400, 400);
  }

  logger.info(ctx, 'get sample sign record', { sampleOrderId });

  const result = await signService.getSignRecordByOrderId(Number(sampleOrderId));
  return successResponse(result);
});
