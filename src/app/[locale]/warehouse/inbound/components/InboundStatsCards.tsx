'use client';

import { TrendingUp, Boxes, Clock, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { InboundRecord } from '../types';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface InboundStatsCardsProps {
  totalInboundToday: number;
  totalInboundMonth: number;
  inboundRecords: InboundRecord[];
}

export function InboundStatsCards({
  totalInboundToday,
  totalInboundMonth,
  inboundRecords,
}: InboundStatsCardsProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const pendingCount = inboundRecords.filter(
    (r) => r.status === 'draft' || r.status === 'pending'
  ).length;

  const labelsCount = inboundRecords
    .filter((r) => r.status === 'approved' || r.status === 'completed')
    .reduce((sum, r) => sum + (r.items?.length || 0), 0);

  return (
    <StatsCards
      configs={[
        { key: 'today', label: t('todayInbound'), icon: TrendingUp, ...StatsTheme.blue },
        { key: 'month', label: t('monthInboundTotal'), icon: Boxes, ...StatsTheme.green },
        { key: 'pending', label: tc('pending'), icon: Clock, ...StatsTheme.orange },
        { key: 'labels', label: t('labelsGenerated'), icon: QrCode, ...StatsTheme.purple },
      ]}
      stats={[
        { key: 'today', count: totalInboundToday },
        { key: 'month', count: totalInboundMonth },
        { key: 'pending', count: pendingCount },
        { key: 'labels', count: labelsCount },
      ]}
      cols={{ mobile: 2, tablet: 2, desktop: 4 }}
    />
  );
}
