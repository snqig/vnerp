export interface StandardCardInkProps {
  id?: number;
  standardCardId?: number;
  inkId: number;
  inkCode?: string;
  inkName?: string;
  colorName?: string;
  ratio?: string;
  unitConsumption: number;
  remark?: string;
}

export class StandardCardInk {
  readonly id?: number;
  readonly standardCardId?: number;
  readonly inkId: number;
  readonly inkCode?: string;
  readonly inkName?: string;
  readonly colorName?: string;
  readonly ratio?: string;
  readonly unitConsumption: number;
  readonly remark?: string;

  constructor(props: StandardCardInkProps) {
    this.validate(props);
    this.id = props.id;
    this.standardCardId = props.standardCardId;
    this.inkId = props.inkId;
    this.inkCode = props.inkCode;
    this.inkName = props.inkName;
    this.colorName = props.colorName;
    this.ratio = props.ratio;
    this.unitConsumption = props.unitConsumption;
    this.remark = props.remark;
  }

  private validate(props: StandardCardInkProps): void {
    if (!props.inkId) {
      throw new Error('油墨ID不能为空');
    }
    if (props.unitConsumption < 0) {
      throw new Error('单耗不能为负数');
    }
    if (props.ratio && !/^[\d:]+$/.test(props.ratio)) {
      throw new Error('配比格式错误，应为数字和冒号组成');
    }
  }

  toJSON(): StandardCardInkProps {
    return {
      id: this.id,
      standardCardId: this.standardCardId,
      inkId: this.inkId,
      inkCode: this.inkCode,
      inkName: this.inkName,
      colorName: this.colorName,
      ratio: this.ratio,
      unitConsumption: this.unitConsumption,
      remark: this.remark,
    };
  }
}
