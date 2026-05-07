import { describe, it, expect } from 'vitest';
import { StateMachineValidator, InspectStatus, ProcessStatus } from './state-machine';

describe('StateMachineValidator', () => {
  describe('canTransitionInspect', () => {
    it('allows pending → inspecting', () => {
      expect(StateMachineValidator.canTransitionInspect('pending', 'inspecting')).toBe(true);
    });

    it('allows inspecting → pass', () => {
      expect(StateMachineValidator.canTransitionInspect('inspecting', 'pass')).toBe(true);
    });

    it('allows inspecting → fail', () => {
      expect(StateMachineValidator.canTransitionInspect('inspecting', 'fail')).toBe(true);
    });

    it('disallows inspecting → pending', () => {
      expect(StateMachineValidator.canTransitionInspect('inspecting', 'pending')).toBe(false);
    });

    it('disallows pass → anything except pass', () => {
      const statuses: InspectStatus[] = ['pending', 'inspecting', 'fail', 'rework', 'scrap'];
      for (const to of statuses) {
        expect(StateMachineValidator.canTransitionInspect('pass', to)).toBe(false);
      }
    });

    it('allows fail → rework', () => {
      expect(StateMachineValidator.canTransitionInspect('fail', 'rework')).toBe(true);
    });

    it('allows fail → scrap', () => {
      expect(StateMachineValidator.canTransitionInspect('fail', 'scrap')).toBe(true);
    });

    it('allows rework → pending', () => {
      expect(StateMachineValidator.canTransitionInspect('rework', 'pending')).toBe(true);
    });

    it('allows rework → scrap', () => {
      expect(StateMachineValidator.canTransitionInspect('rework', 'scrap')).toBe(true);
    });

    it('allows same-to-same transition', () => {
      expect(StateMachineValidator.canTransitionInspect('pending', 'pending')).toBe(true);
      expect(StateMachineValidator.canTransitionInspect('inspecting', 'inspecting')).toBe(true);
    });

    it('disallows scrap → anything except scrap', () => {
      const statuses: InspectStatus[] = ['pending', 'inspecting', 'pass', 'fail', 'rework'];
      for (const to of statuses) {
        expect(StateMachineValidator.canTransitionInspect('scrap', to)).toBe(false);
      }
    });
  });

  describe('canTransitionProcess', () => {
    it('allows created → material_ready', () => {
      expect(StateMachineValidator.canTransitionProcess('created', 'material_ready')).toBe(true);
    });

    it('allows material_ready → in_progress', () => {
      expect(StateMachineValidator.canTransitionProcess('material_ready', 'in_progress')).toBe(true);
    });

    it('allows in_progress → qc_pending', () => {
      expect(StateMachineValidator.canTransitionProcess('in_progress', 'qc_pending')).toBe(true);
    });

    it('allows qc_pending → qc_pass', () => {
      expect(StateMachineValidator.canTransitionProcess('qc_pending', 'qc_pass')).toBe(true);
    });

    it('allows qc_pending → qc_fail', () => {
      expect(StateMachineValidator.canTransitionProcess('qc_pending', 'qc_fail')).toBe(true);
    });

    it('allows qc_pass → completed', () => {
      expect(StateMachineValidator.canTransitionProcess('qc_pass', 'completed')).toBe(true);
    });

    it('allows qc_fail → rework', () => {
      expect(StateMachineValidator.canTransitionProcess('qc_fail', 'rework')).toBe(true);
    });

    it('allows rework → qc_pending', () => {
      expect(StateMachineValidator.canTransitionProcess('rework', 'qc_pending')).toBe(true);
    });

    it('disallows completed → anything except completed', () => {
      const statuses: ProcessStatus[] = [
        'created', 'material_ready', 'in_progress', 'qc_pending',
        'qc_pass', 'qc_fail', 'rework',
      ];
      for (const to of statuses) {
        expect(StateMachineValidator.canTransitionProcess('completed', to)).toBe(false);
      }
    });

    it('allows same-to-same transition', () => {
      expect(StateMachineValidator.canTransitionProcess('created', 'created')).toBe(true);
    });
  });

  describe('getInspectStatusLabel', () => {
    it('returns 合格 for pass', () => {
      expect(StateMachineValidator.getInspectStatusLabel('pass')).toBe('合格');
    });

    it('returns 不合格 for fail', () => {
      expect(StateMachineValidator.getInspectStatusLabel('fail')).toBe('不合格');
    });

    it('returns 待检验 for pending', () => {
      expect(StateMachineValidator.getInspectStatusLabel('pending')).toBe('待检验');
    });

    it('returns 检验中 for inspecting', () => {
      expect(StateMachineValidator.getInspectStatusLabel('inspecting')).toBe('检验中');
    });
  });

  describe('getProcessStatusLabel', () => {
    it('returns 已完成 for completed', () => {
      expect(StateMachineValidator.getProcessStatusLabel('completed')).toBe('已完成');
    });

    it('returns 已创建 for created', () => {
      expect(StateMachineValidator.getProcessStatusLabel('created')).toBe('已创建');
    });

    it('returns 生产中 for in_progress', () => {
      expect(StateMachineValidator.getProcessStatusLabel('in_progress')).toBe('生产中');
    });
  });

  describe('getAllowedInspectTransitions', () => {
    it('returns [inspecting] for pending', () => {
      expect(StateMachineValidator.getAllowedInspectTransitions('pending')).toEqual(['inspecting']);
    });

    it('returns [pass, fail] for inspecting', () => {
      expect(StateMachineValidator.getAllowedInspectTransitions('inspecting')).toEqual(['pass', 'fail']);
    });

    it('returns [] for pass', () => {
      expect(StateMachineValidator.getAllowedInspectTransitions('pass')).toEqual([]);
    });
  });

  describe('getAllowedProcessTransitions', () => {
    it('returns [material_ready] for created', () => {
      expect(StateMachineValidator.getAllowedProcessTransitions('created')).toEqual(['material_ready']);
    });

    it('returns [] for completed', () => {
      expect(StateMachineValidator.getAllowedProcessTransitions('completed')).toEqual([]);
    });
  });
});
