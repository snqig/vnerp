import { DomainEvent } from '@/domain/shared/DomainEvent';

export enum SGSCertStatus {
  VALID = 1,
  EXPIRING = 2,
  EXPIRED = 3,
}

export class SGSCertificate {
  constructor(
    public readonly id: number | undefined,
    public readonly reportNo: string,
    public supplierId: number | undefined,
    public supplierName: string,
    public materialCode: string,
    public materialName: string,
    public batchNo: string,
    public testDate: Date,
    public testMethod: string,
    public testItems: { itemName: string; standard: string; result: 'PASS' | 'FAIL' }[],
    public validFrom: Date,
    public validUntil: Date,
    public certificateUrl: string | undefined,
    public status: SGSCertStatus = SGSCertStatus.VALID
  ) {}

  get expiryDays(): number {
    const now = new Date();
    const ms = this.validUntil.getTime() - now.getTime();
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  }

  get isExpiring(): boolean {
    return this.expiryDays <= 30 && this.expiryDays > 0;
  }

  get isExpired(): boolean {
    return this.expiryDays <= 0;
  }

  static create(props: {
    reportNo: string;
    supplierId?: number;
    supplierName: string;
    materialCode: string;
    materialName: string;
    batchNo: string;
    testDate: Date;
    testMethod: string;
    testItems: { itemName: string; standard: string; result: 'PASS' | 'FAIL' }[];
    validFrom: Date;
    validUntil: Date;
    certificateUrl?: string;
  }): SGSCertificate {
    return new SGSCertificate(
      undefined,
      props.reportNo,
      props.supplierId,
      props.supplierName,
      props.materialCode,
      props.materialName,
      props.batchNo,
      props.testDate,
      props.testMethod,
      props.testItems,
      props.validFrom,
      props.validUntil,
      props.certificateUrl
    );
  }

  refreshStatus(): void {
    if (this.expiryDays <= 0) {
      this.status = SGSCertStatus.EXPIRED;
    } else if (this.expiryDays <= 30) {
      this.status = SGSCertStatus.EXPIRING;
    } else {
      this.status = SGSCertStatus.VALID;
    }
  }
}
