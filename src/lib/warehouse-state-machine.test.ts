import { describe, it, expect } from 'vitest';
import { WarehouseStateMachine, InboundStatus, OutboundStatus } from './warehouse-state-machine';

describe('WarehouseStateMachine', () => {
  describe('canTransitionInbound', () => {
    it('allows draft → pending', () => {
      expect(WarehouseStateMachine.canTransitionInbound('draft', 'pending')).toBe(true);
    });

    it('allows draft → cancelled', () => {
      expect(WarehouseStateMachine.canTransitionInbound('draft', 'cancelled')).toBe(true);
    });

    it('disallows draft → completed', () => {
      expect(WarehouseStateMachine.canTransitionInbound('draft', 'completed')).toBe(false);
    });

    it('allows pending → completed', () => {
      expect(WarehouseStateMachine.canTransitionInbound('pending', 'completed')).toBe(true);
    });

    it('allows pending → cancelled', () => {
      expect(WarehouseStateMachine.canTransitionInbound('pending', 'cancelled')).toBe(true);
    });

    it('allows completed → pending (undo)', () => {
      expect(WarehouseStateMachine.canTransitionInbound('completed', 'pending')).toBe(true);
    });

    it('disallows cancelled → anything', () => {
      const statuses: InboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
      for (const to of statuses) {
        if (to === 'cancelled') continue;
        expect(WarehouseStateMachine.canTransitionInbound('cancelled', to)).toBe(false);
      }
    });
  });

  describe('canTransitionOutbound', () => {
    it('allows draft → pending', () => {
      expect(WarehouseStateMachine.canTransitionOutbound('draft', 'pending')).toBe(true);
    });

    it('allows draft → cancelled', () => {
      expect(WarehouseStateMachine.canTransitionOutbound('draft', 'cancelled')).toBe(true);
    });

    it('disallows draft → completed', () => {
      expect(WarehouseStateMachine.canTransitionOutbound('draft', 'completed')).toBe(false);
    });

    it('allows pending → completed', () => {
      expect(WarehouseStateMachine.canTransitionOutbound('pending', 'completed')).toBe(true);
    });

    it('allows pending → cancelled', () => {
      expect(WarehouseStateMachine.canTransitionOutbound('pending', 'cancelled')).toBe(true);
    });

    it('allows completed → pending (undo)', () => {
      expect(WarehouseStateMachine.canTransitionOutbound('completed', 'pending')).toBe(true);
    });

    it('disallows cancelled → anything', () => {
      const statuses: OutboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
      for (const to of statuses) {
        if (to === 'cancelled') continue;
        expect(WarehouseStateMachine.canTransitionOutbound('cancelled', to)).toBe(false);
      }
    });
  });

  describe('canEditInbound', () => {
    it('returns true for draft', () => {
      expect(WarehouseStateMachine.canEditInbound('draft')).toBe(true);
    });

    it('returns false for pending', () => {
      expect(WarehouseStateMachine.canEditInbound('pending')).toBe(false);
    });

    it('returns false for completed', () => {
      expect(WarehouseStateMachine.canEditInbound('completed')).toBe(false);
    });

    it('returns false for cancelled', () => {
      expect(WarehouseStateMachine.canEditInbound('cancelled')).toBe(false);
    });
  });

  describe('canDeleteInbound', () => {
    it('returns true for draft', () => {
      expect(WarehouseStateMachine.canDeleteInbound('draft')).toBe(true);
    });

    it('returns false for pending', () => {
      expect(WarehouseStateMachine.canDeleteInbound('pending')).toBe(false);
    });

    it('returns false for completed', () => {
      expect(WarehouseStateMachine.canDeleteInbound('completed')).toBe(false);
    });

    it('returns false for cancelled', () => {
      expect(WarehouseStateMachine.canDeleteInbound('cancelled')).toBe(false);
    });
  });

  describe('canAuditInbound', () => {
    it('returns true for pending', () => {
      expect(WarehouseStateMachine.canAuditInbound('pending')).toBe(true);
    });

    it('returns false for draft', () => {
      expect(WarehouseStateMachine.canAuditInbound('draft')).toBe(false);
    });

    it('returns false for completed', () => {
      expect(WarehouseStateMachine.canAuditInbound('completed')).toBe(false);
    });

    it('returns false for cancelled', () => {
      expect(WarehouseStateMachine.canAuditInbound('cancelled')).toBe(false);
    });
  });

  describe('canEditOutbound', () => {
    it('returns true for draft', () => {
      expect(WarehouseStateMachine.canEditOutbound('draft')).toBe(true);
    });

    it('returns false for pending', () => {
      expect(WarehouseStateMachine.canEditOutbound('pending')).toBe(false);
    });

    it('returns false for completed', () => {
      expect(WarehouseStateMachine.canEditOutbound('completed')).toBe(false);
    });
  });

  describe('canConfirmOutbound', () => {
    it('returns true for pending', () => {
      expect(WarehouseStateMachine.canConfirmOutbound('pending')).toBe(true);
    });

    it('returns false for draft', () => {
      expect(WarehouseStateMachine.canConfirmOutbound('draft')).toBe(false);
    });

    it('returns false for completed', () => {
      expect(WarehouseStateMachine.canConfirmOutbound('completed')).toBe(false);
    });

    it('returns false for cancelled', () => {
      expect(WarehouseStateMachine.canConfirmOutbound('cancelled')).toBe(false);
    });
  });

  describe('getTransitionError', () => {
    it('returns descriptive message for inbound', () => {
      const error = WarehouseStateMachine.getTransitionError('inbound', 'draft', 'completed');
      expect(error).toContain('入库单');
      expect(error).toContain('草稿');
      expect(error).toContain('已完成');
    });

    it('returns descriptive message for outbound', () => {
      const error = WarehouseStateMachine.getTransitionError('outbound', 'draft', 'completed');
      expect(error).toContain('出库单');
      expect(error).toContain('草稿');
      expect(error).toContain('已完成');
    });
  });

  describe('getInboundStatusLabel', () => {
    it('returns 草稿 for draft', () => {
      expect(WarehouseStateMachine.getInboundStatusLabel('draft')).toBe('草稿');
    });

    it('returns 待审核 for pending', () => {
      expect(WarehouseStateMachine.getInboundStatusLabel('pending')).toBe('待审核');
    });
  });

  describe('getOutboundStatusLabel', () => {
    it('returns 草稿 for draft', () => {
      expect(WarehouseStateMachine.getOutboundStatusLabel('draft')).toBe('草稿');
    });

    it('returns 待确认 for pending', () => {
      expect(WarehouseStateMachine.getOutboundStatusLabel('pending')).toBe('待确认');
    });
  });
});
