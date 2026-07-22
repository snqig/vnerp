import type { DomainEvent } from '@/domain/shared/DomainTypes';

export class QRCodeGeneratedEvent implements DomainEvent {
  readonly eventType = 'qrcode.generated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      qrId: number;
      qrContent: string;
      materialId: number | null;
      batchNo: string | null;
      quantity: number;
      sourceType: number;
      count: number;
    }
  ) {}
}

export class QRCodeSplitEvent implements DomainEvent {
  readonly eventType = 'qrcode.split';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      parentQrId: number;
      parentQrContent: string;
      childQrIds: number[];
      childQrContents: string[];
      splitCount: number;
    }
  ) {}
}

export class QRCodeScannedEvent implements DomainEvent {
  readonly eventType = 'qrcode.scanned';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      qrId: number;
      qrContent: string;
      operator: string;
      location: string;
    }
  ) {}
}

export class QRCodePrintedEvent implements DomainEvent {
  readonly eventType = 'qrcode.printed';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      qrId: number;
      qrContent: string;
      templateId: number | null;
      operator: string;
      paperType: string;
      printCount: number;
    }
  ) {}
}
