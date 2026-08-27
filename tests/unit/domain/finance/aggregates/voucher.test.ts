import { describe, it, expect, beforeEach } from 'vitest';
import { Voucher, type VoucherProps } from '@/domain/finance/aggregates/Voucher';
import { type VoucherLineProps } from '@/domain/finance/entities/VoucherLine';
import { VoucherStatusEnum } from '@/domain/finance/value-objects/VoucherStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function makeLineProps(overrides: Partial<VoucherLineProps> = {}): VoucherLineProps {
  return {
    lineNo: 1,
    accountId: 1001,
    accountCode: '1001',
    accountName: '库存现金',
    debitAmount: 500,
    creditAmount: 0,
    ...overrides,
  };
}

function makeProps(overrides: Partial<VoucherProps> = {}): VoucherProps {
  const defaultLines: VoucherLineProps[] = [
    makeLineProps({ lineNo: 1, accountId: 1001, accountName: '库存现金', debitAmount: 500, creditAmount: 0 }),
    makeLineProps({ lineNo: 2, accountId: 6001, accountName: '主营业务收入', debitAmount: 0, creditAmount: 500 }),
  ];
  return {
    id: 1,
    voucherNo: 'VCH001',
    periodCode: '2026-07',
    voucherDate: '2026-07-06',
    voucherType: 1,
    summary: '测试凭证',
    lines: defaultLines,
    ...overrides,
  };
}

describe('Voucher 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为 DRAFT(0)', () => {
      const voucher = Voucher.create(makeProps());
      expect(voucher.status.value).toBe(VoucherStatusEnum.DRAFT);
      expect(voucher.voucherNo).toBe('VCH001');
      expect(voucher.periodCode).toBe('2026-07');
      expect(voucher.totalDebit.amount).toBe(500);
      expect(voucher.totalCredit.amount).toBe(500);
      expect(voucher.isBalanced()).toBe(true);
    });

    it('有 id 时发布 VoucherCreatedEvent', () => {
      const voucher = Voucher.create(makeProps({ id: 100 }));
      const events = voucher.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('voucher.created');
      expect(events[0].payload.voucherId).toBe(100);
      expect(events[0].payload.totalDebit).toBe(500);
      expect(events[0].payload.totalCredit).toBe(500);
    });

    it('无 id 时不发布创建事件', () => {
      const voucher = Voucher.create(makeProps({ id: undefined }));
      expect(voucher.getDomainEvents()).toHaveLength(0);
    });

    it('periodCode 为空抛 DomainError', () => {
      expect(() => Voucher.create(makeProps({ periodCode: '' }))).toThrow(DomainError);
      expect(() => Voucher.create(makeProps({ periodCode: '' }))).toThrow(/会计期间不能为空/);
    });

    it('lines 为空数组抛 DomainError', () => {
      expect(() => Voucher.create(makeProps({ lines: [] }))).toThrow(DomainError);
      expect(() => Voucher.create(makeProps({ lines: [] }))).toThrow(/凭证明细不能为空/);
    });

    it('借贷不平衡抛 DomainError', () => {
      const unbalancedLines: VoucherLineProps[] = [
        makeLineProps({ lineNo: 1, debitAmount: 500, creditAmount: 0 }),
        makeLineProps({ lineNo: 2, accountId: 6001, accountName: '主营业务收入', debitAmount: 0, creditAmount: 300 }),
      ];
      expect(() => Voucher.create(makeProps({ lines: unbalancedLines }))).toThrow(DomainError);
      expect(() => Voucher.create(makeProps({ lines: unbalancedLines }))).toThrow(/借贷不平衡/);
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合', () => {
      const voucher = Voucher.reconstitute(
        makeProps({
          status: VoucherStatusEnum.POSTED,
          totalDebit: 500,
          totalCredit: 500,
          postedBy: '记账员',
        })
      );
      expect(voucher.status.value).toBe(VoucherStatusEnum.POSTED);
      expect(voucher.postedBy).toBe('记账员');
    });

    it('未指定 totalDebit/totalCredit 时自动计算', () => {
      const voucher = Voucher.reconstitute(
        makeProps({
          totalDebit: undefined,
          totalCredit: undefined,
          lines: [
            makeLineProps({ lineNo: 1, debitAmount: 800, creditAmount: 0 }),
            makeLineProps({ lineNo: 2, accountId: 6001, accountName: '收入', debitAmount: 0, creditAmount: 800 }),
          ],
        })
      );
      expect(voucher.totalDebit.amount).toBe(800);
      expect(voucher.totalCredit.amount).toBe(800);
    });
  });

  describe('submit() 提交流程', () => {
    it('DRAFT → SUBMITTED，发布 SubmittedEvent', () => {
      const voucher = Voucher.create(makeProps({ id: 1 }));
      voucher.clearDomainEvents();

      voucher.submit();

      expect(voucher.status.value).toBe(VoucherStatusEnum.SUBMITTED);
      const events = voucher.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('voucher.submitted');
    });

    it('非 DRAFT 状态提交抛错', () => {
      const voucher = Voucher.reconstitute(makeProps({ status: VoucherStatusEnum.SUBMITTED }));
      expect(() => voucher.submit()).toThrow(DomainError);
    });
  });

  describe('audit() 审核流程', () => {
    it('SUBMITTED → AUDITED，设置审核人', () => {
      const voucher = Voucher.reconstitute(makeProps({ id: 1, status: VoucherStatusEnum.SUBMITTED }));
      voucher.clearDomainEvents();

      voucher.audit('审核员');

      expect(voucher.status.value).toBe(VoucherStatusEnum.AUDITED);
      expect(voucher.auditedBy).toBe('审核员');
      const events = voucher.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('voucher.audited');
      expect(events[0].payload.auditedBy).toBe('审核员');
    });

    it('非 SUBMITTED 状态审核抛错', () => {
      const voucher = Voucher.create(makeProps({ id: 1 }));
      expect(() => voucher.audit('审核员')).toThrow(DomainError);
    });
  });

  describe('post() 记账流程', () => {
    it('AUDITED → POSTED，设置记账人，发布 PostedEvent（含明细）', () => {
      const voucher = Voucher.reconstitute(makeProps({ id: 1, status: VoucherStatusEnum.AUDITED }));
      voucher.clearDomainEvents();

      voucher.post('记账员');

      expect(voucher.status.value).toBe(VoucherStatusEnum.POSTED);
      expect(voucher.postedBy).toBe('记账员');
      const events = voucher.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('voucher.posted');
      expect(events[0].payload.postedBy).toBe('记账员');
      expect(events[0].payload.lines).toHaveLength(2);
      expect(events[0].payload.totalDebit).toBe(500);
    });

    it('非 AUDITED 状态记账抛错', () => {
      const voucher = Voucher.reconstitute(makeProps({ status: VoucherStatusEnum.SUBMITTED }));
      expect(() => voucher.post('记账员')).toThrow(DomainError);
    });
  });

  describe('void() 作废流程', () => {
    it('DRAFT → VOIDED，发布 VoidedEvent', () => {
      const voucher = Voucher.create(makeProps({ id: 1 }));
      voucher.clearDomainEvents();

      voucher.void('录入错误');

      expect(voucher.status.value).toBe(VoucherStatusEnum.VOIDED);
      const events = voucher.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('voucher.voided');
      expect(events[0].payload.reason).toBe('录入错误');
    });

    it('SUBMITTED → VOIDED', () => {
      const voucher = Voucher.reconstitute(makeProps({ id: 1, status: VoucherStatusEnum.SUBMITTED }));
      voucher.void();
      expect(voucher.status.value).toBe(VoucherStatusEnum.VOIDED);
    });

    it('POSTED → VOIDED 抛错（已记账不可作废）', () => {
      const voucher = Voucher.reconstitute(makeProps({ status: VoucherStatusEnum.POSTED }));
      expect(() => voucher.void()).toThrow(DomainError);
    });
  });

  describe('canEdit/canDelete 权限', () => {
    it('DRAFT 状态可编辑可删除', () => {
      const voucher = Voucher.create(makeProps());
      expect(voucher.canEdit()).toBe(true);
      expect(voucher.canDelete()).toBe(true);
    });

    it('SUBMITTED 状态不可编辑不可删除', () => {
      const voucher = Voucher.reconstitute(makeProps({ status: VoucherStatusEnum.SUBMITTED }));
      expect(voucher.canEdit()).toBe(false);
      expect(voucher.canDelete()).toBe(false);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const voucher = Voucher.create(makeProps({ id: 1 }));
      const events1 = voucher.getDomainEvents();
      voucher.clearDomainEvents();
      expect(events1).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const voucher = Voucher.create(makeProps({ id: 1 }));
      expect(voucher.getDomainEvents()).toHaveLength(1);
      voucher.clearDomainEvents();
      expect(voucher.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('lines 访问器返回副本', () => {
    it('外部修改 lines 数组不影响内部状态', () => {
      const voucher = Voucher.create(makeProps());
      const lines = voucher.lines;
      lines.pop();
      expect(voucher.lines).toHaveLength(2);
    });
  });
});
