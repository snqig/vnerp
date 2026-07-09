import { StandardCardStatus } from '../value-objects/StandardCardStatus';
import { StandardCardType, getTypePrefix } from '../value-objects/StandardCardType';
import { ColorStandardItem } from '../entities/ColorStandardItem';
import { ProcessStandardItem } from '../entities/ProcessStandardItem';
import { QualityStandardItem } from '../entities/QualityStandardItem';
import { StandardCardMaterial } from '../entities/StandardCardMaterial';
import { StandardCardInk } from '../entities/StandardCardInk';
import { StandardCardTooling } from '../entities/StandardCardTooling';
import { StandardCardAttachment } from '../entities/StandardCardAttachment';
import { VersionChangeLog } from '../entities/VersionChangeLog';
import { DomainError } from '@/domain/shared/DomainTypes';

export interface StandardCardProps {
  id?: number;
  code: string;
  version: string;
  name: string;
  type: StandardCardType;
  materialId?: number;
  materialName?: string;
  customerId?: number;
  customerName?: string;
  spec?: string;
  status: StandardCardStatus;
  effectiveDate?: Date;
  expiryDate?: Date;
  parentVersionId?: number;
  isCurrent: boolean;
  isObsolete: boolean;
  isLocked: boolean;
  changeDescription?: string;
  obsoleteReason?: string;
  obsoleteBy?: number;
  obsoleteAt?: Date;
  qualityRequirement?: string;
  materialRequirement?: string;
  inkRequirement?: string;
  toolingRequirement?: string;
  processRequirement?: string;
  createUser?: number;
  createUserName?: string;
  auditUser?: number;
  auditUserName?: number;
  approveUser?: number;
  approveUserName?: string;
  confirmUser?: number;
  confirmUserName?: string;
  createTime?: Date;
  updateTime?: Date;
  remark?: string;
}

export class StandardCard {
  readonly id?: number;
  private _code: string;
  private _version: string;
  private _name: string;
  private _type: StandardCardType;
  private _materialId?: number;
  private _materialName?: string;
  private _customerId?: number;
  private _customerName?: string;
  private _spec?: string;
  private _status: StandardCardStatus;
  private _effectiveDate?: Date;
  private _expiryDate?: Date;
  private _parentVersionId?: number;
  private _isCurrent: boolean;
  private _isObsolete: boolean;
  private _isLocked: boolean;
  private _changeDescription?: string;
  private _obsoleteReason?: string;
  private _obsoleteBy?: number;
  private _obsoleteAt?: Date;
  private _qualityRequirement?: string;
  private _materialRequirement?: string;
  private _inkRequirement?: string;
  private _toolingRequirement?: string;
  private _processRequirement?: string;
  private _createUser?: number;
  private _auditUser?: number;
  private _approveUser?: number;
  private _confirmUser?: number;
  private _createTime?: Date;
  private _updateTime?: Date;
  private _remark?: string;

  private _colorItems: ColorStandardItem[] = [];
  private _processItems: ProcessStandardItem[] = [];
  private _qualityItems: QualityStandardItem[] = [];
  private _materials: StandardCardMaterial[] = [];
  private _inks: StandardCardInk[] = [];
  private _toolings: StandardCardTooling[] = [];
  private _attachments: StandardCardAttachment[] = [];
  private _versionLogs: VersionChangeLog[] = [];

  private _versionLogsNew: {
    version: string;
    changeType: string;
    changeContent: string;
    changedBy: number;
  }[] = [];

  constructor(props: StandardCardProps) {
    this.validateCreation(props);
    this.id = props.id;
    this._code = props.code;
    this._version = props.version;
    this._name = props.name;
    this._type = props.type;
    this._materialId = props.materialId;
    this._materialName = props.materialName;
    this._customerId = props.customerId;
    this._customerName = props.customerName;
    this._spec = props.spec;
    this._status = props.status;
    this._effectiveDate = props.effectiveDate;
    this._expiryDate = props.expiryDate;
    this._parentVersionId = props.parentVersionId;
    this._isCurrent = props.isCurrent;
    this._isObsolete = props.isObsolete;
    this._isLocked = props.isLocked;
    this._changeDescription = props.changeDescription;
    this._obsoleteReason = props.obsoleteReason;
    this._obsoleteBy = props.obsoleteBy;
    this._obsoleteAt = props.obsoleteAt;
    this._qualityRequirement = props.qualityRequirement;
    this._materialRequirement = props.materialRequirement;
    this._inkRequirement = props.inkRequirement;
    this._toolingRequirement = props.toolingRequirement;
    this._processRequirement = props.processRequirement;
    this._createUser = props.createUser;
    this._auditUser = props.auditUser;
    this._approveUser = props.approveUser;
    this._confirmUser = props.confirmUser;
    this._createTime = props.createTime;
    this._updateTime = props.updateTime;
    this._remark = props.remark;
  }

  private validateCreation(props: StandardCardProps): void {
    if (!props.code && !props.id) {
      throw new DomainError('标准卡编号不能为空');
    }
    if (!props.name || props.name.trim() === '') {
      throw new DomainError('标准卡名称不能为空');
    }
    if (!props.type) {
      throw new DomainError('标准卡类型不能为空');
    }
  }

  get code(): string {
    return this._code;
  }
  get version(): string {
    return this._version;
  }
  get name(): string {
    return this._name;
  }
  get type(): StandardCardType {
    return this._type;
  }
  get materialId(): number | undefined {
    return this._materialId;
  }
  get customerId(): number | undefined {
    return this._customerId;
  }
  get status(): StandardCardStatus {
    return this._status;
  }
  get effectiveDate(): Date | undefined {
    return this._effectiveDate;
  }
  get isCurrent(): boolean {
    return this._isCurrent;
  }
  get isObsolete(): boolean {
    return this._isObsolete;
  }
  get isLocked(): boolean {
    return this._isLocked;
  }
  get createUser(): number | undefined {
    return this._createUser;
  }
  get createTime(): Date | undefined {
    return this._createTime;
  }

  get colorItems(): ColorStandardItem[] {
    return [...this._colorItems];
  }
  get processItems(): ProcessStandardItem[] {
    return [...this._processItems];
  }
  get qualityItems(): QualityStandardItem[] {
    return [...this._qualityItems];
  }
  get materials(): StandardCardMaterial[] {
    return [...this._materials];
  }
  get inks(): StandardCardInk[] {
    return [...this._inks];
  }
  get toolings(): StandardCardTooling[] {
    return [...this._toolings];
  }
  get attachments(): StandardCardAttachment[] {
    return [...this._attachments];
  }
  get versionLogs(): VersionChangeLog[] {
    return [...this._versionLogs];
  }
  get versionLogsNew(): {
    version: string;
    changeType: string;
    changeContent: string;
    changedBy: number;
  }[] {
    return [...this._versionLogsNew];
  }

  submit(userId: number): void {
    if (this._status !== StandardCardStatus.DRAFT) {
      throw new DomainError('只有草稿状态的标准卡才能提交审核');
    }
    this._status = StandardCardStatus.AUDITING;
    this.addVersionLog('create', '提交审核', userId);
  }

  approve(userId: number): void {
    if (this._status !== StandardCardStatus.AUDITING) {
      throw new DomainError('只有待审核状态的标准卡才能批准');
    }
    this._status = StandardCardStatus.APPROVED;
    this._auditUser = userId;
    this.addVersionLog('update', '技术主管审核通过', userId);
  }

  reject(userId: number, reason: string): void {
    if (this._status !== StandardCardStatus.AUDITING) {
      throw new DomainError('只有待审核状态的标准卡才能驳回');
    }
    this._status = StandardCardStatus.DRAFT;
    this._auditUser = undefined;
    this.addVersionLog('update', `审核驳回: ${reason}`, userId);
  }

  confirm(userId: number): void {
    if (this._status !== StandardCardStatus.APPROVED) {
      throw new DomainError('只有已批准状态的标准卡才能确认');
    }
    this._status = StandardCardStatus.CONFIRMED;
    this._isCurrent = true;
    this._isLocked = true;
    this._confirmUser = userId;
    if (this._effectiveDate && !this._expiryDate) {
      this._expiryDate = new Date(this._effectiveDate);
      this._expiryDate.setFullYear(this._expiryDate.getFullYear() + 1);
    }
    this.addVersionLog('update', '客户确认', userId);
  }

  obsolete(userId: number, reason: string): void {
    if (![StandardCardStatus.APPROVED, StandardCardStatus.CONFIRMED].includes(this._status)) {
      throw new DomainError('已批准或已确认状态的标准卡才能作废');
    }
    this._status = StandardCardStatus.OBSOLETE;
    this._isObsolete = true;
    this._obsoleteReason = reason;
    this._obsoleteBy = userId;
    this._obsoleteAt = new Date();
    this._isCurrent = false;
    this.addVersionLog('obsolete', `作废原因: ${reason}`, userId);
  }

  createNewVersion(newVersion: string, userId: number): StandardCard {
    if (!this._isLocked) {
      throw new DomainError('只有已确认的标准卡才能创建新版本');
    }
    const newCard = new StandardCard({
      ...this.toProps(),
      id: undefined,
      code: this._code,
      version: newVersion,
      status: StandardCardStatus.DRAFT,
      parentVersionId: this.id,
      isCurrent: false,
      isObsolete: false,
      isLocked: false,
      effectiveDate: undefined,
      expiryDate: undefined,
      auditUser: undefined,
      approveUser: undefined,
      confirmUser: undefined,
      changeDescription: undefined,
      createTime: undefined,
      updateTime: undefined,
    });
    newCard.addVersionLog('create', `基于版本 ${this._version} 创建新版本`, userId);
    return newCard;
  }

  setColorItems(items: ColorStandardItem[]): void {
    this._colorItems = items;
    this._colorItems.forEach((item) => {
      if (!item.standardCardId && this.id) {
        (item as any).standardCardId = this.id;
      }
    });
  }

  setProcessItems(items: ProcessStandardItem[]): void {
    this._processItems = items;
    this._processItems.forEach((item) => {
      if (!item.standardCardId && this.id) {
        (item as any).standardCardId = this.id;
      }
    });
  }

  setQualityItems(items: QualityStandardItem[]): void {
    this._qualityItems = items;
    this._qualityItems.forEach((item) => {
      if (!item.standardCardId && this.id) {
        (item as any).standardCardId = this.id;
      }
    });
  }

  setMaterials(materials: StandardCardMaterial[]): void {
    this._materials = materials;
    this.updateMaterialRequirement();
  }

  setInks(inks: StandardCardInk[]): void {
    this._inks = inks;
    this.updateInkRequirement();
  }

  setToolings(toolings: StandardCardTooling[]): void {
    this._toolings = toolings;
    this.updateToolingRequirement();
  }

  setAttachments(attachments: StandardCardAttachment[]): void {
    this._attachments = attachments;
  }

  addAttachment(attachment: StandardCardAttachment): void {
    if (this._isLocked) {
      throw new DomainError('已确认的标准卡不能添加附件');
    }
    this._attachments.push(attachment);
  }

  private updateMaterialRequirement(): void {
    if (this._materials.length === 0) {
      this._materialRequirement = undefined;
      return;
    }
    const lines = this._materials.map(
      (m) =>
        `${m.materialName || m.materialId} | 规格: ${m.spec || '-'} | 单耗: ${m.unitConsumption} | 损耗: ${m.lossRate}%`
    );
    this._materialRequirement = lines.join('\n');
  }

  private updateInkRequirement(): void {
    if (this._inks.length === 0) {
      this._inkRequirement = undefined;
      return;
    }
    const lines = this._inks.map(
      (ink) =>
        `${ink.inkName || ink.inkId} | 配比: ${ink.ratio || '-'} | 单耗: ${ink.unitConsumption}`
    );
    this._inkRequirement = lines.join('\n');
  }

  private updateToolingRequirement(): void {
    if (this._toolings.length === 0) {
      this._toolingRequirement = undefined;
      return;
    }
    const lines = this._toolings.map((t) => t.toolingSummary);
    this._toolingRequirement = lines.join('\n');
  }

  private addVersionLog(
    changeType: 'create' | 'update' | 'obsolete' | 'restore',
    changeContent: string,
    changedBy: number
  ): void {
    this._versionLogsNew.push({
      version: this._version,
      changeType,
      changeContent,
      changedBy,
    });
  }

  getTotalStandardTime(): number {
    return this._processItems.reduce((sum, item) => sum + item.totalStandardTime, 0);
  }

  canBeUsedForProduction(): boolean {
    return (
      this._status === StandardCardStatus.CONFIRMED &&
      !this._isObsolete &&
      this._isCurrent &&
      (!this._expiryDate || new Date() < this._expiryDate)
    );
  }

  toProps(): StandardCardProps {
    return {
      id: this.id,
      code: this._code,
      version: this._version,
      name: this._name,
      type: this._type,
      materialId: this._materialId,
      materialName: this._materialName,
      customerId: this._customerId,
      customerName: this._customerName,
      spec: this._spec,
      status: this._status,
      effectiveDate: this._effectiveDate,
      expiryDate: this._expiryDate,
      parentVersionId: this._parentVersionId,
      isCurrent: this._isCurrent,
      isObsolete: this._isObsolete,
      isLocked: this._isLocked,
      changeDescription: this._changeDescription,
      obsoleteReason: this._obsoleteReason,
      obsoleteBy: this._obsoleteBy,
      obsoleteAt: this._obsoleteAt,
      qualityRequirement: this._qualityRequirement,
      materialRequirement: this._materialRequirement,
      inkRequirement: this._inkRequirement,
      toolingRequirement: this._toolingRequirement,
      processRequirement: this._processRequirement,
      createUser: this._createUser,
      auditUser: this._auditUser,
      approveUser: this._approveUser,
      confirmUser: this._confirmUser,
      createTime: this._createTime,
      updateTime: this._updateTime,
      remark: this._remark,
    };
  }

  static generateCode(type: StandardCardType): string {
    const prefix = getTypePrefix(type);
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `${prefix}${dateStr}${seq}`;
  }

  static generateVersion(currentVersion?: string): string {
    if (!currentVersion) return '1.0';
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    return `${major}.${minor + 1}`;
  }
}
