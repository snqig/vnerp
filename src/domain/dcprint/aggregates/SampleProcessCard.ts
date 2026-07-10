import { DomainError } from '../../shared/DomainTypes';

export type CardStatus = 1 | 2 | 3 | 4;

export interface SampleProcessItemProps {
  id?: number;
  cardId?: number;
  itemType: number;
  materialId?: number;
  materialCode: string;
  materialName: string;
  specification?: string;
  unitDosage: number;
  unit?: string;
  unitCost?: number;
  lineCost?: number;
  remark?: string;
  sort?: number;
}

export interface SampleProcessStepProps {
  id?: number;
  cardId?: number;
  processId?: number;
  processName: string;
  workHour: number;
  hourlyRate?: number;
  lineCost?: number;
  processParam?: string;
  sort?: number;
}

export interface SampleProcessCardProps {
  id?: number;
  sampleNo?: string;
  sampleName: string;
  customerId?: number;
  customerName?: string;
  productId?: number;
  productName?: string;
  versionNo?: string;
  status: CardStatus;
  substrateMaterialId?: number;
  substrateMaterialName?: string;
  spec?: string;
  printColor?: string;
  inkColorId?: number;
  screenPlateId?: number;
  dieToolId?: number;
  materialLossRate?: number;
  estimatedHour?: number;
  totalMaterialCost?: number;
  totalLaborCost?: number;
  totalToolCost?: number;
  totalCost?: number;
  diagramUrl?: string;
  remark?: string;
  sampleWorkOrderId?: number;
  sampleWorkOrderNo?: string;
  quoteId?: number;
  formalWorkOrderId?: number;
  sourceVersionId?: number;
  confirmBy?: number;
  confirmTime?: string;
  createBy?: number;
  createTime?: string;
  updateBy?: number;
  updateTime?: string;
  items?: SampleProcessItemProps[];
  steps?: SampleProcessStepProps[];
}

export class SampleProcessCard {
  private _domainEvents: Array<{ eventType: string; payload: unknown }> = [];

  private constructor(private _props: SampleProcessCardProps) {}

  get id(): number | undefined {
    return this._props.id;
  }
  get sampleNo(): string {
    return this._props.sampleNo || '';
  }
  get sampleName(): string {
    return this._props.sampleName;
  }
  get status(): CardStatus {
    return this._props.status;
  }
  get customerId(): number | undefined {
    return this._props.customerId;
  }
  get customerName(): string {
    return this._props.customerName || '';
  }
  get productId(): number | undefined {
    return this._props.productId;
  }
  get productName(): string {
    return this._props.productName || '';
  }
  get versionNo(): string {
    return this._props.versionNo || 'V1.0';
  }
  get substrateMaterialId(): number | undefined {
    return this._props.substrateMaterialId;
  }
  get substrateMaterialName(): string {
    return this._props.substrateMaterialName || '';
  }
  get spec(): string {
    return this._props.spec || '';
  }
  get printColor(): string {
    return this._props.printColor || '';
  }
  get inkColorId(): number | undefined {
    return this._props.inkColorId;
  }
  get screenPlateId(): number | undefined {
    return this._props.screenPlateId;
  }
  get dieToolId(): number | undefined {
    return this._props.dieToolId;
  }
  get materialLossRate(): number {
    return this._props.materialLossRate || 5;
  }
  get estimatedHour(): number {
    return this._props.estimatedHour || 0;
  }
  get totalMaterialCost(): number {
    return this._props.totalMaterialCost || 0;
  }
  get totalLaborCost(): number {
    return this._props.totalLaborCost || 0;
  }
  get totalToolCost(): number {
    return this._props.totalToolCost || 0;
  }
  get totalCost(): number {
    return this._props.totalCost || 0;
  }
  get diagramUrl(): string | undefined {
    return this._props.diagramUrl;
  }
  get remark(): string {
    return this._props.remark || '';
  }
  get items(): SampleProcessItemProps[] {
    return this._props.items || [];
  }
  get steps(): SampleProcessStepProps[] {
    return this._props.steps || [];
  }
  get createBy(): number | undefined {
    return this._props.createBy;
  }
  get createTime(): string | undefined {
    return this._props.createTime;
  }
  get confirmBy(): number | undefined {
    return this._props.confirmBy;
  }
  get confirmTime(): string | undefined {
    return this._props.confirmTime;
  }

  get isDraft(): boolean {
    return this._props.status === 1;
  }
  get isSampling(): boolean {
    return this._props.status === 2;
  }
  get isConfirmed(): boolean {
    return this._props.status === 3;
  }
  get isCancelled(): boolean {
    return this._props.status === 4;
  }

  get statusLabel(): string {
    const labels: Record<CardStatus, string> = { 1: '草稿', 2: '打样中', 3: '已确认', 4: '已作废' };
    return labels[this._props.status];
  }

  get canEdit(): boolean {
    return this._props.status === 1;
  }
  get canSubmit(): boolean {
    return this._props.status === 1;
  }
  get canConfirm(): boolean {
    return this._props.status === 2;
  }
  get canCancel(): boolean {
    return this._props.status === 1 || this._props.status === 2;
  }
  get canDelete(): boolean {
    return this._props.status === 1;
  }

  getDomainEvents() {
    return [...this._domainEvents];
  }
  clearDomainEvents() {
    this._domainEvents = [];
  }

  static create(props: SampleProcessCardProps): SampleProcessCard {
    if (!props.sampleName || !props.sampleName.trim()) {
      throw new DomainError('打样名称不能为空');
    }
    if (!props.items || props.items.length === 0) {
      throw new DomainError('至少需要一条物料明细');
    }
    if (!props.steps || props.steps.length === 0) {
      throw new DomainError('至少需要一条工序明细');
    }
    return new SampleProcessCard({ ...props, status: props.status || 1 });
  }

  static reconstitute(props: SampleProcessCardProps): SampleProcessCard {
    return new SampleProcessCard(props);
  }

  submit(): void {
    if (!this.canSubmit) throw new DomainError(`当前状态不允许提交`);
    this._props.status = 2;
  }

  confirm(confirmBy: number): void {
    if (!this.canConfirm) throw new DomainError(`当前状态不允许确认`);
    this._props.status = 3;
    this._props.confirmBy = confirmBy;
    this._props.confirmTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  cancel(): void {
    if (!this.canCancel) throw new DomainError(`当前状态不允许作废`);
    this._props.status = 4;
  }

  updateCosts(material: number, labor: number, tool: number): void {
    this._props.totalMaterialCost = Math.round(material * 10000) / 10000;
    this._props.totalLaborCost = Math.round(labor * 10000) / 10000;
    this._props.totalToolCost = Math.round(tool * 10000) / 10000;
    this._props.totalCost = Math.round((material + labor + tool) * 10000) / 10000;
  }

  toRow(): Record<string, unknown> {
    return {
      id: this._props.id,
      sample_no: this._props.sampleNo,
      sample_name: this._props.sampleName,
      customer_id: this._props.customerId,
      customer_name: this._props.customerName,
      product_id: this._props.productId,
      product_name: this._props.productName,
      version_no: this._props.versionNo,
      status: this._props.status,
      substrate_material_id: this._props.substrateMaterialId,
      substrate_material_name: this._props.substrateMaterialName,
      spec: this._props.spec,
      print_color: this._props.printColor,
      ink_color_id: this._props.inkColorId,
      screen_plate_id: this._props.screenPlateId,
      die_tool_id: this._props.dieToolId,
      material_loss_rate: this._props.materialLossRate,
      estimated_hour: this._props.estimatedHour,
      total_material_cost: this._props.totalMaterialCost,
      total_labor_cost: this._props.totalLaborCost,
      total_tool_cost: this._props.totalToolCost,
      total_cost: this._props.totalCost,
      diagram_url: this._props.diagramUrl,
      remark: this._props.remark,
      sample_work_order_id: this._props.sampleWorkOrderId,
      sample_work_order_no: this._props.sampleWorkOrderNo,
      quote_id: this._props.quoteId,
      formal_work_order_id: this._props.formalWorkOrderId,
      source_version_id: this._props.sourceVersionId,
      confirm_by: this._props.confirmBy,
      confirm_time: this._props.confirmTime,
      create_by: this._props.createBy,
      create_time: this._props.createTime,
      update_by: this._props.updateBy,
      update_time: this._props.updateTime,
    };
  }
}
