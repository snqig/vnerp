import { DomainError } from '../../shared/DomainTypes';

export interface PurchaseOrderLineProps {
  id?: number;
  orderId?: number;
  lineNo: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  unit: string;
  orderQty: number;
  receivedQty: number;
  returnedQty: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  baseUnitPrice?: number;
  baseAmount?: number;
  baseTaxAmount?: number;
  baseLineTotal?: number;
  requireDate?: string;
  remark?: string;
}

export class PurchaseOrderLine {
  private _isClosed: boolean = false;

  private constructor(
    public readonly id: number | undefined,
    public readonly orderId: number | undefined,
    public readonly lineNo: number,
    public readonly materialId: number,
    public readonly materialCode: string,
    public readonly materialName: string,
    public readonly materialSpec: string,
    public readonly unit: string,
    private _orderQty: number,
    private _receivedQty: number,
    private _returnedQty: number,
    private _unitPrice: number,
    private _amount: number,
    private _taxRate: number,
    private _taxAmount: number,
    private _lineTotal: number,
    private _baseUnitPrice: number,
    private _baseAmount: number,
    private _baseTaxAmount: number,
    private _baseLineTotal: number,
    public readonly requireDate: string | undefined,
    public readonly remark: string | undefined
  ) {}

  static create(props: PurchaseOrderLineProps): PurchaseOrderLine {
    if (!props.materialId || props.materialId <= 0) {
      throw new DomainError('采购明细物料ID不能为空');
    }
    if (!props.orderQty || props.orderQty <= 0) {
      throw new DomainError('采购数量必须大于0');
    }
    if (props.unitPrice < 0) {
      throw new DomainError('采购单价不能为负数');
    }

    const amount = (props.orderQty || 0) * (props.unitPrice || 0);
    const taxRate = props.taxRate || 13;
    const taxAmount = (amount * taxRate) / 100;
    const lineTotal = amount + taxAmount;
    const baseUnitPrice = props.baseUnitPrice ?? 0;
    const baseAmount = props.baseAmount ?? 0;
    const baseTaxAmount = props.baseTaxAmount ?? 0;
    const baseLineTotal = props.baseLineTotal ?? 0;

    return new PurchaseOrderLine(
      props.id,
      props.orderId,
      props.lineNo,
      props.materialId,
      props.materialCode || '',
      props.materialName || '',
      props.materialSpec || '',
      props.unit || '件',
      props.orderQty,
      props.receivedQty || 0,
      props.returnedQty || 0,
      props.unitPrice || 0,
      amount,
      taxRate,
      taxAmount,
      lineTotal,
      baseUnitPrice,
      baseAmount,
      baseTaxAmount,
      baseLineTotal,
      props.requireDate,
      props.remark
    );
  }

  static reconstitute(props: PurchaseOrderLineProps): PurchaseOrderLine {
    return new PurchaseOrderLine(
      props.id,
      props.orderId,
      props.lineNo,
      props.materialId,
      props.materialCode || '',
      props.materialName || '',
      props.materialSpec || '',
      props.unit || '件',
      props.orderQty,
      props.receivedQty || 0,
      props.returnedQty || 0,
      props.unitPrice || 0,
      props.amount || 0,
      props.taxRate || 13,
      props.taxAmount || 0,
      props.lineTotal || 0,
      props.baseUnitPrice ?? 0,
      props.baseAmount ?? 0,
      props.baseTaxAmount ?? 0,
      props.baseLineTotal ?? 0,
      props.requireDate,
      props.remark
    );
  }

  get orderQty(): number {
    return this._orderQty;
  }
  get receivedQty(): number {
    return this._receivedQty;
  }
  get returnedQty(): number {
    return this._returnedQty;
  }
  get unitPrice(): number {
    return this._unitPrice;
  }
  get amount(): number {
    return this._amount;
  }
  get taxRate(): number {
    return this._taxRate;
  }
  get taxAmount(): number {
    return this._taxAmount;
  }
  get lineTotal(): number {
    return this._lineTotal;
  }
  get baseUnitPrice(): number {
    return this._baseUnitPrice;
  }
  get baseAmount(): number {
    return this._baseAmount;
  }
  get baseTaxAmount(): number {
    return this._baseTaxAmount;
  }
  get baseLineTotal(): number {
    return this._baseLineTotal;
  }

  get remainingQty(): number {
    return this._orderQty - this._receivedQty;
  }

  get isFullyReceived(): boolean {
    return this._receivedQty >= this._orderQty;
  }

  get isClosed(): boolean {
    return this._isClosed;
  }

  receive(quantity: number, tolerancePercent: number = 0): void {
    if (this._isClosed) {
      throw new DomainError(`行${this.lineNo}已关闭，不允许入库`);
    }
    if (quantity <= 0) {
      throw new DomainError('入库数量必须大于0');
    }
    const newReceivedQty = this._receivedQty + quantity;
    const maxAllowed = this._orderQty * (1 + tolerancePercent / 100);
    if (newReceivedQty > maxAllowed) {
      throw new DomainError(
        `入库数量超限: 行${this.lineNo} 订购${this._orderQty}, 已收${this._receivedQty}, 本次${quantity}, 容差${tolerancePercent}%, 允许上限${maxAllowed.toFixed(2)}`
      );
    }
    this._receivedQty = newReceivedQty;
  }

  close(): void {
    if (this._isClosed) {
      throw new DomainError(`行${this.lineNo}已关闭`);
    }
    this._isClosed = true;
  }

  recalculate(): void {
    this._amount = this._orderQty * this._unitPrice;
    this._taxAmount = (this._amount * this._taxRate) / 100;
    this._lineTotal = this._amount + this._taxAmount;
  }
}
