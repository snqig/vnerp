import { t } from '@/lib/server-translate';

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
  const ts = t;
  const labels: Record<ProcessCardStatus, string> = {
    [ProcessCardStatus.DRAFT]: ts('k_oc54qp'),
    [ProcessCardStatus.SUBMITTED]: ts('k_168pm1t'),
    [ProcessCardStatus.APPROVED]: ts('k_7j2xv0'),
    [ProcessCardStatus.IN_PROGRESS]: ts('k_1rcb0fm'),
    [ProcessCardStatus.COMPLETED]: ts('k_19j4h'),
    [ProcessCardStatus.CANCELLED]: ts('k_1o0kows'),
  };
  return labels[status] ?? ts('k_1lpnuh4');
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
