import { describe, it, expect } from 'vitest';
import { InkFormulaVersion } from '@/domain/dcprint/aggregates/InkFormulaVersion';
import { FormulaStatus } from '@/domain/dcprint/value-objects/FormulaStatus';
import { InvalidTransitionError } from '@/domain/shared/DomainTypes';
import type { FormulaItemProps } from '@/domain/dcprint/value-objects/FormulaItemVO';

/**
 * T401: InkFormulaVersion 聚合根领域事件触发测试
 *
 * 覆盖 T101 集成：InkFormulaVersion 在状态流转时触发领域事件
 * - activate 触发 FormulaVersionActivatedEvent
 * - cancel 触发 FormulaVersionCancelledEvent
 * - 非法状态流转抛 InvalidTransitionError
 */

function makeItem(overrides: Partial<FormulaItemProps> = {}): FormulaItemProps {
  return {
    materialCode: 'M001',
    materialName: 'Ink',
    ratio: 100,
    sort: 1,
    ...overrides,
  };
}

function makeVersionRow(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 1,
    color_id: 1,
    version_no: 'V1.0',
    version_name: null,
    status: FormulaStatus.DRAFT,
    change_reason: null,
    source_version_id: null,
    process_note: null,
    total_weight: null,
    unit: 'kg',
    shelf_life_hours: 168,
    theoretical_cost: null,
    cost_snapshot_time: null,
    cost_calc_status: 0,
    cost_warning: null,
    activate_by: null,
    activate_time: null,
    cancel_by: null,
    cancel_reason: null,
    cancel_time: null,
    create_by: 1,
    create_time: null,
    update_by: 1,
    update_time: null,
    ...overrides,
  };
}

describe('T401: InkFormulaVersion 聚合根领域事件', () => {
  describe('activate 触发 FormulaVersionActivatedEvent', () => {
    it('草稿版本 activate 后触发生效事件', () => {
      // createDraft 不设置 id，事件触发依赖 id，故用 fromRow 重建带 id 的草稿版本
      const version = InkFormulaVersion.fromRow(
        makeVersionRow({ id: 1, status: FormulaStatus.DRAFT, version_no: 'V1.0' })
      );

      version.activate(1);

      const events = version.getDomainEvents();
      const activated = events.find((e) => e.eventType === 'inkFormulaVersion.activated');
      expect(activated).toBeDefined();
      expect(activated!.payload.versionNo).toBe('V1.0');
      expect(activated!.payload.activatedBy).toBe(1);
      expect(version.status).toBe(FormulaStatus.ACTIVE);
    });

    it('createDraft 创建的草稿可正常 activate（无 id 不触发事件）', () => {
      const version = InkFormulaVersion.createDraft(
        1,
        { versionNo: 'V1.0' },
        [makeItem()],
        1
      );

      version.activate(1);

      expect(version.status).toBe(FormulaStatus.ACTIVE);
      // createDraft 未赋 id，事件不触发
      expect(version.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('cancel 触发 FormulaVersionCancelledEvent', () => {
    it('已生效版本 cancel 后触发作废事件', () => {
      const version = InkFormulaVersion.fromRow(
        makeVersionRow({ id: 1, status: FormulaStatus.ACTIVE, version_no: 'V1.0' })
      );

      version.cancel(1, 'obsolete');

      const events = version.getDomainEvents();
      const cancelled = events.find((e) => e.eventType === 'inkFormulaVersion.cancelled');
      expect(cancelled).toBeDefined();
      expect(cancelled!.payload.reason).toBe('obsolete');
      expect(cancelled!.payload.cancelledBy).toBe(1);
      expect(version.status).toBe(FormulaStatus.CANCELLED);
    });
  });

  describe('非法状态流转抛 InvalidTransitionError', () => {
    it('已生效版本再次 activate 抛 InvalidTransitionError', () => {
      const version = InkFormulaVersion.fromRow(
        makeVersionRow({ id: 1, status: FormulaStatus.ACTIVE })
      );

      expect(() => version.activate(1)).toThrow(InvalidTransitionError);
    });

    it('草稿版本不能直接 cancel 抛 InvalidTransitionError', () => {
      const version = InkFormulaVersion.fromRow(
        makeVersionRow({ id: 1, status: FormulaStatus.DRAFT })
      );

      expect(() => version.cancel(1, 'reason')).toThrow(InvalidTransitionError);
    });
  });

  describe('领域事件管理', () => {
    it('clearDomainEvents 清空事件数组', () => {
      const version = InkFormulaVersion.fromRow(
        makeVersionRow({ id: 1, status: FormulaStatus.DRAFT })
      );
      version.activate(1);
      expect(version.getDomainEvents()).toHaveLength(1);

      version.clearDomainEvents();

      expect(version.getDomainEvents()).toHaveLength(0);
    });
  });
});
