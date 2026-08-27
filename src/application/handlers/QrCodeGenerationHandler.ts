import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { createHash } from 'crypto';
import { secureLog } from '@/lib/logger';

/**
 * 入库审核通过时为每个明细生成物料二维码。
 *
 * 幂等策略（修复「反审核→再审核」产生重复二维码的问题 #5）：
 *   - 二维码取值由「入库单号 + 行序号 + 批次 + 物料 + 仓库」确定性推导，
 *     同一入库明细每次审核得到同一张码，不会随机漂移。
 *   - qrcode_record 上已存在 UNIQUE INDEX uk_qr_code（迁移 077 保证同步环境也具备），
 *     INSERT ... ON DUPLICATE KEY UPDATE status = 1 会在再次审核时
 *     「复活」原码（status=1），而非插入新行，从而实现唯一有效码。
 *   - 行序号 index 纳入推导，可正确处理同一入库单内「同物料同批次多行」的场景，
 *     每行得到各自独立的码，互不覆盖。
 */
export class QrCodeGenerationHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
    const { inboundId, inboundNo, items, warehouseId, warehouseName, supplierName } = event.payload;

    await transaction(async (conn) => {
      // 逐行生成（保持与 items 顺序一致，行序号纳入推导以区分同物料同批次多行）
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const seed = [
          inboundId,
          index,
          item.batchNo || '',
          item.materialId || '',
          warehouseId || '',
        ].join('|');
        const qrCode = 'MA-' + createHash('sha1').update(seed).digest('hex').substring(0, 16);
        try {
          await conn.execute(
            `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, batch_no, material_id, material_code, material_name, specification, quantity, unit, warehouse_id, warehouse_name, supplier_name, production_date, status, extra_data)
             VALUES (?, 'material', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE
               status = 1,
               quantity = VALUES(quantity),
               material_name = VALUES(material_name),
               warehouse_name = VALUES(warehouse_name),
               supplier_name = VALUES(supplier_name),
               extra_data = VALUES(extra_data)`,
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
        } catch {
          secureLog('error', 'Failed to generate QR code', {
            orderNo: inboundNo,
            materialId: item.materialId,
          });
        }
      }
    });

    secureLog('info', 'QR codes generated for inbound order', {
      orderNo: inboundNo,
      itemCount: items.length,
    });
  }
}
