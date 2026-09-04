'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface BatchDeleteBarProps {
  /** Number of currently selected rows. The bar hides automatically when 0. */
  count: number;
  onClear: () => void;
  onDelete: () => void | Promise<void>;
  /** Loading state — disables buttons to prevent double-submit. */
  loading?: boolean;
}

/**
 * Selection toolbar shown above a table when rows are selected.
 * Reads its labels from the `Common` i18n namespace
 * (selectedCount / clearSelection / batchDelete).
 */
export function BatchDeleteBar({ count, onClear, onDelete, loading }: BatchDeleteBarProps) {
  const tc = useTranslations('Common');
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-sm">
      <span className="font-medium" aria-live="polite">
        {tc('selectedCount', { count })}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear} disabled={loading}>
          {tc('clearSelection')}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={loading}>
          {tc('batchDelete')}
        </Button>
      </div>
    </div>
  );
}
