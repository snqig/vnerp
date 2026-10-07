'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Printer } from 'lucide-react';

export interface QualityBatchBarProps<T> {
  /** 当前选中的行 */
  selectedRows: T[];
  /** 全部数据(用于全选/清空) */
  allRows: T[];
  /** 选中变化回调 */
  onSelectedRowsChange: (rows: T[]) => void;
  /** 批量打印回调(默认清空选中) */
  onBatchPrint?: () => void;
  /** 批量导出回调(默认清空选中) */
  onBatchExport?: () => void;
  /** 文案回调:父页传入 t('selectedItems')/{t('clearSelection')} 等 */
  labels: {
    selectedCount: string; // e.g. t('selectedItems', { count })
    clearSelection: string;
    batchPrint: string;
  };
}

/**
 * 质量列表批量操作底栏。
 * - 选中 0 行时自动隐藏
 * - 勾选全选/取消全选
 * - 提供批量打印(默认) + 批量导出按钮
 * process/final 两页共享,点击行为由父页注入(onBatchPrint/onBatchExport)
 */
export function QualityBatchBar<T>({
  selectedRows,
  allRows,
  onSelectedRowsChange,
  onBatchPrint,
  onBatchExport,
  labels,
}: QualityBatchBarProps<T>) {
  if (selectedRows.length === 0) return null;

  const allSelected =
    allRows.length > 0 && selectedRows.length === allRows.length;

  const handleSelectAll = (checked: boolean) => {
    onSelectedRowsChange(checked ? allRows : []);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => handleSelectAll(!!checked)}
            />
            <span className="text-sm text-muted-foreground">{labels.selectedCount}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onSelectedRowsChange([])}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {labels.clearSelection}
            </Button>
            {onBatchPrint && (
              <Button variant="outline" onClick={onBatchPrint}>
                <Printer className="h-4 w-4 mr-2" />
                {labels.batchPrint}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
