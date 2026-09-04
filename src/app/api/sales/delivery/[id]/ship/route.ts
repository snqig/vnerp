import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { generateDocumentNo } from '@/lib/document-numbering';
import type mysql from 'mysql2/promise';
import type { DbRow } from '@/types/db';

// 业务错误：在事务内抛错触发回滚，携带 HTTP 状态码供外层转换为对应响应
class ShipError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ShipError';
  }
}

// POST /api/sales/delivery/[id]/ship - 扫码发货（符合设计文档 5.2 节）
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    // withPermission不转发context.params，从URL路径提取动态路由参数
    const shipmentId = parseInt(new URL(request.url).pathname.split('/')[4]);
    const body = await request.json();
    const { items, logistics_company, tracking_no } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(ts('k_ydqtum'), 400, 400);
    }

    try {
      // 发货流程整体包在一个事务中：全部写操作（明细/库存/二维码/发货单/销售订单/应收单）
      // 要么全部成功要么全部回滚，杜绝中途失败导致的数据不一致。
      const result = await transaction(async (conn: mysql.PoolConnection) => {
        // 锁定发货单行，防止并发点击重复发货/超发（TOCTOU）
        const [shipmentRows] = await conn.query<mysql.RowDataPacket[]>(
          `SELECT * FROM shipments WHERE id = ? AND deleted = 0 FOR UPDATE`,
          [shipmentId]
        );
        const shipment = shipmentRows[0] as DbRow | undefined;

        if (!shipment) {
          throw new ShipError(404, ts('k_12d7h0r'));
        }

        // 验证发货单状态（只有待发货状态才能执行发货操作）
        if (shipment.status !== 3) {
          const statusMap: Record<number, string> = {
            1: ts('k_oc54qp'),
            2: ts('k_rkj3lq'),
            3: ts('k_18crht8'),
            4: ts('k_1yb9kf7'),
            5: ts('k_ypt6sx'),
            6: ts('k_1d8x36r'),
          };
          throw new ShipError(
            400,
            `当前状态为"${statusMap[shipment.status as number]}"，不能执行发货操作`
          );
        }

        // 验证并锁定每个二维码（防止同一二维码被两个请求同时发货）
        const qrMeta = new Map<string, { materialId: number; warehouseId: number }>();
        for (const item of items) {
          const { qr_code } = item;
          const [qrRows] = await conn.query<mysql.RowDataPacket[]>(
            `SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0 FOR UPDATE`,
            [qr_code]
          );
          const qrRecord = qrRows[0] as DbRow | undefined;

          if (!qrRecord) {
            throw new ShipError(404, `二维码 ${qr_code} 不存在`);
          }
          if (qrRecord.status === 'shipped') {
            throw new ShipError(400, `二维码 ${qr_code} 对应的成品已发货`);
          }
          // 记录 qr_code → (material_id, warehouse_id)，供下方扣减 inv_inventory 使用
          qrMeta.set(qr_code, {
            materialId: Number(qrRecord.material_id),
            warehouseId: Number(qrRecord.warehouse_id),
          });
        }

        let totalShippedQty = 0;

        for (const item of items) {
          const { material_id, qr_code, quantity } = item;
          const qty = parseFloat(quantity);
          if (Number.isNaN(qty) || qty <= 0) {
            throw new ShipError(400, `二维码 ${qr_code} 的发货数量无效`);
          }

          // 更新明细表已发货数量
          await conn.execute(
            `UPDATE shipment_items
           SET shipped_quantity = shipped_quantity + ?, qr_code = ?
           WHERE shipment_id = ? AND material_id = ?`,
            [qty, qr_code, shipmentId, material_id]
          );

          // 扣减库存：统一到 inv_inventory（按 material_id + warehouse_id 聚合粒度）
          // wh_inventory 为遗留幽灵表（权威 schema 中已无建表定义），qr_code 维度的库存由
          // qrcode_record（携带 material_id/warehouse_id）+ inv_inventory 共同表达。
          const [invResult] = await conn.execute<mysql.ResultSetHeader>(
            `UPDATE inv_inventory
           SET quantity = quantity - ?, available_qty = available_qty - ?, update_time = NOW()
           WHERE material_id = ? AND warehouse_id = ? AND quantity >= ? AND available_qty >= ?`,
            [qty, qty, qrMeta.get(qr_code)!.materialId, qrMeta.get(qr_code)!.warehouseId, qty, qty]
          );
          if (invResult.affectedRows === 0) {
            throw new ShipError(400, `二维码 ${qr_code} 对应库存不足，无法发货`);
          }

          // 更新二维码状态为已发货
          await conn.execute(
            `UPDATE qrcode_record
           SET status = 'shipped', shipped_at = NOW(), shipment_id = ?
           WHERE qr_code = ?`,
            [shipmentId, qr_code]
          );

          totalShippedQty += qty;
        }

        // 更新发货单主表（行已被 FOR UPDATE 锁定，此处读-改-写安全）
        const newShippedQty = (parseFloat(shipment.shipped_quantity) || 0) + totalShippedQty;
        const newStatus = newShippedQty >= parseFloat(shipment.total_quantity) ? 5 : 4; // 已发货 or 部分发货

        await conn.execute(
          `UPDATE shipments
         SET shipped_quantity = ?, status = ?, ship_time = NOW(),
         logistics_company = COALESCE(?, logistics_company),
         tracking_no = COALESCE(?, tracking_no)
         WHERE id = ?`,
          [newShippedQty, newStatus, logistics_company || null, tracking_no || null, shipmentId]
        );

        // 更新销售订单已发货数量（符合设计文档"实时同步"原则）
        await conn.execute(
          `UPDATE sal_order
         SET shipped_qty = IFNULL(shipped_qty, 0) + ?, status =
           CASE WHEN IFNULL(shipped_qty, 0) + ? >= total_qty THEN 4 ELSE status END
         WHERE id = ?`,
          [totalShippedQty, totalShippedQty, shipment.sales_order_id]
        );

        // 如果全部发货完成，自动生成应收单（并发安全：命名锁保证单号唯一，与业务同事务）
        if (newStatus === 5) {
          const receivableNo = await generateDocumentNo('receivable', conn);
          await conn.execute(
            `INSERT INTO fin_receivable (
            receivable_no, order_id, order_type, customer_id,
            amount, status, create_time
          ) VALUES (?, ?, 'sales', ?, 0, 1, NOW())`,
            [receivableNo, shipment.sales_order_id, shipment.customer_id]
          );
        }

        return {
          shipment_no: shipment.shipment_no,
          status: newStatus,
          ship_time: new Date().toISOString(),
          shipped_quantity: newShippedQty,
        };
      });

      return successResponse(result, ts('k_1o0yt80'));
    } catch (error) {
      // 将业务错误转换为对应 HTTP 响应（其他错误交由 withPermission 全局处理）
      if (error instanceof ShipError) {
        if (error.status === 404) {
          return commonErrors.notFound(error.message);
        }
        return errorResponse(error.message, error.status, error.status);
      }
      throw error;
    }
  },
  { logTitle: '扫码发货', logType: 'business' }
);
