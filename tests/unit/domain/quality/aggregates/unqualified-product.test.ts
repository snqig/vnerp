import { describe, it, expect } from 'vitest';
import {
  UnqualifiedProduct,
  UnqualifiedProductProps,
} from '@/domain/quality/aggregates/UnqualifiedProduct';
import { UnqualifiedStatus } from '@/domain/quality/value-objects/UnqualifiedStatus';
import { HandleMethod } from '@/domain/quality/value-objects/HandleMethod';
import { DomainError } from '@/domain/shared/DomainTypes';

function buildValidProps(overrides: Partial<UnqualifiedProductProps> = {}): UnqualifiedProductProps {
  return {
    id: 1,
    unqualifiedNo: 'UQ-20260707-0001',
    handleNo: 'UH-20260707-0001',
    inspectionId: 100,
    sourceType: 'incoming',
    sourceNo: 'IQC-20260707-001',
    materialId: 200,
    materialCode: 'MAT001',
    materialName: 'UV油墨-黑色',
    quantity: 18,
    defectType: '来料不合格',
    defectDesc: '色差超标',
    handleType: 'rework',
    createBy: 1,
    ...overrides,
  };
}

describe('UnqualifiedProduct Aggregate', () => {
  describe('create()', () => {
    it('creates a valid product with pending status', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(product.id).toBe(1);
      expect(product.unqualifiedNo).toBe('UQ-20260707-0001');
      expect(product.handleNo).toBe('UH-20260707-0001');
      expect(product.inspectionId).toBe(100);
      expect(product.quantity).toBe(18);
      expect(product.status.value).toBe('pending');
      expect(product.status.toDbCode()).toBe(1);
    });

    it('pushes UnqualifiedCreatedEvent when id is set', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      const events = product.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('quality.unqualified.created');
    });

    it('does not push event when id is undefined', () => {
      const product = UnqualifiedProduct.create(buildValidProps({ id: undefined }));
      expect(product.getDomainEvents()).toHaveLength(0);
    });

    it('throws DomainError when inspectionId <= 0', () => {
      expect(() => UnqualifiedProduct.create(buildValidProps({ inspectionId: 0 }))).toThrow(DomainError);
      expect(() => UnqualifiedProduct.create(buildValidProps({ inspectionId: -1 }))).toThrow(DomainError);
    });

    it('throws DomainError when quantity <= 0', () => {
      expect(() => UnqualifiedProduct.create(buildValidProps({ quantity: 0 }))).toThrow(DomainError);
      expect(() => UnqualifiedProduct.create(buildValidProps({ quantity: -1 }))).toThrow(DomainError);
    });

    it('throws DomainError when quantity is undefined', () => {
      expect(() => UnqualifiedProduct.create(buildValidProps({ quantity: undefined as unknown as number }))).toThrow(DomainError);
    });

    it('initializes handleType value object when provided', () => {
      const product = UnqualifiedProduct.create(buildValidProps({ handleType: 'scrap' }));
      expect(product.handleType?.value).toBe('scrap');
      expect(product.handleType?.toDbCode()).toBe(2);
    });
  });

  describe('reconstitute()', () => {
    it('rebuilds product without triggering events', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({ status: 'handling' }));
      expect(product.status.value).toBe('handling');
      expect(product.getDomainEvents()).toHaveLength(0);
    });

    it('preserves all fields from props', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({
        status: 'completed',
        responsibleDept: '品质部',
        responsiblePerson: '周杰',
        handler: '周杰',
        costAmount: 1500,
      }));
      expect(product.responsibleDept).toBe('品质部');
      expect(product.responsiblePerson).toBe('周杰');
      expect(product.handler).toBe('周杰');
      expect(product.costAmount).toBe(1500);
    });
  });

  describe('assignResponsible()', () => {
    it('assigns dept and person when pending', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      product.assignResponsible('品质部', '周杰');
      expect(product.responsibleDept).toBe('品质部');
      expect(product.responsiblePerson).toBe('周杰');
    });

    it('assigns dept and person when handling', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({ status: 'handling' }));
      product.assignResponsible('品质部', '周杰');
      expect(product.responsibleDept).toBe('品质部');
    });

    it('throws DomainError when completed', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({ status: 'completed' }));
      expect(() => product.assignResponsible('品质部', '周杰')).toThrow(DomainError);
    });

    it('throws DomainError when dept is empty', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(() => product.assignResponsible('', '周杰')).toThrow(DomainError);
      expect(() => product.assignResponsible('  ', '周杰')).toThrow(DomainError);
    });

    it('throws DomainError when person is empty', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(() => product.assignResponsible('品质部', '')).toThrow(DomainError);
    });

    it('trims whitespace in dept and person', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      product.assignResponsible('  品质部  ', '  周杰  ');
      expect(product.responsibleDept).toBe('品质部');
      expect(product.responsiblePerson).toBe('周杰');
    });
  });

  describe('startHandle()', () => {
    it('transitions pending -> handling and pushes HandlingStartedEvent', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      product.startHandle('rework', '品质部', '周杰');
      expect(product.status.value).toBe('handling');
      const events = product.getDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[1].eventType).toBe('quality.unqualified.handling_started');
      expect(product.handleType?.value).toBe('rework');
    });

    it('throws DomainError when status is completed', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({ status: 'completed' }));
      expect(() => product.startHandle('rework', '品质部', '周杰')).toThrow(DomainError);
    });

    it('throws DomainError when status is already handling', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({ status: 'handling' }));
      expect(() => product.startHandle('rework', '品质部', '周杰')).toThrow(DomainError);
    });

    it('throws DomainError when responsibleDept is empty', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(() => product.startHandle('rework', '', '周杰')).toThrow(DomainError);
    });

    it('throws DomainError when responsiblePerson is empty', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(() => product.startHandle('rework', '品质部', '')).toThrow(DomainError);
    });
  });

  describe('completeHandle()', () => {
    it('transitions handling -> completed and pushes UnqualifiedCompletedEvent', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({
        status: 'handling',
        responsibleDept: '品质部',
        responsiblePerson: '周杰',
      }));
      product.completeHandle('周杰', 1, 1500);
      expect(product.status.value).toBe('completed');
      expect(product.handler).toBe('周杰');
      expect(product.handleResult).toBe(1);
      expect(product.costAmount).toBe(1500);
      expect(product.handleDate).toBeDefined();
      const events = product.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('quality.unqualified.completed');
    });

    it('throws DomainError when status is pending (no skip)', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(() => product.completeHandle('周杰', 1, 1500)).toThrow(DomainError);
    });

    it('throws DomainError when responsibleDept is missing', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({
        status: 'handling',
        responsibleDept: undefined,
        responsiblePerson: '周杰',
      }));
      expect(() => product.completeHandle('周杰', 1, 1500)).toThrow(DomainError);
    });

    it('throws DomainError when responsiblePerson is missing', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({
        status: 'handling',
        responsibleDept: '品质部',
        responsiblePerson: undefined,
      }));
      expect(() => product.completeHandle('周杰', 1, 1500)).toThrow(DomainError);
    });

    it('throws DomainError when handler is empty', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({
        status: 'handling',
        responsibleDept: '品质部',
        responsiblePerson: '周杰',
      }));
      expect(() => product.completeHandle('', 1, 1500)).toThrow(DomainError);
      expect(() => product.completeHandle('  ', 1, 1500)).toThrow(DomainError);
    });

    it('throws DomainError when handleResult is invalid', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({
        status: 'handling',
        responsibleDept: '品质部',
        responsiblePerson: '周杰',
      }));
      expect(() => product.completeHandle('周杰', 0, 1500)).toThrow(DomainError);
      expect(() => product.completeHandle('周杰', 3, 1500)).toThrow(DomainError);
    });

    it('throws DomainError when costAmount is negative', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({
        status: 'handling',
        responsibleDept: '品质部',
        responsiblePerson: '周杰',
      }));
      expect(() => product.completeHandle('周杰', 1, -1)).toThrow(DomainError);
    });

    it('accepts costAmount = 0', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({
        status: 'handling',
        responsibleDept: '品质部',
        responsiblePerson: '周杰',
      }));
      product.completeHandle('周杰', 1, 0);
      expect(product.costAmount).toBe(0);
    });
  });

  describe('canEdit() / canDelete()', () => {
    it('pending allows edit and delete', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(product.canEdit()).toBe(true);
      expect(product.canDelete()).toBe(true);
    });

    it('handling allows edit but not delete', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({ status: 'handling' }));
      expect(product.canEdit()).toBe(true);
      expect(product.canDelete()).toBe(false);
    });

    it('completed disallows both edit and delete', () => {
      const product = UnqualifiedProduct.reconstitute(buildValidProps({ status: 'completed' }));
      expect(product.canEdit()).toBe(false);
      expect(product.canDelete()).toBe(false);
    });
  });

  describe('lifecycle events', () => {
    it('accumulates events through full lifecycle', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(product.getDomainEvents()).toHaveLength(1);

      product.startHandle('rework', '品质部', '周杰');
      expect(product.getDomainEvents()).toHaveLength(2);

      product.completeHandle('周杰', 1, 1500);
      expect(product.getDomainEvents()).toHaveLength(3);

      const eventTypes = product.getDomainEvents().map((e) => e.eventType);
      expect(eventTypes).toEqual([
        'quality.unqualified.created',
        'quality.unqualified.handling_started',
        'quality.unqualified.completed',
      ]);
    });

    it('clearDomainEvents() empties the events list', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      expect(product.getDomainEvents()).toHaveLength(1);
      product.clearDomainEvents();
      expect(product.getDomainEvents()).toHaveLength(0);
    });

    it('getDomainEvents() returns a copy (immutable)', () => {
      const product = UnqualifiedProduct.create(buildValidProps());
      const events1 = product.getDomainEvents();
      const events2 = product.getDomainEvents();
      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });
  });
});
