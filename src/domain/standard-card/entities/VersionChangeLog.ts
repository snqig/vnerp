export interface VersionChangeLogProps {
  id?: number;
  standardCardId: number;
  version: string;
  changeType: 'create' | 'update' | 'obsolete' | 'restore';
  changeContent: string;
  changedBy: number;
  changedByName?: string;
  changedAt?: Date;
}

export class VersionChangeLog {
  readonly id?: number;
  readonly standardCardId: number;
  readonly version: string;
  readonly changeType: 'create' | 'update' | 'obsolete' | 'restore';
  readonly changeContent: string;
  readonly changedBy: number;
  readonly changedByName?: string;
  readonly changedAt: Date;

  constructor(props: VersionChangeLogProps) {
    this.validate(props);
    this.id = props.id;
    this.standardCardId = props.standardCardId;
    this.version = props.version;
    this.changeType = props.changeType;
    this.changeContent = props.changeContent;
    this.changedBy = props.changedBy;
    this.changedByName = props.changedByName;
    this.changedAt = props.changedAt ?? new Date();
  }

  private validate(props: VersionChangeLogProps): void {
    if (!props.standardCardId) {
      throw new Error('标准卡ID不能为空');
    }
    if (!props.version || props.version.trim() === '') {
      throw new Error('版本号不能为空');
    }
    if (!['create', 'update', 'obsolete', 'restore'].includes(props.changeType)) {
      throw new Error('变更类型无效');
    }
    if (!props.changeContent || props.changeContent.trim() === '') {
      throw new Error('变更内容不能为空');
    }
    if (!props.changedBy) {
      throw new Error('操作人不能为空');
    }
  }

  get changeTypeLabel(): string {
    const labels: Record<string, string> = {
      'create': '创建',
      'update': '更新',
      'obsolete': '作废',
      'restore': '恢复'
    };
    return labels[this.changeType] || this.changeType;
  }

  toJSON(): VersionChangeLogProps {
    return {
      id: this.id,
      standardCardId: this.standardCardId,
      version: this.version,
      changeType: this.changeType,
      changeContent: this.changeContent,
      changedBy: this.changedBy,
      changedByName: this.changedByName,
      changedAt: this.changedAt
    };
  }
}
