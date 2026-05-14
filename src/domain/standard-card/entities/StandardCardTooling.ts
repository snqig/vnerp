export interface StandardCardToolingProps {
  id?: number;
  standardCardId?: number;
  dieMoldId?: number;
  dieMoldCode?: string;
  dieMoldName?: string;
  screenPlateId?: number;
  screenPlateCode?: string;
  screenPlateName?: string;
  remark?: string;
}

export class StandardCardTooling {
  readonly id?: number;
  readonly standardCardId?: number;
  readonly dieMoldId?: number;
  readonly dieMoldCode?: string;
  readonly dieMoldName?: string;
  readonly screenPlateId?: number;
  readonly screenPlateCode?: string;
  readonly screenPlateName?: string;
  readonly remark?: string;

  constructor(props: StandardCardToolingProps) {
    this.validate(props);
    this.id = props.id;
    this.standardCardId = props.standardCardId;
    this.dieMoldId = props.dieMoldId;
    this.dieMoldCode = props.dieMoldCode;
    this.dieMoldName = props.dieMoldName;
    this.screenPlateId = props.screenPlateId;
    this.screenPlateCode = props.screenPlateCode;
    this.screenPlateName = props.screenPlateName;
    this.remark = props.remark;
  }

  private validate(props: StandardCardToolingProps): void {
    if (!props.dieMoldId && !props.screenPlateId) {
      throw new Error('刀模和网版至少需要选择一个');
    }
  }

  get toolingSummary(): string {
    const parts: string[] = [];
    if (this.dieMoldName) parts.push(`刀模: ${this.dieMoldName}`);
    if (this.screenPlateName) parts.push(`网版: ${this.screenPlateName}`);
    return parts.join(', ');
  }

  toJSON(): StandardCardToolingProps {
    return {
      id: this.id,
      standardCardId: this.standardCardId,
      dieMoldId: this.dieMoldId,
      dieMoldCode: this.dieMoldCode,
      dieMoldName: this.dieMoldName,
      screenPlateId: this.screenPlateId,
      screenPlateCode: this.screenPlateCode,
      screenPlateName: this.screenPlateName,
      remark: this.remark,
    };
  }
}
