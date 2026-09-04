'use client';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

export function StatusBadge<T extends number | string>({
  status,
  statusMap,
}: {
  status: T;
  statusMap: Record<T, StatusConfig>;
}) {
  const ts = useTranslations('Common');
  const config = statusMap[status];
  if (!config) return <Badge variant="outline">{ts('k_1lpnuh4')}</Badge>;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
