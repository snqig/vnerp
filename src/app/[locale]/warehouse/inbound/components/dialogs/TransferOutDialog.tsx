'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import type { InboundRecord, Warehouse } from '../../types';

interface AggregatedItem {
  material_id: number;
  material_name: string;
  material_code: string;
  batch_no: string;
  unit: string;
  quantity: number;
}

interface TransferOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceRecords: InboundRecord[];
  warehouses: Warehouse[];
  operatorId?: number;
  onSuccess: () => void;
}

export function TransferOutDialog({
  open,
  onOpenChange,
  sourceRecords,
  warehouses,
  operatorId,
  onSuccess,
}: TransferOutDialogProps) {
  const fromWarehouseId = sourceRecords[0]?.warehouse_id;
  const fromWarehouseName =
    warehouses.find((w) => w.id === fromWarehouseId)?.warehouse_name ||
    `仓库#${fromWarehouseId || '-'}`;

  // 跨单合并：同一 (物料, 批次) 累加数量
  const aggregated = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>();
    for (const rec of sourceRecords) {
      for (const it of rec.items || []) {
        const key = `${it.material_id}|${it.batch_no || ''}`;
        const ex = map.get(key);
        const qty = Number(it.quantity) || 0;
        if (ex) {
          ex.quantity += qty;
        } else {
          map.set(key, {
            material_id: it.material_id,
            material_name: it.material_name || '',
            material_code: it.material_code || '',
            batch_no: it.batch_no || '',
            unit: it.unit || '',
            quantity: qty,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [sourceRecords]);

  const [items, setItems] = useState<AggregatedItem[]>([]);
  const [toWarehouseId, setToWarehouseId] = useState<number | ''>('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(aggregated.map((a) => ({ ...a })));
      setToWarehouseId('');
      setRemark('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceRecords]);

  const targetWarehouses = warehouses.filter((w) => w.id !== fromWarehouseId);
  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  const updateQty = (idx: number, qty: number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)));
  };

  const handleConfirm = async () => {
    if (!fromWarehouseId) {
      toast.error('无法确定调出仓库');
      return;
    }
    if (!toWarehouseId) {
      toast.error('请选择调入仓库');
      return;
    }
    const validItems = items.filter((it) => it.material_id && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('请至少填写一项有效数量');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/warehouse/transfer', {
        method: 'POST',
        body: JSON.stringify({
          type: 2,
          from_warehouse_id: fromWarehouseId,
          to_warehouse_id: toWarehouseId,
          operator_id: operatorId || null,
          remark: remark || null,
          items: validItems.map((it) => ({
            material_id: it.material_id,
            quantity: Number(it.quantity),
            unit: it.unit || null,
            batch_no: it.batch_no || null,
          })),
        }),
      });
      const result = await res.json();
      if (!result.success) {
        toast.error(result.message || '创建调拨单失败');
        setSubmitting(false);
        return;
      }

      const transferId = result.data?.id;
      if (transferId) {
        const subRes = await authFetch('/api/warehouse/transfer', {
          method: 'PUT',
          body: JSON.stringify({ id: transferId, action: 'submit' }),
        });
        const subResult = await subRes.json();
        if (!subResult.success) {
          toast.error(`调拨单已创建，但提交失败：${subResult.message || ''}`);
        }
      }

      toast.success('调拨单已创建并提交，请在「仓库调拨」模块完成出库/入库');
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" resizable>
        <DialogHeader>
          <DialogTitle>调拨出库到其他仓库</DialogTitle>
          <DialogDescription>
            从入库单发起仓库调拨。调出仓库已自动带出，请选择调入仓库并确认明细后提交。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[62vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>调出仓库</Label>
              <div className="flex h-9 items-center rounded-md border border-muted bg-muted/50 px-3 text-sm">
                {fromWarehouseName}
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                调入仓库 <span className="text-red-500">*</span>
              </Label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value ? Number(e.target.value) : '')}
                className={inputCls}
              >
                <option value="">请选择调入仓库</option>
                {targetWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouse_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>调拨明细</Label>
              <span className="text-xs text-muted-foreground">
                共 {items.length} 项 / {totalQty} 件
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
                        所选入库单没有可调拨的物料明细
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
                            onChange={(e) => updateQty(idx, Number(e.target.value))}
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

          <div className="space-y-1">
            <Label>备注</Label>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="可选，如调拨原因"
              className={inputCls}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? '处理中...' : '创建调拨单'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
