import { NextRequest } from 'next/server';
import { successResponse, commonErrors } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { query } from '@/lib/db';

// 与 MysqlInboundOrderRepository 保持一致：DB 状态码 → 领域状态字符串
const DB_TO_DOMAIN_STATUS: Record<string, string> = {
  draft: 'draft',
  pending: 'pending',
  approved: 'completed',
  completed: 'completed',
  cancelled: 'cancelled',
};

interface InboundRecordRow {
  id: number;
  order_no: string;
  inbound_date: string | null;
  status: string;
  supplier_name: string;
  total_quantity: number;
  total_amount: number;
}

// GET /api/purchase/orders/:id/inbound-records — 查询采购单关联的入库记录
export const GET = withPermission(
  async (
    _request: NextRequest,
    _userInfo: UserInfo,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    // 校验 poId 为数字，非法返回 400；查不到记录返回空数组（200），不返回 404
    if (!/^\d+$/.test(id)) {
      return commonErrors.badRequest('采购单ID不合法');
    }

    const records = await query<InboundRecordRow>(
      `SELECT id, order_no, inbound_date, status, supplier_name, total_quantity, total_amount
       FROM inv_inbound_order
       WHERE po_id = ? AND deleted = 0
       ORDER BY create_time DESC`,
      [Number(id)]
    );

    const serializedData = (records || []).map((record) => ({
      id: record.id,
      order_no: record.order_no,
      inbound_date: record.inbound_date,
      status: DB_TO_DOMAIN_STATUS[record.status] || record.status,
      supplier_name: record.supplier_name,
      total_quantity: record.total_quantity,
      total_amount: record.total_amount,
    }));

    return successResponse(serializedData, '查询成功');
  }
);
