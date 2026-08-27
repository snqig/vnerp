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
import { aggregateInboundItems, AggItem } from './aggregateInboundItems';
import { OutboundItemsEditor } from './OutboundItemsEditor';

interface WO {
  id: number;
  work_order_no: string;
  product_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceRecords: InboundRecord[];
  warehouses: Warehouse[];
  operatorId?: number;
  operatorName?: string;
  onSuccess: () => void;
}

export function ProductionReturnDialog({
  open,
  onOpenChange,
  sourceRecords,
  warehouses,
  operatorId,
  operatorName,
  onSuccess,
}: Props) {
  const fromWarehouseId = sourceRecords[0]?.warehouse_id;
  const wh = warehouses.find((w) => w.id === fromWarehouseId);
  const fromWarehouseName = wh?.warehouse_name || `仓库#${fromWarehouseId || '-'}`;

  const aggregated = useMemo<AggItem[]>(
    () => aggregateInboundItems(sourceRecords),
    [sourceRecords]
  );
  const [items, setItems] = useState<AggItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WO[]>([]);
  const [selectedWO, setSelectedWO] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(aggregated.map((a) => ({ ...a })));
      setSelectedWO('');
      setRemark('');
      authFetch('/api/workorders?pageSize=1000&status=all')
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setWorkOrders(res.data?.list || []);
        })
        .catch(() => {});
    }
  }, [open, aggregated]);

  const updateQty = (idx: number, qty: number) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)));

  const handleConfirm = async () => {
    if (!fromWarehouseId) {
      toast.error('无法确定退料仓库');
      return;
    }
    const valid = items.filter((it) => it.material_id && Number(it.quantity) > 0);
    if (valid.length === 0) {
      toast.error('请至少填写一项有效数量');
      return;
    }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const wo = workOrders.find((w) => w.work_order_no === selectedWO);
      const res = await authFetch('/api/production/material-return', {
        method: 'POST',
        body: JSON.stringify({
          warehouse_id: fromWarehouseId,
          work_order_id: wo?.id ?? null,
          work_order_no: selectedWO || null,
          return_date: today,
          operator_name: operatorName || '',
          remark: remark || null,
          items: valid.map((it) => ({
            material_id: it.material_id,
            material_code: it.material_code,
            material_name: it.material_name,
            return_qty: Number(it.quantity),
            unit: it.unit || null,
            batch_no: it.batch_no || null,
          })),
        }),
      });
      const result = await res.json();
      if (!result.success) {
        toast.error(result.message || '创建生产退料单失败');
        setSubmitting(false);
        return;
      }
      const returnId = result.data?.id;
      if (returnId) {
        const cRes = await authFetch('/api/production/material-return', {
          method: 'PUT',
          body: JSON.stringify({ id: returnId, action: 'confirm' }),
        });
        const cResult = await cRes.json();
        if (!cResult.success) {
          toast.error(`退料单已创建，但确认失败：${cResult.message || ''}`);
          setSubmitting(false);
          return;
        }
      }
      toast.success('生产退料单已确认，库存已回冲（车间→仓库）');
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
          <DialogTitle>生产退料（车间 → 仓库）</DialogTitle>
          <DialogDescription>
            把车间用剩的物料退回仓库，确认后库存回冲增加。可关联工单（可选）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[62vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>退料仓库</Label>
              <div className="flex h-9 items-center rounded-md border border-muted bg-muted/50 px-3 text-sm">
                {fromWarehouseName}
              </div>
            </div>
            <div className="space-y-1">
              <Label>关联工单（可选）</Label>
              <select
                value={selectedWO}
                onChange={(e) => setSelectedWO(e.target.value)}
                className={inputCls}
              >
                <option value="">不关联工单</option>
                {workOrders.map((w) => (
                  <option key={w.work_order_no} value={w.work_order_no}>
                    {w.work_order_no} - {w.product_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <OutboundItemsEditor items={items} onQtyChange={updateQty} />

          <div className="space-y-1">
            <Label>备注</Label>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="可选"
              className={inputCls}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? '处理中...' : '创建并确认退料'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
