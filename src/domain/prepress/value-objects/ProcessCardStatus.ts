import { DomainError } from '@/domain/shared/DomainTypes';

export enum ProcessCardStatus {
  DRAFT = 0,
  SUBMITTED = 1,
  APPROVED = 2,
  IN_PROGRESS = 3,
  COMPLETED = 4,
  CANCELLED = -1,
}

const TRANSITIONS: Record<ProcessCardStatus, ProcessCardStatus[]> = {
  [ProcessCardStatus.DRAFT]: [ProcessCardStatus.SUBMITTED, ProcessCardStatus.CANCELLED],
  [ProcessCardStatus.SUBMITTED]: [
    ProcessCardStatus.APPROVED,
    ProcessCardStatus.DRAFT,
    ProcessCardStatus.CANCELLED,
  ],
  [ProcessCardStatus.APPROVED]: [ProcessCardStatus.IN_PROGRESS, ProcessCardStatus.CANCELLED],
  [ProcessCardStatus.IN_PROGRESS]: [ProcessCardStatus.COMPLETED, ProcessCardStatus.CANCELLED],
  [ProcessCardStatus.COMPLETED]: [],
  [ProcessCardStatus.CANCELLED]: [],
};

export function canTransitionProcessCard(from: ProcessCardStatus, to: ProcessCardStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertProcessCardTransition(from: ProcessCardStatus, to: ProcessCardStatus): void {
  if (!canTransitionProcessCard(from, to)) {
    throw new DomainError(
      `工艺卡状态不允许从 ${getProcessCardStatusLabel(from)} 流转到 ${getProcessCardStatusLabel(to)}`
    );
  }
}

export function getProcessCardStatusLabel(status: ProcessCardStatus): string {
  const labels: Record<ProcessCardStatus, string> = {
    [ProcessCardStatus.DRAFT]: '草稿',
    [ProcessCardStatus.SUBMITTED]: '已提交',
    [ProcessCardStatus.APPROVED]: '已审核',
    [ProcessCardStatus.IN_PROGRESS]: '生产中',
    [ProcessCardStatus.COMPLETED]: '已完成',
    [ProcessCardStatus.CANCELLED]: '已作废',
  };
  return labels[status] ?? '未知';
}

export enum BurdeningStatus {
  PENDING = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
}

export enum LockStatus {
  UNLOCKED = 0,
  LOCKED = 1,
}
