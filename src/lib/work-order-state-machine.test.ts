import { describe, it, expect } from 'vitest';
import {
  WorkOrderStateMachine,
  ProcessStepStateMachine,
  WorkOrderStatus,
  ProcessStepStatus,
} from './work-order-state-machine';

describe('WorkOrderStateMachine', () => {
  describe('canTransition', () => {
    it('allows pending → confirmed', () => {
      expect(WorkOrderStateMachine.canTransition('pending', 'confirmed')).toBe(true);
    });

    it('disallows pending → producing', () => {
      expect(WorkOrderStateMachine.canTransition('pending', 'producing')).toBe(false);
    });

    it('disallows completed → pending', () => {
      expect(WorkOrderStateMachine.canTransition('completed', 'pending')).toBe(false);
    });

    it('disallows cancelled → anything', () => {
      const statuses: WorkOrderStatus[] = [
        'pending',
        'confirmed',
        'material_preparing',
        'material_ready',
        'producing',
        'qc_pending',
        'qc_pass',
        'qc_fail',
        'rework',
        'completed',
        'cancelled',
      ];
      for (const to of statuses) {
        if (to === 'cancelled') continue;
        expect(WorkOrderStateMachine.canTransition('cancelled', to)).toBe(false);
      }
    });

    it('allows same-to-same transition', () => {
      expect(WorkOrderStateMachine.canTransition('pending', 'pending')).toBe(true);
      expect(WorkOrderStateMachine.canTransition('producing', 'producing')).toBe(true);
    });

    it('allows confirmed → material_preparing', () => {
      expect(WorkOrderStateMachine.canTransition('confirmed', 'material_preparing')).toBe(true);
    });

    it('allows producing → qc_pending', () => {
      expect(WorkOrderStateMachine.canTransition('producing', 'qc_pending')).toBe(true);
    });

    it('allows qc_fail → rework', () => {
      expect(WorkOrderStateMachine.canTransition('qc_fail', 'rework')).toBe(true);
    });

    it('allows rework → qc_pending', () => {
      expect(WorkOrderStateMachine.canTransition('rework', 'qc_pending')).toBe(true);
    });
  });

  describe('getAllowedTransitions', () => {
    it('returns [confirmed, cancelled] for pending', () => {
      expect(WorkOrderStateMachine.getAllowedTransitions('pending')).toEqual([
        'confirmed',
        'cancelled',
      ]);
    });

    it('returns [] for completed', () => {
      expect(WorkOrderStateMachine.getAllowedTransitions('completed')).toEqual([]);
    });

    it('returns [] for cancelled', () => {
      expect(WorkOrderStateMachine.getAllowedTransitions('cancelled')).toEqual([]);
    });

    it('returns [qc_pass, qc_fail] for qc_pending', () => {
      expect(WorkOrderStateMachine.getAllowedTransitions('qc_pending')).toEqual([
        'qc_pass',
        'qc_fail',
      ]);
    });
  });

  describe('getStatusLabel', () => {
    it('returns 待确认 for pending', () => {
      expect(WorkOrderStateMachine.getStatusLabel('pending')).toBe('待确认');
    });

    it('returns 生产中 for producing', () => {
      expect(WorkOrderStateMachine.getStatusLabel('producing')).toBe('生产中');
    });

    it('returns 已完成 for completed', () => {
      expect(WorkOrderStateMachine.getStatusLabel('completed')).toBe('已完成');
    });

    it('returns 已取消 for cancelled', () => {
      expect(WorkOrderStateMachine.getStatusLabel('cancelled')).toBe('已取消');
    });
  });

  describe('canEdit', () => {
    it('returns true for pending', () => {
      expect(WorkOrderStateMachine.canEdit('pending')).toBe(true);
    });

    it('returns false for confirmed', () => {
      expect(WorkOrderStateMachine.canEdit('confirmed')).toBe(false);
    });

    it('returns false for producing', () => {
      expect(WorkOrderStateMachine.canEdit('producing')).toBe(false);
    });

    it('returns false for completed', () => {
      expect(WorkOrderStateMachine.canEdit('completed')).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('returns true for pending', () => {
      expect(WorkOrderStateMachine.canDelete('pending')).toBe(true);
    });

    it('returns false for confirmed', () => {
      expect(WorkOrderStateMachine.canDelete('confirmed')).toBe(false);
    });

    it('returns false for completed', () => {
      expect(WorkOrderStateMachine.canDelete('completed')).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('returns true for pending', () => {
      expect(WorkOrderStateMachine.canCancel('pending')).toBe(true);
    });

    it('returns true for confirmed', () => {
      expect(WorkOrderStateMachine.canCancel('confirmed')).toBe(true);
    });

    it('returns true for material_preparing', () => {
      expect(WorkOrderStateMachine.canCancel('material_preparing')).toBe(true);
    });

    it('returns true for material_ready', () => {
      expect(WorkOrderStateMachine.canCancel('material_ready')).toBe(true);
    });

    it('returns true for producing', () => {
      expect(WorkOrderStateMachine.canCancel('producing')).toBe(true);
    });

    it('returns true for qc_fail', () => {
      expect(WorkOrderStateMachine.canCancel('qc_fail')).toBe(true);
    });

    it('returns false for completed', () => {
      expect(WorkOrderStateMachine.canCancel('completed')).toBe(false);
    });

    it('returns false for cancelled', () => {
      expect(WorkOrderStateMachine.canCancel('cancelled')).toBe(false);
    });

    it('returns false for qc_pending', () => {
      expect(WorkOrderStateMachine.canCancel('qc_pending')).toBe(false);
    });

    it('returns false for qc_pass', () => {
      expect(WorkOrderStateMachine.canCancel('qc_pass')).toBe(false);
    });

    it('returns false for rework', () => {
      expect(WorkOrderStateMachine.canCancel('rework')).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('does not throw for valid transition', () => {
      expect(() => WorkOrderStateMachine.validateTransition('pending', 'confirmed')).not.toThrow();
    });

    it('does not throw for same-to-same transition', () => {
      expect(() => WorkOrderStateMachine.validateTransition('pending', 'pending')).not.toThrow();
    });

    it('throws Error for invalid transition', () => {
      expect(() => WorkOrderStateMachine.validateTransition('pending', 'producing')).toThrow(Error);
    });

    it('throws Error for completed → pending', () => {
      expect(() => WorkOrderStateMachine.validateTransition('completed', 'pending')).toThrow(Error);
    });
  });

  describe('getTransitionError', () => {
    it('returns empty string for valid transition', () => {
      expect(WorkOrderStateMachine.getTransitionError('pending', 'confirmed')).toBe('');
    });

    it('returns empty string for same-to-same transition', () => {
      expect(WorkOrderStateMachine.getTransitionError('pending', 'pending')).toBe('');
    });

    it('returns descriptive Chinese message for invalid transition', () => {
      const error = WorkOrderStateMachine.getTransitionError('pending', 'producing');
      expect(error).toContain('待确认');
      expect(error).toContain('生产中');
      expect(error).toContain('不允许');
    });

    it('includes allowed transitions in error message', () => {
      const error = WorkOrderStateMachine.getTransitionError('pending', 'producing');
      expect(error).toContain('已确认');
      expect(error).toContain('已取消');
    });

    it('returns 无 for status with no allowed transitions', () => {
      const error = WorkOrderStateMachine.getTransitionError('completed', 'pending');
      expect(error).toContain('无');
    });
  });
});

describe('ProcessStepStateMachine', () => {
  describe('canTransition', () => {
    it('allows pending → in_progress', () => {
      expect(ProcessStepStateMachine.canTransition('pending', 'in_progress')).toBe(true);
    });

    it('allows pending → skipped', () => {
      expect(ProcessStepStateMachine.canTransition('pending', 'skipped')).toBe(true);
    });

    it('allows in_progress → completed', () => {
      expect(ProcessStepStateMachine.canTransition('in_progress', 'completed')).toBe(true);
    });

    it('allows in_progress → failed', () => {
      expect(ProcessStepStateMachine.canTransition('in_progress', 'failed')).toBe(true);
    });

    it('allows failed → in_progress (retry)', () => {
      expect(ProcessStepStateMachine.canTransition('failed', 'in_progress')).toBe(true);
    });

    it('disallows completed → anything except completed', () => {
      expect(ProcessStepStateMachine.canTransition('completed', 'pending')).toBe(false);
      expect(ProcessStepStateMachine.canTransition('completed', 'in_progress')).toBe(false);
      expect(ProcessStepStateMachine.canTransition('completed', 'failed')).toBe(false);
      expect(ProcessStepStateMachine.canTransition('completed', 'skipped')).toBe(false);
    });

    it('disallows skipped → anything except skipped', () => {
      expect(ProcessStepStateMachine.canTransition('skipped', 'pending')).toBe(false);
      expect(ProcessStepStateMachine.canTransition('skipped', 'in_progress')).toBe(false);
    });

    it('allows same-to-same transition', () => {
      expect(ProcessStepStateMachine.canTransition('pending', 'pending')).toBe(true);
      expect(ProcessStepStateMachine.canTransition('in_progress', 'in_progress')).toBe(true);
    });
  });

  describe('getStatusLabel', () => {
    it('returns 待处理 for pending', () => {
      expect(ProcessStepStateMachine.getStatusLabel('pending')).toBe('待处理');
    });

    it('returns 进行中 for in_progress', () => {
      expect(ProcessStepStateMachine.getStatusLabel('in_progress')).toBe('进行中');
    });

    it('returns 已完成 for completed', () => {
      expect(ProcessStepStateMachine.getStatusLabel('completed')).toBe('已完成');
    });
  });
});
