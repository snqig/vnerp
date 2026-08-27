/**
 * SampleOrderStatus 值对象单元测试
 * 覆盖状态机配置、canTransition 合法/非法路径、getStatusLabel、getStatusColor
 */

import { describe, it, expect } from 'vitest';
import {
  SampleOrderStatus,
  sampleOrderStateMachine,
  statusTransitionActions,
  canTransition,
  getStatusLabel,
  getStatusColor,
} from '@/domain/sample/value-objects/SampleOrderStatus';

describe('SampleOrderStatus 值对象', () => {
  // ============================================================
  // 状态机配置
  // ============================================================
  describe('状态机配置', () => {
    it('应包含 7 种状态', () => {
      const statuses = Object.keys(sampleOrderStateMachine);
      expect(statuses).toHaveLength(7);
      expect(statuses).toContain(SampleOrderStatus.DRAFT);
      expect(statuses).toContain(SampleOrderStatus.PENDING);
      expect(statuses).toContain(SampleOrderStatus.IN_PROGRESS);
      expect(statuses).toContain(SampleOrderStatus.COMPLETED);
      expect(statuses).toContain(SampleOrderStatus.CONFIRMED);
      expect(statuses).toContain(SampleOrderStatus.CONVERTED);
      expect(statuses).toContain(SampleOrderStatus.CANCELLED);
    });

    it('converted 和 cancelled 是终态（无允许流转）', () => {
      expect(sampleOrderStateMachine[SampleOrderStatus.CONVERTED].allowedTransitions).toEqual([]);
      expect(sampleOrderStateMachine[SampleOrderStatus.CANCELLED].allowedTransitions).toEqual([]);
    });

    it('每个状态都应有 label 和 color', () => {
      for (const status of Object.keys(sampleOrderStateMachine) as SampleOrderStatus[]) {
        const config = sampleOrderStateMachine[status];
        expect(config.label).toBeTruthy();
        expect(config.color).toMatch(/^#/);
      }
    });
  });

  // ============================================================
  // canTransition — 合法路径
  // ============================================================
  describe('canTransition() 合法路径', () => {
    it('draft → pending ✓', () => {
      expect(canTransition(SampleOrderStatus.DRAFT, SampleOrderStatus.PENDING)).toBe(true);
    });
    it('draft → cancelled ✓', () => {
      expect(canTransition(SampleOrderStatus.DRAFT, SampleOrderStatus.CANCELLED)).toBe(true);
    });
    it('pending → in_progress ✓', () => {
      expect(canTransition(SampleOrderStatus.PENDING, SampleOrderStatus.IN_PROGRESS)).toBe(true);
    });
    it('pending → cancelled ✓', () => {
      expect(canTransition(SampleOrderStatus.PENDING, SampleOrderStatus.CANCELLED)).toBe(true);
    });
    it('in_progress → completed ✓', () => {
      expect(canTransition(SampleOrderStatus.IN_PROGRESS, SampleOrderStatus.COMPLETED)).toBe(true);
    });
    it('in_progress → cancelled ✓', () => {
      expect(canTransition(SampleOrderStatus.IN_PROGRESS, SampleOrderStatus.CANCELLED)).toBe(true);
    });
    it('completed → confirmed ✓', () => {
      expect(canTransition(SampleOrderStatus.COMPLETED, SampleOrderStatus.CONFIRMED)).toBe(true);
    });
    it('completed → cancelled ✓', () => {
      expect(canTransition(SampleOrderStatus.COMPLETED, SampleOrderStatus.CANCELLED)).toBe(true);
    });
    it('confirmed → converted ✓', () => {
      expect(canTransition(SampleOrderStatus.CONFIRMED, SampleOrderStatus.CONVERTED)).toBe(true);
    });
  });

  // ============================================================
  // canTransition — 非法路径
  // ============================================================
  describe('canTransition() 非法路径', () => {
    it('draft → in_progress ✗', () => {
      expect(canTransition(SampleOrderStatus.DRAFT, SampleOrderStatus.IN_PROGRESS)).toBe(false);
    });
    it('draft → completed ✗', () => {
      expect(canTransition(SampleOrderStatus.DRAFT, SampleOrderStatus.COMPLETED)).toBe(false);
    });
    it('draft → confirmed ✗', () => {
      expect(canTransition(SampleOrderStatus.DRAFT, SampleOrderStatus.CONFIRMED)).toBe(false);
    });
    it('draft → converted ✗', () => {
      expect(canTransition(SampleOrderStatus.DRAFT, SampleOrderStatus.CONVERTED)).toBe(false);
    });
    it('pending → completed ✗ (跳级)', () => {
      expect(canTransition(SampleOrderStatus.PENDING, SampleOrderStatus.COMPLETED)).toBe(false);
    });
    it('in_progress → confirmed ✗ (跳级)', () => {
      expect(canTransition(SampleOrderStatus.IN_PROGRESS, SampleOrderStatus.CONFIRMED)).toBe(false);
    });
    it('completed → converted ✗ (跳级)', () => {
      expect(canTransition(SampleOrderStatus.COMPLETED, SampleOrderStatus.CONVERTED)).toBe(false);
    });
    it('confirmed → cancelled ✗', () => {
      expect(canTransition(SampleOrderStatus.CONFIRMED, SampleOrderStatus.CANCELLED)).toBe(false);
    });
    it('converted → 任意 ✗ (终态)', () => {
      expect(canTransition(SampleOrderStatus.CONVERTED, SampleOrderStatus.DRAFT)).toBe(false);
      expect(canTransition(SampleOrderStatus.CONVERTED, SampleOrderStatus.CANCELLED)).toBe(false);
    });
    it('cancelled → 任意 ✗ (终态)', () => {
      expect(canTransition(SampleOrderStatus.CANCELLED, SampleOrderStatus.DRAFT)).toBe(false);
      expect(canTransition(SampleOrderStatus.CANCELLED, SampleOrderStatus.PENDING)).toBe(false);
    });
  });

  // ============================================================
  // getStatusLabel
  // ============================================================
  describe('getStatusLabel()', () => {
    it('应返回各状态中文名', () => {
      expect(getStatusLabel(SampleOrderStatus.DRAFT)).toBe('草稿');
      expect(getStatusLabel(SampleOrderStatus.PENDING)).toBe('待打样');
      expect(getStatusLabel(SampleOrderStatus.IN_PROGRESS)).toBe('打样中');
      expect(getStatusLabel(SampleOrderStatus.COMPLETED)).toBe('已完成');
      expect(getStatusLabel(SampleOrderStatus.CONFIRMED)).toBe('已确认');
      expect(getStatusLabel(SampleOrderStatus.CONVERTED)).toBe('已转大货');
      expect(getStatusLabel(SampleOrderStatus.CANCELLED)).toBe('已作废');
    });
  });

  // ============================================================
  // getStatusColor
  // ============================================================
  describe('getStatusColor()', () => {
    it('应返回有效 hex 颜色', () => {
      for (const status of Object.keys(sampleOrderStateMachine) as SampleOrderStatus[]) {
        const color = getStatusColor(status);
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  // ============================================================
  // statusTransitionActions
  // ============================================================
  describe('statusTransitionActions', () => {
    it('应包含 submit/startProduction/complete/confirm/convert/cancel 动作', () => {
      const actions = statusTransitionActions.map((a) => a.action);
      expect(actions).toContain('submit');
      expect(actions).toContain('startProduction');
      expect(actions).toContain('complete');
      expect(actions).toContain('confirm');
      expect(actions).toContain('convert');
      expect(actions).toContain('cancel');
    });

    it('每条动作的 from→to 应与 canTransition 一致', () => {
      for (const action of statusTransitionActions) {
        expect(canTransition(action.from, action.to)).toBe(true);
      }
    });
  });
});
