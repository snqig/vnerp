'use client';

import {
  ClipboardList,
  CheckCircle,
  Truck,
  CircleCheckBig,
  XCircle,
} from 'lucide-react';

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

const STATS_CONFIG = [
  { key: 1, icon: ClipboardList, labelKey: 'summaryPending', color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-800/50' },
  { key: 2, icon: CheckCircle, labelKey: 'summaryConfirmed', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 3, icon: Truck, labelKey: 'summaryPartialShip', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { key: 4, icon: CircleCheckBig, labelKey: 'summaryCompleted', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { key: 5, icon: XCircle, labelKey: 'summaryCancelled', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
] as const;

export function SalesStatsCards({
  stats,
  statusFilter,
  onStatusFilterChange,
  onFetchOrders,
  onPageChange,
  t,
}: SalesStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {STATS_CONFIG.map(({ key, icon: Icon, labelKey, color, bg }) => {
        const s = stats.find((st) => st.status === key);
        const count = s?.count ?? 0;
        const amount = s?.amount ?? 0;
        const isActive = statusFilter === String(key);

        const handleClick = () => {
          onStatusFilterChange(String(key));
          onPageChange(1);
          onFetchOrders(undefined, String(key), 1);
        };

        return (
          <div
            key={key}
            className={`${bg} rounded-lg border p-3 flex flex-col gap-1 cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all ${isActive ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-950' : 'hover:border-blue-300 dark:hover:border-blue-700'}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t(labelKey)}</span>
              <Icon className={`h-4 w-4 ${color} ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            </div>
            <span className="text-xl font-semibold">{count}</span>
            <span className="text-xs text-muted-foreground">{t('summaryAmountLabel')}: ¥{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        );
      })}
    </div>
  );
}
