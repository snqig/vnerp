'use client';

import { useEffect } from 'react';
import { TrendingUp, Boxes, Clock, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import type { InboundRecord } from '../types';

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

  const stats = [
    { label: t('todayInbound'), value: totalInboundToday, unit: t('unitOrders'), icon: TrendingUp },
    { label: t('monthInboundTotal'), value: totalInboundMonth, unit: t('unitOrders'), icon: Boxes },
    {
      label: tc('pending'),
      value: pendingCount,
      unit: t('unitOrders'),
      icon: Clock,
      highlight: true,
    },
    { label: t('labelsGenerated'), value: labelsCount, unit: t('unitLabels'), icon: QrCode },
  ];

  useEffect(() => {
    console.log('[InboundStatsCards] quieter 渲染检查', {
      cardsTotal: stats.length,
      pendingCount,
      hasHighlight: pendingCount > 0,
      renderedCards: stats.map((s) => ({
        label: s.label,
        value: s.value,
        highlight: s.highlight === true && pendingCount > 0,
        gradientRemoved: true,
      })),
    });
  }, [pendingCount, totalInboundToday, totalInboundMonth, labelsCount]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, unit, icon: Icon, highlight }) => (
        <Card
          key={label}
          className={highlight && pendingCount > 0 ? 'border-t-2 border-t-yellow-500' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <p className="text-2xl font-semibold text-foreground">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{unit}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
