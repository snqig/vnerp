'use client';

import { Calculator, ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react';
import { StatsCards, type StatsItem } from '@/components/stats-cards';

export interface ReconciliationStatsCardsProps {
  totalDelivery: number;
  totalReturn: number;
  totalNet: number;
  totalBalance: number;
  t: (key: string) => string;
}

export function ReconciliationStatsCards({
  totalDelivery,
  totalReturn,
  totalNet,
  totalBalance,
  t,
}: ReconciliationStatsCardsProps) {
  const configs = [
    { key: 'delivery', icon: ArrowDownCircle, label: t('totalDelivery'), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'return', icon: ArrowUpCircle, label: t('totalReturn'), color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { key: 'net', icon: Calculator, label: t('netAmount'), color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { key: 'balance', icon: Scale, label: t('balanceAmount'), color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  const stats: StatsItem<string>[] = [
    { key: 'delivery', count: totalDelivery, amount: totalDelivery },
    { key: 'return', count: totalReturn, amount: totalReturn },
    { key: 'net', count: totalNet, amount: totalNet },
    { key: 'balance', count: totalBalance, amount: totalBalance },
  ];

  return (
    <StatsCards
      configs={configs}
      stats={stats}
      currencySymbol="¥"
      amountFormatter={(amount) => amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    />
  );
}