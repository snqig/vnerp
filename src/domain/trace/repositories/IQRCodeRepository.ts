import type { QRCode } from '../QRCode';

export interface TraceTimelineItem {
  time: string;
  eventType: string;
  eventName: string;
  operator: string;
  docNo: string;
  quantity: string;
  process: string;
  batchNo: string;
  materialName: string;
}

export interface IQRCodeRepository {
  findByContent(qrCode: string): Promise<QRCode | null>;
  findById(id: number): Promise<QRCode | null>;
  findByParentQrCode(parentQrCode: string): Promise<QRCode[]>;
  findByBatchNo(batchNo: string): Promise<QRCode[]>;
  create(qrCode: QRCode): Promise<number>;
  createBatch(qrCodes: QRCode[]): Promise<number[]>;
  updateQuantity(id: number, quantity: number): Promise<void>;
  queryTraceTimeline(qrCode: string): Promise<TraceTimelineItem[]>;
}
