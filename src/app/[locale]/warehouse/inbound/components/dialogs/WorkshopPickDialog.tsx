'use client';
import { useTranslations } from 'next-intl';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  status: string;
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

export function WorkshopPickDialog({
  open,
  onOpenChange,
  sourceRecords,
  warehouses,
  operatorId,
  operatorName,
  onSuccess,
}: Props) {
  const ts = useTranslations('Warehouse');
  const router = useRouter();
  const fromWarehouseId = sourceRecords[0]?.warehouse_id;
  const aggregated = useMemo<AggItem[]>(
    () => aggregateInboundItems(sourceRecords),
    [sourceRecords]
  );
  const [items, setItems] = useState<AggItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WO[]>([]);
  const [selectedWO, setSelectedWO] = useState('');
  const [noWo, setNoWo] = useState(false);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(aggregated.map((a) => ({ ...a })));
      setSelectedWO('');
      setNoWo(false);
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
      toast.error(ts('k_x7wkjd'));
      return;
    }
    if (!noWo && !selectedWO) {
      toast.error(ts('k_14ucen1'));
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
      const res = await authFetch('/api/production/material-issue', {
        method: 'POST',
        body: JSON.stringify({
          warehouse_id: fromWarehouseId,
          items: valid.map((it) => ({
            material_id: it.material_id,
            material_code: it.material_code,
            material_name: it.material_name,
            required_qty: 0,
            issued_qty: Number(it.quantity),
            unit: it.unit || null,
            batch_no: it.batch_no || null,
          })),
          work_order_id: noWo ? null : wo?.id ?? null,
          work_order_no: noWo ? null : selectedWO || null,
          issue_date: today,
          issue_type: 1,
          operator_name: operatorName || '',
          remark: remark || null,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        toast.error(result.message || ts('k_1c2fnhi'));
        setSubmitting(false);
        return;
      }
      const issueId = result.data?.id;
      if (issueId) {
        const pRes = await authFetch('/api/production/material-issue', {
          method: 'PUT',
          body: JSON.stringify({ id: issueId, action: 'post' }),
        });
        const pResult = await pRes.json();
        if (!pResult.success) {
          toast.error(`领料单已创建，但过账失败：${pResult.message || ''}`);
          setSubmitting(false);
          return;
        }
      }
      toast.success(ts('k_lh12t4'));
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
          <DialogTitle>{ts('k_1pisd7i')}</DialogTitle>
          <DialogDescription>
            {ts('k_106oopf')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[62vh] overflow-y-auto">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>
                {ts('k_1yxsmpc')}<span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push('/production/workorder')}
              >
                {ts('k_1qnotqp')}</Button>
            </div>
            <select
              value={selectedWO}
              disabled={noWo}
              onChange={(e) => setSelectedWO(e.target.value)}
              className={inputCls}
            >
              <option value="">{ts('k_1djjuk8')}</option>
              {workOrders.map((w) => (
                <option key={w.work_order_no} value={w.work_order_no}>
                  {w.work_order_no} - {w.product_name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={noWo}
                onChange={(e) => setNoWo(e.target.checked)}
              />
              {ts('k_6kawh0')}</label>
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
            {submitting ? ts('k_1j4vco4') : ts('k_1asb8fu')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
