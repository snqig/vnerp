import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import {
  InboundOrderUnapprovedEvent,
  InboundOrderCancelledEvent,
} from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

/**
 * 入库单红冲 / 作废时，同步作废其生成的物料二维码。
 *
 * 二维码在入库审核通过时由 QrCodeGenerationHandler 生成，qr_code.ref_id = 入库单 ID。
 * 若入库单被反审核 / 取消，旧码若不失效，扫码仍能定位到已被回滚的批次 → 虚码。
 * 此处按 ref_id 将对应 qr_code_record 置为失效（status = 0），与库存回滚同源触发。
 */
export class InboundQrInvalidationHandler
  implements EventHandler<InboundOrderUnapprovedEvent | InboundOrderCancelledEvent>
{
  async handle(
    event: InboundOrderUnapprovedEvent | InboundOrderCancelledEvent
  ): Promise<void> {
    const inboundId = event.payload.inboundId;
    const eventType = event.eventType;

    await transaction(async (conn) => {
      const [result] = (await conn.execute(
        "UPDATE qrcode_record SET status = 0 WHERE ref_id = ? AND qr_type = 'material' AND status = 1",
        [inboundId]
      )) as [{ affectedRows: number }, unknown];

      secureLog('info', 'Inbound QR codes invalidated', {
        inboundId,
        eventType,
        affectedRows: result.affectedRows,
      });
    });
  }
}
