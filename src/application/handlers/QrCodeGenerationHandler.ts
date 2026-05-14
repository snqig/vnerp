import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { randomUUID } from 'crypto';
import { secureLog } from '@/lib/logger';

export class QrCodeGenerationHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
    const { inboundId, inboundNo, items, warehouseId, warehouseName, supplierName } = event.payload;

    await transaction(async (conn) => {
      for (const item of items) {
        const qrCode = 'MA-' + randomUUID().replace(/-/g, '').substring(0, 16);
        try {
          await conn.execute(
            `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, batch_no, material_id, material_code, material_name, specification, quantity, unit, warehouse_id, warehouse_name, supplier_name, production_date, status, extra_data)
             VALUES (?, 'material', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [
              qrCode,
              inboundId,
              inboundNo,
              item.batchNo || null,
              item.materialId || null,
              item.materialCode || null,
              item.materialName || '',
              '', // specification
              item.quantity || 0,
              '件', // unit
              warehouseId || null,
              warehouseName,
              supplierName || '',
              null, // produceDate
              JSON.stringify({
                inbound_order_no: inboundNo,
              }),
            ]
          );
        } catch (e) {
          secureLog('error', 'Failed to generate QR code', {
            orderNo: inboundNo,
            materialId: item.materialId,
          });
        }
      }
    });

    secureLog('info', 'QR codes generated for inbound order', { orderNo: inboundNo, itemCount: items.length });
  }
}
