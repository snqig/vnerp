import { getTranslations } from 'next-intl/server';

import { QRCode, QR_TYPE, type QRCodeProps } from '@/domain/trace/QRCode';
import type {
  IQRCodeRepository,
  TraceTimelineItem,
} from '@/domain/trace/repositories/IQRCodeRepository';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction, execute } from '@/lib/db';
import {
  QRCodeGeneratedEvent,
  QRCodeSplitEvent,
  QRCodeScannedEvent,
} from '@/domain/trace/events/QRCodeEvents';

export interface SplitInput {
  quantity: number;
}

export class QRCodeApplicationService {
  constructor(private readonly qrCodeRepo: IQRCodeRepository) {}

  async generateBatchQr(props: {
    qrType?: string;
    batchNo?: string | null;
    quantity: number;
    count: number;
    materialId?: number | null;
    materialCode?: string | null;
    materialName?: string | null;
    unit?: string | null;
    warehouseId?: number | null;
    warehouseName?: string | null;
    refId?: number | null;
    refNo?: string | null;
  }): Promise<{ ids: number[]; qrCodes: string[] }> {
  const ts = await getTranslations('Common');
    if (props.count <= 0) throw new DomainError(ts('k_1wdgl62'));
    if (props.quantity <= 0) throw new DomainError(ts('k_bit7af'));

    const qrType = props.qrType || QR_TYPE.MATERIAL;
    const qrCodes: QRCode[] = [];
    for (let i = 0; i < props.count; i++) {
      const qrCodeValue = `${props.batchNo || 'QR'}-${Date.now()}-${i}`;
      qrCodes.push(
        QRCode.create({
          qrCode: qrCodeValue,
          qrType,
          batchNo: props.batchNo ?? null,
          quantity: props.quantity,
          materialId: props.materialId ?? null,
          materialCode: props.materialCode ?? null,
          materialName: props.materialName ?? null,
          unit: props.unit ?? null,
          warehouseId: props.warehouseId ?? null,
          warehouseName: props.warehouseName ?? null,
          refId: props.refId ?? null,
          refNo: props.refNo ?? null,
        })
      );
    }

    const ids = await this.qrCodeRepo.createBatch(qrCodes);

    for (let i = 0; i < ids.length; i++) {
      const event = new QRCodeGeneratedEvent({
        qrId: ids[i],
        qrCode: qrCodes[i].qrCode,
        materialId: props.materialId ?? null,
        batchNo: props.batchNo ?? null,
        quantity: props.quantity,
        qrType,
        count: props.count,
      });
      await transaction(async (conn) => {
        await getDomainEventOutbox().saveEvents(conn, 'QRCode', ids[i], [event]);
      });
    }

    return {
      ids,
      qrCodes: qrCodes.map((q) => q.qrCode),
    };
  }

  async splitParentQr(
    parentQrCode: string,
    splits: SplitInput[]
  ): Promise<{ childIds: number[]; childCodes: string[] }> {
  const ts = await getTranslations('Common');
    const parent = await this.qrCodeRepo.findByContent(parentQrCode);
    if (!parent) throw new NotFoundError(ts('k_8gk8m7'));
    if (parent.status !== 1) throw new DomainError(ts('k_1ki7xuv'));

    const totalQuantity = splits.reduce((sum, s) => sum + s.quantity, 0);
    if (totalQuantity > parent.quantity) throw new DomainError(ts('k_bn27n1'));

    const childIds: number[] = [];
    const childCodes: string[] = [];

    await transaction(async (conn) => {
      let childIndex = 1;
      for (const split of splits) {
        const childQr = parent.split(split.quantity, splits.length, childIndex);
        const [result] = (await conn.execute(
          `INSERT INTO qrcode_record (qr_code, qr_type, parent_qr_code, split_flag, split_index, batch_no, material_id, material_code, material_name, quantity, unit, warehouse_id, status, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          [
            childQr.qrCode,
            QR_TYPE.SPLIT,
            parent.qrCode,
            1,
            childIndex,
            parent.batchNo,
            parent.materialId,
            parent.materialCode,
            parent.materialName,
            split.quantity,
            parent.unit,
            parent.warehouseId,
          ]
        )) as unknown as [{ insertId: number }];
        childIds.push(Number(result.insertId));
        childCodes.push(childQr.qrCode);
        childIndex++;
      }

      const remaining = (parent.quantity ?? 0) - (totalQuantity ?? 0);
      await conn.execute(
        'UPDATE qrcode_record SET quantity = ?, update_time = NOW() WHERE id = ?',
        [remaining, parent.id!] as any
      );

      const splitEvent = new QRCodeSplitEvent({
        parentQrId: parent.id!,
        parentQrCode: parent.qrCode,
        childQrIds: childIds,
        childQrCodes: childCodes,
        splitCount: splits.length,
      });
      await getDomainEventOutbox().saveEvents(conn, 'QRCode', parent.id!, [splitEvent]);
    });

    return { childIds, childCodes };
  }

  async recordScan(qrCode: string, operator: string, location: string): Promise<void> {
  const ts = await getTranslations('Common');
    const qr = await this.qrCodeRepo.findByContent(qrCode);
    if (!qr) throw new NotFoundError(ts('k_1o9pxv'));

    await transaction(async (conn) => {
      // P0 幂等：同一二维码+操作员+位置在 10 秒内重复调用（如 Pad 离线队列网络重试）
      // 视为同一笔扫码，跳过写流水与计数，避免重复扫码记录 + 虚增 scan_count
      const [recent] = await conn.query(
        `SELECT id FROM qrcode_scan_log
         WHERE qr_code = ? AND operator_name = ? AND scan_message = ? AND create_time >= NOW() - INTERVAL 10 SECOND
         LIMIT 1`,
        [qrCode, operator, `扫码位置: ${location}`]
      );
      if (Array.isArray(recent) && recent.length > 0) {
        return;
      }

      await conn.execute(
        `INSERT INTO qrcode_scan_log (qr_code, qr_type, scan_type, operator_name, scan_result, scan_message, create_time)
         VALUES (?, ?, ?, ?, 'success', ?, NOW())`,
        [qrCode, qr.qrType, 'trace', operator, `扫码位置: ${location}`]
      );

      await conn.execute(
        'UPDATE qrcode_record SET scan_count = scan_count + 1, last_scan_time = NOW() WHERE id = ?',
        [qr.id!]
      );

      const event = new QRCodeScannedEvent({
        qrId: qr.id!,
        qrCode: qr.qrCode,
        operator,
        location,
      });
      await getDomainEventOutbox().saveEvents(conn, 'QRCode', qr.id!, [event]);
    });
  }

  async getTraceTimeline(qrCode: string): Promise<TraceTimelineItem[]> {
  const ts = await getTranslations('Common');
    const qr = await this.qrCodeRepo.findByContent(qrCode);
    if (!qr) throw new NotFoundError(ts('k_1o9pxv'));
    return this.qrCodeRepo.queryTraceTimeline(qrCode);
  }

  async recordPrint(
    qrId: number,
    templateId: number | null,
    operator: string,
    paperType: string,
    printCount: number = 1
  ): Promise<void> {
  const ts = await getTranslations('Common');
    const qr = await this.qrCodeRepo.findById(qrId);
    if (!qr) throw new NotFoundError(ts('k_1o9pxv'));
    await execute(
      `INSERT INTO print_log (qr_id, template_id, print_time, operator, paper_type, print_count)
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [qrId, templateId, operator, paperType, printCount]
    );
    await execute(
      'UPDATE qrcode_record SET print_count = print_count + ?, last_print_time = NOW() WHERE id = ?',
      [printCount, qrId]
    );
  }
}
