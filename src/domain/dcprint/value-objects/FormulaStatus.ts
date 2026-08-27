/**
 * 配方版本状态枚举与状态机
 * 依据: docs/油墨配方版本管理完整落地方案.md 第一节
 */

export enum FormulaStatus {
  DRAFT = 1,
  ACTIVE = 2,
  CANCELLED = 3,
}

export const formulaStateMachine: Record<
  FormulaStatus,
  { allowedTransitions: FormulaStatus[]; color: string; label: string }
> = {
  [FormulaStatus.DRAFT]: {
    allowedTransitions: [FormulaStatus.ACTIVE],
    color: 'gray',
    label: '草稿',
  },
  [FormulaStatus.ACTIVE]: {
    allowedTransitions: [FormulaStatus.CANCELLED],
    color: 'green',
    label: '已生效',
  },
  [FormulaStatus.CANCELLED]: {
    allowedTransitions: [],
    color: 'red',
    label: '已作废',
  },
};

export function canTransition(from: FormulaStatus, to: FormulaStatus): boolean {
  if (from === to) return false;
  return formulaStateMachine[from].allowedTransitions.includes(to);
}

export function getStatusLabel(status: FormulaStatus): string {
  return formulaStateMachine[status]?.label || String(status);
}

export function getStatusColor(status: FormulaStatus): string {
  return formulaStateMachine[status]?.color || 'gray';
}

export function isEditable(status: FormulaStatus): boolean {
  return status === FormulaStatus.DRAFT;
}

export function isUsableForProduction(status: FormulaStatus): boolean {
  return status === FormulaStatus.ACTIVE;
}
