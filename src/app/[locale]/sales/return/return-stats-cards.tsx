'use client';

import { RotateCcw, Clock, CircleCheckBig, CircleX } from 'lucide-react';
import { StatsCards, type StatsItem } from '@/components/stats-cards';

export interface ReturnStatsCardsProps {
  total: number;
  pending: number;
  approved: number;
  returned: number;
  t: (key: string) => string;
  tc: (key: string) => string;
}

export function ReturnStatsCards({ total, pending, approved, returned, t, tc }: ReturnStatsCardsProps) {
  const configs = [
    { key: 'total', icon: RotateCcw, label: t('totalReturnOrders'), color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-800/50' },
    { key: 'pending', icon: Clock, label: tc('pending'), color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { key: 'approved', icon: CircleCheckBig, label: tc('approved'), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'returned', icon: CircleX, label: t('returned'), color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  ];

  const stats: StatsItem<string>[] = [
    { key: 'total', count: total },
    { key: 'pending', count: pending },
    { key: 'approved', count: approved },
    { key: 'returned', count: returned },
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