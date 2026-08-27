export type WorkOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'material_preparing'
  | 'material_ready'
  | 'producing'
  | 'qc_pending'
  | 'qc_pass'
  | 'qc_fail'
  | 'rework'
  | 'completed'
  | 'cancelled';

export type ProcessStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export interface ProcessStep {
  id: number;
  workOrderId: number;
  stepNo: number;
  stepName: string;
  processType: string;
  description?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  equipmentId?: number;
  equipmentName?: string;
  operatorId?: number;
  operatorName?: string;
  status: ProcessStepStatus;
  startTime?: string;
  endTime?: string;
  remark?: string;
}

interface WorkOrderStatusConfig {
  label: string;
  color: string;
  allowedTransitions: WorkOrderStatus[];
  allowedOperations: string[];
}

interface ProcessStepStatusConfig {
  label: string;
  color: string;
  allowedTransitions: ProcessStepStatus[];
}

const workOrderStateMachineConfig: Record<WorkOrderStatus, WorkOrderStatusConfig> = {
  pending: {
    label: '待确认',
    color: 'bg-gray-100 text-gray-700',
    allowedTransitions: ['confirmed', 'cancelled'],
    allowedOperations: ['edit', 'delete', 'confirm', 'cancel'],
  },
  confirmed: {
    label: '已确认',
    color: 'bg-blue-100 text-blue-700',
    allowedTransitions: ['material_preparing', 'cancelled'],
    allowedOperations: ['start_material_prep', 'cancel'],
  },
  material_preparing: {
    label: '备料中',
    color: 'bg-cyan-100 text-cyan-700',
    allowedTransitions: ['material_ready', 'cancelled'],
    allowedOperations: ['complete_material_prep', 'cancel'],
  },
  material_ready: {
    label: '备料完成',
    color: 'bg-teal-100 text-teal-700',
    allowedTransitions: ['producing', 'cancelled'],
    allowedOperations: ['start_production', 'cancel'],
  },
  producing: {
    label: '生产中',
    color: 'bg-yellow-100 text-yellow-700',
    allowedTransitions: ['qc_pending', 'cancelled'],
    allowedOperations: ['submit_qc', 'cancel'],
  },
  qc_pending: {
    label: '待检验',
    color: 'bg-orange-100 text-orange-700',
    allowedTransitions: ['qc_pass', 'qc_fail'],
    allowedOperations: ['inspect'],
  },
  qc_pass: {
    label: '检验通过',
    color: 'bg-green-100 text-green-700',
    allowedTransitions: ['completed'],
    allowedOperations: ['complete'],
  },
  qc_fail: {
    label: '检验失败',
    color: 'bg-red-100 text-red-700',
    allowedTransitions: ['rework', 'cancelled'],
    allowedOperations: ['rework', 'cancel'],
  },
  rework: {
    label: '返工中',
    color: 'bg-purple-100 text-purple-700',
    allowedTransitions: ['qc_pending'],
    allowedOperations: ['submit_qc'],
  },
  completed: {
    label: '已完成',
    color: 'bg-indigo-100 text-indigo-700',
    allowedTransitions: [],
    allowedOperations: [],
  },
  cancelled: {
    label: '已取消',
    color: 'bg-gray-200 text-gray-500',
    allowedTransitions: [],
    allowedOperations: [],
  },
};

const processStepStateMachineConfig: Record<ProcessStepStatus, ProcessStepStatusConfig> = {
  pending: {
    label: '待处理',
    color: 'bg-gray-100 text-gray-700',
    allowedTransitions: ['in_progress', 'skipped'],
  },
  in_progress: {
    label: '进行中',
    color: 'bg-blue-100 text-blue-700',
    allowedTransitions: ['completed', 'failed'],
  },
  completed: {
    label: '已完成',
    color: 'bg-green-100 text-green-700',
    allowedTransitions: [],
  },
  skipped: {
    label: '已跳过',
    color: 'bg-gray-200 text-gray-500',
    allowedTransitions: [],
  },
  failed: {
    label: '失败',
    color: 'bg-red-100 text-red-700',
    allowedTransitions: ['in_progress'],
  },
};

export class WorkOrderStateMachine {
  static canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
    if (from === to) return true;
    return workOrderStateMachineConfig[from].allowedTransitions.includes(to);
  }

  static getAllowedTransitions(status: WorkOrderStatus): WorkOrderStatus[] {
    return workOrderStateMachineConfig[status].allowedTransitions;
  }

  static getStatusLabel(status: WorkOrderStatus): string {
    return workOrderStateMachineConfig[status]?.label || status;
  }

  static getStatusColor(status: WorkOrderStatus): string {
    return workOrderStateMachineConfig[status]?.color || 'bg-gray-100 text-gray-700';
  }

  static getAllowedOperations(status: WorkOrderStatus): string[] {
    return workOrderStateMachineConfig[status].allowedOperations;
  }

  static canEdit(status: WorkOrderStatus): boolean {
    return workOrderStateMachineConfig[status].allowedOperations.includes('edit');
  }

  static canDelete(status: WorkOrderStatus): boolean {
    return workOrderStateMachineConfig[status].allowedOperations.includes('delete');
  }

  static canCancel(status: WorkOrderStatus): boolean {
    return workOrderStateMachineConfig[status].allowedOperations.includes('cancel');
  }

  static getTransitionError(from: WorkOrderStatus, to: WorkOrderStatus): string {
    if (from === to) return '';
    const config = workOrderStateMachineConfig[from];
    if (config.allowedTransitions.includes(to)) return '';
    const fromLabel = config.label;
    const toLabel = workOrderStateMachineConfig[to]?.label || to;
    const allowedLabels = config.allowedTransitions
      .map((s) => workOrderStateMachineConfig[s].label)
      .join('、');
    return `工单状态不允许从"${fromLabel}"流转到"${toLabel}"，允许的流转目标：${allowedLabels || '无'}`;
  }

  static validateTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
    if (from === to) return;
    if (!workOrderStateMachineConfig[from].allowedTransitions.includes(to)) {
      throw new Error(WorkOrderStateMachine.getTransitionError(from, to));
    }
  }
}

export class ProcessStepStateMachine {
  static canTransition(from: ProcessStepStatus, to: ProcessStepStatus): boolean {
    if (from === to) return true;
    return processStepStateMachineConfig[from].allowedTransitions.includes(to);
  }

  static getAllowedTransitions(status: ProcessStepStatus): ProcessStepStatus[] {
    return processStepStateMachineConfig[status].allowedTransitions;
  }

  static getStatusLabel(status: ProcessStepStatus): string {
    return processStepStateMachineConfig[status]?.label || status;
  }

  static getStatusColor(status: ProcessStepStatus): string {
    return processStepStateMachineConfig[status]?.color || 'bg-gray-100 text-gray-700';
  }
}

export const CREATE_WORK_ORDER_PROCESS_STEP_SQL = `
CREATE TABLE IF NOT EXISTS prod_work_order_process_step (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  step_no INT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  process_type VARCHAR(50) NOT NULL,
  description TEXT,
  estimated_duration DECIMAL(10,2),
  actual_duration DECIMAL(10,2),
  equipment_id INT,
  equipment_name VARCHAR(100),
  operator_id INT,
  operator_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  start_time DATETIME,
  end_time DATETIME,
  remark TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0,
  INDEX idx_work_order_id (work_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const CREATE_BOM_PROCESS_TEMPLATE_SQL = `
CREATE TABLE IF NOT EXISTS bom_process_template (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bom_id INT NOT NULL,
  step_no INT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  process_type VARCHAR(50) NOT NULL,
  description TEXT,
  estimated_duration DECIMAL(10,2),
  equipment_type VARCHAR(100),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0,
  INDEX idx_bom_id (bom_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
