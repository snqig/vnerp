export interface ColorStandardItemProps {
  id?: number;
  standardCardId?: number;
  colorName: string;
  pantoneCode?: string;
  cmykValue?: string;
  rgbValue?: string;
  colorSampleImage?: string;
  tolerance?: string;
  remark?: string;
}

export class ColorStandardItem {
  readonly id?: number;
  readonly standardCardId?: number;
  readonly colorName: string;
  readonly pantoneCode?: string;
  readonly cmykValue?: string;
  readonly rgbValue?: string;
  readonly colorSampleImage?: string;
  readonly tolerance?: string;
  readonly remark?: string;

  constructor(props: ColorStandardItemProps) {
    this.validate(props);
    this.id = props.id;
    this.standardCardId = props.standardCardId;
    this.colorName = props.colorName;
    this.pantoneCode = props.pantoneCode;
    this.cmykValue = props.cmykValue;
    this.rgbValue = props.rgbValue;
    this.colorSampleImage = props.colorSampleImage;
    this.tolerance = props.tolerance;
    this.remark = props.remark;
  }

  private validate(props: ColorStandardItemProps): void {
    if (!props.colorName || props.colorName.trim() === '') {
      throw new Error('颜色名称不能为空');
    }
    if (props.cmykValue && !/^(\d{1,3},){3}\d{1,3}$/.test(props.cmykValue)) {
      throw new Error('CMYK值格式错误，应为 C,M,Y,K 格式');
    }
    if (props.rgbValue && !/^(\d{1,3},){2}\d{1,3}$/.test(props.rgbValue)) {
      throw new Error('RGB值格式错误，应为 R,G,B 格式');
    }
  }

  toJSON(): ColorStandardItemProps {
    return {
      id: this.id,
      standardCardId: this.standardCardId,
      colorName: this.colorName,
      pantoneCode: this.pantoneCode,
      cmykValue: this.cmykValue,
      rgbValue: this.rgbValue,
      colorSampleImage: this.colorSampleImage,
      tolerance: this.tolerance,
      remark: this.remark,
    };
  }
}
