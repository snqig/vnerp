import { t } from '@/lib/server-translate';

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
  const ts = t;
    if (!props.standardCardId) {
      throw new Error(ts('k_abbfyw'));
    }
    if (!props.version || props.version.trim() === '') {
      throw new Error(ts('k_1whf9q4'));
    }
    if (!['create', 'update', 'obsolete', 'restore'].includes(props.changeType)) {
      throw new Error(ts('k_dw5qlz'));
    }
    if (!props.changeContent || props.changeContent.trim() === '') {
      throw new Error(ts('k_1t2ak9'));
    }
    if (!props.changedBy) {
      throw new Error(ts('k_1ut87p8'));
    }
  }

  get changeTypeLabel(): string {
  const ts = t;
    const labels: Record<string, string> = {
      create: ts('k_khvw5c'),
      update: ts('k_v6g9yh'),
      obsolete: ts('k_wph6a4'),
      restore: ts('k_13bnw3c'),
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
      changedAt: this.changedAt,
    };
  }
}
