'use client';

import { Users, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { StatsCards, type StatsItem } from '@/components/stats-cards';

export interface AnalysisSummary {
  total_customers: number;
  total_amount: number;
  avg_satisfaction: number;
  avg_on_time_rate: number;
}

export interface AnalysisStatsCardsProps {
  summary: AnalysisSummary;
  t: (key: string) => string;
}

export function AnalysisStatsCards({ summary, t }: AnalysisStatsCardsProps) {
  const configs = [
    { key: 'customers', icon: Users, label: t('totalCustomers'), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'amount', icon: DollarSign, label: t('totalOrderAmount'), color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { key: 'satisfaction', icon: TrendingUp, label: t('avgSatisfaction'), color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { key: 'onTime', icon: BarChart3, label: t('avgOnTimeRate'), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  const stats: StatsItem<string>[] = [
    { key: 'customers', count: summary.total_customers },
    { key: 'amount', count: summary.total_amount },
    { key: 'satisfaction', count: summary.avg_satisfaction },
    { key: 'onTime', count: summary.avg_on_time_rate },
  ];

  return (
    <StatsCards
      configs={configs}
      stats={stats}
      currencySymbol="¥"
      amountFormatter={(amount) => amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      countFormatter={(count, key) => {
        if (key === 'amount') {
          return `¥${count.toLocaleString()}`;
        }
        if (key === 'satisfaction') {
          return count.toFixed(1);
        }
        if (key === 'onTime') {
          return `${count.toFixed(1)}%`;
        }
        return String(count);
      }}
    />
  );
}