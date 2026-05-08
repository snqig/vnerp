'use client';

import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

export function StatusBadge<T extends number | string>(
  { status, statusMap }: { status: T; statusMap: Record<T, StatusConfig> }
) {
  const config = statusMap[status];
  if (!config) return <Badge variant="outline">未知</Badge>;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
