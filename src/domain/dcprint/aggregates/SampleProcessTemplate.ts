import { DomainError } from '../../shared/DomainTypes';

export interface TemplateItemProps {
  id?: number;
  templateId?: number;
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

export interface TemplateStepProps {
  id?: number;
  templateId?: number;
  processId?: number;
  processName: string;
  workHour: number;
  hourlyRate?: number;
  lineCost?: number;
  processParam?: string;
  sort?: number;
}

export interface SampleProcessTemplateProps {
  id?: number;
  templateNo?: string;
  templateName: string;
  category?: string;
  tags?: string;
  description?: string;
  sourceCardId?: number;
  customerId?: number;
  customerName?: string;
  productName?: string;
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
  status?: number;
  usageCount?: number;
  createBy?: number;
  createTime?: string;
  updateBy?: number;
  updateTime?: string;
  items?: TemplateItemProps[];
  steps?: TemplateStepProps[];
}

export class SampleProcessTemplate {
  private _props: SampleProcessTemplateProps;

  private constructor(props: SampleProcessTemplateProps) {
    this._props = { ...props, status: props.status ?? 1, usageCount: props.usageCount ?? 0 };
  }

  get id(): number | undefined {
    return this._props.id;
  }
  get templateNo(): string {
    return this._props.templateNo || '';
  }
  get templateName(): string {
    return this._props.templateName;
  }
  get category(): string {
    return this._props.category || '';
  }
  get description(): string {
    return this._props.description || '';
  }
  get customerId(): number | undefined {
    return this._props.customerId;
  }
  get customerName(): string {
    return this._props.customerName || '';
  }
  get productName(): string {
    return this._props.productName || '';
  }
  get status(): number {
    return this._props.status || 1;
  }
  get usageCount(): number {
    return this._props.usageCount || 0;
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
  get items(): TemplateItemProps[] {
    return this._props.items || [];
  }
  get steps(): TemplateStepProps[] {
    return this._props.steps || [];
  }

  get canDelete(): boolean {
    return this._props.status === 1;
  }

  getDomainEvents() {
    return [];
  }
  clearDomainEvents() {}

  static create(props: SampleProcessTemplateProps): SampleProcessTemplate {
    if (!props.templateName || !props.templateName.trim()) {
      throw new DomainError('模板名称不能为空');
    }
    return new SampleProcessTemplate(props);
  }

  static reconstitute(props: SampleProcessTemplateProps): SampleProcessTemplate {
    return new SampleProcessTemplate(props);
  }

  incrementUsage(): void {
    this._props.usageCount = (this._props.usageCount || 0) + 1;
  }

  toRow(): Record<string, unknown> {
    return {
      id: this._props.id,
      template_no: this._props.templateNo,
      template_name: this._props.templateName,
      category: this._props.category,
      tags: this._props.tags,
      description: this._props.description,
      source_card_id: this._props.sourceCardId,
      customer_id: this._props.customerId,
      customer_name: this._props.customerName,
      product_name: this._props.productName,
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
      status: this._props.status,
      usage_count: this._props.usageCount,
      create_by: this._props.createBy,
    };
  }
}
