'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, X } from 'lucide-react';

export interface BatchAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  onClick: (ids: (string | number)[]) => void | Promise<void>;
  confirm?: string;
  requireAllSameStatus?: string; // 要求所有选中项状态相同
}

interface BatchToolbarProps {
  selectedIds: (string | number)[];
  totalItems: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  actions: BatchAction[];
  className?: string;
}

export function BatchToolbar({
  selectedIds,
  totalItems,
  onSelectAll,
  onClearSelection,
  actions,
  className = '',
}: BatchToolbarProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = useCallback(
    async (action: BatchAction) => {
      if (action.confirm && !confirm(action.confirm)) return;
      setLoading(true);
      try {
        await action.onClick(selectedIds);
      } finally {
        setLoading(false);
      }
    },
    [selectedIds]
  );

  if (selectedIds.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 p-2 bg-muted/50 rounded-lg border ${className}`}>
      <Checkbox
        checked={selectedIds.length === totalItems && totalItems > 0}
        onCheckedChange={(checked) => {
          if (checked) onSelectAll();
          else onClearSelection();
        }}
      />
      <span className="text-sm text-muted-foreground">
        已选
        <strong className="text-foreground">{selectedIds.length}</strong> / {totalItems}项
      </span>
      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClearSelection}>
        <X className="h-3 w-3 mr-0.5" />
        取消选择
      </Button>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        {actions.slice(0, 3).map((action) => (
          <Button
            key={action.key}
            size="sm"
            variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
            className="h-7 text-xs gap-1"
            onClick={() => handleAction(action)}
            disabled={loading}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        {actions.length > 3 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7" disabled={loading}>
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(3).map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  onClick={() => handleAction(action)}
                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
