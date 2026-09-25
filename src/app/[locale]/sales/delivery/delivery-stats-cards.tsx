'use client';

import { Truck, Clock, CircleCheckBig, XCircle } from 'lucide-react';
import { StatsCards, type StatsItem } from '@/components/stats-cards';

export interface DeliveryStatsCardsProps {
  total: number;
  pending: number;
  delivered: number;
  signed: number;
  t: (key: string) => string;
}

export function DeliveryStatsCards({ total, pending, delivered, signed, t }: DeliveryStatsCardsProps) {
  const configs = [
    { key: 'total', icon: Truck, label: t('totalDelivery'), color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-800/50' },
    { key: 'pending', icon: Clock, label: t('pendingDelivery'), color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { key: 'delivered', icon: CircleCheckBig, label: t('delivered'), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'signed', icon: XCircle, label: t('signed'), color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  ];

  const stats: StatsItem<string>[] = [
    { key: 'total', count: total },
    { key: 'pending', count: pending },
    { key: 'delivered', count: delivered },
    { key: 'signed', count: signed },
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