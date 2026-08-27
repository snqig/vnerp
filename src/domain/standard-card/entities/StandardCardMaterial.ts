export interface StandardCardMaterialProps {
  id?: number;
  standardCardId?: number;
  materialId: number;
  materialCode?: string;
  materialName?: string;
  spec?: string;
  unitConsumption: number;
  lossRate?: number;
  remark?: string;
}

export class StandardCardMaterial {
  readonly id?: number;
  readonly standardCardId?: number;
  readonly materialId: number;
  readonly materialCode?: string;
  readonly materialName?: string;
  readonly spec?: string;
  readonly unitConsumption: number;
  readonly lossRate: number;
  readonly remark?: string;

  constructor(props: StandardCardMaterialProps) {
    this.validate(props);
    this.id = props.id;
    this.standardCardId = props.standardCardId;
    this.materialId = props.materialId;
    this.materialCode = props.materialCode;
    this.materialName = props.materialName;
    this.spec = props.spec;
    this.unitConsumption = props.unitConsumption;
    this.lossRate = props.lossRate ?? 0;
    this.remark = props.remark;
  }

  private validate(props: StandardCardMaterialProps): void {
    if (!props.materialId) {
      throw new Error('物料ID不能为空');
    }
    if (props.unitConsumption < 0) {
      throw new Error('单耗不能为负数');
    }
    if (props.lossRate !== undefined && (props.lossRate < 0 || props.lossRate > 100)) {
      throw new Error('损耗率必须在0-100之间');
    }
  }

  get effectiveConsumption(): number {
    return this.unitConsumption * (1 + this.lossRate / 100);
  }

  toJSON(): StandardCardMaterialProps {
    return {
      id: this.id,
      standardCardId: this.standardCardId,
      materialId: this.materialId,
      materialCode: this.materialCode,
      materialName: this.materialName,
      spec: this.spec,
      unitConsumption: this.unitConsumption,
      lossRate: this.lossRate,
      remark: this.remark,
    };
  }
}
