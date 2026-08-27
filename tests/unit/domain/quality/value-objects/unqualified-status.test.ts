import { describe, it, expect } from 'vitest';
import { UnqualifiedStatus } from '@/domain/quality/value-objects/UnqualifiedStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

describe('UnqualifiedStatus Value Object', () => {
  describe('static factories', () => {
    it('pending() creates pending status', () => {
      expect(UnqualifiedStatus.pending().value).toBe('pending');
    });
    it('handling() creates handling status', () => {
      expect(UnqualifiedStatus.handling().value).toBe('handling');
    });
    it('completed() creates completed status', () => {
      expect(UnqualifiedStatus.completed().value).toBe('completed');
    });
  });

  describe('from()', () => {
    it('accepts valid string values', () => {
      expect(UnqualifiedStatus.from('pending').value).toBe('pending');
      expect(UnqualifiedStatus.from('handling').value).toBe('handling');
      expect(UnqualifiedStatus.from('completed').value).toBe('completed');
    });
    it('throws DomainError on invalid value', () => {
      expect(() => UnqualifiedStatus.from('invalid')).toThrow(DomainError);
      expect(() => UnqualifiedStatus.from('')).toThrow(DomainError);
    });
  });

  describe('fromDbCode() / toDbCode()', () => {
    it('maps 1 -> pending', () => {
      expect(UnqualifiedStatus.fromDbCode(1).value).toBe('pending');
    });
    it('maps 2 -> handling', () => {
      expect(UnqualifiedStatus.fromDbCode(2).value).toBe('handling');
    });
    it('maps 3 -> completed', () => {
      expect(UnqualifiedStatus.fromDbCode(3).value).toBe('completed');
    });
    it('throws DomainError on invalid code', () => {
      expect(() => UnqualifiedStatus.fromDbCode(0)).toThrow(DomainError);
      expect(() => UnqualifiedStatus.fromDbCode(4)).toThrow(DomainError);
      expect(() => UnqualifiedStatus.fromDbCode(-1)).toThrow(DomainError);
    });
    it('toDbCode() returns correct inverse mapping', () => {
      expect(UnqualifiedStatus.pending().toDbCode()).toBe(1);
      expect(UnqualifiedStatus.handling().toDbCode()).toBe(2);
      expect(UnqualifiedStatus.completed().toDbCode()).toBe(3);
    });
  });

  describe('transitions', () => {
    it('pending -> handling is allowed', () => {
      expect(UnqualifiedStatus.pending().canTransitionTo('handling')).toBe(true);
      const newStatus = UnqualifiedStatus.pending().transitionTo('handling');
      expect(newStatus.value).toBe('handling');
    });
    it('handling -> completed is allowed', () => {
      expect(UnqualifiedStatus.handling().canTransitionTo('completed')).toBe(true);
      const newStatus = UnqualifiedStatus.handling().transitionTo('completed');
      expect(newStatus.value).toBe('completed');
    });
    it('completed -> handling is forbidden', () => {
      expect(UnqualifiedStatus.completed().canTransitionTo('handling')).toBe(false);
      expect(() => UnqualifiedStatus.completed().transitionTo('handling')).toThrow(DomainError);
    });
    it('pending -> completed is forbidden (no skip)', () => {
      expect(UnqualifiedStatus.pending().canTransitionTo('completed')).toBe(false);
      expect(() => UnqualifiedStatus.pending().transitionTo('completed')).toThrow(DomainError);
    });
    it('handling -> pending is forbidden (no backward)', () => {
      expect(UnqualifiedStatus.handling().canTransitionTo('pending')).toBe(false);
      expect(() => UnqualifiedStatus.handling().transitionTo('pending')).toThrow(DomainError);
    });
    it('completed has no outgoing transitions', () => {
      expect(UnqualifiedStatus.completed().canTransitionTo('pending')).toBe(false);
      expect(UnqualifiedStatus.completed().canTransitionTo('handling')).toBe(false);
      expect(UnqualifiedStatus.completed().canTransitionTo('completed')).toBe(false);
    });
  });

  describe('operations', () => {
    it('pending allows start_handle/edit/delete', () => {
      expect(UnqualifiedStatus.pending().canStartHandle()).toBe(true);
      expect(UnqualifiedStatus.pending().canEdit()).toBe(true);
      expect(UnqualifiedStatus.pending().canDelete()).toBe(true);
    });
    it('handling allows complete_handle/edit but not delete', () => {
      expect(UnqualifiedStatus.handling().canComplete()).toBe(true);
      expect(UnqualifiedStatus.handling().canEdit()).toBe(true);
      expect(UnqualifiedStatus.handling().canDelete()).toBe(false);
      expect(UnqualifiedStatus.handling().canStartHandle()).toBe(false);
    });
    it('completed allows view only', () => {
      expect(UnqualifiedStatus.completed().canStartHandle()).toBe(false);
      expect(UnqualifiedStatus.completed().canComplete()).toBe(false);
      expect(UnqualifiedStatus.completed().canEdit()).toBe(false);
      expect(UnqualifiedStatus.completed().canDelete()).toBe(false);
    });
  });

  describe('label()', () => {
    it('returns Chinese labels', () => {
      expect(UnqualifiedStatus.pending().label()).toBe('待处理');
      expect(UnqualifiedStatus.handling().label()).toBe('处理中');
      expect(UnqualifiedStatus.completed().label()).toBe('已完成');
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      expect(UnqualifiedStatus.pending().equals(UnqualifiedStatus.pending())).toBe(true);
    });
    it('returns false for different value', () => {
      expect(UnqualifiedStatus.pending().equals(UnqualifiedStatus.handling())).toBe(false);
    });
  });
});
