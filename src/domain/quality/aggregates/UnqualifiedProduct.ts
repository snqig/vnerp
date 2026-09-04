import { t } from '@/lib/server-translate';

import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { UnqualifiedStatus, UnqualifiedStatusValue } from '../value-objects/UnqualifiedStatus';
import { HandleMethod, HandleMethodValue } from '../value-objects/HandleMethod';
import {
  UnqualifiedCreatedEvent,
  HandlingStartedEvent,
  UnqualifiedCompletedEvent,
} from '../events/UnqualifiedEvents';

export interface UnqualifiedProductProps {
  id?: number;
  unqualifiedNo?: string;
  handleNo?: string;
  inspectionId: number;
  sourceType?: string;
  sourceNo?: string;
  materialId?: number;
  materialCode?: string;
  materialName?: string;
  quantity: number;
  defectType?: string;
  defectDesc?: string;
  handleType?: HandleMethodValue;
  status?: UnqualifiedStatusValue;
  responsibleDept?: string;
  responsiblePerson?: string;
  costAmount?: number;
  handler?: string;
  handleDate?: string;
  remark?: string;
  createBy?: number;
  updateBy?: number;
  createTime?: string;
  updateTime?: string;
}

export class UnqualifiedProduct {
  private _domainEvents: DomainEvent[] = [];
  private _responsibleDept: string | undefined;
  private _responsiblePerson: string | undefined;
  private _handleType: HandleMethod | undefined;
  private _handler: string | undefined;
  private _handleResult: number | undefined;
  private _costAmount: number | undefined;
  private _handleDate: string | undefined;
  private _remark: string | undefined;

  private constructor(
    public readonly id: number | undefined,
    public readonly unqualifiedNo: string,
    public readonly handleNo: string,
    public readonly inspectionId: number,
    public readonly sourceType: string | undefined,
    public readonly sourceNo: string | undefined,
    public readonly materialId: number | undefined,
    public readonly materialCode: string | undefined,
    public readonly materialName: string | undefined,
    public readonly quantity: number,
    public readonly defectType: string | undefined,
    public readonly defectDesc: string | undefined,
    private _status: UnqualifiedStatus,
    handleType: HandleMethod | undefined,
    responsibleDept: string | undefined,
    responsiblePerson: string | undefined,
    costAmount: number | undefined,
    handler: string | undefined,
    handleDate: string | undefined,
    handleResult: number | undefined,
    remark: string | undefined,
    public readonly createBy: number | undefined,
    public readonly updateBy: number | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {
    this._handleType = handleType;
    this._responsibleDept = responsibleDept;
    this._responsiblePerson = responsiblePerson;
    this._costAmount = costAmount;
    this._handler = handler;
    this._handleDate = handleDate;
    this._handleResult = handleResult;
    this._remark = remark;
  }

  static create(props: UnqualifiedProductProps): UnqualifiedProduct {
  const ts = t;
    if (!props.inspectionId || props.inspectionId <= 0) {
      throw new DomainError(ts('k_sldnwj'));
    }
    if (props.quantity === undefined || props.quantity <= 0) {
      throw new DomainError(ts('k_1r79tz4'));
    }

    const handleType = props.handleType ? HandleMethod.from(props.handleType) : undefined;
    const product = new UnqualifiedProduct(
      props.id,
      props.unqualifiedNo || '',
      props.handleNo || '',
      props.inspectionId,
      props.sourceType,
      props.sourceNo,
      props.materialId,
      props.materialCode,
      props.materialName,
      props.quantity,
      props.defectType,
      props.defectDesc,
      UnqualifiedStatus.pending(),
      handleType,
      props.responsibleDept,
      props.responsiblePerson,
      props.costAmount,
      props.handler,
      props.handleDate,
      undefined,
      props.remark,
      props.createBy,
      props.updateBy,
      props.createTime,
      props.updateTime
    );

    if (product.id) {
      product._domainEvents.push(
        new UnqualifiedCreatedEvent({
          recordId: product.id,
          unqualifiedNo: product.unqualifiedNo,
          handleNo: product.handleNo,
          inspectionId: product.inspectionId,
          sourceType: product.sourceType,
          sourceNo: product.sourceNo,
          materialId: product.materialId,
          materialName: product.materialName,
          quantity: product.quantity,
          defectType: product.defectType,
          handleType: handleType?.value,
        })
      );
    }

    return product;
  }

  static reconstitute(props: UnqualifiedProductProps): UnqualifiedProduct {
    const handleType = props.handleType ? HandleMethod.from(props.handleType) : undefined;
    return new UnqualifiedProduct(
      props.id,
      props.unqualifiedNo || '',
      props.handleNo || '',
      props.inspectionId,
      props.sourceType,
      props.sourceNo,
      props.materialId,
      props.materialCode,
      props.materialName,
      props.quantity,
      props.defectType,
      props.defectDesc,
      UnqualifiedStatus.from(props.status || 'pending'),
      handleType,
      props.responsibleDept,
      props.responsiblePerson,
      props.costAmount,
      props.handler,
      props.handleDate,
      undefined,
      props.remark,
      props.createBy,
      props.updateBy,
      props.createTime,
      props.updateTime
    );
  }

  get status(): UnqualifiedStatus {
    return this._status;
  }

  get handleType(): HandleMethod | undefined {
    return this._handleType;
  }

  get responsibleDept(): string | undefined {
    return this._responsibleDept;
  }

  get responsiblePerson(): string | undefined {
    return this._responsiblePerson;
  }

  get handler(): string | undefined {
    return this._handler;
  }

  get handleResult(): number | undefined {
    return this._handleResult;
  }

  get costAmount(): number | undefined {
    return this._costAmount;
  }

  get handleDate(): string | undefined {
    return this._handleDate;
  }

  get remark(): string | undefined {
    return this._remark;
  }

  assignResponsible(dept: string, person: string): void {
  const ts = t;
    if (this._status.value === 'completed') {
      throw new DomainError(`当前状态"${this._status.label()}"不允许分配责任人`);
    }
    if (!dept || !dept.trim()) {
      throw new DomainError(ts('k_1tuvq05'));
    }
    if (!person || !person.trim()) {
      throw new DomainError(ts('k_1joih2d'));
    }
    this._responsibleDept = dept.trim();
    this._responsiblePerson = person.trim();
  }

  startHandle(handleType: HandleMethodValue, responsibleDept: string, responsiblePerson: string): void {
    if (!this._status.canStartHandle()) {
      throw new DomainError(`当前状态"${this._status.label()}"不允许开始处理`);
    }
    this._handleType = HandleMethod.from(handleType);
    this.assignResponsible(responsibleDept, responsiblePerson);
    this._status = this._status.transitionTo('handling');

    this._domainEvents.push(
      new HandlingStartedEvent({
        recordId: this.id!,
        unqualifiedNo: this.unqualifiedNo,
        handleNo: this.handleNo,
        handleType: this._handleType.value,
        responsibleDept: this._responsibleDept!,
        responsiblePerson: this._responsiblePerson!,
      })
    );
  }

  completeHandle(handler: string, handleResult: number, costAmount: number): void {
  const ts = t;
    if (!this._status.canComplete()) {
      throw new DomainError(`当前状态"${this._status.label()}"不允许完成处理`);
    }
    if (!this._responsibleDept || !this._responsiblePerson) {
      throw new DomainError(ts('k_17qioo1'));
    }
    if (!handler || !handler.trim()) {
      throw new DomainError(ts('k_z5ky01'));
    }
    if (handleResult !== 1 && handleResult !== 2) {
      throw new DomainError(ts('k_1qad9h0'));
    }
    if (costAmount < 0) {
      throw new DomainError(ts('k_sxaiey'));
    }

    this._handler = handler.trim();
    this._handleResult = handleResult;
    this._costAmount = costAmount;
    this._handleDate = new Date().toISOString().slice(0, 10);
    this._status = this._status.transitionTo('completed');

    this._domainEvents.push(
      new UnqualifiedCompletedEvent({
        recordId: this.id!,
        unqualifiedNo: this.unqualifiedNo,
        handleNo: this.handleNo,
        handler: this._handler,
        handleResult: this._handleResult,
        costAmount: this._costAmount,
      })
    );
  }

  canEdit(): boolean {
    return this._status.canEdit();
  }

  canDelete(): boolean {
    return this._status.canDelete();
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
