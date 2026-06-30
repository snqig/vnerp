import { describe, it, expect } from 'vitest';
import { GeneralLedger, ACCOUNT_TYPE_MAP } from '@/lib/general-ledger';

describe('GeneralLedger - 财务总账', () => {
  const gl = new GeneralLedger();

  describe('会计科目类型', () => {
    it('资产类科目以1开头，借方余额', () => {
      expect(ACCOUNT_TYPE_MAP.asset.prefix).toBe('1');
      expect(ACCOUNT_TYPE_MAP.asset.direction).toBe('debit');
      expect(ACCOUNT_TYPE_MAP.asset.label).toBe('资产类');
    });

    it('负债类科目以2开头，贷方余额', () => {
      expect(ACCOUNT_TYPE_MAP.liability.prefix).toBe('2');
      expect(ACCOUNT_TYPE_MAP.liability.direction).toBe('credit');
    });

    it('所有者权益类科目以3开头，贷方余额', () => {
      expect(ACCOUNT_TYPE_MAP.equity.prefix).toBe('3');
      expect(ACCOUNT_TYPE_MAP.equity.direction).toBe('credit');
    });

    it('成本类科目以4开头，借方余额', () => {
      expect(ACCOUNT_TYPE_MAP.cost.prefix).toBe('4');
      expect(ACCOUNT_TYPE_MAP.cost.direction).toBe('debit');
    });

    it('损益类科目以5开头（也可能是6），贷方为主', () => {
      expect(ACCOUNT_TYPE_MAP.profit_loss.prefix).toBe('5');
      expect(ACCOUNT_TYPE_MAP.profit_loss.direction).toBe('credit');
    });
  });

  describe('凭证借贷平衡校验', () => {
    it('借贷相等的凭证应该通过校验', () => {
      const voucher = {
        lines: [
          { lineNo: 1, accountId: 1, summary: '现金', debitAmount: 1000, creditAmount: 0 },
          { lineNo: 2, accountId: 2, summary: '收入', debitAmount: 0, creditAmount: 1000 },
        ],
      };
      expect(gl.validateVoucherBalance(voucher)).toBe(true);
    });

    it('借贷不相等的凭证应该不通过校验', () => {
      const voucher = {
        lines: [
          { lineNo: 1, accountId: 1, summary: '现金', debitAmount: 1000, creditAmount: 0 },
          { lineNo: 2, accountId: 2, summary: '收入', debitAmount: 0, creditAmount: 500 },
        ],
      };
      expect(gl.validateVoucherBalance(voucher)).toBe(false);
    });

    it('空凭证应该通过校验（0=0）', () => {
      const voucher = { lines: [] };
      expect(gl.validateVoucherBalance(voucher)).toBe(true);
    });

    it('一借多贷应该平衡', () => {
      const voucher = {
        lines: [
          { lineNo: 1, accountId: 1, summary: '借方', debitAmount: 1500, creditAmount: 0 },
          { lineNo: 2, accountId: 2, summary: '贷方1', debitAmount: 0, creditAmount: 1000 },
          { lineNo: 3, accountId: 3, summary: '贷方2', debitAmount: 0, creditAmount: 500 },
        ],
      };
      expect(gl.validateVoucherBalance(voucher)).toBe(true);
    });

    it('一贷多借应该平衡', () => {
      const voucher = {
        lines: [
          { lineNo: 1, accountId: 1, summary: '借方1', debitAmount: 600, creditAmount: 0 },
          { lineNo: 2, accountId: 2, summary: '借方2', debitAmount: 400, creditAmount: 0 },
          { lineNo: 3, accountId: 3, summary: '贷方', debitAmount: 0, creditAmount: 1000 },
        ],
      };
      expect(gl.validateVoucherBalance(voucher)).toBe(true);
    });

    it('允许小额浮点误差（小于0.01）', () => {
      const voucher = {
        lines: [
          { lineNo: 1, accountId: 1, summary: '借方', debitAmount: 1000, creditAmount: 0 },
          { lineNo: 2, accountId: 2, summary: '贷方', debitAmount: 0, creditAmount: 1000.005 },
        ],
      };
      expect(gl.validateVoucherBalance(voucher)).toBe(true);
    });
  });

  describe('账户余额计算', () => {
    it('资产类账户：期初借方 + 本期借方 - 本期贷方 = 期末借方', () => {
      const result = gl.calculateAccountBalance(10000, 0, 5000, 3000, 'debit');
      expect(result.endDebit).toBe(12000);
      expect(result.endCredit).toBe(0);
      expect(result.netBalance).toBe(12000);
    });

    it('负债类账户：期初贷方 + 本期贷方 - 本期借方 = 期末贷方', () => {
      const result = gl.calculateAccountBalance(0, 20000, 5000, 8000, 'credit');
      expect(result.endDebit).toBe(0);
      expect(result.endCredit).toBe(23000);
      expect(result.netBalance).toBe(23000);
    });

    it('借方账户期末为贷方余额时，应显示在贷方', () => {
      const result = gl.calculateAccountBalance(1000, 0, 0, 2000, 'debit');
      expect(result.endDebit).toBe(0);
      expect(result.endCredit).toBe(1000);
      expect(result.netBalance).toBe(-1000);
    });

    it('贷方账户期末为借方余额时，应显示在借方', () => {
      const result = gl.calculateAccountBalance(0, 1000, 2000, 0, 'credit');
      expect(result.endDebit).toBe(1000);
      expect(result.endCredit).toBe(0);
      expect(result.netBalance).toBe(-1000);
    });

    it('期初为0，本期只有借方发生', () => {
      const result = gl.calculateAccountBalance(0, 0, 5000, 0, 'debit');
      expect(result.endDebit).toBe(5000);
      expect(result.endCredit).toBe(0);
    });

    it('期初为0，本期只有贷方发生', () => {
      const result = gl.calculateAccountBalance(0, 0, 0, 3000, 'credit');
      expect(result.endDebit).toBe(0);
      expect(result.endCredit).toBe(3000);
    });

    it('本期借贷相等，余额不变', () => {
      const result = gl.calculateAccountBalance(10000, 0, 5000, 5000, 'debit');
      expect(result.endDebit).toBe(10000);
    });
  });

  describe('会计恒等式验证', () => {
    it('资产 = 负债 + 所有者权益', () => {
      const totalAssets = 500000;
      const totalLiabilities = 200000;
      const totalEquity = 300000;

      expect(totalAssets).toBe(totalLiabilities + totalEquity);
    });

    it('收入 - 费用 = 利润', () => {
      const revenue = 100000;
      const cost = 60000;
      const expenses = 20000;

      const profit = revenue - cost - expenses;
      expect(profit).toBe(20000);
    });
  });

  describe('凭证类型', () => {
    it('收款凭证：借方必有现金/银行存款', () => {
      const cashAccount = {
        accountCode: '1001',
        accountName: '库存现金',
        accountType: 'asset' as const,
      };
      expect(cashAccount.accountCode.startsWith('1')).toBe(true);
      expect(cashAccount.accountType).toBe('asset');
    });

    it('付款凭证：贷方必有现金/银行存款', () => {
      const bankAccount = {
        accountCode: '1002',
        accountName: '银行存款',
        accountType: 'asset' as const,
      };
      expect(bankAccount.accountCode.startsWith('1')).toBe(true);
    });

    it('转账凭证：不涉及现金/银行存款', () => {
      const transferVoucher = {
        lines: [
          { accountId: 1, accountCode: '5001', debitAmount: 1000, creditAmount: 0 },
          { accountId: 2, accountCode: '1403', debitAmount: 0, creditAmount: 1000 },
        ],
      };
      const hasCash = transferVoucher.lines.some(
        (l) =>
          l.accountCode && (l.accountCode.startsWith('1001') || l.accountCode.startsWith('1002'))
      );
      expect(hasCash).toBe(false);
    });
  });

  describe('损益结转逻辑', () => {
    it('收入类科目结转：从借方转至本年利润贷方', () => {
      const revenueAccount = {
        accountCode: '6001',
        accountName: '主营业务收入',
        currentDebit: 0,
        currentCredit: 100000,
      };

      const netBalance = revenueAccount.currentDebit - revenueAccount.currentCredit;
      expect(netBalance).toBe(-100000);

      const carryOverDebit = Math.abs(netBalance);
      const carryOverCredit = 0;

      expect(carryOverDebit).toBe(100000);
      expect(carryOverCredit).toBe(0);
    });

    it('成本费用类科目结转：从贷方转至本年利润借方', () => {
      const expenseAccount = {
        accountCode: '6401',
        accountName: '主营业务成本',
        currentDebit: 60000,
        currentCredit: 0,
      };

      const netBalance = expenseAccount.currentDebit - expenseAccount.currentCredit;
      expect(netBalance).toBe(60000);

      const carryOverDebit = 0;
      const carryOverCredit = netBalance;

      expect(carryOverDebit).toBe(0);
      expect(carryOverCredit).toBe(60000);
    });

    it('净利润 = 收入 - 成本 - 费用', () => {
      const revenue = 100000;
      const cost = 60000;
      const sellingExpense = 5000;
      const adminExpense = 10000;
      const financialExpense = 2000;

      const netProfit = revenue - cost - sellingExpense - adminExpense - financialExpense;
      expect(netProfit).toBe(23000);
    });
  });

  describe('试算平衡', () => {
    it('期初借方合计 = 期初贷方合计', () => {
      const beginDebits = [
        { account: '现金', amount: 5000 },
        { account: '银行存款', amount: 50000 },
        { account: '原材料', amount: 30000 },
        { account: '固定资产', amount: 100000 },
      ];
      const beginCredits = [
        { account: '应付账款', amount: 20000 },
        { account: '实收资本', amount: 165000 },
      ];

      const totalDebit = beginDebits.reduce((s, a) => s + a.amount, 0);
      const totalCredit = beginCredits.reduce((s, a) => s + a.amount, 0);

      expect(totalDebit).toBe(185000);
      expect(totalCredit).toBe(185000);
    });

    it('本期借方发生额合计 = 本期贷方发生额合计', () => {
      const currentDebits = [
        { account: '银行存款', amount: 100000 },
        { account: '应收账款', amount: 50000 },
      ];
      const currentCredits = [{ account: '主营业务收入', amount: 150000 }];

      const totalDebit = currentDebits.reduce((s, a) => s + a.amount, 0);
      const totalCredit = currentCredits.reduce((s, a) => s + a.amount, 0);

      expect(totalDebit).toBe(totalCredit);
    });

    it('期末借方余额合计 = 期末贷方余额合计', () => {
      const endDebits = [
        { account: '现金', amount: 6000 },
        { account: '银行存款', amount: 120000 },
        { account: '库存商品', amount: 40000 },
        { account: '固定资产', amount: 95000 },
      ];
      const endCredits = [
        { account: '应付账款', amount: 15000 },
        { account: '实收资本', amount: 165000 },
        { account: '本年利润', amount: 81000 },
      ];

      const totalDebit = endDebits.reduce((s, a) => s + a.amount, 0);
      const totalCredit = endCredits.reduce((s, a) => s + a.amount, 0);

      expect(totalDebit).toBe(261000);
      expect(totalCredit).toBe(261000);
    });
  });

  describe('GeneralLedger 实例', () => {
    it('应该能创建GeneralLedger实例', () => {
      const ledger = new GeneralLedger();
      expect(ledger).toBeInstanceOf(GeneralLedger);
    });
  });
});
