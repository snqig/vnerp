export enum SampleOrderStatus {
  DRAFT = 'draft', // 草稿
  PENDING = 'pending', // 待打样
  IN_PROGRESS = 'in_progress', // 打样中
  COMPLETED = 'completed', // 已完成
  CONFIRMED = 'confirmed', // 已确认
  CONVERTED = 'converted', // 已转大货
  CANCELLED = 'cancelled', // 已作废
}

export interface StatusTransition {
  action: string; // 动作标识
  label: string; // 操作按钮文案
  from: SampleOrderStatus; // 源状态
  to: SampleOrderStatus; // 目标状态
}

export interface StatusConfig {
  allowedTransitions: SampleOrderStatus[]; // 可转换到的状态列表
  color: string; // 显示颜色 (CSS color)
  label: string; // 状态中文名称
}

// 状态转换配置
export const sampleOrderStateMachine: Record<SampleOrderStatus, StatusConfig> = {
  [SampleOrderStatus.DRAFT]: {
    allowedTransitions: [SampleOrderStatus.PENDING, SampleOrderStatus.CANCELLED],
    color: '#909399', // 灰色
    label: '草稿',
  },
  [SampleOrderStatus.PENDING]: {
    allowedTransitions: [SampleOrderStatus.IN_PROGRESS, SampleOrderStatus.CANCELLED],
    color: '#E6A23C', // 橙色
    label: '待打样',
  },
  [SampleOrderStatus.IN_PROGRESS]: {
    allowedTransitions: [SampleOrderStatus.COMPLETED, SampleOrderStatus.CANCELLED],
    color: '#409EFF', // 蓝色
    label: '打样中',
  },
  [SampleOrderStatus.COMPLETED]: {
    allowedTransitions: [SampleOrderStatus.CONFIRMED, SampleOrderStatus.CANCELLED],
    color: '#67C23A', // 绿色
    label: '已完成',
  },
  [SampleOrderStatus.CONFIRMED]: {
    allowedTransitions: [SampleOrderStatus.CONVERTED],
    color: '#00C853', // 亮绿色
    label: '已确认',
  },
  [SampleOrderStatus.CONVERTED]: {
    allowedTransitions: [], // 终态，不可转换
    color: '#000000', // 黑色
    label: '已转大货',
  },
  [SampleOrderStatus.CANCELLED]: {
    allowedTransitions: [], // 终态，不可转换
    color: '#F56C6C', // 红色
    label: '已作废',
  },
};

// 所有状态转换动作定义
export const statusTransitionActions: StatusTransition[] = [
  { action: 'submit', label: '提交', from: SampleOrderStatus.DRAFT, to: SampleOrderStatus.PENDING },
  {
    action: 'startProduction',
    label: '开始生产',
    from: SampleOrderStatus.PENDING,
    to: SampleOrderStatus.IN_PROGRESS,
  },
  {
    action: 'complete',
    label: '完成生产',
    from: SampleOrderStatus.IN_PROGRESS,
    to: SampleOrderStatus.COMPLETED,
  },
  {
    action: 'confirm',
    label: '确认合格',
    from: SampleOrderStatus.COMPLETED,
    to: SampleOrderStatus.CONFIRMED,
  },
  {
    action: 'convert',
    label: '转为大货订单',
    from: SampleOrderStatus.CONFIRMED,
    to: SampleOrderStatus.CONVERTED,
  },
  {
    action: 'cancel',
    label: '作废',
    from: SampleOrderStatus.DRAFT,
    to: SampleOrderStatus.CANCELLED,
  },
  {
    action: 'cancel',
    label: '作废',
    from: SampleOrderStatus.PENDING,
    to: SampleOrderStatus.CANCELLED,
  },
  {
    action: 'cancel',
    label: '作废',
    from: SampleOrderStatus.IN_PROGRESS,
    to: SampleOrderStatus.CANCELLED,
  },
  {
    action: 'cancel',
    label: '作废',
    from: SampleOrderStatus.COMPLETED,
    to: SampleOrderStatus.CANCELLED,
  },
];

/**
 * 判断当前状态是否允许转换到目标状态
 * @param current 当前状态
 * @param target 目标状态
 * @returns 是否允许转换
 */
export function canTransition(current: SampleOrderStatus, target: SampleOrderStatus): boolean {
  const config = sampleOrderStateMachine[current];
  if (!config) return false;
  return config.allowedTransitions.includes(target);
}

/**
 * 获取状态显示名称
 * @param status 状态
 * @returns 状态中文名称
 */
export function getStatusLabel(status: SampleOrderStatus): string {
  return sampleOrderStateMachine[status]?.label ?? '未知状态';
}

/**
 * 获取状态显示颜色
 * @param status 状态
 * @returns 状态颜色
 */
export function getStatusColor(status: SampleOrderStatus): string {
  return sampleOrderStateMachine[status]?.color ?? '#909399';
}
