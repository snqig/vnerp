/**
 * 油墨配方版本聚合根
 *
 * 封装核心业务规则：
 * - 状态流转：草稿→已生效→已作废
 * - 版本号生成：复用时次版本号+1，重大调整主版本号+1
 * - 一键复用：复制源版本全部明细与工艺参数
 * - 成本快照：生效瞬间固化成本
 * - 明细校验：比例合法性、物料编码非空
 *
 * 依据: docs/油墨配方版本管理完整落地方案.md 第一、三节
 */
import { FormulaStatus, canTransition, isEditable } from '../value-objects/FormulaStatus';
import { FormulaItemVO, FormulaItemProps } from '../value-objects/FormulaItemVO';
import { DomainError, DomainEvent, InvalidTransitionError } from '@/domain/shared/DomainTypes';
import {
  FormulaVersionActivatedEvent,
  FormulaVersionCancelledEvent,
} from '../events/FormulaVersionEvents';

export interface InkFormulaVersionProps {
  id?: number;
  colorId: number;
  versionNo: string;
  versionName?: string | null;
  status: FormulaStatus;
  changeReason?: string | null;
  sourceVersionId?: number | null;
  processNote?: string | null;
  totalWeight?: number | null;
  unit?: string;
  shelfLifeHours?: number;

  // 成本快照
  theoreticalCost?: number | null;
  costSnapshotTime?: Date | null;
  costCalcStatus?: number;
  costWarning?: string | null;

  // 审计字段
  activateBy?: number | null;
  activateTime?: Date | null;
  cancelBy?: number | null;
  cancelReason?: string | null;
  cancelTime?: Date | null;
  createBy?: number | null;
  createTime?: Date | null;
  updateBy?: number | null;
  updateTime?: Date | null;

  items?: FormulaItemVO[];
}

export interface CostSnapshotResult {
  totalCost: number;
  itemCosts: { itemId?: number; materialCode: string; unitCost: number; itemCost: number }[];
  status: number; // 0-未计算 1-完成 2-部分缺失
  warning: string | null;
}

export class InkFormulaVersion {
  readonly id?: number;
  private _colorId: number;
  private _versionNo: string;
  private _versionName: string | null;
  private _status: FormulaStatus;
  private _changeReason: string | null;
  private _sourceVersionId: number | null;
  private _processNote: string | null;
  private _totalWeight: number | null;
  private _unit: string;
  private _shelfLifeHours: number;

  private _theoreticalCost: number | null;
  private _costSnapshotTime: Date | null;
  private _costCalcStatus: number;
  private _costWarning: string | null;

  private _activateBy: number | null;
  private _activateTime: Date | null;
  private _cancelBy: number | null;
  private _cancelReason: string | null;
  private _cancelTime: Date | null;
  private _createBy: number | null;
  private _createTime: Date | null;
  private _updateBy: number | null;
  private _updateTime: Date | null;

  private _items: FormulaItemVO[];
  private _domainEvents: DomainEvent[] = [];

  constructor(props: InkFormulaVersionProps) {
    this.validateCreation(props);
    this.id = props.id;
    this._colorId = props.colorId;
    this._versionNo = props.versionNo;
    this._versionName = props.versionName ?? null;
    this._status = props.status;
    this._changeReason = props.changeReason ?? null;
    this._sourceVersionId = props.sourceVersionId ?? null;
    this._processNote = props.processNote ?? null;
    this._totalWeight = props.totalWeight ?? null;
    this._unit = props.unit ?? 'kg';
    this._shelfLifeHours = props.shelfLifeHours ?? 168;
    this._theoreticalCost = props.theoreticalCost ?? null;
    this._costSnapshotTime = props.costSnapshotTime ?? null;
    this._costCalcStatus = props.costCalcStatus ?? 0;
    this._costWarning = props.costWarning ?? null;
    this._activateBy = props.activateBy ?? null;
    this._activateTime = props.activateTime ?? null;
    this._cancelBy = props.cancelBy ?? null;
    this._cancelReason = props.cancelReason ?? null;
    this._cancelTime = props.cancelTime ?? null;
    this._createBy = props.createBy ?? null;
    this._createTime = props.createTime ?? null;
    this._updateBy = props.updateBy ?? null;
    this._updateTime = props.updateTime ?? null;
    this._items = props.items ?? [];
  }

  private validateCreation(props: InkFormulaVersionProps): void {
    if (!props.colorId || props.colorId <= 0) {
      throw new DomainError('色号ID不能为空');
    }
    if (!props.versionNo || props.versionNo.trim() === '') {
      throw new DomainError('版本号不能为空');
    }
    if (!props.versionNo.match(/^V\d+\.\d+$/)) {
      throw new DomainError(`版本号格式不合法: ${props.versionNo}，应为 V主.次 格式`);
    }
  }

  // ===== Getters =====

  get colorId(): number {
    return this._colorId;
  }
  get versionNo(): string {
    return this._versionNo;
  }
  get versionName(): string | null {
    return this._versionName;
  }
  get status(): FormulaStatus {
    return this._status;
  }
  get changeReason(): string | null {
    return this._changeReason;
  }
  get sourceVersionId(): number | null {
    return this._sourceVersionId;
  }
  get processNote(): string | null {
    return this._processNote;
  }
  get totalWeight(): number | null {
    return this._totalWeight;
  }
  get unit(): string {
    return this._unit;
  }
  get shelfLifeHours(): number {
    return this._shelfLifeHours;
  }
  get theoreticalCost(): number | null {
    return this._theoreticalCost;
  }
  get costSnapshotTime(): Date | null {
    return this._costSnapshotTime;
  }
  get costCalcStatus(): number {
    return this._costCalcStatus;
  }
  get costWarning(): string | null {
    return this._costWarning;
  }
  get activateBy(): number | null {
    return this._activateBy;
  }
  get activateTime(): Date | null {
    return this._activateTime;
  }
  get cancelBy(): number | null {
    return this._cancelBy;
  }
  get cancelReason(): string | null {
    return this._cancelReason;
  }
  get cancelTime(): Date | null {
    return this._cancelTime;
  }
  get createBy(): number | null {
    return this._createBy;
  }
  get createTime(): Date | null {
    return this._createTime;
  }
  get updateBy(): number | null {
    return this._updateBy;
  }
  get updateTime(): Date | null {
    return this._updateTime;
  }
  get items(): FormulaItemVO[] {
    return [...this._items];
  }

  // ===== 领域事件 =====

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  // ===== 状态判断 =====

  get isDraft(): boolean {
    return this._status === FormulaStatus.DRAFT;
  }
  get isActive(): boolean {
    return this._status === FormulaStatus.ACTIVE;
  }
  get isCancelled(): boolean {
    return this._status === FormulaStatus.CANCELLED;
  }
  get canEdit(): boolean {
    return isEditable(this._status);
  }
  get canDelete(): boolean {
    return this._status !== FormulaStatus.ACTIVE;
  }

  // ===== 状态流转 =====

  /** 版本生效：草稿 → 已生效 */
  activate(operatorId: number): void {
    if (!canTransition(this._status, FormulaStatus.ACTIVE)) {
      throw new InvalidTransitionError(getStatusLabel(this._status), '已生效');
    }
    this._status = FormulaStatus.ACTIVE;
    this._activateBy = operatorId;
    this._activateTime = new Date();
    this._updateBy = operatorId;

    // T101: 触发配方生效事件
    if (this.id) {
      this._domainEvents.push(
        new FormulaVersionActivatedEvent({
          versionId: this.id,
          colorId: this._colorId,
          versionNo: this._versionNo,
          activatedBy: operatorId,
          theoreticalCost: this._theoreticalCost,
        })
      );
    }
  }

  /** 版本作废：已生效 → 已作废 */
  cancel(operatorId: number, reason: string): void {
    if (!canTransition(this._status, FormulaStatus.CANCELLED)) {
      throw new InvalidTransitionError(getStatusLabel(this._status), '已作废');
    }
    if (!reason || reason.trim() === '') {
      throw new DomainError('作废原因不能为空');
    }
    this._status = FormulaStatus.CANCELLED;
    this._cancelBy = operatorId;
    this._cancelReason = reason;
    this._cancelTime = new Date();
    this._updateBy = operatorId;

    // T101: 触发配方作废事件
    if (this.id) {
      this._domainEvents.push(
        new FormulaVersionCancelledEvent({
          versionId: this.id,
          colorId: this._colorId,
          versionNo: this._versionNo,
          cancelledBy: operatorId,
          reason,
        })
      );
    }
  }

  // ===== 明细操作 =====

  /** 更新明细（仅草稿可操作） */
  updateItems(newItems: FormulaItemProps[]): void {
    if (!this.canEdit) {
      throw new DomainError('只有草稿版本可以修改明细');
    }
    this._items = newItems.map((item, index) => {
      const props = { ...item };
      if (props.sort === undefined) props.sort = index + 1;
      return new FormulaItemVO(props);
    });
    // 明细变更后重置成本状态
    this._costCalcStatus = 0;
    this._costWarning = null;
  }

  /** 更新基础信息（仅草稿可操作） */
  updateBaseInfo(data: {
    versionName?: string | null;
    changeReason?: string | null;
    processNote?: string | null;
    totalWeight?: number | null;
    unit?: string;
    shelfLifeHours?: number;
  }): void {
    if (!this.canEdit) {
      throw new DomainError('只有草稿版本可以编辑');
    }
    if (data.versionName !== undefined) this._versionName = data.versionName;
    if (data.changeReason !== undefined) this._changeReason = data.changeReason;
    if (data.processNote !== undefined) this._processNote = data.processNote;
    if (data.totalWeight !== undefined) this._totalWeight = data.totalWeight;
    if (data.unit !== undefined) this._unit = data.unit;
    if (data.shelfLifeHours !== undefined) this._shelfLifeHours = data.shelfLifeHours;
  }

  // ===== 成本快照 =====

  /** 固化成本快照（生效时调用） */
  snapshotCost(costResult: CostSnapshotResult): void {
    this._theoreticalCost = costResult.totalCost;
    this._costSnapshotTime = new Date();
    this._costCalcStatus = costResult.status;
    this._costWarning = costResult.warning;

    // 更新明细的快照成本
    this._items = this._items.map((item) => {
      const costInfo = costResult.itemCosts.find((c) => c.materialCode === item.materialCode);
      if (costInfo) {
        return new FormulaItemVO({
          ...item.toProps(),
          snapshotUnitCost: costInfo.unitCost,
        });
      }
      return item;
    });
  }

  // ===== 版本号生成 =====

  /**
   * 生成下一个版本号
   * @param current 当前版本号 (如 V1.2)
   * @param majorBump 是否主版本号升级
   * @returns 新版本号 (如 V1.3 或 V2.0)
   */
  static generateNextVersionNo(current: string, majorBump = false): string {
    const match = current.match(/^V(\d+)\.(\d+)$/);
    if (!match) {
      return 'V1.0';
    }
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (majorBump) {
      return `V${major + 1}.0`;
    }
    return `V${major}.${minor + 1}`;
  }

  /**
   * 根据已有版本列表生成新版本号
   * 如果有色号下已有版本，取最新版本号 +1
   */
  static generateVersionNo(existingVersionNos: string[]): string {
    if (existingVersionNos.length === 0) {
      return 'V1.0';
    }
    // 取最后一个版本号
    const last = existingVersionNos[existingVersionNos.length - 1];
    return this.generateNextVersionNo(last, false);
  }

  // ===== 工厂方法 =====

  /** 创建草稿版本 */
  static createDraft(
    colorId: number,
    baseInfo: {
      versionNo: string;
      versionName?: string | null;
      changeReason?: string | null;
      processNote?: string | null;
      totalWeight?: number | null;
      unit?: string;
      shelfLifeHours?: number;
    },
    items: FormulaItemProps[],
    operatorId: number
  ): InkFormulaVersion {
    return new InkFormulaVersion({
      colorId,
      versionNo: baseInfo.versionNo,
      versionName: baseInfo.versionName ?? null,
      status: FormulaStatus.DRAFT,
      changeReason: baseInfo.changeReason ?? null,
      processNote: baseInfo.processNote ?? null,
      totalWeight: baseInfo.totalWeight ?? null,
      unit: baseInfo.unit ?? 'kg',
      shelfLifeHours: baseInfo.shelfLifeHours ?? 168,
      costCalcStatus: 0,
      createBy: operatorId,
      updateBy: operatorId,
      items: items.map((item, index) => {
        const props = { ...item };
        if (props.sort === undefined) props.sort = index + 1;
        return new FormulaItemVO(props);
      }),
    });
  }

  /** 一键复用：从源版本创建草稿 */
  static duplicateFrom(
    source: InkFormulaVersion,
    options: {
      versionName?: string | null;
      changeReason?: string | null;
      majorVersion?: boolean;
    },
    operatorId: number
  ): InkFormulaVersion {
    const newVersionNo = this.generateNextVersionNo(
      source.versionNo,
      options.majorVersion ?? false
    );

    return new InkFormulaVersion({
      colorId: source.colorId,
      versionNo: newVersionNo,
      versionName: options.versionName ?? `复制自 ${source.versionNo}`,
      status: FormulaStatus.DRAFT,
      changeReason: options.changeReason ?? `从 ${source.versionNo} 一键复用`,
      sourceVersionId: source.id ?? null,
      processNote: source.processNote,
      totalWeight: source.totalWeight,
      unit: source.unit,
      shelfLifeHours: source.shelfLifeHours,
      costCalcStatus: 0,
      createBy: operatorId,
      updateBy: operatorId,
      items: source.items.map((item) => {
        const props = item.toProps();
        // 复用时清除 id 和快照成本
        return new FormulaItemVO({
          ...props,
          id: undefined,
          versionId: undefined,
          snapshotUnitCost: null,
        });
      }),
    });
  }

  /** 从数据库行重建聚合根 */
  static fromRow(row: any, items?: FormulaItemVO[]): InkFormulaVersion {
    return new InkFormulaVersion({
      id: row.id,
      colorId: row.color_id,
      versionNo: row.version_no,
      versionName: row.version_name,
      status: row.status as FormulaStatus,
      changeReason: row.change_reason,
      sourceVersionId: row.source_version_id,
      processNote: row.process_note,
      totalWeight: row.total_weight != null ? Number(row.total_weight) : null,
      unit: row.unit,
      shelfLifeHours: row.shelf_life_hours,
      theoreticalCost: row.theoretical_cost != null ? Number(row.theoretical_cost) : null,
      costSnapshotTime: row.cost_snapshot_time ? new Date(row.cost_snapshot_time) : null,
      costCalcStatus: row.cost_calc_status ?? 0,
      costWarning: row.cost_warning,
      activateBy: row.activate_by,
      activateTime: row.activate_time ? new Date(row.activate_time) : null,
      cancelBy: row.cancel_by,
      cancelReason: row.cancel_reason,
      cancelTime: row.cancel_time ? new Date(row.cancel_time) : null,
      createBy: row.create_by,
      createTime: row.create_time ? new Date(row.create_time) : null,
      updateBy: row.update_by,
      updateTime: row.update_time ? new Date(row.update_time) : null,
      items,
    });
  }

  /** 转为属性对象 */
  toProps(): InkFormulaVersionProps {
    return {
      id: this.id,
      colorId: this._colorId,
      versionNo: this._versionNo,
      versionName: this._versionName,
      status: this._status,
      changeReason: this._changeReason,
      sourceVersionId: this._sourceVersionId,
      processNote: this._processNote,
      totalWeight: this._totalWeight,
      unit: this._unit,
      shelfLifeHours: this._shelfLifeHours,
      theoreticalCost: this._theoreticalCost,
      costSnapshotTime: this._costSnapshotTime,
      costCalcStatus: this._costCalcStatus,
      costWarning: this._costWarning,
      activateBy: this._activateBy,
      activateTime: this._activateTime,
      cancelBy: this._cancelBy,
      cancelReason: this._cancelReason,
      cancelTime: this._cancelTime,
      createBy: this._createBy,
      createTime: this._createTime,
      updateBy: this._updateBy,
      updateTime: this._updateTime,
      items: [...this._items],
    };
  }
}

function getStatusLabel(status: FormulaStatus): string {
  const labels: Record<FormulaStatus, string> = {
    [FormulaStatus.DRAFT]: '草稿',
    [FormulaStatus.ACTIVE]: '已生效',
    [FormulaStatus.CANCELLED]: '已作废',
  };
  return labels[status] || String(status);
}
