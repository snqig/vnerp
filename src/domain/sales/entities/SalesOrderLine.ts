import { DomainError } from '../../shared/DomainTypes';

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
  remark?: string;
}

export class SalesOrderLine {
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
    public readonly remark: string | undefined
  ) {}

  static create(props: SalesOrderLineProps): SalesOrderLine {
    if (!props.materialId || props.materialId <= 0) {
      throw new DomainError('销售明细物料ID不能为空');
    }
    if (!props.orderQty || props.orderQty <= 0) {
      throw new DomainError('销售数量必须大于0');
    }
    const amount = (props.orderQty || 0) * (props.unitPrice || 0);
    return new SalesOrderLine(
      props.id, props.orderId, props.lineNo,
      props.materialId, props.materialCode || '', props.materialName || '',
      props.specification || '', props.unit || '件',
      props.orderQty, props.shippedQty || 0, props.unitPrice || 0, amount,
      props.remark
    );
  }

  static reconstitute(props: SalesOrderLineProps): SalesOrderLine {
    return new SalesOrderLine(
      props.id, props.orderId, props.lineNo,
      props.materialId, props.materialCode || '', props.materialName || '',
      props.specification || '', props.unit || '件',
      props.orderQty, props.shippedQty || 0, props.unitPrice || 0,
      props.amount || 0, props.remark
    );
  }

  get orderQty(): number { return this._orderQty; }
  get shippedQty(): number { return this._shippedQty; }
  get unitPrice(): number { return this._unitPrice; }
  get amount(): number { return this._amount; }

  get remainingQty(): number { return this._orderQty - this._shippedQty; }
  get isFullyShipped(): boolean { return this._shippedQty >= this._orderQty; }

  ship(quantity: number): void {
    if (quantity <= 0) throw new DomainError('出库数量必须大于0');
    const newShippedQty = this._shippedQty + quantity;
    if (newShippedQty > this._orderQty) {
      throw new DomainError(`出库数量超限: 行${this.lineNo} 订购${this._orderQty}, 已发${this._shippedQty}, 本次${quantity}`);
    }
    this._shippedQty = newShippedQty;
  }
}
