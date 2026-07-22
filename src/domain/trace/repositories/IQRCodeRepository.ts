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
  findByContent(qrContent: string): Promise<QRCode | null>;
  findById(id: number): Promise<QRCode | null>;
  findByParentId(parentId: number): Promise<QRCode[]>;
  findByBatchNo(batchNo: string): Promise<QRCode[]>;
  create(qrCode: QRCode): Promise<number>;
  createBatch(qrCodes: QRCode[]): Promise<number[]>;
  updateQuantity(id: number, quantity: number): Promise<void>;
  queryTraceTimeline(qrContent: string): Promise<TraceTimelineItem[]>;
}
