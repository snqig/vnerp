import { describe, it, expect } from 'vitest';
import {
  StandardCard,
  type StandardCardProps,
} from '@/domain/standard-card/aggregates/StandardCard';
import { StandardCardStatus } from '@/domain/standard-card/value-objects/StandardCardStatus';
import { StandardCardType } from '@/domain/standard-card/value-objects/StandardCardType';
import { DomainError } from '@/domain/shared/DomainTypes';

/**
 * StandardCard 聚合根核心流程测试
 *
 * 覆盖目标：
 * 1. create() / reconstitute() 工厂方法（含校验）
 * 2. submit() 提交流程（状态流转 + 领域事件 + 状态守卫）
 * 3. approve() 审核流程（状态流转 + 领域事件 + 状态守卫）
 * 4. reject() 驳回流程（状态流转 + 领域事件）
 * 5. confirm() 确认流程（锁定 + expiryDate 自动填充）
 * 6. obsolete() 作废流程
 * 7. createNewVersion() 新版本流程
 * 8. 领域事件管理（getDomainEvents / clearDomainEvents）
 */
function makeCardProps(overrides: Partial<StandardCardProps> = {}): StandardCardProps {
  return {
    id: 1,
    code: 'SCC202607010001',
    version: '1.0',
    name: '测试标准卡',
    type: StandardCardType.COLOR,
    materialId: 10,
    materialName: '测试物料',
    status: StandardCardStatus.DRAFT,
    isCurrent: false,
    isObsolete: false,
    isLocked: false,
    ...overrides,
  };
}

describe('StandardCard 聚合根', () => {
  describe('create() / reconstitute() 工厂方法', () => {
    it('合法参数创建成功，状态为 draft', () => {
      const card = StandardCard.create(makeCardProps());
      expect(card.code).toBe('SCC202607010001');
      expect(card.version).toBe('1.0');
      expect(card.name).toBe('测试标准卡');
      expect(card.status).toBe(StandardCardStatus.DRAFT);
      expect(card.isCurrent).toBe(false);
      expect(card.isLocked).toBe(false);
      expect(card.isObsolete).toBe(false);
    });

    it('reconstitute 重建保留所有状态', () => {
      const props = makeCardProps({
        status: StandardCardStatus.CONFIRMED,
        isLocked: true,
        isCurrent: true,
      });
      const card = StandardCard.reconstitute(props);
      expect(card.status).toBe(StandardCardStatus.CONFIRMED);
      expect(card.isLocked).toBe(true);
      expect(card.isCurrent).toBe(true);
    });

    it('create 不产生领域事件（由应用服务在 save 后发布 CreatedEvent）', () => {
      const card = StandardCard.create(makeCardProps());
      expect(card.getDomainEvents()).toHaveLength(0);
    });

    it('name 为空抛 DomainError', () => {
      expect(() => StandardCard.create(makeCardProps({ name: '' }))).toThrow(DomainError);
    });

    it('name 仅空白抛 DomainError', () => {
      expect(() => StandardCard.create(makeCardProps({ name: '   ' }))).toThrow(DomainError);
    });

    it('type 缺失抛 DomainError', () => {
      expect(() =>
        StandardCard.create(makeCardProps({ type: undefined as unknown as StandardCardType }))
      ).toThrow(DomainError);
    });
  });

  describe('submit() 提交流程', () => {
    it('DRAFT → AUDITING 并发布 StandardCardSubmittedEvent', () => {
      const card = StandardCard.create(makeCardProps());
      card.submit(100);

      expect(card.status).toBe(StandardCardStatus.AUDITING);

      const events = card.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('StandardCardSubmitted');
      expect(events[0].payload).toMatchObject({
        standardCardId: 1,
        code: 'SCC202607010001',
        version: '1.0',
        userId: 100,
      });
    });

    it('非 DRAFT 状态 submit 抛 DomainError', () => {
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.AUDITING })
      );
      expect(() => card.submit(100)).toThrow(DomainError);
    });

    it('CONFIRMED 状态 submit 抛 DomainError', () => {
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.CONFIRMED, isLocked: true })
      );
      expect(() => card.submit(100)).toThrow(DomainError);
    });
  });

  describe('approve() 审核流程', () => {
    it('AUDITING → APPROVED 并发布 StandardCardApprovedEvent', () => {
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.AUDITING })
      );
      card.approve(200);

      expect(card.status).toBe(StandardCardStatus.APPROVED);

      const events = card.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('StandardCardApproved');
      expect(events[0].payload).toMatchObject({
        standardCardId: 1,
        userId: 200,
        approvalLevel: 'tech_manager',
      });
    });

    it('非 AUDITING 状态 approve 抛 DomainError', () => {
      const card = StandardCard.create(makeCardProps({ status: StandardCardStatus.DRAFT }));
      expect(() => card.approve(200)).toThrow(DomainError);
    });

    it('已 APPROVED 状态再次 approve 抛 DomainError', () => {
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.APPROVED })
      );
      expect(() => card.approve(200)).toThrow(DomainError);
    });
  });

  describe('reject() 驳回流程', () => {
    it('AUDITING → DRAFT 并发布 StandardCardRejectedEvent', () => {
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.AUDITING })
      );
      card.reject(200, '颜色规格不达标');

      expect(card.status).toBe(StandardCardStatus.DRAFT);

      const events = card.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('StandardCardRejected');
      expect(events[0].payload).toMatchObject({
        reason: '颜色规格不达标',
        userId: 200,
      });
    });

    it('非 AUDITING 状态 reject 抛 DomainError', () => {
      const card = StandardCard.create(makeCardProps({ status: StandardCardStatus.DRAFT }));
      expect(() => card.reject(200, '理由')).toThrow(DomainError);
    });
  });

  describe('confirm() 确认流程', () => {
    it('APPROVED → CONFIRMED，锁定 + isCurrent + 发布 ConfirmedEvent', () => {
      const effectiveDate = new Date('2026-06-15');
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.APPROVED, effectiveDate })
      );
      card.confirm(300);

      expect(card.status).toBe(StandardCardStatus.CONFIRMED);
      expect(card.isCurrent).toBe(true);
      expect(card.isLocked).toBe(true);

      const events = card.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('StandardCardConfirmed');
      expect(events[0].payload).toMatchObject({ materialId: 10, userId: 300 });
    });

    it('有 effectiveDate 无 expiryDate → 自动填充一年后', () => {
      const effectiveDate = new Date('2026-06-15');
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.APPROVED, effectiveDate })
      );
      card.confirm(300);

      const props = card.toProps();
      expect(props.expiryDate).toBeInstanceOf(Date);
      expect(props.expiryDate?.getFullYear()).toBe(2027);
      expect(props.expiryDate?.getMonth()).toBe(effectiveDate.getMonth());
    });

    it('非 APPROVED 状态 confirm 抛 DomainError', () => {
      const card = StandardCard.create(makeCardProps({ status: StandardCardStatus.DRAFT }));
      expect(() => card.confirm(300)).toThrow(DomainError);
    });
  });

  describe('obsolete() 作废流程', () => {
    it('APPROVED → OBSOLETE 并发布 ObsoletedEvent', () => {
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.APPROVED })
      );
      card.obsolete(400, '版本过期');

      expect(card.status).toBe(StandardCardStatus.OBSOLETE);
      expect(card.isObsolete).toBe(true);
      expect(card.isCurrent).toBe(false);

      const events = card.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('StandardCardObsoleted');
      expect(events[0].payload).toMatchObject({ reason: '版本过期', userId: 400 });
    });

    it('CONFIRMED 状态也可 obsolete', () => {
      const card = StandardCard.create(
        makeCardProps({
          status: StandardCardStatus.CONFIRMED,
          isLocked: true,
          isCurrent: true,
        })
      );
      card.obsolete(400, '版本过期');
      expect(card.status).toBe(StandardCardStatus.OBSOLETE);
      expect(card.isCurrent).toBe(false);
    });

    it('DRAFT 状态 obsolete 抛 DomainError', () => {
      const card = StandardCard.create(makeCardProps({ status: StandardCardStatus.DRAFT }));
      expect(() => card.obsolete(400, '理由')).toThrow(DomainError);
    });
  });

  describe('createNewVersion() 新版本流程', () => {
    it('基于已确认卡创建新版本并发布 NewVersionCreatedEvent', () => {
      const card = StandardCard.create(
        makeCardProps({
          status: StandardCardStatus.CONFIRMED,
          isLocked: true,
          isCurrent: true,
        })
      );
      const newCard = card.createNewVersion('2.0', 500);

      expect(newCard.version).toBe('2.0');
      expect(newCard.code).toBe('SCC202607010001');
      expect(newCard.status).toBe(StandardCardStatus.DRAFT);
      expect(newCard.isLocked).toBe(false);
      expect(newCard.isCurrent).toBe(false);
      expect(newCard.isObsolete).toBe(false);

      const events = newCard.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('StandardCardNewVersionCreated');
      expect(events[0].payload).toMatchObject({
        parentStandardCardId: 1,
        parentVersion: '1.0',
        newVersion: '2.0',
        userId: 500,
      });
    });

    it('未确认卡 createNewVersion 抛 DomainError', () => {
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.APPROVED })
      );
      expect(() => card.createNewVersion('2.0', 500)).toThrow(DomainError);
    });

    it('原卡不产生事件（事件仅在新卡上）', () => {
      const card = StandardCard.create(
        makeCardProps({
          status: StandardCardStatus.CONFIRMED,
          isLocked: true,
          isCurrent: true,
        })
      );
      card.createNewVersion('2.0', 500);
      expect(card.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本，多次调用长度一致', () => {
      const card = StandardCard.create(makeCardProps());
      card.submit(100);
      expect(card.getDomainEvents()).toHaveLength(1);
      expect(card.getDomainEvents()).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const card = StandardCard.create(makeCardProps());
      card.submit(100);
      expect(card.getDomainEvents()).toHaveLength(1);
      card.clearDomainEvents();
      expect(card.getDomainEvents()).toHaveLength(0);
    });

    it('多步骤流程累积多事件', () => {
      const card = StandardCard.create(
        makeCardProps({ status: StandardCardStatus.AUDITING })
      );
      card.approve(200);
      card.confirm(300);
      const events = card.getDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('StandardCardApproved');
      expect(events[1].eventType).toBe('StandardCardConfirmed');
    });
  });
});
