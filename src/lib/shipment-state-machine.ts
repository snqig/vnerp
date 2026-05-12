import { secureLog } from '@/lib/logger';

export type ShipmentStatus =
  | 'draft'           // 草稿
  | 'pending_review'  // 待审批
  | 'approved'        // 已审批（待发货）
  | 'picking'         // 拣货中
  | 'picked'          // 已拣货
  | 'partial_ship'    // 部分发货
  | 'shipped'         // 已发货
  | 'in_transit'      // 运输中
  | 'delivered'       // 已签收
  | 'returned'        // 已退货
  | 'cancelled';      // 已取消

export interface ShipmentStatusConfig {
  label: string;
  color: string;
  icon: string;
  allowedTransitions: ShipmentStatus[];
  allowedOperations: string[];
}

const shipmentStateMachineConfig: Record<ShipmentStatus, ShipmentStatusConfig> = {
  draft: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-700',
    icon: 'FileEdit',
    allowedTransitions: ['pending_review', 'cancelled'],
    allowedOperations: ['edit', 'submit_for_approval', 'delete'],
  },
  pending_review: {
    label: '待审批',
    color: 'bg-yellow-100 text-yellow-700',
    icon: 'Clock',
    allowedTransitions: ['approved', 'draft', 'cancelled'],
    allowedOperations: ['approve', 'reject', 'view'],
  },
  approved: {
    label: '待发货',
    color: 'bg-blue-100 text-blue-700',
    icon: 'Package',
    allowedTransitions: ['picking', 'cancelled'],
    allowedOperations: ['start_picking', 'cancel', 'view'],
  },
  picking: {
    label: '拣货中',
    color: 'bg-cyan-100 text-cyan-700',
    icon: 'Hand',
    allowedTransitions: ['picked', 'partial_ship', 'approved'],
    allowedOperations: ['complete_pick', 'partial_pick', 'cancel', 'view'],
  },
  picked: {
    label: '已拣货',
    color: 'bg-teal-100 text-teal-700',
    icon: 'PackageCheck',
    allowedTransitions: ['shipped', 'picking', 'cancelled'],
    allowedOperations: ['confirm_ship', 'cancel', 'print_label', 'view'],
  },
  partial_ship: {
    label: '部分发货',
    color: 'bg-orange-100 text-orange-700',
    icon: 'PackageOpen',
    allowedTransitions: ['shipped', 'picking', 'picked', 'cancelled'],
    allowedOperations: ['continue_ship', 'cancel', 'view'],
  },
  shipped: {
    label: '已发货',
    color: 'bg-green-100 text-green-700',
    icon: 'Truck',
    allowedTransitions: ['in_transit', 'delivered', 'returned'],
    allowedOperations: ['update_tracking', 'confirm_delivery', 'process_return', 'view'],
  },
  in_transit: {
    label: '运输中',
    color: 'bg-indigo-100 text-indigo-700',
    icon: 'Route',
    allowedTransitions: ['delivered', 'shipped', 'returned'],
    allowedOperations: ['update_location', 'confirm_delivery', 'report_issue', 'view'],
  },
  delivered: {
    label: '已签收',
    color: 'bg-emerald-100 text-emerald-700',
    icon: 'CircleCheck',
    allowedTransitions: [],
    allowedOperations: ['archive', 'generate_receipt', 'view'],
  },
  returned: {
    label: '已退货',
    color: 'bg-red-100 text-red-700',
    icon: 'RotateCcw',
    allowedTransitions: ['draft', 'cancelled'],
    allowedOperations: ['create_return_order', 'dispose', 'view'],
  },
  cancelled: {
    label: '已取消',
    color: 'bg-stone-100 text-stone-700',
    icon: 'XCircle',
    allowedTransitions: ['draft'],
    allowedOperations: ['reactivate', 'view'],
  },
};

export class ShipmentStateMachine {
  static getStatusConfig(status: ShipmentStatus): ShipmentStatusConfig {
    return shipmentStateMachineConfig[status];
  }

  static getAllStatuses(): Array<{ status: ShipmentStatus; config: ShipmentStatusConfig }> {
    return Object.entries(shipmentStateMachineConfig).map(([status, config]) => ({
      status: status as ShipmentStatus,
      config,
    }));
  }

  static canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
    const config = shipmentStateMachineConfig[from];
    if (!config) {
      secureLog.error('无效的源状态', { from });
      return false;
    }
    return config.allowedTransitions.includes(to);
  }

  static getAllowedTransitions(status: ShipmentStatus): ShipmentStatus[] {
    const config = shipmentStateMachineConfig[status];
    return config ? config.allowedTransitions : [];
  }

  static getAllowedOperations(status: ShipmentStatus): string[] {
    const config = shipmentStateMachineConfig[status];
    return config ? config.allowedOperations : [];
  }

  static validateTransition(
    currentStatus: ShipmentStatus,
    targetStatus: ShipmentStatus,
    operation?: string
  ): { valid: boolean; error?: string } {
    if (!this.canTransition(currentStatus, targetStatus)) {
      return {
        valid: false,
        error: `不允许从"${shipmentStateMachineConfig[currentStatus].label}"转换到"${shipmentStateMachineConfig[targetStatus].label}"`,
      };
    }

    if (operation) {
      const allowedOps = this.getAllowedOperations(currentStatus);
      if (!allowedOps.includes(operation)) {
        return {
          valid: false,
          error: `当前状态"${shipmentStateMachineConfig[currentStatus].label}"不允许执行操作：${operation}`,
        };
      }
    }

    return { valid: true };
  }

  static getNextMilestones(status: ShipmentStatus): Array<{ step: number; status: ShipmentStatus; label: string; completed: boolean }> {
    const allSteps: ShipmentStatus[] = [
      'draft',
      'pending_review',
      'approved',
      'picking',
      'picked',
      'shipped',
      'in_transit',
      'delivered',
    ];

    const currentIndex = allSteps.indexOf(status);
    
    return allSteps.map((step, index) => ({
      step: index + 1,
      status: step,
      label: shipmentStateMachineConfig[step].label,
      completed: index <= currentIndex,
    }));
  }
}
