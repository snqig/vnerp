export interface ProcessStandardItemProps {
  id?: number;
  standardCardId?: number;
  processId?: number;
  processName: string;
  processOrder: number;
  parameterName?: string;
  standardValue?: string;
  tolerance?: string;
  unit?: string;
  standardTime?: number;
  machineType?: string;
  description?: string;
  remark?: string;
}

export class ProcessStandardItem {
  readonly id?: number;
  readonly standardCardId?: number;
  readonly processId?: number;
  readonly processName: string;
  readonly processOrder: number;
  readonly parameterName?: string;
  readonly standardValue?: string;
  readonly tolerance?: string;
  readonly unit?: string;
  readonly standardTime?: number;
  readonly machineType?: string;
  readonly description?: string;
  readonly remark?: string;

  constructor(props: ProcessStandardItemProps) {
    this.validate(props);
    this.id = props.id;
    this.standardCardId = props.standardCardId;
    this.processId = props.processId;
    this.processName = props.processName;
    this.processOrder = props.processOrder;
    this.parameterName = props.parameterName;
    this.standardValue = props.standardValue;
    this.tolerance = props.tolerance;
    this.unit = props.unit;
    this.standardTime = props.standardTime;
    this.machineType = props.machineType;
    this.description = props.description;
    this.remark = props.remark;
  }

  private validate(props: ProcessStandardItemProps): void {
    if (!props.processName || props.processName.trim() === '') {
      throw new Error('工序名称不能为空');
    }
    if (props.processOrder < 0) {
      throw new Error('工序顺序不能为负数');
    }
    if (props.standardTime !== undefined && props.standardTime < 0) {
      throw new Error('标准工时不能为负数');
    }
  }

  get totalStandardTime(): number {
    return this.standardTime || 0;
  }

  toJSON(): ProcessStandardItemProps {
    return {
      id: this.id,
      standardCardId: this.standardCardId,
      processId: this.processId,
      processName: this.processName,
      processOrder: this.processOrder,
      parameterName: this.parameterName,
      standardValue: this.standardValue,
      tolerance: this.tolerance,
      unit: this.unit,
      standardTime: this.standardTime,
      machineType: this.machineType,
      description: this.description,
      remark: this.remark
    };
  }
}
