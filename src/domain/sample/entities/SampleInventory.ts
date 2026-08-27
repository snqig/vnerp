/** 样品库存实体属性 — 与 sal_sample_inventory 表字段对齐 */
export interface SampleInventoryProps {
  id?: number;
  sampleOrderId?: number;
  productName?: string;
  materialNo?: string;
  quantity?: number;
  unit?: string;
  warehouseId?: number;
  status?: string;
  sentTo?: string;
  sentDate?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  deleted?: number;
}

export class SampleInventory {
  private constructor(
    public readonly id: number | undefined,
    public readonly sampleOrderId: number | undefined,
    public readonly productName: string,
    public readonly materialNo: string,
    private _quantity: number,
    public readonly unit: string,
    public readonly warehouseId: number | undefined,
    private _status: string,
    public readonly sentTo: string,
    public readonly sentDate: string,
    public readonly remark: string,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined,
    public readonly deleted: number
  ) {}

  static create(props: SampleInventoryProps): SampleInventory {
    return new SampleInventory(
      props.id,
      props.sampleOrderId,
      props.productName || '',
      props.materialNo || '',
      props.quantity || 0,
      props.unit || 'pcs',
      props.warehouseId,
      props.status || 'available',
      props.sentTo || '',
      props.sentDate || '',
      props.remark || '',
      props.createTime,
      props.updateTime,
      props.deleted || 0
    );
  }

  static reconstitute(props: SampleInventoryProps): SampleInventory {
    return new SampleInventory(
      props.id,
      props.sampleOrderId,
      props.productName || '',
      props.materialNo || '',
      props.quantity || 0,
      props.unit || 'pcs',
      props.warehouseId,
      props.status || 'available',
      props.sentTo || '',
      props.sentDate || '',
      props.remark || '',
      props.createTime,
      props.updateTime,
      props.deleted || 0
    );
  }

  get quantity(): number {
    return this._quantity;
  }
  get status(): string {
    return this._status;
  }

  markAsSent(sentTo: string, sentDate: string): void {
    this._status = 'sent';
    (this as any).sentTo = sentTo;
    (this as any).sentDate = sentDate;
  }

  markAsUsed(): void {
    this._status = 'used';
  }

  markAsScrapped(): void {
    this._status = 'scrapped';
  }

  toProps(): SampleInventoryProps {
    return {
      id: this.id,
      sampleOrderId: this.sampleOrderId,
      productName: this.productName,
      materialNo: this.materialNo,
      quantity: this._quantity,
      unit: this.unit,
      warehouseId: this.warehouseId,
      status: this._status,
      sentTo: this.sentTo,
      sentDate: this.sentDate,
      remark: this.remark,
      createTime: this.createTime,
      updateTime: this.updateTime,
      deleted: this.deleted,
    };
  }
}
