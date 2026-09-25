'use client';

import {
  ClipboardList,
  CheckCircle,
  Truck,
  CircleCheckBig,
  XCircle,
} from 'lucide-react';
import { StatsCards, StatsTheme, type StatsCardConfig, type StatsItem } from '@/components/stats-cards';

export interface SalesStatsItem {
  status: number;
  count: number;
  amount: number;
}

export interface SalesStatsCardsProps {
  stats: SalesStatsItem[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onFetchOrders: (keyword?: string, status?: string, pageNum?: number) => void;
  onPageChange: (page: number) => void;
  t: (key: string) => string;
}

const STATS_CONFIG: Array<{ key: number; icon: typeof ClipboardList; labelKey: string; theme: typeof StatsTheme[keyof typeof StatsTheme] }> = [
  { key: 1, icon: ClipboardList, labelKey: 'summaryPending', theme: StatsTheme.gray },
  { key: 2, icon: CheckCircle, labelKey: 'summaryConfirmed', theme: StatsTheme.blue },
  { key: 3, icon: Truck, labelKey: 'summaryPartialShip', theme: StatsTheme.orange },
  { key: 4, icon: CircleCheckBig, labelKey: 'summaryCompleted', theme: StatsTheme.green },
  { key: 5, icon: XCircle, labelKey: 'summaryCancelled', theme: StatsTheme.red },
] as const;

export function SalesStatsCards({
  stats,
  statusFilter,
  onStatusFilterChange,
  onFetchOrders,
  onPageChange,
  t,
}: SalesStatsCardsProps) {
  const configs: StatsCardConfig<number>[] = STATS_CONFIG.map(({ key, icon, labelKey, theme }) => ({
    key,
    label: t(labelKey),
    icon,
    color: theme.color,
    bg: theme.bg,
  }));

  const statsItems: StatsItem<number>[] = stats.map((s) => ({
    key: s.status,
    count: s.count,
    amount: s.amount,
  }));

  return (
    <StatsCards
      configs={configs}
      stats={statsItems}
      activeKey={statusFilter ? Number(statusFilter) : undefined}
      currencySymbol="¥"
      onCardClick={(key) => {
        onStatusFilterChange(String(key));
        onPageChange(1);
        onFetchOrders(undefined, String(key), 1);
      }}
    />
  );
}
