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
import { Textarea } from '@/components/ui/textarea';
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
import type { InboundFormData, WarehouseCategory } from '../../types';
import { INITIAL_FORM_DATA } from '../../types';

interface MixedAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: InboundFormData;
  setFormData: React.Dispatch<React.SetStateAction<InboundFormData>>;
  warehouseCategories: WarehouseCategory[];
  onSuccess: () => void;
}

export function MixedAddDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  warehouseCategories,
  onSuccess,
}: MixedAddDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const resetForm = () => setFormData({ ...INITIAL_FORM_DATA });

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.materialName || !formData.quantity) {
      toast.error(t('materialNameRequired'));
      return;
    }
    try {
      const response = await authFetch('/api/warehouse/inbound', {
        method: 'POST',
        body: JSON.stringify({
          warehouse_id: formData.warehouse || null,
          supplier_name: formData.supplier,
          inbound_date: new Date().toISOString().split('T')[0],
          remark: formData.remark,
          items: [
            {
              material_id: formData.materialCode || 0,
              material_name: formData.materialName,
              material_spec: formData.specification,
              batch_no: formData.batchNo,
              quantity: parseFloat(formData.quantity),
              unit: formData.unit || '卷',
              unit_price: 0,
              warehouse_location: '',
              color_code: formData.colorCode,
              machine_no: formData.machineNo,
              width: formData.width,
              mixed_material_remark: formData.mixedMaterialRemark,
            },
          ],
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('mixedInboundCreated'));
        onOpenChange(false);
        resetForm();
        onSuccess();
      } else {
        toast.error(result.message || t('createMixedInboundFailed'));
      }
    } catch {
      toast.error(t('createMixedInboundFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
        <DialogHeader>
          <DialogTitle>{t('mixedMaterialAdd')}</DialogTitle>
          <DialogDescription>{t('enterMixedInboundInfo')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mixed-materialCode">{tc('materialCode')}</Label>
              <Input
                id="mixed-materialCode"
                value={formData.materialCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, materialCode: e.target.value }))}
                placeholder={t('enterMaterialCode')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixed-materialName">{tc('materialName')}</Label>
              <Input
                id="mixed-materialName"
                value={formData.materialName}
                onChange={(e) => setFormData((prev) => ({ ...prev, materialName: e.target.value }))}
                placeholder={t('enterMaterialName')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mixed-specification">{tc('specification')}</Label>
              <Input
                id="mixed-specification"
                value={formData.specification}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, specification: e.target.value }))
                }
                placeholder={t('specExample2')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixed-quantity">{tc('quantity')}</Label>
              <Input
                id="mixed-quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder={t('enterQuantity')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mixed-colorCode">{t('colorCode')}</Label>
              <Input
                id="mixed-colorCode"
                value={formData.colorCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, colorCode: e.target.value }))}
                placeholder={t('enterColorCode')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixed-machineNo">{t('machineNo')}</Label>
              <Input
                id="mixed-machineNo"
                value={formData.machineNo}
                onChange={(e) => setFormData((prev) => ({ ...prev, machineNo: e.target.value }))}
                placeholder={t('enterMachineNo')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mixed-width">{t('width')}</Label>
              <Input
                id="mixed-width"
                value={formData.width}
                onChange={(e) => setFormData((prev) => ({ ...prev, width: e.target.value }))}
                placeholder={t('enterWidth')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixed-warehouse">{tc('warehouse')}</Label>
              <Select
                value={formData.warehouse}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, warehouse: value }))}
              >
                <SelectTrigger id="mixed-warehouse">
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
            <Label htmlFor="mixed-mixedMaterialRemark">{t('mixedMaterialRemark')}</Label>
            <Textarea
              id="mixed-mixedMaterialRemark"
              value={formData.mixedMaterialRemark}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, mixedMaterialRemark: e.target.value }))
              }
              placeholder={t('mixedMaterialRemarkPlaceholder')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mixed-remark">{tc('remark')}</Label>
            <Input
              id="mixed-remark"
              value={formData.remark}
              onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
              placeholder={t('remarkPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit}>{t('confirmInbound')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
