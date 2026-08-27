export type InspectionResult = 1 | 2 | 3;

export interface InspectionRecordProps {
  id?: number;
  inspectionNo: string;
  inspectionType: 'incoming' | 'process' | 'final';
  materialId?: number;
  materialName?: string;
  result: InspectionResult;
  remark?: string;
}

export class InspectionRecord {
  private constructor(
    public readonly id: number | undefined,
    public readonly inspectionNo: string,
    public readonly inspectionType: 'incoming' | 'process' | 'final',
    public readonly materialId: number | undefined,
    public readonly materialName: string | undefined,
    public readonly result: InspectionResult,
    public readonly remark: string | undefined
  ) {}

  static from(props: InspectionRecordProps): InspectionRecord {
    return new InspectionRecord(
      props.id,
      props.inspectionNo,
      props.inspectionType,
      props.materialId,
      props.materialName,
      props.result,
      props.remark
    );
  }

  isPassed(): boolean {
    return this.result === 1;
  }

  isFailed(): boolean {
    return this.result === 2;
  }

  isConcession(): boolean {
    return this.result === 3;
  }
}
