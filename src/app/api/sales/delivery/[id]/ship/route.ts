import { getTranslations } from 'next-intl/server';
import type { DbConnection } from '@/types/db';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { generateDocumentNo } from '@/lib/document-numbering';
import { DeliveryStatusEnum } from '@/domain/sales/value-objects/DeliveryStatus';
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
//
// 原实现写的是 `shipments` / `shipment_items` 两张库里不存在的表，且沿用了另一套状态机
// （4=部分发货 / 5=已发货）。真实表是 sal_delivery / sal_delivery_detail，状态机是
// 「1-待发货 / 2-已发货 / 3-已签收 / 9-已取消」（见 domain/sales/value-objects/DeliveryStatus），
// 因此这里的状态判定与写回都对齐到 DeliveryStatusEnum。
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    // withPermission不转发context.params，从URL路径提取动态路由参数
    const deliveryId = parseInt(new URL(request.url).pathname.split('/')[4]);
    const body = await request.json();
    const { items, logistics_company, tracking_no } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(ts('k_ydqtum'), 400, 400);
    }

    try {
      // 发货流程整体包在一个事务中：全部写操作（明细/库存/二维码/发货单/销售订单/应收单）
      // 要么全部成功要么全部回滚，杜绝中途失败导致的数据不一致。
      const result = await transaction(async (conn: DbConnection) => {
        // 锁定发货单行，防止并发点击重复发货/超发（TOCTOU）
        const [deliveryRows] = await conn.query<mysql.RowDataPacket[]>(
          `SELECT id, delivery_no, order_id, order_no, customer_id, warehouse_id, status, total_qty
           FROM sal_delivery WHERE id = ? AND deleted = 0 FOR UPDATE`,
          [deliveryId]
        );
        const delivery = deliveryRows[0] as DbRow | undefined;

        if (!delivery) {
          throw new ShipError(404, ts('k_12d7h0r'));
        }

        // 验证发货单状态（只有「待发货」才能执行发货操作）
        if (Number(delivery.status) !== DeliveryStatusEnum.PENDING) {
          throw new ShipError(400, `当前状态不可发货，仅支持「待发货」状态执行发货`);
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

          // 累加明细表数量（sal_delivery_detail 没有 shipped_quantity / qr_code 列）
          await conn.execute(
            `UPDATE sal_delivery_detail
           SET quantity = quantity + ?
           WHERE delivery_id = ? AND material_id = ?`,
            [qty, deliveryId, material_id]
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
            [deliveryId, qr_code]
          );

          totalShippedQty += qty;
        }

        // 发货单主表：全部数量发完即「已发货」，否则留在「待发货」。
        // sal_delivery 上没有 shipped_quantity 列，用本次实发量对账单据申明量。
        const declaredQty = parseFloat(String(delivery.total_qty ?? '')) || 0;
        const isFullyShipped = declaredQty > 0 ? totalShippedQty >= declaredQty : true;
        const newStatus = isFullyShipped ? DeliveryStatusEnum.SHIPPED : DeliveryStatusEnum.PENDING;

        await conn.execute(
          `UPDATE sal_delivery
         SET status = ?, ship_time = NOW(),
         logistics_company = COALESCE(?, logistics_company),
         tracking_no = COALESCE(?, tracking_no)
         WHERE id = ?`,
          [newStatus, logistics_company || null, tracking_no || null, deliveryId]
        );

        // 更新销售订单已发货数量（符合设计文档"实时同步"原则）
        // 注：sal_order 上没有 total_qty 列（只有 total_amount），订单级状态不在这里推进，
        // 交给 sal_order 自身的状态机处理。TODO：需要订单总数量列时再补回状态推进。
        if (delivery.order_id) {
          await conn.execute(
            `UPDATE sal_order
           SET shipped_qty = IFNULL(shipped_qty, 0) + ?
           WHERE id = ?`,
            [totalShippedQty, delivery.order_id]
          );
        }

        // 如果全部发货完成，自动生成应收单（并发安全：命名锁保证单号唯一，与业务同事务）
        if (isFullyShipped && delivery.order_id) {
          const receivableNo = await generateDocumentNo('receivable', conn);
          await conn.execute(
            `INSERT INTO fin_receivable (
            receivable_no, source_type, source_no, order_id, order_type,
            customer_id, amount, status, create_time
          ) VALUES (?, 'sales', ?, ?, 'sales', ?, 0, 1, NOW())`,
            [receivableNo, delivery.delivery_no ?? '', delivery.order_id, delivery.customer_id ?? null]
          );
        }

        return {
          delivery_no: delivery.delivery_no,
          status: newStatus,
          ship_time: new Date().toISOString(),
          shipped_quantity: totalShippedQty,
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
