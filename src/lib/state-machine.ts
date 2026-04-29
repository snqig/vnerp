// 品质检验状态机
// 定义检验状态流转规则

export type InspectStatus = 
  | 'pending'      // 待检验
  | 'inspecting'   // 检验中
  | 'pass'         // 合格
  | 'fail'         // 不合格
  | 'rework'       // 返工
  | 'scrap';       // 报废

export type ProcessStatus = 
  | 'created'      // 已创建
  | 'material_ready' // 材料准备
  | 'in_progress'  // 生产中
  | 'qc_pending'   // 待检验
  | 'qc_pass'      // 检验通过
  | 'qc_fail'      // 检验失败
  | 'rework'       // 返工中
  | 'completed';   // 已完成

// 检验状态机配置
export const inspectStateMachine: Record<InspectStatus, {
  label: string;
  color: string;
  allowedTransitions: InspectStatus[];
}> = {
  pending: {
    label: '待检验',
    color: 'bg-gray-100 text-gray-700',
    allowedTransitions: ['inspecting'],
  },
  inspecting: {
    label: '检验中',
    color: 'bg-blue-100 text-blue-700',
    allowedTransitions: ['pass', 'fail'],
  },
  pass: {
    label: '合格',
    color: 'bg-green-100 text-green-700',
    allowedTransitions: [],
  },
  fail: {
    label: '不合格',
    color: 'bg-red-100 text-red-700',
    allowedTransitions: ['rework', 'scrap'],
  },
  rework: {
    label: '返工',
    color: 'bg-yellow-100 text-yellow-700',
    allowedTransitions: ['pending', 'scrap'],
  },
  scrap: {
    label: '报废',
    color: 'bg-black text-white',
    allowedTransitions: [],
  },
};

// 生产流程状态机配置
export const processStateMachine: Record<ProcessStatus, {
  label: string;
  color: string;
  allowedTransitions: ProcessStatus[];
}> = {
  created: {
    label: '已创建',
    color: 'bg-gray-100 text-gray-700',
    allowedTransitions: ['material_ready'],
  },
  material_ready: {
    label: '材料准备',
    color: 'bg-blue-100 text-blue-700',
    allowedTransitions: ['in_progress'],
  },
  in_progress: {
    label: '生产中',
    color: 'bg-yellow-100 text-yellow-700',
    allowedTransitions: ['qc_pending'],
  },
  qc_pending: {
    label: '待检验',
    color: 'bg-orange-100 text-orange-700',
    allowedTransitions: ['qc_pass', 'qc_fail'],
  },
  qc_pass: {
    label: '检验通过',
    color: 'bg-green-100 text-green-700',
    allowedTransitions: ['completed'],
  },
  qc_fail: {
    label: '检验失败',
    color: 'bg-red-100 text-red-700',
    allowedTransitions: ['rework'],
  },
  rework: {
    label: '返工中',
    color: 'bg-purple-100 text-purple-700',
    allowedTransitions: ['qc_pending'],
  },
  completed: {
    label: '已完成',
    color: 'bg-indigo-100 text-indigo-700',
    allowedTransitions: [],
  },
};

// 状态机验证类
export class StateMachineValidator {
  // 验证检验状态流转是否合法
  static canTransitionInspect(from: InspectStatus, to: InspectStatus): boolean {
    if (from === to) return true;
    return inspectStateMachine[from].allowedTransitions.includes(to);
  }

  // 验证生产流程状态流转是否合法
  static canTransitionProcess(from: ProcessStatus, to: ProcessStatus): boolean {
    if (from === to) return true;
    return processStateMachine[from].allowedTransitions.includes(to);
  }

  // 获取检验状态标签
  static getInspectStatusLabel(status: InspectStatus): string {
    return inspectStateMachine[status]?.label || status;
  }

  // 获取检验状态颜色
  static getInspectStatusColor(status: InspectStatus): string {
    return inspectStateMachine[status]?.color || 'bg-gray-100 text-gray-700';
  }

  // 获取生产流程状态标签
  static getProcessStatusLabel(status: ProcessStatus): string {
    return processStateMachine[status]?.label || status;
  }

  // 获取生产流程状态颜色
  static getProcessStatusColor(status: ProcessStatus): string {
    return processStateMachine[status]?.color || 'bg-gray-100 text-gray-700';
  }

  // 获取允许的检验状态流转
  static getAllowedInspectTransitions(status: InspectStatus): InspectStatus[] {
    return inspectStateMachine[status].allowedTransitions;
  }

  // 获取允许的生产流程状态流转
  static getAllowedProcessTransitions(status: ProcessStatus): ProcessStatus[] {
    return processStateMachine[status].allowedTransitions;
  }
}

// 状态流转记录接口
export interface StateTransition {
  id: number;
  entityType: 'inspect' | 'process';
  entityId: number;
  fromStatus: string;
  toStatus: string;
  operatorId?: number;
  operatorName?: string;
  remark?: string;
  createTime: Date;
}

// 状态流转日志服务
export class StateTransitionLogger {
  // 记录状态流转（这里可以扩展到数据库）
  static logTransition(
    entityType: 'inspect' | 'process',
    entityId: number,
    fromStatus: string,
    toStatus: string,
    operatorId?: number,
    operatorName?: string,
    remark?: string
  ): StateTransition {
    const transition: StateTransition = {
      id: Date.now(),
      entityType,
      entityId,
      fromStatus,
      toStatus,
      operatorId,
      operatorName,
      remark,
      createTime: new Date(),
    };

    // 这里可以保存到数据库
    console.log(`[StateTransition] ${entityType} #${entityId}: ${fromStatus} -> ${toStatus}`);
    
    return transition;
  }
}
