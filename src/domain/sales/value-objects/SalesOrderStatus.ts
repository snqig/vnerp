import { t } from '@/lib/server-translate';
import { SalesOrderStatusCode, normalizeSalesOrderStatus } from '@/lib/order-status';

import { DomainError } from '../../shared/DomainTypes';

export type SalesStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_shipped'
  | 'completed'
  | 'closed'
  | 'voided';

export class SalesOrderStatus {
  private constructor(public readonly value: SalesStatus) {}

  static draft(): SalesOrderStatus {
    return new SalesOrderStatus('draft');
  }
  static submitted(): SalesOrderStatus {
    return new SalesOrderStatus('submitted');
  }
  static approved(): SalesOrderStatus {
    return new SalesOrderStatus('approved');
  }
  static partiallyShipped(): SalesOrderStatus {
    return new SalesOrderStatus('partially_shipped');
  }
  static completed(): SalesOrderStatus {
    return new SalesOrderStatus('completed');
  }
  static closed(): SalesOrderStatus {
    return new SalesOrderStatus('closed');
  }
  static voided(): SalesOrderStatus {
    return new SalesOrderStatus('voided');
  }

  static from(value: string): SalesOrderStatus {
    const validStatuses: SalesStatus[] = [
      'draft',
      'submitted',
      'approved',
      'partially_shipped',
      'completed',
      'closed',
      'voided',
    ];
    if (!validStatuses.includes(value as SalesStatus)) {
      throw new DomainError(`无效的销售单状态: ${value}`);
    }
    return new SalesOrderStatus(value as SalesStatus);
  }

  /**
   * 从库内状态码构造。
   *
   * ⚠️ 状态码契约的唯一真相源是 src/lib/order-status.ts
   *    （依据 live 库 sal_order.status 列注释：1-待确认 … 5-已取消）。
   *
   * 修复前的旧表是 0=draft,1=submitted,2=approved,3=partially_shipped,4=completed,6=voided,9=closed，
   * 与库内契约在 1/2/3 上整体错位：API 层写 3 表示"已审核"，本表读 3 却是"部分发货"，
   * 导出与列表页又是第三套。现统一为「先经 normalizeSalesOrderStatus 归一到 1..5，再回映领域态」，
   * 旧码（0/6/9 与 10-60 家族）自动兼容，不再抛错。
   */
  static fromDbCode(code: number): SalesOrderStatus {
    const normalized = normalizeSalesOrderStatus(code);
    if (normalized === null) {
      throw new DomainError(`无效的销售单状态码: ${code}`);
    }
    const map: Record<number, SalesStatus> = {
      [SalesOrderStatusCode.PENDING]: 'draft',
      // 契约态 2「已确认」回映为领域态 submitted，
      // 以便 SalesOrder.approve()（canApprove 仅 submitted 为真）仍可正常流转。
      [SalesOrderStatusCode.CONFIRMED]: 'submitted',
      [SalesOrderStatusCode.PARTIALLY_SHIPPED]: 'partially_shipped',
      [SalesOrderStatusCode.COMPLETED]: 'completed',
      [SalesOrderStatusCode.CANCELLED]: 'voided',
    };
    return new SalesOrderStatus(map[normalized]);
  }

  /**
   * 映射到库内状态码（契约码 1..5）。
   *
   * 契约只有 5 个态，而领域层有 7 个：其中
   *   submitted / approved  → 同为 2（已确认）
   *   completed / closed    → 同为 4（已完成）
   * 即「已提交且已审核」「已完成且已关闭」在库内不可区分，这是本契约的既定取舍。
   * 领域层的事件与流转规则不受影响（仍按细粒度状态运行），只是落库时被折叠。
   */
  toDbCode(): number {
    const map: Record<SalesStatus, number> = {
      draft: SalesOrderStatusCode.PENDING,
      submitted: SalesOrderStatusCode.CONFIRMED,
      approved: SalesOrderStatusCode.CONFIRMED,
      partially_shipped: SalesOrderStatusCode.PARTIALLY_SHIPPED,
      completed: SalesOrderStatusCode.COMPLETED,
      closed: SalesOrderStatusCode.COMPLETED,
      voided: SalesOrderStatusCode.CANCELLED,
    };
    return map[this.value];
  }

  private static transitions: Record<SalesStatus, SalesStatus[]> = {
    draft: ['submitted', 'closed', 'voided'],
    submitted: ['approved', 'closed', 'voided'],
    approved: ['partially_shipped', 'completed', 'closed', 'voided'],
    partially_shipped: ['completed', 'closed', 'voided'],
    // 已完成可关闭（支持作废全链路回滚 T403）
    completed: ['closed'],
    closed: [],
    voided: [],
  };

  private static operations: Record<SalesStatus, string[]> = {
    draft: ['edit', 'delete', 'submit', 'void'],
    submitted: ['approve', 'close', 'void'],
    approved: ['ship', 'close', 'void'],
    partially_shipped: ['ship', 'close', 'void'],
    completed: ['view', 'close'],
    closed: ['view'],
    voided: ['view'],
  };

  canTransitionTo(target: SalesStatus): boolean {
    return SalesOrderStatus.transitions[this.value].includes(target);
  }

  transitionTo(target: SalesStatus): SalesOrderStatus {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `销售单状态流转不合法: ${this.label()} -> ${SalesOrderStatus.from(target).label()}`
      );
    }
    return new SalesOrderStatus(target);
  }

  canEdit(): boolean {
    return SalesOrderStatus.operations[this.value].includes('edit');
  }
  canDelete(): boolean {
    return SalesOrderStatus.operations[this.value].includes('delete');
  }
  canApprove(): boolean {
    return SalesOrderStatus.operations[this.value].includes('approve');
  }
  canShip(): boolean {
    return SalesOrderStatus.operations[this.value].includes('ship');
  }
  canVoid(): boolean {
    return SalesOrderStatus.operations[this.value].includes('void');
  }

  label(): string {
  const ts = t;
    const labels: Record<SalesStatus, string> = {
      draft: ts('k_oc54qp'),
      submitted: ts('k_168pm1t'),
      approved: ts('k_7j2xv0'),
      partially_shipped: ts('k_8lpqyg'),
      completed: ts('k_19j4h'),
      closed: ts('k_q0bjhp'),
      voided: ts('k_1o0kows'),
    };
    return labels[this.value];
  }

  equals(other: SalesOrderStatus): boolean {
    return this.value === other.value;
  }
}
