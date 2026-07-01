export enum DefectLevel {
  FATAL = 'fatal',
  SERIOUS = 'serious',
  GENERAL = 'general',
  SLIGHT = 'slight',
}

export const defectLevelLabels: Record<DefectLevel, string> = {
  [DefectLevel.FATAL]: '致命',
  [DefectLevel.SERIOUS]: '严重',
  [DefectLevel.GENERAL]: '一般',
  [DefectLevel.SLIGHT]: '轻微',
};

export interface QualityStandardItemProps {
  id?: number;
  standardCardId?: number;
  inspectionItem: string;
  standardValue?: string;
  tolerance?: string;
  inspectionMethod?: string;
  isKey?: boolean;
  defectLevel?: DefectLevel;
  remark?: string;
}

export class QualityStandardItem {
  readonly id?: number;
  readonly standardCardId?: number;
  readonly inspectionItem: string;
  readonly standardValue?: string;
  readonly tolerance?: string;
  readonly inspectionMethod?: string;
  readonly isKey: boolean;
  readonly defectLevel?: DefectLevel;
  readonly remark?: string;

  constructor(props: QualityStandardItemProps) {
    this.validate(props);
    this.id = props.id;
    this.standardCardId = props.standardCardId;
    this.inspectionItem = props.inspectionItem;
    this.standardValue = props.standardValue;
    this.tolerance = props.tolerance;
    this.inspectionMethod = props.inspectionMethod;
    this.isKey = props.isKey ?? false;
    this.defectLevel = props.defectLevel;
    this.remark = props.remark;
  }

  setStandardCardId(id: number): void {
    (this as any).standardCardId = id;
  }

  private validate(props: QualityStandardItemProps): void {
    if (!props.inspectionItem || props.inspectionItem.trim() === '') {
      throw new Error('检验项目不能为空');
    }
  }

  get defectLevelLabel(): string {
    return this.defectLevel ? defectLevelLabels[this.defectLevel] : '';
  }

  toJSON(): QualityStandardItemProps {
    return {
      id: this.id,
      standardCardId: this.standardCardId,
      inspectionItem: this.inspectionItem,
      standardValue: this.standardValue,
      tolerance: this.tolerance,
      inspectionMethod: this.inspectionMethod,
      isKey: this.isKey,
      defectLevel: this.defectLevel,
      remark: this.remark,
    };
  }
}
