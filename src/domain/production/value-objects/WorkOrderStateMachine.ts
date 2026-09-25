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

interface ProcessStepStatusConfig {
  label: string;
  color: string;
  allowedTransitions: ProcessStepStatus[];
}

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
