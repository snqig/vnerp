import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getShPrefix, generateDocNo } from '@/lib/global-config';
import type mysql from 'mysql2/promise';
import type { DbRow } from '@/types/db';

// 业务错误：在事务内抛错触发回滚，携带 HTTP 状态码供外层转换为对应响应
class PartialShipError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'PartialShipError';
  }
}

// POST /api/sales/delivery/partial - 提交部分发货申请（符合设计文档 5.3 节）
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { sales_order_id, quantity, remark } = body;

    if (!sales_order_id) {
      return errorResponse('缺少销售订单ID', 400, 400);
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      return errorResponse('发货数量必须大于0', 400, 400);
    }

    try {
      const result = await transaction(async (conn: mysql.PoolConnection) => {
        // 锁定销售订单行，防止并发提交部分发货申请导致超发（TOCTOU）
        const [orderRows] = await conn.query<mysql.RowDataPacket[]>(
          `SELECT * FROM sal_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
          [sales_order_id]
        );
        const order = orderRows[0] as DbRow | undefined;

        if (!order) {
          throw new PartialShipError(404, '销售订单不存在');
        }

        // 验证部分发货数量不超过订单剩余数量（行已锁定，此处计算安全）
        const shippedQty = parseFloat(order.shipped_qty) || 0;
        const remainingQty = (parseFloat(order.total_qty) || 0) - shippedQty;
        if (parseFloat(quantity) > remainingQty) {
          throw new PartialShipError(400, `部分发货数量${quantity}超过订单剩余数量${remainingQty}`);
        }

        // 创建部分发货单（status=2 待审批，申请提交成功后再走审批/发货流程）
        const shipmentNo = generateDocNo(getShPrefix());

        const [insertResult] = await conn.execute<mysql.ResultSetHeader>(
          `INSERT INTO shipments (
          shipment_no, sales_order_id, type, status,
          customer_id, customer_name, warehouse_id,
          total_quantity, shipped_quantity, remark
        ) VALUES (?, ?, 'partial', 2, ?, ?, ?, ?, 0, ?)`,
          [
            shipmentNo,
            sales_order_id,
            order.customer_id,
            order.customer_name,
            order.warehouse_id || 1,
            quantity,
            remark || `先发货${quantity}件，剩余${remainingQty - parseFloat(quantity)}件明天发货`,
          ]
        );

        return {
          id: insertResult.insertId,
          shipment_no: shipmentNo,
        };
      });

      return successResponse(
        {
          id: result.id,
          shipment_no: result.shipment_no,
          type: 'partial',
          status: 2, // 待审批
        },
        '部分发货申请提交成功'
      );
    } catch (error) {
      if (error instanceof PartialShipError) {
        if (error.status === 404) {
          return commonErrors.notFound(error.message);
        }
        return errorResponse(error.message, error.status, error.status);
      }
      throw error;
    }
  },
  { logTitle: '提交部分发货申请', logType: 'business' }
);
