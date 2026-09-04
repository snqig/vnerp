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

// 仓库类型(sys_warehouse_category.id) → 出库类型映射
// 1=原材料仓 2=半成品仓 3=成品仓 4=辅料仓 5=耗材仓 6=退货仓 7=报废仓
const CATEGORY_TO_OUTBOUND_TYPE: Record<number, string> = {
  1: 'raw_material',
  2: 'production',
  3: 'sales',
  4: 'production',
  5: 'other',
  6: 'return',
  7: 'other',
};

const CATEGORY_TO_OUTBOUND_LABEL: Record<number, string> = {
  1: '原料出库',
  2: '半成品出库',
  3: '销售出库',
  4: '辅料出库',
  5: '耗材出库',
  6: '退货出库',
  7: '报废出库',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceRecords: InboundRecord[];
  warehouses: Warehouse[];
  operatorId?: number;
  operatorName?: string;
  onSuccess: () => void;
}

export function OutboundDialog({
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
  const fromCategoryId = wh?.category_id;
  // 按仓库类型自动映射出库类型
  const outboundType = fromCategoryId
    ? CATEGORY_TO_OUTBOUND_TYPE[fromCategoryId] || 'other'
    : 'raw_material';
  const outboundTypeLabel = fromCategoryId
    ? CATEGORY_TO_OUTBOUND_LABEL[fromCategoryId] || ts('k_le3tde')
    : ts('k_i8a8h6');

  // 可选目标仓库（排除来源仓，用于调拨）
  const targetWarehouses = warehouses.filter((w) => w.id !== fromWarehouseId);

  const aggregated = useMemo<AggItem[]>(
    () => aggregateInboundItems(sourceRecords),
    [sourceRecords]
  );
  const [items, setItems] = useState<AggItem[]>([]);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 目标仓库：选了表示调拨，不选表示普通出库
  const [toWarehouseId, setToWarehouseId] = useState<number | ''>('');

  useEffect(() => {
    if (open) {
      setItems(aggregated.map((a) => ({ ...a })));
      setRemark('');
      setToWarehouseId('');
    }
  }, [open, aggregated]);

  const updateQty = (idx: number, qty: number) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)));

  const handleConfirm = async () => {
    if (!fromWarehouseId) {
      toast.error(ts('k_1li0kgb'));
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

      // 选了目标仓库 → 调拨流程（创建调拨单→提交→出库→入库）
      if (toWarehouseId) {
        const transferItems = valid.map((it) => ({
          material_id: it.material_id,
          quantity: Number(it.quantity),
          unit: it.unit || null,
          batch_no: it.batch_no || null,
        }));

        // 1. 创建调拨单（type=2 仓库调拨）
        const createRes = await authFetch('/api/warehouse/transfer', {
          method: 'POST',
          body: JSON.stringify({
            type: 2,
            from_warehouse_id: fromWarehouseId,
            to_warehouse_id: toWarehouseId,
            operator_id: operatorId || null,
            remark: remark || null,
            items: transferItems,
          }),
        });
        const createResult = await createRes.json();
        if (!createResult.success) {
          toast.error(createResult.message || ts('k_tl5ox0'));
          setSubmitting(false);
          return;
        }
        const transferId = createResult.data?.id;

        // 2. 提交调拨单（status 0→1）
        const submitRes = await authFetch('/api/warehouse/transfer', {
          method: 'PUT',
          body: JSON.stringify({ id: transferId, action: 'submit' }),
        });
        const submitResult = await submitRes.json();
        if (!submitResult.success) {
          toast.error(`调拨单已创建，但提交失败：${submitResult.message || ''}`);
          setSubmitting(false);
          return;
        }

        // 3. 调拨出库（来源仓扣减）
        const outRes = await authFetch(`/api/warehouse/transfer/${transferId}/outbound`, {
          method: 'POST',
          body: JSON.stringify({ items: transferItems }),
        });
        const outResult = await outRes.json();
        if (!outResult.success) {
          toast.error(`调拨出库失败：${outResult.message || ''}`);
          setSubmitting(false);
          return;
        }

        // 4. 调拨入库（目标仓增加）
        const inRes = await authFetch(`/api/warehouse/transfer/${transferId}/inbound`, {
          method: 'POST',
          body: JSON.stringify({ items: transferItems }),
        });
        const inResult = await inRes.json();
        if (!inResult.success) {
          toast.error(`调拨入库失败：${inResult.message || ''}（出库已完成，请手动补入库）`);
          setSubmitting(false);
          return;
        }

        const toWh = warehouses.find((w) => w.id === toWarehouseId);
        toast.success(`调拨完成：${fromWarehouseName} → ${toWh?.warehouse_name || ts('k_1cdu8hv')}，库存已同步`);
        onOpenChange(false);
        onSuccess();
      } else {
        // 普通出库流程（按仓库类型映射出库类型）
        const res = await authFetch('/api/warehouse/outbound', {
          method: 'POST',
          body: JSON.stringify({
            orderDate: today,
            warehouseId: fromWarehouseId,
            warehouseCode: wh?.warehouse_code || `W${fromWarehouseId}`,
            warehouseName: fromWarehouseName,
            outboundType,
            operatorId: operatorId || null,
            operatorName: operatorName || '',
            remark: remark || null,
            items: valid.map((it) => ({
              materialId: it.material_id,
              materialName: it.material_name,
              specification: it.material_spec,
              qty: Number(it.quantity),
              unit: it.unit || null,
              unitPrice: 0,
              batchNo: it.batch_no || null,
            })),
          }),
        });
        const result = await res.json();
        if (!result.success) {
          toast.error(result.message || ts('k_1ata65c'));
          setSubmitting(false);
          return;
        }
        const orderId = result.data?.id;
        if (orderId) {
          const cRes = await authFetch('/api/warehouse/outbound/confirm', {
            method: 'POST',
            body: JSON.stringify({
              id: orderId,
              operatorId: operatorId || null,
              operatorName: operatorName || '',
            }),
          });
          const cResult = await cRes.json();
          if (!cResult.success) {
            toast.error(`出库单已创建，但确认失败：${cResult.message || ''}`);
            setSubmitting(false);
            return;
          }
        }
        toast.success(`${outboundTypeLabel}单已创建并确认，库存已按先进先出扣减`);
        onOpenChange(false);
        onSuccess();
      }
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
          <DialogTitle>{toWarehouseId ? ts('k_ziydyv') : `${outboundTypeLabel}（先进先出）`}</DialogTitle>
          <DialogDescription>
            {toWarehouseId
              ? ts('k_153mxl')
              : ts('k_h5inpc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[62vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{ts('k_1skdlyg')}</Label>
              <div className="flex h-9 items-center rounded-md border border-muted bg-muted/50 px-3 text-sm">
                {fromWarehouseName}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{ts('k_1tel4bs')}</Label>
              <div className="flex h-9 items-center rounded-md border border-muted bg-muted/50 px-3 text-sm">
                {toWarehouseId ? ts('k_1j10cql') : outboundTypeLabel}
              </div>
            </div>
          </div>

          {/* 目标仓库：选了表示调拨，不选为普通出库 */}
          <div className="space-y-1">
            <Label>{ts('k_n80g8s')}</Label>
            <select
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value ? Number(e.target.value) : '')}
              className={inputCls}
            >
              <option value="">{ts('k_14m3xr9')}</option>
              {targetWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warehouse_name}
                  {w.warehouse_code ? `（${w.warehouse_code}）` : ''}
                </option>
              ))}
            </select>
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
            {submitting ? ts('k_1j4vco4') : toWarehouseId ? ts('k_1mh14gz') : ts('k_vsucqv')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
