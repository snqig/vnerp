// 仓库单据状态机
// 定义入库单和出库单的状态流转规则

// 入库单状态
export type InboundStatus =
  | 'draft'        // 草稿
  | 'pending'      // 待审核
  | 'completed'    // 已完成
  | 'cancelled';   // 已取消

// 出库单状态
export type OutboundStatus =
  | 'draft'        // 草稿
  | 'pending'      // 待确认
  | 'completed'    // 已完成
  | 'cancelled';   // 已取消

// 状态配置
interface StatusConfig {
  label: string;
  color: string;
  allowedTransitions: string[];
  allowedOperations: string[];
}

// 入库单状态机配置
export const inboundStateMachine: Record<InboundStatus, StatusConfig> = {
  draft: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-700',
    allowedTransitions: ['pending', 'cancelled'],
    allowedOperations: ['edit', 'delete', 'submit'],
  },
  pending: {
    label: '待审核',
    color: 'bg-yellow-100 text-yellow-700',
    allowedTransitions: ['completed', 'cancelled'],
    allowedOperations: ['audit', 'cancel', 'view'],
  },
  completed: {
    label: '已完成',
    color: 'bg-green-100 text-green-700',
    allowedTransitions: ['pending'], // 允许撤销
    allowedOperations: ['unaudit', 'view'],
  },
  cancelled: {
    label: '已取消',
    color: 'bg-red-100 text-red-700',
    allowedTransitions: [],
    allowedOperations: ['view'],
  },
};

// 出库单状态机配置
export const outboundStateMachine: Record<OutboundStatus, StatusConfig> = {
  draft: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-700',
    allowedTransitions: ['pending', 'cancelled'],
    allowedOperations: ['edit', 'delete', 'submit'],
  },
  pending: {
    label: '待确认',
    color: 'bg-blue-100 text-blue-700',
    allowedTransitions: ['completed', 'cancelled'],
    allowedOperations: ['confirm', 'cancel', 'view'],
  },
  completed: {
    label: '已完成',
    color: 'bg-green-100 text-green-700',
    allowedTransitions: ['pending'], // 允许撤销
    allowedOperations: ['unconfirm', 'view'],
  },
  cancelled: {
    label: '已取消',
    color: 'bg-red-100 text-red-700',
    allowedTransitions: [],
    allowedOperations: ['view'],
  },
};

// 状态机验证器
export class WarehouseStateMachine {
  // 验证入库单状态流转是否合法
  static canTransitionInbound(
    fromStatus: InboundStatus,
    toStatus: InboundStatus
  ): boolean {
    const config = inboundStateMachine[fromStatus];
    if (!config) return false;
    return config.allowedTransitions.includes(toStatus);
  }

  // 验证出库单状态流转是否合法
  static canTransitionOutbound(
    fromStatus: OutboundStatus,
    toStatus: OutboundStatus
  ): boolean {
    const config = outboundStateMachine[fromStatus];
    if (!config) return false;
    return config.allowedTransitions.includes(toStatus);
  }

  // 获取入库单状态标签
  static getInboundStatusLabel(status: InboundStatus): string {
    return inboundStateMachine[status]?.label || status;
  }

  // 获取出库单状态标签
  static getOutboundStatusLabel(status: OutboundStatus): string {
    return outboundStateMachine[status]?.label || status;
  }

  // 获取入库单状态颜色
  static getInboundStatusColor(status: InboundStatus): string {
    return inboundStateMachine[status]?.color || 'bg-gray-100 text-gray-700';
  }

  // 获取出库单状态颜色
  static getOutboundStatusColor(status: OutboundStatus): string {
    return outboundStateMachine[status]?.color || 'bg-gray-100 text-gray-700';
  }

  // 检查入库单是否允许编辑
  static canEditInbound(status: InboundStatus): boolean {
    return inboundStateMachine[status]?.allowedOperations.includes('edit') || false;
  }

  // 检查入库单是否允许删除
  static canDeleteInbound(status: InboundStatus): boolean {
    return inboundStateMachine[status]?.allowedOperations.includes('delete') || false;
  }

  // 检查入库单是否允许审核
  static canAuditInbound(status: InboundStatus): boolean {
    return inboundStateMachine[status]?.allowedOperations.includes('audit') || false;
  }

  // 检查出库单是否允许编辑
  static canEditOutbound(status: OutboundStatus): boolean {
    return outboundStateMachine[status]?.allowedOperations.includes('edit') || false;
  }

  // 检查出库单是否允许删除
  static canDeleteOutbound(status: OutboundStatus): boolean {
    return outboundStateMachine[status]?.allowedOperations.includes('delete') || false;
  }

  // 检查出库单是否允许确认
  static canConfirmOutbound(status: OutboundStatus): boolean {
    return outboundStateMachine[status]?.allowedOperations.includes('confirm') || false;
  }

  // 获取状态流转错误信息
  static getTransitionError(
    type: 'inbound' | 'outbound',
    fromStatus: string,
    toStatus: string
  ): string {
    const typeLabel = type === 'inbound' ? '入库单' : '出库单';
    const stateMachine = type === 'inbound' ? inboundStateMachine : outboundStateMachine;
    const fromLabel = stateMachine[fromStatus as InboundStatus | OutboundStatus]?.label || fromStatus;
    const toLabel = stateMachine[toStatus as InboundStatus | OutboundStatus]?.label || toStatus;
    return `${typeLabel}状态流转不合法: ${fromLabel} -> ${toLabel}`;
  }
}

// 库存操作类型
export type InventoryTransType =
  | 'inbound'           // 入库
  | 'inbound_cancel'    // 入库撤销
  | 'outbound'          // 出库
  | 'outbound_cancel'   // 出库撤销
  | 'transfer_in'       // 调拨入库
  | 'transfer_out'      // 调拨出库
  | 'adjust_add'        // 盘盈
  | 'adjust_sub'        // 盘亏;

// 库存交易记录接口
export interface InventoryTransaction {
  id?: number;
  transNo: string;
  transType: InventoryTransType;
  batchNo: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  warehouseId: number;
  warehouseCode: string;
  quantity: number;
  sourceType: string;
  sourceNo: string;
  operatedBy?: number;
  operatedAt?: Date;
  remark?: string;
}

// 库存变动日志记录器
export class InventoryTransactionLogger {
  static async log(transaction: InventoryTransaction): Promise<void> {
    // 这里可以将日志保存到数据库或发送到日志服务
    console.log(`[InventoryTransaction] ${transaction.transType}: ${transaction.materialName} ${transaction.quantity > 0 ? '+' : ''}${transaction.quantity} ${transaction.materialCode}`);
  }
}
