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
import type { InboundFormData, InboundRecord, Supplier, WarehouseCategory } from '../../types';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: InboundFormData;
  setFormData: React.Dispatch<React.SetStateAction<InboundFormData>>;
  currentRecord: InboundRecord | null;
  suppliers: Supplier[];
  warehouseCategories: WarehouseCategory[];
  onSuccess: () => void;
}

export function EditDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  currentRecord,
  suppliers,
  warehouseCategories,
  onSuccess,
}: EditDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const handleSubmit = async () => {
    if (!currentRecord) return;
    try {
      const response = await authFetch('/api/warehouse/inbound', {
        method: 'PUT',
        body: JSON.stringify({
          id: currentRecord.id,
          status: currentRecord.status,
          remark: formData.remark,
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
                    .filter((s: any) => s.status !== 0 && s.status !== 'inactive')
                    .map((s: any) => (
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
                  {warehouseCategories
                    .filter((wh: any) => wh.status !== 0)
                    .map((wh: any) => (
                      <SelectItem key={wh.id} value={wh.name}>
                        {wh.name}
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
