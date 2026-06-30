import { query, execute, getConnection, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export type AccountType = 'asset' | 'liability' | 'equity' | 'cost' | 'profit_loss';
export type BalanceDirection = 'debit' | 'credit';
export type VoucherStatus = 'draft' | 'submitted' | 'audited' | 'posted' | 'voided';
export type VoucherType = 'receipt' | 'payment' | 'transfer' | 'adjustment';
export type PeriodStatus = 'open' | 'closed' | 'closing';

export interface Account {
  id: number;
  accountCode: string;
  accountName: string;
  fullName: string;
  parentId: number | null;
  level: number;
  accountType: AccountType;
  balanceDirection: BalanceDirection;
  isLeaf: boolean;
  assistTypes: string[];
  status: number;
  sortOrder: number;
}

export interface VoucherLine {
  id?: number;
  voucherId?: number;
  lineNo: number;
  accountId: number;
  accountCode?: string;
  accountName?: string;
  summary: string;
  debitAmount: number;
  creditAmount: number;
  customerId?: number;
  supplierId?: number;
  departmentId?: number;
  projectId?: number;
}

export interface Voucher {
  id: number;
  voucherNo: string;
  periodCode: string;
  voucherDate: string;
  voucherType: VoucherType;
  sourceType?: string;
  sourceId?: number;
  sourceNo?: string;
  totalDebit: number;
  totalCredit: number;
  status: VoucherStatus;
  summary?: string;
  attachmentCount?: number;
  createdBy?: string;
  createdAt?: string;
  auditedBy?: string;
  auditedAt?: string;
  postedBy?: string;
  postedAt?: string;
  lines: VoucherLine[];
}

export interface AccountBalance {
  periodCode: string;
  accountId: number;
  accountCode?: string;
  accountName?: string;
  beginDebit: number;
  beginCredit: number;
  currentDebit: number;
  currentCredit: number;
  yearDebit: number;
  yearCredit: number;
  endDebit: number;
  endCredit: number;
  direction: BalanceDirection;
}

export interface BalanceSheetItem {
  itemCode: string;
  itemName: string;
  amount: number;
  level: number;
  isGroup: boolean;
  parentCode?: string;
}

export interface IncomeStatementItem {
  itemCode: string;
  itemName: string;
  currentAmount: number;
  yearAmount: number;
  level: number;
  isGroup: boolean;
  parentCode?: string;
}

export const ACCOUNT_TYPE_MAP: Record<
  AccountType,
  { label: string; prefix: string; direction: BalanceDirection }
> = {
  asset: { label: '资产类', prefix: '1', direction: 'debit' },
  liability: { label: '负债类', prefix: '2', direction: 'credit' },
  equity: { label: '所有者权益类', prefix: '3', direction: 'credit' },
  cost: { label: '成本类', prefix: '4', direction: 'debit' },
  profit_loss: { label: '损益类', prefix: '5', direction: 'credit' },
};

interface VoucherStatusRow extends RowDataPacket {
  status: number;
}

interface VoucherWithPeriodRow extends RowDataPacket {
  status: number;
  is_closed: number;
  period_code: string;
}

interface VoucherLineRow extends RowDataPacket {
  account_id: number;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
}

interface AccountBalanceRow extends RowDataPacket {
  account_id: number;
  account_code: string;
  account_name: string;
  balance_direction: number;
  begin_debit: number;
  begin_credit: number;
  current_debit: number;
  current_credit: number;
  year_debit: number;
  year_credit: number;
}

export class GeneralLedger {
  constructor() {}

  validateVoucherBalance(voucher: { lines: VoucherLine[] }): boolean {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of voucher.lines) {
      totalDebit += Number(line.debitAmount || 0);
      totalCredit += Number(line.creditAmount || 0);
    }

    return Math.abs(totalDebit - totalCredit) < 0.01;
  }

  calculateAccountBalance(
    beginDebit: number,
    beginCredit: number,
    currentDebit: number,
    currentCredit: number,
    direction: BalanceDirection
  ): { endDebit: number; endCredit: number; netBalance: number } {
    const netBegin = beginDebit - beginCredit;
    const netCurrent = currentDebit - currentCredit;
    const netEnd = netBegin + netCurrent;

    let endDebit = 0;
    let endCredit = 0;

    if (netEnd > 0) {
      endDebit = netEnd;
    } else if (netEnd < 0) {
      endCredit = Math.abs(netEnd);
    }

    const netBalance = direction === 'debit' ? netEnd : -netEnd;

    return {
      endDebit: this.roundAmount(endDebit),
      endCredit: this.roundAmount(endCredit),
      netBalance: this.roundAmount(netBalance),
    };
  }

  async createVoucher(voucher: Omit<Voucher, 'id' | 'createdAt'>): Promise<number> {
    if (!this.validateVoucherBalance(voucher)) {
      throw new Error('凭证借贷不平衡');
    }

    if (voucher.lines.length === 0) {
      throw new Error('凭证明细不能为空');
    }

    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const totalDebit = voucher.lines.reduce((s, l) => s + Number(l.debitAmount || 0), 0);
      const totalCredit = voucher.lines.reduce((s, l) => s + Number(l.creditAmount || 0), 0);

      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO fin_voucher (
          voucher_no, period_code, voucher_date, voucher_type,
          source_type, source_id, source_no,
          total_debit, total_credit, status,
          summary, attachment_count, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          voucher.voucherNo,
          voucher.periodCode,
          voucher.voucherDate,
          this.voucherTypeToInt(voucher.voucherType),
          voucher.sourceType || null,
          voucher.sourceId || null,
          voucher.sourceNo || null,
          totalDebit,
          totalCredit,
          this.voucherStatusToInt(voucher.status),
          voucher.summary || null,
          voucher.attachmentCount || 0,
          voucher.createdBy || null,
        ]
      );

      const voucherId = result.insertId;

      for (let i = 0; i < voucher.lines.length; i++) {
        const line = voucher.lines[i];
        await conn.execute(
          `INSERT INTO fin_voucher_line (
            voucher_id, line_no, account_id, account_code, account_name,
            summary, debit_amount, credit_amount,
            customer_id, supplier_id, department_id, project_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            voucherId,
            i + 1,
            line.accountId,
            line.accountCode || null,
            line.accountName || null,
            line.summary || '',
            line.debitAmount,
            line.creditAmount,
            line.customerId || null,
            line.supplierId || null,
            line.departmentId || null,
            line.projectId || null,
          ]
        );
      }

      await conn.commit();

      secureLog('info', '凭证创建成功', { voucherId, voucherNo: voucher.voucherNo });
      return voucherId;
    } catch (error: unknown) {
      await conn.rollback();
      secureLog('error', '凭证创建失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      if (conn && conn.release) conn.release();
    }
  }

  async auditVoucher(voucherId: number, auditor: string): Promise<boolean> {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query<VoucherStatusRow[]>(
        `SELECT status FROM fin_voucher WHERE id = ?`,
        [voucherId]
      );

      if (rows.length === 0) {
        throw new Error('凭证不存在');
      }

      const status = rows[0].status;
      if (status !== 1) {
        throw new Error('只有已提交的凭证才能审核');
      }

      await conn.execute(
        `UPDATE fin_voucher SET status = 2, audited_by = ?, audited_at = NOW() WHERE id = ?`,
        [auditor, voucherId]
      );

      secureLog('info', '凭证审核成功', { voucherId, auditor });
      return true;
    } finally {
      if (conn && conn.release) conn.release();
    }
  }

  async postVoucher(voucherId: number, poster: string): Promise<boolean> {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [voucherRows] = await conn.query<VoucherWithPeriodRow[]>(
        `SELECT v.*, p.period_code as period 
         FROM fin_voucher v
         INNER JOIN fin_period p ON p.period_code = v.period_code
         WHERE v.id = ?`,
        [voucherId]
      );

      if (voucherRows.length === 0) {
        throw new Error('凭证不存在');
      }

      const voucher = voucherRows[0];
      if (voucher.status !== 2) {
        throw new Error('只有已审核的凭证才能记账');
      }

      if (voucher.is_closed) {
        throw new Error('会计期间已结账，不能记账');
      }

      const [lines] = await conn.query<VoucherLineRow[]>(
        `SELECT * FROM fin_voucher_line WHERE voucher_id = ? ORDER BY line_no`,
        [voucherId]
      );

      for (const line of lines) {
        await conn.execute(
          `INSERT INTO fin_account_balance (
            period_code, account_id, account_code,
            begin_debit, begin_credit,
            current_debit, current_credit,
            year_debit, year_credit,
            end_debit, end_credit
          ) VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, 0, 0)
          ON DUPLICATE KEY UPDATE
            current_debit = current_debit + VALUES(current_debit),
            current_credit = current_credit + VALUES(current_credit),
            year_debit = year_debit + VALUES(year_debit),
            year_credit = year_credit + VALUES(year_credit)`,
          [
            voucher.period_code,
            line.account_id,
            line.account_code,
            line.debit_amount,
            line.credit_amount,
            line.debit_amount,
            line.credit_amount,
          ]
        );
      }

      await conn.execute(
        `UPDATE fin_voucher SET status = 3, posted_by = ?, posted_at = NOW() WHERE id = ?`,
        [poster, voucherId]
      );

      await conn.commit();

      secureLog('info', '凭证记账成功', { voucherId, poster });
      return true;
    } catch (error: unknown) {
      await conn.rollback();
      secureLog('error', '凭证记账失败', {
        error: error instanceof Error ? error.message : String(error),
        voucherId,
      });
      throw error;
    } finally {
      if (conn && conn.release) conn.release();
    }
  }

  async calculatePeriodBalances(periodCode: string): Promise<AccountBalance[]> {
    const conn = await getConnection();
    try {
      const [yearStr, monthStr] = periodCode.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const firstPeriod = `${year}-01`;
      const prevMonth = month - 1;
      const prevPeriod =
        prevMonth > 0 ? `${year}-${String(prevMonth).padStart(2, '0')}` : `${year - 1}-12`;

      const [rows] = await conn.query<AccountBalanceRow[]>(
        `SELECT 
           a.id as account_id,
           a.account_code,
           a.account_name,
           a.balance_direction,
           COALESCE(pb.end_debit, 0) as begin_debit,
           COALESCE(pb.end_credit, 0) as begin_credit,
           COALESCE(cb.current_debit, 0) as current_debit,
           COALESCE(cb.current_credit, 0) as current_credit,
           COALESCE(yb.current_debit, 0) as year_debit,
           COALESCE(yb.current_credit, 0) as year_credit
         FROM fin_account a
         LEFT JOIN fin_account_balance pb ON pb.account_id = a.id AND pb.period_code = ?
         LEFT JOIN fin_account_balance cb ON cb.account_id = a.id AND cb.period_code = ?
         LEFT JOIN fin_account_balance yb ON yb.account_id = a.id AND yb.period_code >= ? AND yb.period_code <= ?
         WHERE a.status = 1 AND a.is_leaf = 1
         ORDER BY a.account_code`,
        [prevPeriod, periodCode, firstPeriod, periodCode]
      );

      const results: AccountBalance[] = [];
      for (const row of rows) {
        const direction = row.balance_direction === 2 ? 'credit' : 'debit';
        const balanceResult = this.calculateAccountBalance(
          Number(row.begin_debit || 0),
          Number(row.begin_credit || 0),
          Number(row.current_debit || 0),
          Number(row.current_credit || 0),
          direction
        );

        results.push({
          periodCode,
          accountId: Number(row.account_id),
          accountCode: row.account_code,
          accountName: row.account_name,
          beginDebit: this.roundAmount(Number(row.begin_debit || 0)),
          beginCredit: this.roundAmount(Number(row.begin_credit || 0)),
          currentDebit: this.roundAmount(Number(row.current_debit || 0)),
          currentCredit: this.roundAmount(Number(row.current_credit || 0)),
          yearDebit: this.roundAmount(Number(row.year_debit || 0)),
          yearCredit: this.roundAmount(Number(row.year_credit || 0)),
          endDebit: balanceResult.endDebit,
          endCredit: balanceResult.endCredit,
          direction,
        });
      }

      return results;
    } finally {
      if (conn && conn.release) conn.release();
    }
  }

  async generateBalanceSheet(periodCode: string): Promise<BalanceSheetItem[]> {
    const balances = await this.calculatePeriodBalances(periodCode);
    const balanceMap = new Map<number, AccountBalance>();
    for (const b of balances) {
      balanceMap.set(b.accountId, b);
    }

    const items: BalanceSheetItem[] = [];

    items.push({ itemCode: 'A', itemName: '资产', amount: 0, level: 1, isGroup: true });

    const assetAccounts = balances.filter((b) => b.accountCode?.startsWith('1'));
    let totalAsset = 0;

    items.push({
      itemCode: 'A01',
      itemName: '流动资产',
      amount: 0,
      level: 2,
      isGroup: true,
      parentCode: 'A',
    });
    const currentAssetAccounts = assetAccounts.filter(
      (b) =>
        b.accountCode &&
        ['1001', '1002', '1122', '1403', '1405'].some((p) => b.accountCode!.startsWith(p))
    );
    let currentAssetTotal = 0;
    for (const acc of currentAssetAccounts) {
      const amount =
        acc.direction === 'debit' ? acc.endDebit - acc.endCredit : acc.endCredit - acc.endDebit;
      items.push({
        itemCode: acc.accountCode!,
        itemName: acc.accountName!,
        amount: this.roundAmount(amount),
        level: 3,
        isGroup: false,
        parentCode: 'A01',
      });
      currentAssetTotal += amount;
    }
    items[items.length - currentAssetAccounts.length - 1].amount =
      this.roundAmount(currentAssetTotal);
    totalAsset += currentAssetTotal;

    items.push({
      itemCode: 'A02',
      itemName: '非流动资产',
      amount: 0,
      level: 2,
      isGroup: true,
      parentCode: 'A',
    });
    const nonCurrentAssetAccounts = assetAccounts.filter(
      (b) => b.accountCode && b.accountCode.startsWith('16')
    );
    let nonCurrentAssetTotal = 0;
    for (const acc of nonCurrentAssetAccounts) {
      const amount =
        acc.direction === 'debit' ? acc.endDebit - acc.endCredit : acc.endCredit - acc.endDebit;
      items.push({
        itemCode: acc.accountCode!,
        itemName: acc.accountName!,
        amount: this.roundAmount(amount),
        level: 3,
        isGroup: false,
        parentCode: 'A02',
      });
      nonCurrentAssetTotal += amount;
    }
    items[items.length - nonCurrentAssetAccounts.length - 1].amount =
      this.roundAmount(nonCurrentAssetTotal);
    totalAsset += nonCurrentAssetTotal;

    items[0].amount = this.roundAmount(totalAsset);

    items.push({
      itemCode: 'B',
      itemName: '负债和所有者权益',
      amount: this.roundAmount(totalAsset),
      level: 1,
      isGroup: true,
    });

    items.push({
      itemCode: 'B01',
      itemName: '流动负债',
      amount: 0,
      level: 2,
      isGroup: true,
      parentCode: 'B',
    });
    const liabilityAccounts = balances.filter((b) => b.accountCode?.startsWith('2'));
    let totalLiability = 0;
    for (const acc of liabilityAccounts) {
      const amount =
        acc.direction === 'credit' ? acc.endCredit - acc.endDebit : acc.endDebit - acc.endCredit;
      items.push({
        itemCode: acc.accountCode!,
        itemName: acc.accountName!,
        amount: this.roundAmount(amount),
        level: 3,
        isGroup: false,
        parentCode: 'B01',
      });
      totalLiability += amount;
    }
    items[items.findIndex((i) => i.itemCode === 'B01')].amount = this.roundAmount(totalLiability);

    items.push({
      itemCode: 'B02',
      itemName: '所有者权益',
      amount: 0,
      level: 2,
      isGroup: true,
      parentCode: 'B',
    });
    const equityAccounts = balances.filter((b) => b.accountCode?.startsWith('3'));
    let totalEquity = 0;
    for (const acc of equityAccounts) {
      const amount =
        acc.direction === 'credit' ? acc.endCredit - acc.endDebit : acc.endDebit - acc.endCredit;
      items.push({
        itemCode: acc.accountCode!,
        itemName: acc.accountName!,
        amount: this.roundAmount(amount),
        level: 3,
        isGroup: false,
        parentCode: 'B02',
      });
      totalEquity += amount;
    }
    items[items.findIndex((i) => i.itemCode === 'B02')].amount = this.roundAmount(totalEquity);

    return items;
  }

  async generateIncomeStatement(periodCode: string): Promise<IncomeStatementItem[]> {
    const [yearStr, monthStr] = periodCode.split('-');
    const firstPeriod = `${yearStr}-01`;
    const balances = await this.calculatePeriodBalances(periodCode);
    const balanceMap = new Map<string, AccountBalance>();
    for (const b of balances) {
      if (b.accountCode) {
        balanceMap.set(b.accountCode, b);
      }
    }

    const items: IncomeStatementItem[] = [];

    items.push({
      itemCode: 'I01',
      itemName: '一、营业收入',
      currentAmount: 0,
      yearAmount: 0,
      level: 1,
      isGroup: true,
    });

    const revenueAccount = balanceMap.get('6001');
    const revenueAmount = revenueAccount
      ? revenueAccount.currentCredit - revenueAccount.currentDebit
      : 0;
    const revenueYearAmount = revenueAccount
      ? revenueAccount.yearCredit - revenueAccount.yearDebit
      : 0;

    items.push({
      itemCode: '6001',
      itemName: '主营业务收入',
      currentAmount: this.roundAmount(revenueAmount),
      yearAmount: this.roundAmount(revenueYearAmount),
      level: 2,
      isGroup: false,
      parentCode: 'I01',
    });
    items[0].currentAmount = this.roundAmount(revenueAmount);
    items[0].yearAmount = this.roundAmount(revenueYearAmount);

    items.push({
      itemCode: 'I02',
      itemName: '二、营业成本',
      currentAmount: 0,
      yearAmount: 0,
      level: 1,
      isGroup: true,
    });

    const costAccount = balanceMap.get('6401');
    const costAmount = costAccount ? costAccount.currentDebit - costAccount.currentCredit : 0;
    const costYearAmount = costAccount ? costAccount.yearDebit - costAccount.yearCredit : 0;

    items.push({
      itemCode: '6401',
      itemName: '主营业务成本',
      currentAmount: this.roundAmount(costAmount),
      yearAmount: this.roundAmount(costYearAmount),
      level: 2,
      isGroup: false,
      parentCode: 'I02',
    });
    items[2].currentAmount = this.roundAmount(costAmount);
    items[2].yearAmount = this.roundAmount(costYearAmount);

    const expenseItems = [
      { code: '6601', name: '销售费用', parentCode: 'I03' },
      { code: '6602', name: '管理费用', parentCode: 'I03' },
      { code: '6603', name: '财务费用', parentCode: 'I03' },
    ];

    items.push({
      itemCode: 'I03',
      itemName: '三、期间费用',
      currentAmount: 0,
      yearAmount: 0,
      level: 1,
      isGroup: true,
    });

    let totalExpense = 0;
    let totalExpenseYear = 0;

    for (const exp of expenseItems) {
      const acc = balanceMap.get(exp.code);
      const amount = acc ? acc.currentDebit - acc.currentCredit : 0;
      const yearAmount = acc ? acc.yearDebit - acc.yearCredit : 0;
      items.push({
        itemCode: exp.code,
        itemName: exp.name,
        currentAmount: this.roundAmount(amount),
        yearAmount: this.roundAmount(yearAmount),
        level: 2,
        isGroup: false,
        parentCode: exp.parentCode,
      });
      totalExpense += amount;
      totalExpenseYear += yearAmount;
    }
    items[4].currentAmount = this.roundAmount(totalExpense);
    items[4].yearAmount = this.roundAmount(totalExpenseYear);

    const profitAmount = revenueAmount - costAmount - totalExpense;
    const profitYearAmount = revenueYearAmount - costYearAmount - totalExpenseYear;

    items.push({
      itemCode: 'I04',
      itemName: '四、利润总额',
      currentAmount: this.roundAmount(profitAmount),
      yearAmount: this.roundAmount(profitYearAmount),
      level: 1,
      isGroup: false,
    });

    return items;
  }

  async carryForwardProfit(periodCode: string, operator: string): Promise<number> {
    const balances = await this.calculatePeriodBalances(periodCode);

    const plAccounts = balances.filter(
      (b) => b.accountCode?.startsWith('5') || b.accountCode?.startsWith('6')
    );

    const lines: VoucherLine[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const acc of plAccounts) {
      const netBalance = acc.currentDebit - acc.currentCredit;

      if (Math.abs(netBalance) < 0.01) continue;

      if (netBalance > 0) {
        lines.push({
          lineNo: lines.length + 1,
          accountId: acc.accountId,
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          summary: `结转${acc.accountName}`,
          debitAmount: 0,
          creditAmount: netBalance,
        });
        totalCredit += netBalance;
      } else {
        lines.push({
          lineNo: lines.length + 1,
          accountId: acc.accountId,
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          summary: `结转${acc.accountName}`,
          debitAmount: Math.abs(netBalance),
          creditAmount: 0,
        });
        totalDebit += Math.abs(netBalance);
      }
    }

    const netProfit = totalCredit - totalDebit;

    if (netProfit > 0) {
      lines.push({
        lineNo: lines.length + 1,
        accountId: 0,
        accountCode: '3131',
        accountName: '本年利润',
        summary: '结转本期净利润',
        debitAmount: netProfit,
        creditAmount: 0,
      });
      totalDebit += netProfit;
    } else if (netProfit < 0) {
      lines.push({
        lineNo: lines.length + 1,
        accountId: 0,
        accountCode: '3131',
        accountName: '本年利润',
        summary: '结转本期净亏损',
        debitAmount: 0,
        creditAmount: Math.abs(netProfit),
      });
      totalCredit += Math.abs(netProfit);
    }

    const voucherNo = `SZ-${periodCode.replace('-', '')}-001`;

    return this.createVoucher({
      voucherNo,
      periodCode,
      voucherDate: new Date().toISOString().split('T')[0],
      voucherType: 'transfer',
      sourceType: 'period_end',
      totalDebit,
      totalCredit,
      status: 'draft',
      summary: '损益结转',
      createdBy: operator,
      lines,
    });
  }

  private voucherTypeToInt(type: VoucherType): number {
    const map: Record<VoucherType, number> = {
      receipt: 1,
      payment: 2,
      transfer: 3,
      adjustment: 4,
    };
    return map[type] || 3;
  }

  private voucherStatusToInt(status: VoucherStatus): number {
    const map: Record<VoucherStatus, number> = {
      draft: 0,
      submitted: 1,
      audited: 2,
      posted: 3,
      voided: 4,
    };
    return map[status] || 0;
  }

  private roundAmount(v: number): number {
    return Math.round(v * 100) / 100;
  }
}

export default GeneralLedger;
