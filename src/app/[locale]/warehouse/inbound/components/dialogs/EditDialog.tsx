'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import type { InboundFormData, InboundRecord, InboundItem, Supplier, Warehouse } from '../../types';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: InboundFormData;
  setFormData: React.Dispatch<React.SetStateAction<InboundFormData>>;
  currentRecord: InboundRecord | null;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  onSuccess: () => void;
}

export function EditDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  currentRecord,
  suppliers,
  warehouses,
  onSuccess,
}: EditDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const handleSubmit = async () => {
    if (!currentRecord) return;
    try {
      if (!formData.materialName || !formData.quantity) {
        toast.error(t('materialNameRequired'));
        return;
      }
      if (!formData.warehouse) {
        toast.error(t('selectWarehouse'));
        return;
      }

      // 以记录原始明细为基底（保留未在前端表单中编辑的字段），仅首行用表单覆盖可编辑字段。
      // 多行入库单不会被误删：后端 updateOrderContent 会整体替换明细，故必须回传全部行。
      const baseItems: InboundItem[] =
        currentRecord.items && currentRecord.items.length
          ? currentRecord.items
          : [
              {
                material_id: currentRecord.material_id,
                material_name: currentRecord.material_name,
                material_code: currentRecord.material_code,
                material_spec: currentRecord.specification,
                specification: currentRecord.specification,
                quantity: currentRecord.quantity,
                unit: currentRecord.unit,
                unit_price: 0,
                total_price: 0,
                location: '',
                batch_no: '',
                remark: '',
              },
            ];

      const items = baseItems.map((it, idx) => {
        const editable = idx === 0 ? formData : null;
        return {
          material_id: editable?.materialId ?? it.material_id ?? 0,
          material_code: editable?.materialCode || it.material_code || '',
          material_name: (editable?.materialName || it.material_name) as string,
          material_spec: editable?.specification || it.material_spec || '',
          batch_no: editable?.batchNo || it.batch_no || '',
          quantity: parseFloat(editable?.quantity || String(it.quantity ?? '0')),
          // unit / unit_price 表单无对应输入，必须从原记录保留
          unit: it.unit || '件',
          unit_price: editable?.unitPrice ?? it.unit_price ?? 0,
        };
      });

      const response = await authFetch('/api/warehouse/inbound', {
        method: 'PUT',
        body: JSON.stringify({
          id: currentRecord.id,
          action: 'update',
          // supplier_name / currency / inbound_date 未在编辑表单中提供时，从原记录保留
          supplier_name: formData.supplier || currentRecord.supplier_name || null,
          warehouse_id: Number(formData.warehouse),
          inbound_date: currentRecord.inbound_date || new Date().toISOString().split('T')[0],
          currency: currentRecord.currency || formData.currency || 'CNY',
          remark: formData.remark || null,
          items,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('updateSuccess'));
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message || t('updateFailed'));
      }
    } catch {
      toast.error(t('updateFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
        <DialogHeader>
          <DialogTitle>{t('editInboundOrder')}</DialogTitle>
          <DialogDescription>{t('editInboundOrderDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tc('materialCode')}</Label>
              <Input
                value={formData.materialCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, materialCode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('materialName')}</Label>
              <Input
                value={formData.materialName}
                onChange={(e) => setFormData((prev) => ({ ...prev, materialName: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tc('specification')}</Label>
              <Input
                value={formData.specification}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, specification: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('quantity')}</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tc('supplier')}</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, supplier: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSupplier')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter((s: Loose) => s.status !== 0 && s.status !== 'inactive')
                    .map((s: Loose) => (
                      <SelectItem key={s.id} value={s.name || s.supplier_name}>
                        {s.name || s.supplier_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tc('warehouse')}</Label>
              <Select
                value={formData.warehouse}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, warehouse: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectWarehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((wh: Loose) => wh.status !== 0 && wh.status !== 'inactive')
                    .map((wh: Loose) => (
                      <SelectItem key={wh.id} value={String(wh.id)}>
                        {wh.warehouse_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tc('remark')}</Label>
            <Input
              value={formData.remark}
              onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit}>{tc('save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
