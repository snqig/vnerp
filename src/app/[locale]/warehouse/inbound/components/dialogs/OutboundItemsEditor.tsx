'use client';

import { Label } from '@/components/ui/label';
import type { AggItem } from './aggregateInboundItems';

interface Props {
  items: AggItem[];
  onQtyChange: (idx: number, qty: number) => void;
}

/** 出库类弹窗共用的明细编辑表格：按 (物料,批次) 展示，数量可编辑 */
export function OutboundItemsEditor({ items, onQtyChange }: Props) {
  const total = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>明细</Label>
        <span className="text-xs text-muted-foreground">
          共 {items.length} 项 / {total} 件
        </span>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left font-medium">物料</th>
              <th className="px-2 py-2 text-left font-medium">批次</th>
              <th className="px-2 py-2 text-left font-medium">单位</th>
              <th className="px-2 py-2 text-right font-medium">数量</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">
                  所选入库单没有可操作的物料明细
                </td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr key={`${it.material_id}-${it.batch_no}-${idx}`} className="border-t">
                  <td className="px-2 py-2">
                    <div className="font-medium">{it.material_name || '-'}</div>
                    <div className="text-xs text-muted-foreground">{it.material_code}</div>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{it.batch_no || '-'}</td>
                  <td className="px-2 py-2">{it.unit || '-'}</td>
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={it.quantity}
                      onChange={(e) => onQtyChange(idx, Number(e.target.value))}
                      className="h-8 w-24 rounded-md border border-input bg-transparent px-2 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
