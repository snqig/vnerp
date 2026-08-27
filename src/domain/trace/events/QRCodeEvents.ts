import type { DomainEvent } from '@/domain/shared/DomainTypes';

export class QRCodeGeneratedEvent implements DomainEvent {
  readonly eventType = 'qrcode.generated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      qrId: number;
      qrCode: string;
      materialId: number | null;
      batchNo: string | null;
      quantity: number;
      qrType: string;
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
      parentQrCode: string;
      childQrIds: number[];
      childQrCodes: string[];
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
      qrCode: string;
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
      qrCode: string;
      templateId: number | null;
      operator: string;
      paperType: string;
      printCount: number;
    }
  ) {}
}
