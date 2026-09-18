import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { queryOne, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 入库标签二维码（warehouse/inbound 页「查看二维码」）
 * GET /api/warehouse/inbound/labels/{id}/qrcode
 * 返回以标签编号 label_id 为内容的二维码 DataURL（与扫码查询主键一致）
 */
export const GET = withPermission(
  async (
    _request: NextRequest,
    _userInfo,
    context?: { params: Promise<{ id: string }> }
  ) => {
    const { id } = (await context?.params) ?? { id: '' };
    const labelIdNum = Number(id);
    if (!labelIdNum) return errorResponse('参数 id 无效', 400, 400);

    const label = await queryOne<{ label_id: string; material_name: string; batch_no: string | null }>(
      'SELECT label_id, material_name, batch_no FROM inv_inbound_label WHERE id = ? AND deleted = 0',
      [labelIdNum] as SqlValue[]
    );
    if (!label) return errorResponse('标签不存在', 404, 404);

    const qrCode = await QRCode.toDataURL(label.label_id, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    });
    return successResponse({ qrCode, labelId: label.label_id });
  },
  { errorMessage: '生成标签二维码失败' }
);
