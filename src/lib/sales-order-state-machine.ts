import { secureLog } from '@/lib/logger';

export type SalesOrderStatus =
  | 'draft' // 草稿
  | 'pending_review' // 待审核
  | 'approved' // 已审核
  | 'producing' // 生产中（已转工单）
  | 'partial_ship' // 部分发货
  | 'shipped' // 已发货
  | 'completed' // 已完成
  | 'cancelled'; // 已取消

export interface SalesOrderStatusConfig {
  label: string;
  color: string;
  icon: string;
  allowedTransitions: SalesOrderStatus[];
  allowedOperations: string[];
}

const salesOrderStateMachineConfig: Record<SalesOrderStatus, SalesOrderStatusConfig> = {
  draft: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-700',
    icon: 'FileEdit',
    allowedTransitions: ['pending_review', 'cancelled'],
    allowedOperations: ['edit', 'submit', 'delete'],
  },
  pending_review: {
    label: '待审核',
    color: 'bg-yellow-100 text-yellow-700',
    icon: 'Clock',
    allowedTransitions: ['approved', 'draft', 'cancelled'],
    allowedOperations: ['approve', 'reject', 'view'],
  },
  approved: {
    label: '已审核',
    color: 'bg-blue-100 text-blue-700',
    icon: 'CheckCircle',
    allowedTransitions: ['producing', 'shipped', 'cancelled'],
    allowedOperations: ['convert_to_wo', 'cancel', 'view'],
  },
  producing: {
    label: '生产中',
    color: 'bg-orange-100 text-orange-700',
    icon: 'Factory',
    allowedTransitions: ['partial_ship', 'shipped', 'completed', 'cancelled'],
    allowedOperations: ['track_production', 'ship', 'cancel', 'view'],
  },
  partial_ship: {
    label: '部分发货',
    color: 'bg-purple-100 text-purple-700',
    icon: 'Truck',
    allowedTransitions: ['shipped', 'producing', 'completed', 'cancelled'],
    allowedOperations: ['continue_ship', 'view'],
  },
  shipped: {
    label: '已发货',
    color: 'bg-teal-100 text-teal-700',
    icon: 'PackageCheck',
    allowedTransitions: ['completed', 'partial_ship'],
    allowedOperations: ['confirm_receipt', 'return', 'view'],
  },
  completed: {
    label: '已完成',
    color: 'bg-green-100 text-green-700',
    icon: 'CircleCheck',
    allowedTransitions: [],
    allowedOperations: ['archive', 'view'],
  },
  cancelled: {
    label: '已取消',
    color: 'bg-red-100 text-red-700',
    icon: 'XCircle',
    allowedTransitions: [],
    allowedOperations: ['reactivate', 'view'],
  },
};

export class SalesOrderStateMachine {
  static getStatusConfig(status: SalesOrderStatus): SalesOrderStatusConfig {
    return salesOrderStateMachineConfig[status];
  }

  static getAllStatuses(): Array<{ status: SalesOrderStatus; config: SalesOrderStatusConfig }> {
    return Object.entries(salesOrderStateMachineConfig).map(([status, config]) => ({
      status: status as SalesOrderStatus,
      config,
    }));
  }

  static canTransition(from: SalesOrderStatus, to: SalesOrderStatus): boolean {
    const config = salesOrderStateMachineConfig[from];
    if (!config) {
      secureLog('error', '无效的源状态', { from });
      return false;
    }
    return config.allowedTransitions.includes(to);
  }

  static getAllowedTransitions(status: SalesOrderStatus): SalesOrderStatus[] {
    const config = salesOrderStateMachineConfig[status];
    return config ? config.allowedTransitions : [];
  }

  static getAllowedOperations(status: SalesOrderStatus): string[] {
    const config = salesOrderStateMachineConfig[status];
    return config ? config.allowedOperations : [];
  }

  static validateTransition(
    currentStatus: SalesOrderStatus,
    targetStatus: SalesOrderStatus,
    operation?: string
  ): { valid: boolean; error?: string } {
    if (!this.canTransition(currentStatus, targetStatus)) {
      return {
        valid: false,
        error: `不允许从"${salesOrderStateMachineConfig[currentStatus].label}"转换到"${salesOrderStateMachineConfig[targetStatus].label}"`,
      };
    }

    if (operation) {
      const allowedOps = this.getAllowedOperations(currentStatus);
      if (!allowedOps.includes(operation)) {
        return {
          valid: false,
          error: `当前状态"${salesOrderStateMachineConfig[currentStatus].label}"不允许执行操作：${operation}`,
        };
      }
    }

    return { valid: true };
  }
}
