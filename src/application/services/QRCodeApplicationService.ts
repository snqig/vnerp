import { QRCode, SourceType } from '@/domain/trace/QRCode';
import type { IQRCodeRepository, TraceTimelineItem } from '@/domain/trace/repositories/IQRCodeRepository';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction, execute } from '@/lib/db';
import { QRCodeGeneratedEvent, QRCodeSplitEvent, QRCodeScannedEvent } from '@/domain/trace/events/QRCodeEvents';

export interface SplitInput {
  quantity: number;
}

export class QRCodeApplicationService {
  constructor(
    private readonly qrCodeRepo: IQRCodeRepository
  ) {}

  async generateBatchQr(
    materialId: number | null,
    materialName: string | null,
    batchNo: string | null,
    quantity: number,
    count: number,
    sourceType: number = SourceType.INBOUND
  ): Promise<{ ids: number[]; qrContents: string[] }> {
    if (count <= 0) throw new DomainError('生成数量必须大于0');
    if (quantity <= 0) throw new DomainError('数量必须大于0');

    const qrCodeProps = [];
    for (let i = 0; i < count; i++) {
      const qrContent = `${batchNo || 'QR'}-${Date.now()}-${i}`;
      qrCodeProps.push(QRCode.create({
        qrContent,
        sourceType,
        batchNo,
        quantity,
        materialId,
        materialName,
      }));
    }

    const ids = await this.qrCodeRepo.createBatch(qrCodeProps);

    for (let i = 0; i < ids.length; i++) {
      const event = new QRCodeGeneratedEvent({
        qrId: ids[i],
        qrContent: qrCodeProps[i].qrContent,
        materialId,
        batchNo,
        quantity,
        sourceType,
        count,
      });
      await transaction(async (conn) => {
        await getDomainEventOutbox().saveEvents(conn, 'QRCode', ids[i], [event]);
      });
    }

    return {
      ids,
      qrContents: qrCodeProps.map((q) => q.qrContent),
    };
  }

  async splitParentQr(
    parentQrContent: string,
    splits: SplitInput[]
  ): Promise<{ childIds: number[]; childContents: string[] }> {
    const parent = await this.qrCodeRepo.findByContent(parentQrContent);
    if (!parent) throw new NotFoundError('父二维码不存在');
    if (parent.status !== 1) throw new DomainError('父二维码已失效');

    const totalQuantity = splits.reduce((sum, s) => sum + s.quantity, 0);
    if (totalQuantity > parent.quantity) throw new DomainError('拆分总量超过父码剩余数量');

    const childIds: number[] = [];
    const childContents: string[] = [];

    await transaction(async (conn) => {
      let childIndex = 1;
      for (const split of splits) {
        const childQr = parent.split(split.quantity, splits.length, childIndex);
        const [result] = (await conn.execute(
          `INSERT INTO qrcode_record (qr_content, parent_qr_id, split_flag, split_index, source_type, batch_no, quantity, material_id, material_name, status, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          [
            childQr.qrContent,
            parent.id,
            1,
            childIndex,
            SourceType.SPLIT,
            parent.batchNo,
            split.quantity,
            parent.materialId,
            parent.materialName,
          ]
        )) as unknown as [{ insertId: number }];
        childIds.push(Number(result.insertId));
        childContents.push(childQr.qrContent);
        childIndex++;
      }

      const remaining = parent.quantity - totalQuantity;
      await conn.execute(
        'UPDATE qrcode_record SET quantity = ?, update_time = NOW() WHERE id = ?',
        [remaining, parent.id]
      );

      const splitEvent = new QRCodeSplitEvent({
        parentQrId: parent.id!,
        parentQrContent: parent.qrContent,
        childQrIds: childIds,
        childQrContents: childContents,
        splitCount: splits.length,
      });
      await getDomainEventOutbox().saveEvents(conn, 'QRCode', parent.id!, [splitEvent]);
    });

    return { childIds, childContents };
  }

  async recordScan(
    qrContent: string,
    operator: string,
    location: string
  ): Promise<void> {
    const qr = await this.qrCodeRepo.findByContent(qrContent);
    if (!qr) throw new NotFoundError('二维码不存在');

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO qrcode_scan_log (qr_content, operator, location, scan_time) VALUES (?, ?, ?, NOW())`,
        [qrContent, operator, location]
      );

      const event = new QRCodeScannedEvent({
        qrId: qr.id!,
        qrContent: qr.qrContent,
        operator,
        location,
      });
      await getDomainEventOutbox().saveEvents(conn, 'QRCode', qr.id!, [event]);
    });
  }

  async getTraceTimeline(qrContent: string): Promise<TraceTimelineItem[]> {
    const qr = await this.qrCodeRepo.findByContent(qrContent);
    if (!qr) throw new NotFoundError('二维码不存在');
    return this.qrCodeRepo.queryTraceTimeline(qrContent);
  }

  async recordPrint(
    qrId: number,
    templateId: number | null,
    operator: string,
    paperType: string,
    printCount: number = 1
  ): Promise<void> {
    const qr = await this.qrCodeRepo.findById(qrId);
    if (!qr) throw new NotFoundError('二维码不存在');
    await execute(
      `INSERT INTO print_log (qr_id, template_id, print_time, operator, paper_type, print_count)
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [qrId, templateId, operator, paperType, printCount]
    );
  }
}
