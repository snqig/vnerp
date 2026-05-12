export interface StandardCardAttachmentProps {
  id?: number;
  standardCardId?: number;
  version?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType?: string;
  remark?: string;
  uploadedBy?: number;
  uploadedByName?: string;
  uploadedAt?: Date;
}

export class StandardCardAttachment {
  readonly id?: number;
  readonly standardCardId?: number;
  readonly version?: string;
  readonly fileName: string;
  readonly filePath: string;
  readonly fileSize: number;
  readonly fileType?: string;
  readonly remark?: string;
  readonly uploadedBy?: number;
  readonly uploadedByName?: string;
  readonly uploadedAt?: Date;

  constructor(props: StandardCardAttachmentProps) {
    this.validate(props);
    this.id = props.id;
    this.standardCardId = props.standardCardId;
    this.version = props.version;
    this.fileName = props.fileName;
    this.filePath = props.filePath;
    this.fileSize = props.fileSize;
    this.fileType = props.fileType;
    this.remark = props.remark;
    this.uploadedBy = props.uploadedBy;
    this.uploadedByName = props.uploadedByName;
    this.uploadedAt = props.uploadedAt;
  }

  private validate(props: StandardCardAttachmentProps): void {
    if (!props.fileName || props.fileName.trim() === '') {
      throw new Error('文件名不能为空');
    }
    if (!props.filePath || props.filePath.trim() === '') {
      throw new Error('文件路径不能为空');
    }
    if (props.fileSize <= 0) {
      throw new Error('文件大小必须大于0');
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (props.fileType && !allowedTypes.includes(props.fileType)) {
      throw new Error('不支持的文件类型，仅支持PDF、JPG、PNG');
    }
  }

  get formattedFileSize(): string {
    const kb = this.fileSize / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  get fileExtension(): string {
    const parts = this.fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  toJSON(): StandardCardAttachmentProps {
    return {
      id: this.id,
      standardCardId: this.standardCardId,
      version: this.version,
      fileName: this.fileName,
      filePath: this.filePath,
      fileSize: this.fileSize,
      fileType: this.fileType,
      remark: this.remark,
      uploadedBy: this.uploadedBy,
      uploadedByName: this.uploadedByName,
      uploadedAt: this.uploadedAt
    };
  }
}
