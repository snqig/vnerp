import { DomainError } from '../../shared/DomainTypes';
import { roundPrice, roundAmount, multiplyDecimal } from '@/lib/decimal-utils';

export interface SalesOrderLineProps {
  id?: number;
  orderId?: number;
  lineNo: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  specification?: string;
  unit: string;
  orderQty: number;
  shippedQty: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal?: number;
  remark?: string;
}

export class SalesOrderLine {
  private _taxRate: number;
  private _taxAmount: number;
  private _lineTotal: number;

  private constructor(
    public readonly id: number | undefined,
    public readonly orderId: number | undefined,
    public readonly lineNo: number,
    public readonly materialId: number,
    public readonly materialCode: string,
    public readonly materialName: string,
    public readonly specification: string,
    public readonly unit: string,
    private _orderQty: number,
    private _shippedQty: number,
    private _unitPrice: number,
    private _amount: number,
    taxRate: number,
    taxAmount: number,
    lineTotal: number,
    public readonly remark: string | undefined
  ) {
    this._taxRate = taxRate;
    this._taxAmount = taxAmount;
    this._lineTotal = lineTotal;
  }

  static create(props: SalesOrderLineProps): SalesOrderLine {
    if (!props.materialId || props.materialId <= 0) {
      throw new DomainError('销售明细物料ID不能为空');
    }
    if (!props.orderQty || props.orderQty <= 0) {
      throw new DomainError('销售数量必须大于0');
    }
    const amount = roundAmount(multiplyDecimal(props.orderQty || 0, props.unitPrice || 0));
    const taxRate = props.taxRate ?? 0;
    const taxAmount = roundAmount(multiplyDecimal(amount, taxRate / 100));
    const lineTotal = roundAmount(amount + taxAmount);
    return new SalesOrderLine(
      props.id,
      props.orderId,
      props.lineNo,
      props.materialId,
      props.materialCode || '',
      props.materialName || '',
      props.specification || '',
      props.unit || '件',
      props.orderQty,
      props.shippedQty || 0,
      props.unitPrice || 0,
      amount,
      taxRate,
      taxAmount,
      lineTotal,
      props.remark
    );
  }

  static reconstitute(props: SalesOrderLineProps): SalesOrderLine {
    const amount = props.amount || 0;
    const taxRate = props.taxRate || 0;
    const taxAmount = props.taxAmount || 0;
    const lineTotal = props.lineTotal || amount;
    return new SalesOrderLine(
      props.id,
      props.orderId,
      props.lineNo,
      props.materialId,
      props.materialCode || '',
      props.materialName || '',
      props.specification || '',
      props.unit || '件',
      props.orderQty,
      props.shippedQty || 0,
      props.unitPrice || 0,
      amount,
      taxRate,
      taxAmount,
      lineTotal,
      props.remark
    );
  }

  get orderQty(): number {
    return this._orderQty;
  }
  get shippedQty(): number {
    return this._shippedQty;
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

  get remainingQty(): number {
    return this._orderQty - this._shippedQty;
  }
  get isFullyShipped(): boolean {
    return this._shippedQty >= this._orderQty;
  }

  ship(quantity: number): void {
    if (quantity <= 0) throw new DomainError('出库数量必须大于0');
    const newShippedQty = this._shippedQty + quantity;
    if (newShippedQty > this._orderQty) {
      throw new DomainError(
        `出库数量超限: 行${this.lineNo} 订购${this._orderQty}, 已发${this._shippedQty}, 本次${quantity}`
      );
    }
    this._shippedQty = newShippedQty;
  }
}
