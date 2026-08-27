import { describe, it, expect } from 'vitest';
import {
  SampleProcessCard,
  type SampleProcessItemProps,
  type SampleProcessStepProps,
  type SampleProcessCardProps,
} from '@/domain/dcprint/aggregates/SampleProcessCard';
import { DomainError } from '@/domain/shared/DomainTypes';

/**
 * T401: SampleProcessCard 聚合根领域事件触发测试
 *
 * 覆盖 T101 集成：SampleProcessCard 在确认时触发领域事件
 * - confirm 触发 ProcessCardConfirmedEvent (仅在打样中状态 status=2)
 * - 草稿状态确认抛错
 * - submit 状态流转 1 → 2
 */

function makeItem(overrides: Partial<SampleProcessItemProps> = {}): SampleProcessItemProps {
  return {
    itemType: 1,
    materialCode: 'M001',
    materialName: 'Paper',
    unitDosage: 100,
    ...overrides,
  };
}

function makeStep(overrides: Partial<SampleProcessStepProps> = {}): SampleProcessStepProps {
  return {
    processName: 'Print',
    workHour: 2,
    ...overrides,
  };
}

function makeCardProps(
  overrides: Partial<SampleProcessCardProps> = {}
): SampleProcessCardProps {
  return {
    id: 1,
    sampleName: 'Test Card',
    status: 2,
    items: [makeItem()],
    steps: [makeStep()],
    ...overrides,
  };
}

describe('T401: SampleProcessCard 聚合根领域事件', () => {
  describe('confirm 触发 ProcessCardConfirmedEvent', () => {
    it('打样中状态(status=2)确认后触发确认事件', () => {
      const card = SampleProcessCard.reconstitute(
        makeCardProps({ id: 1, status: 2, sampleName: 'Test Card' })
      );

      card.confirm(1);

      const events = card.getDomainEvents();
      const confirmed = events.find((e) => e.eventType === 'process_card.confirmed');
      expect(confirmed).toBeDefined();
      expect(confirmed!.payload.cardId).toBe(1);
      expect(confirmed!.payload.confirmBy).toBe(1);
      expect(card.status).toBe(3);
    });

    it('无 id 时确认不触发事件', () => {
      const card = SampleProcessCard.reconstitute(
        makeCardProps({ id: undefined, status: 2 })
      );

      card.confirm(1);

      expect(card.getDomainEvents()).toHaveLength(0);
      expect(card.status).toBe(3);
    });
  });

  describe('confirm 状态校验', () => {
    it('草稿状态(status=1)确认抛 DomainError', () => {
      const card = SampleProcessCard.create({
        sampleName: 'Test Card',
        status: 1,
        items: [makeItem()],
        steps: [makeStep()],
      });
      expect(card.status).toBe(1);

      expect(() => card.confirm(1)).toThrow(DomainError);
    });

    it('已确认状态(status=3)再次确认抛 DomainError', () => {
      const card = SampleProcessCard.reconstitute(
        makeCardProps({ id: 1, status: 3 })
      );

      expect(() => card.confirm(1)).toThrow(DomainError);
    });
  });

  describe('submit 状态流转', () => {
    it('submit 将状态从 1(草稿) 变为 2(打样中)', () => {
      const card = SampleProcessCard.create({
        sampleName: 'Test Card',
        status: 1,
        items: [makeItem()],
        steps: [makeStep()],
      });
      expect(card.status).toBe(1);

      card.submit();

      expect(card.status).toBe(2);
    });

    it('非草稿状态 submit 抛 DomainError', () => {
      const card = SampleProcessCard.reconstitute(
        makeCardProps({ id: 1, status: 2 })
      );

      expect(() => card.submit()).toThrow(DomainError);
    });
  });

  describe('领域事件管理', () => {
    it('clearDomainEvents 清空事件数组', () => {
      const card = SampleProcessCard.reconstitute(
        makeCardProps({ id: 1, status: 2 })
      );
      card.confirm(1);
      expect(card.getDomainEvents()).toHaveLength(1);

      card.clearDomainEvents();

      expect(card.getDomainEvents()).toHaveLength(0);
    });
  });
});
