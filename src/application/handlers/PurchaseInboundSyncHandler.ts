import { t } from '@/lib/server-translate';
import { getTranslations } from 'next-intl/server';

import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { PurchaseOrder, PurchaseOrderProps } from '@/domain/purchase/aggregates/PurchaseOrder';
import { PurchaseOrderStatus } from '@/domain/purchase/value-objects/PurchaseOrderStatus';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import type { RowDataPacket } from 'mysql2';

/** pur_purchase_order 表行类型（与 MysqlPurchaseOrderRepository 内部行类型等价） */
interface PurchaseOrderRow {
  id: number;
  po_no: string;
  supplier_id: number;
  supplier_name: string;
  supplier_code: string | null;
  order_date: string | null;
  delivery_date: string | null;
  currency: string | null;
  exchange_rate: number | string | null;
  total_amount: number | string;
  total_quantity: number | string;
  tax_rate: number | string | null;
  tax_amount: number | string | null;
  grand_total: number | string | null;
  base_total_amount: number | string;
  base_tax_amount: number | string;
  base_grand_total: number | string;
  status: number;
  over_receipt_tolerance: number | string | null;
  payment_terms: string | null;
  delivery_address: string | null;
  remark: string | null;
  create_by: number | null;
  create_time: string | null;
  update_time: string | null;
  audit_by: number | null;
  audit_time: string | null;
}

/** pur_purchase_order_line 表行类型 */
interface PurchaseOrderLineRow {
  id: number;
  po_id: number;
  line_no: number;
  material_id: number;
  material_code: string | null;
  material_name: string | null;
  material_spec: string | null;
  unit: string | null;
  order_qty: number | string;
  received_qty: number | string;
  returned_qty: number | string;
  unit_price: number | string;
  amount: number | string;
  tax_rate: number | string | null;
  tax_amount: number | string | null;
  line_total: number | string | null;
  base_unit_price: number | string;
  base_amount: number | string;
  base_tax_amount: number | string;
  base_line_total: number | string;
  require_date: string | null;
  remark: string | null;
}

const LINE_COLUMNS = `id, po_id, line_no, material_id, material_code, material_name, material_spec,
                       unit, order_qty, received_qty, returned_qty, unit_price, amount,
                       tax_rate, tax_amount, line_total, base_unit_price, base_amount, base_tax_amount, base_line_total, require_date, remark`;

/** 行数据 → PurchaseOrderProps（与 MysqlPurchaseOrderRepository.mapToProps 等价，该私有方法无法复用） */
function mapToProps(order: PurchaseOrderRow, lines: PurchaseOrderLineRow[]): PurchaseOrderProps {
  let statusValue: PurchaseOrderProps['status'];
  try {
    statusValue = PurchaseOrderStatus.fromDbCode(order.status).value;
  } catch {
    statusValue = 'draft' as PurchaseOrderProps['status'];
  }
  return {
    id: order.id,
    orderNo: order.po_no,
    status: statusValue,
    supplierId: order.supplier_id,
    supplierName: order.supplier_name || '',
    supplierCode: order.supplier_code || '',
    orderDate: order.order_date || '',
    deliveryDate: order.delivery_date || '',
    currency: order.currency || 'CNY',
    exchangeRate: Number(order.exchange_rate) || 1.0,
    taxRate: Number(order.tax_rate) || 13,
    totalAmount: Number(order.total_amount),
    totalQuantity: Number(order.total_quantity),
    taxAmount: Number(order.tax_amount) || 0,
    grandTotal: Number(order.grand_total) || 0,
    baseCurrency: 'CNY',
    baseTotalAmount: Number(order.base_total_amount) || 0,
    baseTaxAmount: Number(order.base_tax_amount) || 0,
    baseGrandTotal: Number(order.base_grand_total) || 0,
    overReceiptTolerance: Number(order.over_receipt_tolerance) || 0,
    paymentTerms: order.payment_terms || '',
    deliveryAddress: order.delivery_address || '',
    remark: order.remark || '',
    createBy: order.create_by ?? undefined,
    auditBy: order.audit_by ?? undefined,
    auditTime: order.audit_time ?? undefined,
    lines: (lines || []).map((line) => {
  const ts = t;
  return  ({
      id: line.id,
      orderId: line.po_id,
      lineNo: line.line_no,
      materialId: line.material_id,
      materialCode: line.material_code || '',
      materialName: line.material_name || '',
      materialSpec: line.material_spec || '',
      unit: line.unit || ts('k_w0gthl'),
      orderQty: Number(line.order_qty),
      receivedQty: Number(line.received_qty) || 0,
      returnedQty: Number(line.returned_qty) || 0,
      unitPrice: Number(line.unit_price) || 0,
      amount: Number(line.amount) || 0,
      taxRate: Number(line.tax_rate) || 13,
      taxAmount: Number(line.tax_amount) || 0,
      lineTotal: Number(line.line_total) || 0,
      baseUnitPrice: Number(line.base_unit_price) || 0,
      baseAmount: Number(line.base_amount) || 0,
      baseTaxAmount: Number(line.base_tax_amount) || 0,
      baseLineTotal: Number(line.base_line_total) || 0,
      requireDate: line.require_date ?? undefined,
      remark: line.remark ?? undefined,
    });
}),
    createTime: order.create_time ?? undefined,
    updateTime: order.update_time ?? undefined,
  };
}

export class PurchaseInboundSyncHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const { inboundId, inboundNo, poId, items } = event.payload;
    const ctx = { module: 'purchase-inbound', action: 'sync', inboundId, poId };
    let phase = 'init';

    if (!poId) {
      logger.info(ctx, ts('k_1azg923'), { inboundNo });
      return;
    }

    try {
      await transaction(async (conn) => {
        phase = 'lock_po';
        const [orderRows] = await conn.execute<RowDataPacket[]>(
          'SELECT * FROM pur_purchase_order WHERE id = ? AND deleted = 0 AND status IN (30, 40) FOR UPDATE',
          [poId]
        );

        if (!orderRows || orderRows.length === 0) {
          secureLog('info', 'Purchase order not found or not receivable for inbound sync', {
            poId,
            inboundNo,
          });
          logger.info(ctx, ts('k_1x8ore7'), {
            poId,
            inboundNo,
          });
          return;
        }

        phase = 'lock_po_lines';
        const [lineRows] = await conn.execute<RowDataPacket[]>(
          `SELECT ${LINE_COLUMNS} FROM pur_purchase_order_line WHERE po_id = ? ORDER BY line_no ASC FOR UPDATE`,
          [poId]
        );

        if (!lineRows || lineRows.length === 0) {
          secureLog('warn', 'Purchase order lines not found for inbound sync', { poId, inboundNo });
          logger.warn(ctx, ts('k_1tbpmfc'), { poId, inboundNo });
          return;
        }

        const order = orderRows[0] as unknown as PurchaseOrderRow;
        const lines = lineRows as unknown as PurchaseOrderLineRow[];
        const purchaseOrder = PurchaseOrder.reconstitute(mapToProps(order, lines));
        logger.info(ctx, ts('k_1h86l8i'), {
          poId,
          lineCount: lines.length,
          inboundItemCount: items.length,
          status: purchaseOrder.status.value,
        });

        phase = 'receive';
        const lineReceives: Array<{
          lineNo: number;
          quantity: number;
          batchNo: string;
          warehouseId: number;
        }> = [];
        for (const item of items) {
          const line = lines.find((l) => l.material_id === item.materialId);
          if (!line) {
            secureLog('warn', 'Matching PO line not found for material', {
              poId,
              materialId: item.materialId,
              inboundNo,
            });
            logger.warn(ctx, ts('k_17gfcmb'), {
              materialId: item.materialId,
              inboundQty: item.quantity,
            });
            continue;
          }
          lineReceives.push({
            lineNo: line.line_no,
            quantity: item.quantity,
            batchNo: item.batchNo,
            warehouseId: event.payload.warehouseId,
          });
        }

        if (lineReceives.length === 0) {
          logger.warn(ctx, ts('k_zup9oe'), { poId, inboundNo });
          return;
        }

        purchaseOrder.receive(lineReceives);

        phase = 'update_received_qty';
        for (const line of purchaseOrder.lines) {
          if (line.id === undefined) continue;
          await conn.execute(
            'UPDATE pur_purchase_order_line SET received_qty = ?, update_time = NOW() WHERE id = ?',
            [line.receivedQty, line.id]
          );
        }

        phase = 'update_po_status';
        await conn.execute(
          'UPDATE pur_purchase_order SET status = ?, received_quantity = ?, update_time = NOW() WHERE id = ?',
          [purchaseOrder.status.toDbCode(), purchaseOrder.totalReceivedQty, poId]
        );
        logger.info(ctx, ts('k_7kgh00'), {
          poId,
          inboundNo,
          newStatus: purchaseOrder.status.value,
          receivedQuantity: purchaseOrder.totalReceivedQty,
          itemCount: items.length,
        });
        secureLog('info', 'Purchase order synced from inbound approval', {
          poId,
          inboundNo,
          newStatus: purchaseOrder.status.value,
          receivedQuantity: purchaseOrder.totalReceivedQty,
        });

        phase = 'save_events';
        await getDomainEventOutbox().saveEvents(
          conn,
          'PurchaseOrder',
          poId,
          purchaseOrder.getDomainEvents()
        );
      });
    } catch (err) {
      logger.error(ctx, `PurchaseInboundSync 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        inboundNo,
        poId,
      });
      throw err;
    }
  }
}
