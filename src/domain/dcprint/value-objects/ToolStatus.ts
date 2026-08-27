/**
 * 工装状态枚举与状态机
 */
export enum ToolStatus {
  STANDBY = 1, // 待用
  ACTIVE = 2, // 在用
  MAINTENANCE = 3, // 维修中
  WARNING = 4, // 预警
  SCRAPPED = 5, // 已报废
}

/**
 * 状态机：定义允许的状态流转
 */
const TRANSITIONS: Record<ToolStatus, ToolStatus[]> = {
  [ToolStatus.STANDBY]: [ToolStatus.ACTIVE, ToolStatus.SCRAPPED],
  [ToolStatus.ACTIVE]: [ToolStatus.MAINTENANCE, ToolStatus.WARNING, ToolStatus.SCRAPPED],
  [ToolStatus.MAINTENANCE]: [ToolStatus.ACTIVE, ToolStatus.WARNING],
  [ToolStatus.WARNING]: [ToolStatus.ACTIVE, ToolStatus.MAINTENANCE, ToolStatus.SCRAPPED],
  [ToolStatus.SCRAPPED]: [],
};

export function canToolTransition(from: ToolStatus, to: ToolStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getToolStatusLabel(status: ToolStatus): string {
  const labels: Record<ToolStatus, string> = {
    [ToolStatus.STANDBY]: '待用',
    [ToolStatus.ACTIVE]: '在用',
    [ToolStatus.MAINTENANCE]: '维修中',
    [ToolStatus.WARNING]: '预警',
    [ToolStatus.SCRAPPED]: '已报废',
  };
  return labels[status] ?? '未知';
}

export function getToolStatusColor(status: ToolStatus): string {
  const colors: Record<ToolStatus, string> = {
    [ToolStatus.STANDBY]: 'default',
    [ToolStatus.ACTIVE]: 'success',
    [ToolStatus.MAINTENANCE]: 'warning',
    [ToolStatus.WARNING]: 'error',
    [ToolStatus.SCRAPPED]: 'default',
  };
  return colors[status] ?? 'default';
}

export function isToolUsable(status: ToolStatus): boolean {
  return [ToolStatus.ACTIVE, ToolStatus.WARNING].includes(status);
}
