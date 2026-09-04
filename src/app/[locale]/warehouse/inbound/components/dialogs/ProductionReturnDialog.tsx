'use client';
import { useTranslations } from 'next-intl';

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
  const ts = useTranslations('Warehouse');
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
      toast.error(ts('k_euog53'));
      return;
    }
    const valid = items.filter((it) => it.material_id && Number(it.quantity) > 0);
    if (valid.length === 0) {
      toast.error(ts('k_482f8l'));
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
        toast.error(result.message || ts('k_72an32'));
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
      toast.success(ts('k_177v9xb'));
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(ts('k_1yojo3u'));
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
          <DialogTitle>{ts('k_1gsuhdd')}</DialogTitle>
          <DialogDescription>
            {ts('k_6lpxcc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[62vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{ts('k_7kduo')}</Label>
              <div className="flex h-9 items-center rounded-md border border-muted bg-muted/50 px-3 text-sm">
                {fromWarehouseName}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{ts('k_kt9uaf')}</Label>
              <select
                value={selectedWO}
                onChange={(e) => setSelectedWO(e.target.value)}
                className={inputCls}
              >
                <option value="">{ts('k_ogu1y9')}</option>
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
            <Label>{ts('k_b5m1l6')}</Label>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={ts('k_zflkxh')}
              className={inputCls}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {ts('k_1589w37')}</Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? ts('k_1j4vco4') : ts('k_hpihkr')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
