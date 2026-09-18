import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 分切单明细（warehouse/split-order 详情弹窗）
 * GET /api/warehouse/split-order/detail?splitId=1
 */
export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const splitId = searchParams.get('splitId');
    if (!splitId) return errorResponse('缺少参数 splitId', 400, 400);

    const rows = await query(
      `SELECT id, pieces, qty_per_piece, total_qty, width, is_waste, child_batch_no, remark
       FROM split_order_detail
       WHERE split_id = ?
       ORDER BY id`,
      [Number(splitId)] as SqlValue[]
    );
    return successResponse(
      (rows as Record<string, unknown>[]).map((r) => ({
        id: r.id,
        pieces: Number(r.pieces) || 1,
        qtyPerPiece: Number(r.qty_per_piece) || 0,
        totalQty: Number(r.total_qty) || 0,
        width: Number(r.width) || 0,
        isWaste: r.is_waste === 1,
        childBatchNo: r.child_batch_no || undefined,
        remark: r.remark || undefined,
      }))
    );
  },
  { errorMessage: '获取分切单明细失败' }
);
