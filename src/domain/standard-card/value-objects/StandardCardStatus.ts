export enum StandardCardStatus {
  DRAFT = 'draft',
  AUDITING = 'auditing',
  APPROVED = 'approved',
  CONFIRMED = 'confirmed',
  OBSOLETE = 'obsolete',
}

export interface StateTransition {
  from: StandardCardStatus;
  to: StandardCardStatus;
  action: string;
  requiredRole?: string[];
}

export const standardCardStateMachine: Record<
  StandardCardStatus,
  {
    allowedTransitions: StandardCardStatus[];
    color: string;
    label: string;
  }
> = {
  [StandardCardStatus.DRAFT]: {
    allowedTransitions: [StandardCardStatus.AUDITING],
    color: 'gray',
    label: '草稿',
  },
  [StandardCardStatus.AUDITING]: {
    allowedTransitions: [StandardCardStatus.APPROVED, StandardCardStatus.DRAFT],
    color: 'orange',
    label: '待审核',
  },
  [StandardCardStatus.APPROVED]: {
    allowedTransitions: [StandardCardStatus.CONFIRMED, StandardCardStatus.OBSOLETE],
    color: 'blue',
    label: '已批准',
  },
  [StandardCardStatus.CONFIRMED]: {
    allowedTransitions: [StandardCardStatus.OBSOLETE],
    color: 'green',
    label: '已确认',
  },
  [StandardCardStatus.OBSOLETE]: {
    allowedTransitions: [],
    color: 'red',
    label: '已作废',
  },
};

export const statusTransitionActions: StateTransition[] = [
  {
    from: StandardCardStatus.DRAFT,
    to: StandardCardStatus.AUDITING,
    action: 'submit',
    requiredRole: ['process_engineer', 'admin'],
  },
  {
    from: StandardCardStatus.AUDITING,
    to: StandardCardStatus.APPROVED,
    action: 'approve',
    requiredRole: ['process_manager', 'admin'],
  },
  {
    from: StandardCardStatus.AUDITING,
    to: StandardCardStatus.DRAFT,
    action: 'reject',
    requiredRole: ['process_manager', 'admin'],
  },
  {
    from: StandardCardStatus.APPROVED,
    to: StandardCardStatus.CONFIRMED,
    action: 'confirm',
    requiredRole: ['general_manager', 'admin'],
  },
  {
    from: StandardCardStatus.APPROVED,
    to: StandardCardStatus.OBSOLETE,
    action: 'obsolete',
    requiredRole: ['process_manager', 'admin'],
  },
  {
    from: StandardCardStatus.CONFIRMED,
    to: StandardCardStatus.OBSOLETE,
    action: 'obsolete',
    requiredRole: ['process_manager', 'admin'],
  },
];

export function canTransition(current: StandardCardStatus, target: StandardCardStatus): boolean {
  if (current === target) return false;
  return standardCardStateMachine[current].allowedTransitions.includes(target);
}

export function getStatusLabel(status: StandardCardStatus): string {
  return standardCardStateMachine[status]?.label || status;
}

export function getStatusColor(status: StandardCardStatus): string {
  return standardCardStateMachine[status]?.color || 'gray';
}
