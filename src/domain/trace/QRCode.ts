import { DomainError } from '@/domain/shared/DomainTypes';
import type { DomainEvent } from '@/domain/shared/DomainTypes';
import { QRCodeGeneratedEvent, QRCodeScannedEvent, QRCodeSplitEvent } from './events/QRCodeEvents';

export enum SourceType {
  INBOUND = 1,
  SPLIT = 2,
  FINISHED = 3,
  OUTBOUND = 4,
}

export interface QRCodeProps {
  id?: number;
  qrContent: string;
  parentQrId?: number | null;
  splitFlag?: number;
  splitIndex?: number;
  sourceType: number;
  batchNo?: string | null;
  quantity?: number;
  materialId?: number | null;
  materialName?: string | null;
  status?: number;
}

export class QRCode {
  private _domainEvents: DomainEvent[] = [];

  public readonly id: number | undefined;
  public readonly qrContent: string;
  public readonly parentQrId: number | null;
  public readonly splitFlag: number;
  public readonly splitIndex: number;
  public readonly sourceType: number;
  public readonly batchNo: string | null;
  public readonly materialId: number | null;
  public readonly materialName: string | null;
  private _quantity: number;
  private _status: number;

  private constructor(props: QRCodeProps) {
    this.id = props.id;
    this.qrContent = props.qrContent;
    this.parentQrId = props.parentQrId ?? null;
    this.splitFlag = props.splitFlag ?? 0;
    this.splitIndex = props.splitIndex ?? 0;
    this.sourceType = props.sourceType;
    this.batchNo = props.batchNo ?? null;
    this._quantity = props.quantity ?? 0;
    this.materialId = props.materialId ?? null;
    this.materialName = props.materialName ?? null;
    this._status = props.status ?? 1;
  }

  static create(props: QRCodeProps): QRCode {
    if (!props.qrContent) throw new DomainError('二维码内容不能为空');
    if (!props.sourceType) throw new DomainError('来源类型不能为空');
    if (props.quantity !== undefined && props.quantity < 0) throw new DomainError('数量不能为负数');
    const entity = new QRCode(props);
    return entity;
  }

  static reconstitute(props: QRCodeProps): QRCode {
    return new QRCode(props);
  }

  split(quantity: number, totalSplits: number, index: number): QRCode {
    if (quantity <= 0) throw new DomainError('拆分数量必须大于0');
    if (quantity > this._quantity) throw new DomainError('拆分数量不能超过父码剩余数量');
    if (index <= 0) throw new DomainError('拆分子码索引必须大于0');
    if (index > totalSplits) throw new DomainError('拆分子码索引不能超过总数');
    const child = new QRCode({
      qrContent: `${this.qrContent}-S${index}`,
      parentQrId: this.id ?? null,
      splitFlag: 1,
      splitIndex: index,
      sourceType: SourceType.SPLIT,
      batchNo: this.batchNo,
      quantity,
      materialId: this.materialId,
      materialName: this.materialName,
    });
    this._domainEvents.push(
      new QRCodeSplitEvent({
        parentQrId: this.id!,
        parentQrContent: this.qrContent,
        childQrIds: [],
        childQrContents: [child.qrContent],
        splitCount: 1,
      })
    );
    return child;
  }

  markScanned(operator: string, location: string): void {
    this._domainEvents.push(
      new QRCodeScannedEvent({
        qrId: this.id!,
        qrContent: this.qrContent,
        operator,
        location,
      })
    );
  }

  bindBatch(batchNo: string): void {
    (this as { batchNo: string | null }).batchNo = batchNo;
  }

  get quantity(): number {
    return this._quantity;
  }

  get status(): number {
    return this._status;
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
