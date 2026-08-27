import { describe, it, expect } from 'vitest';
import { HandleMethod } from '@/domain/quality/value-objects/HandleMethod';
import { DomainError } from '@/domain/shared/DomainTypes';

describe('HandleMethod Value Object', () => {
  describe('static factories', () => {
    it('rework() creates rework method', () => {
      expect(HandleMethod.rework().value).toBe('rework');
    });
    it('scrap() creates scrap method', () => {
      expect(HandleMethod.scrap().value).toBe('scrap');
    });
    it('concession() creates concession method', () => {
      expect(HandleMethod.concession().value).toBe('concession');
    });
    it('return() creates return method', () => {
      expect(HandleMethod.return().value).toBe('return');
    });
  });

  describe('from()', () => {
    it('accepts valid string values', () => {
      expect(HandleMethod.from('rework').value).toBe('rework');
      expect(HandleMethod.from('scrap').value).toBe('scrap');
      expect(HandleMethod.from('concession').value).toBe('concession');
      expect(HandleMethod.from('return').value).toBe('return');
    });
    it('throws DomainError on invalid value', () => {
      expect(() => HandleMethod.from('invalid')).toThrow(DomainError);
      expect(() => HandleMethod.from('')).toThrow(DomainError);
    });
  });

  describe('fromDbCode() / toDbCode()', () => {
    it('maps 1 -> rework', () => {
      expect(HandleMethod.fromDbCode(1).value).toBe('rework');
    });
    it('maps 2 -> scrap', () => {
      expect(HandleMethod.fromDbCode(2).value).toBe('scrap');
    });
    it('maps 3 -> concession', () => {
      expect(HandleMethod.fromDbCode(3).value).toBe('concession');
    });
    it('maps 4 -> return', () => {
      expect(HandleMethod.fromDbCode(4).value).toBe('return');
    });
    it('throws DomainError on invalid code', () => {
      expect(() => HandleMethod.fromDbCode(0)).toThrow(DomainError);
      expect(() => HandleMethod.fromDbCode(5)).toThrow(DomainError);
    });
    it('toDbCode() returns correct inverse mapping', () => {
      expect(HandleMethod.rework().toDbCode()).toBe(1);
      expect(HandleMethod.scrap().toDbCode()).toBe(2);
      expect(HandleMethod.concession().toDbCode()).toBe(3);
      expect(HandleMethod.return().toDbCode()).toBe(4);
    });
  });

  describe('label()', () => {
    it('returns Chinese labels', () => {
      expect(HandleMethod.rework().label()).toBe('返工');
      expect(HandleMethod.scrap().label()).toBe('报废');
      expect(HandleMethod.concession().label()).toBe('让步接收');
      expect(HandleMethod.return().label()).toBe('退货');
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      expect(HandleMethod.rework().equals(HandleMethod.rework())).toBe(true);
    });
    it('returns false for different value', () => {
      expect(HandleMethod.rework().equals(HandleMethod.scrap())).toBe(false);
    });
  });
});
