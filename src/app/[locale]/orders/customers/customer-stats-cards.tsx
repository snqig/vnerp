'use client';

import { Users, CheckCircle, MessageCircle, Building2 } from 'lucide-react';
import { StatsCards, type StatsItem } from '@/components/stats-cards';

export interface CustomerStatsItem {
  key: string;
  count: number;
}

export interface CustomerStatsCardsProps {
  totalCount: number;
  customers: Array<{ followUpStatus: number; customerType: number }>;
  t: (key: string) => string;
}

const STATS_CONFIG: Array<{
  key: string;
  icon: typeof Users | typeof CheckCircle | typeof MessageCircle | typeof Building2;
  labelKey: string;
  color: string;
  bg: string;
}> = [
  { key: 'total', icon: Users, labelKey: 'totalCustomers', color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-800/50' },
  { key: 'completed', icon: CheckCircle, labelKey: 'completedCustomers', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { key: 'intention', icon: MessageCircle, labelKey: 'intentionCustomers', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { key: 'enterprise', icon: Building2, labelKey: 'enterpriseCustomers', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
];

export function CustomerStatsCards({ totalCount, customers, t }: CustomerStatsCardsProps) {
  const statsItems: StatsItem<string>[] = [
    { key: 'total', count: totalCount },
    {
      key: 'completed',
      count: customers.filter((c) => c.followUpStatus === 3).length,
    },
    {
      key: 'intention',
      count: customers.filter((c) => c.followUpStatus === 2).length,
    },
    {
      key: 'enterprise',
      count: customers.filter((c) => c.customerType === 1).length,
    },
  ];

  const configs = STATS_CONFIG.map(({ key, icon, labelKey, color, bg }) => ({
    key,
    label: t(labelKey),
    icon,
    color,
    bg,
  }));

  return (
    <StatsCards
      configs={configs}
      stats={statsItems}
    />
  );
}
