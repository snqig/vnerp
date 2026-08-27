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

interface PO {
  id: number;
  po_no: string;
  supplier_id: number;
  supplier_name: string;
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

export function PurchaseReturnDialog({
  open,
  onOpenChange,
  sourceRecords,
  warehouses,
  operatorId,
  operatorName,
  onSuccess,
}: Props) {
  const fromWarehouseId = sourceRecords[0]?.warehouse_id;
  const fromWarehouseName =
    warehouses.find((w) => w.id === fromWarehouseId)?.warehouse_name ||
    `仓库#${fromWarehouseId || '-'}`;

  const aggregated = useMemo<AggItem[]>(
    () => aggregateInboundItems(sourceRecords),
    [sourceRecords]
  );

  const [items, setItems] = useState<AggItem[]>([]);
  const [reason, setReason] = useState('');
  const [po, setPo] = useState<PO | null>(null);
  const [poLookupMsg, setPoLookupMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 校验：所选入库单必须同来源采购单（source_order_id）+ 同仓库
  const consistency = useMemo(() => {
    if (sourceRecords.length === 0) return { ok: false, message: '未选择入库单' };
    const first = sourceRecords[0];
    const so = first.source_order_id ?? null;
    if (!so) {
      return { ok: false, message: '该入库单不是采购入库（无来源采购单），无法发起采购退料' };
    }
    const sameSO = sourceRecords.every((r) => (r.source_order_id ?? null) === so);
    if (!sameSO) return { ok: false, message: '所选入库单的来源采购单不一致' };
    const sameWh = sourceRecords.every((r) => r.warehouse_id === first.warehouse_id);
    if (!sameWh) return { ok: false, message: '所选入库单的仓库不一致' };
    return { ok: true, sourceOrderId: so as number };
  }, [sourceRecords]);

  useEffect(() => {
    if (open) {
      setItems(aggregated.map((a) => ({ ...a })));
      setReason('');
      setPo(null);
      setPoLookupMsg('');
      if (consistency.ok) {
        const soId = (consistency as { sourceOrderId: number }).sourceOrderId;
        authFetch(`/api/purchase/orders/${soId}`)
          .then((r) => r.json())
          .then((res) => {
            if (res?.success && res?.data?.id) {
              setPo({
                id: res.data.id,
                po_no: res.data.po_no,
                supplier_id: res.data.supplier_id,
                supplier_name: res.data.supplier_name,
              });
            } else {
              setPoLookupMsg(`未找到采购单 #${soId}，无法发起退货`);
            }
          })
          .catch(() => setPoLookupMsg('采购单查询失败'));
      }
    }
  }, [open, aggregated, consistency]);

  const updateQty = (idx: number, qty: number) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)));

  const canSubmit = consistency.ok && po !== null && poLookupMsg === '' && reason.trim().length > 0;

  const handleConfirm = async () => {
    if (!canSubmit || !fromWarehouseId || !po) {
      toast.error(poLookupMsg || '请先填写退货原因并确认采购单');
      return;
    }
    const valid = items.filter((it) => it.material_id && Number(it.quantity) > 0);
    if (valid.length === 0) {
      toast.error('请至少填写一项有效数量');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/purchase/return', {
        method: 'POST',
        body: JSON.stringify({
          order_id: po.id,
          order_no: po.po_no,
          supplier_id: po.supplier_id,
          supplier_name: po.supplier_name,
          warehouse_id: fromWarehouseId,
          reason: reason.trim(),
          remark: `从入库单 ${sourceRecords.map((r) => r.inbound_no || r.order_no).join(',')} 发起采购退料`,
          items: valid.map((it) => ({
            material_id: it.material_id,
            material_code: it.material_code,
            material_name: it.material_name,
            material_spec: it.material_spec || '',
            unit: it.unit || '件',
            quantity: Number(it.quantity),
            unit_price: Number(it.unitPrice) || 0,
            batch_no: it.batch_no || '',
            reason: reason.trim(),
            remark: '',
          })),
        }),
      });
      const result = await res.json();
      if (!result.success) {
        toast.error(result.message || '创建采购退货单失败');
        setSubmitting(false);
        return;
      }
      const returnId = result.data?.id;
      // 实际库存扣减在采购退货模块「完成」时生成出库单并确认；此处仅建单+审核，
      // 把重活留给采购退货模块（与调拨/出库保持一致）
      if (returnId) {
        const aRes = await authFetch('/api/purchase/return', {
          method: 'PUT',
          body: JSON.stringify({ id: returnId, action: 'approve' }),
        });
        const aResult = await aRes.json();
        if (!aResult.success) {
          toast.error(`退货单已创建，但审核失败：${aResult.message || ''}`);
          setSubmitting(false);
          return;
        }
      }
      toast.success('采购退货单已创建并审核，可在采购退货模块完成出库扣减');
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
          <DialogTitle>采购退料（退供应商）</DialogTitle>
          <DialogDescription>
            把物料退回供应商，库存将在采购退货模块「完成」时扣减。仅支持来源为采购单的入库单。
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
              <Label>来源采购单</Label>
              <div className="flex h-9 items-center rounded-md border border-muted bg-muted/50 px-3 text-sm">
                {consistency.ok ? (po ? `${po.po_no}（${po.supplier_name}）` : '查询中…') : poLookupMsg || '—'}
              </div>
            </div>
          </div>

          {!consistency.ok && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {consistency.message}
            </div>
          )}
          {consistency.ok && poLookupMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {poLookupMsg}
            </div>
          )}

          <OutboundItemsEditor items={items} onQtyChange={updateQty} />

          <div className="space-y-1">
            <Label>
              退货原因 <span className="text-red-500">*</span>
            </Label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="必填，如 质量不合格 / 多送 / 规格不符"
              className={inputCls}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || !canSubmit}>
            {submitting ? '处理中...' : '创建并审核退货'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
