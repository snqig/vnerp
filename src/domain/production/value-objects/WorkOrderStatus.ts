import { t } from '@/lib/server-translate';

import { DomainError } from '../../shared/DomainTypes';

/**
 * @deprecated 未接线（dead code），且词表与 DB **并不对齐** —— 勿用于新增代码。
 *
 * 事实（2026-09-23 运行时核实）：
 *   - 唯一消费者 `ProductionApplicationService` 零外部引用；`@/domain/production` 桶文件亦无人 import
 *   - `prod_work_order.status` 的规范词表是 `pending/confirmed/producing/completed/cancelled`，
 *     与本类的 `draft/approved/picking/in_progress/closed` **不同域**；
 *     原注释称「与 prod_work_order.status 字段对齐」是**错的**，已更正
 *   - 本类原有的 1..7 数字码映射（1=draft…）与迁移 `060_unify_status_codes.sql` 的 1..5 口径互相矛盾，
 *     且零调用 —— 已删除，以免再次被误采信（曾导致 mrp-engine 写出 `IN ('draft','approved')`）
 *
 * 唯一真相源：`@/lib/constants` 的 `WorkOrderStatus` + `normalizeWorkOrderStatus()`。
 */
export type WorkOrderStatus =
  | 'draft'
  | 'approved'
  | 'picking'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled';

/** @deprecated 见文件头说明；唯一真相源为 `@/lib/constants`。 */
export class WorkOrderStatusVO {
  private constructor(public readonly value: WorkOrderStatus) {}

  static draft(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('draft');
  }
  static approved(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('approved');
  }
  static picking(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('picking');
  }
  static inProgress(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('in_progress');
  }
  static completed(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('completed');
  }
  static closed(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('closed');
  }
  static cancelled(): WorkOrderStatusVO {
    return new WorkOrderStatusVO('cancelled');
  }

  static from(value: string): WorkOrderStatusVO {
    const validStatuses: WorkOrderStatus[] = [
      'draft',
      'approved',
      'picking',
      'in_progress',
      'completed',
      'closed',
      'cancelled',
    ];
    if (!validStatuses.includes(value as WorkOrderStatus)) {
      throw new DomainError(`无效的工单状态: ${value}`);
    }
    return new WorkOrderStatusVO(value as WorkOrderStatus);
  }

  private static transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    draft: ['approved', 'cancelled'],
    approved: ['picking', 'cancelled'],
    picking: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: ['closed'],
    closed: [],
    cancelled: [],
  };

  canTransitionTo(target: WorkOrderStatus): boolean {
    return WorkOrderStatusVO.transitions[this.value].includes(target);
  }

  transitionTo(target: WorkOrderStatus): WorkOrderStatusVO {
    if (!this.canTransitionTo(target)) {
      throw new DomainError(
        `工单状态流转不合法: ${this.label()} -> ${WorkOrderStatusVO.from(target).label()}`
      );
    }
    return new WorkOrderStatusVO(target);
  }

  canEdit(): boolean {
    return this.value === 'draft';
  }
  canDelete(): boolean {
    return this.value === 'draft';
  }
  canApprove(): boolean {
    return this.value === 'draft';
  }
  canPick(): boolean {
    return this.value === 'approved';
  }
  canStart(): boolean {
    return this.value === 'approved' || this.value === 'picking';
  }
  canComplete(): boolean {
    return this.value === 'in_progress';
  }
  canClose(): boolean {
    return this.value === 'completed';
  }
  canCancel(): boolean {
    return !['closed', 'cancelled', 'completed'].includes(this.value);
  }

  label(): string {
  const ts = t;
    const labels: Record<WorkOrderStatus, string> = {
      draft: ts('k_oc54qp'),
      approved: ts('k_7j2xv0'),
      picking: ts('k_ngsv7b'),
      in_progress: ts('k_1rcb0fm'),
      completed: ts('k_vuhsey'),
      closed: ts('k_kigq32'),
      cancelled: ts('k_1o0kows'),
    };
    return labels[this.value];
  }

  equals(other: WorkOrderStatusVO): boolean {
    return this.value === other.value;
  }
}
