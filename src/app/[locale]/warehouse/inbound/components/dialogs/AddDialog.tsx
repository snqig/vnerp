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
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import type { InboundFormData, Supplier, WarehouseCategory, PurchaseOrder } from '../../types';
import { INITIAL_FORM_DATA } from '../../types';

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: InboundFormData;
  setFormData: React.Dispatch<React.SetStateAction<InboundFormData>>;
  suppliers: Supplier[];
  warehouseCategories: WarehouseCategory[];
  poSearchResults: PurchaseOrder[];
  poSearchLoading: boolean;
  poDropdownVisible: boolean;
  setPoDropdownVisible: React.Dispatch<React.SetStateAction<boolean>>;
  handlePoSearchChange: (value: string) => void;
  handlePoSelect: (po: any) => void;
  onSuccess: () => void;
}

export function AddDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  suppliers,
  warehouseCategories,
  poSearchResults,
  poSearchLoading,
  poDropdownVisible,
  setPoDropdownVisible,
  handlePoSearchChange,
  handlePoSelect,
  onSuccess,
}: AddDialogProps) {
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
            },
          ],
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('inboundOrderCreated'));
        onOpenChange(false);
        resetForm();
        onSuccess();
      } else {
        toast.error(result.message || t('createInboundFailed'));
      }
    } catch {
      toast.error(t('createInboundFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
        <DialogHeader>
          <DialogTitle>{t('addInboundOrder')}</DialogTitle>
          <DialogDescription>{t('enterInboundInfo')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-materialCode">{tc('materialCode')}</Label>
              <Input
                id="add-materialCode"
                value={formData.materialCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, materialCode: e.target.value }))}
                placeholder={t('enterMaterialCode')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-materialName">{tc('materialName')}</Label>
              <Input
                id="add-materialName"
                value={formData.materialName}
                onChange={(e) => setFormData((prev) => ({ ...prev, materialName: e.target.value }))}
                placeholder={t('enterMaterialName')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-specification">{tc('specification')}</Label>
              <Input
                id="add-specification"
                value={formData.specification}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, specification: e.target.value }))
                }
                placeholder={t('specExample2')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-quantity">{tc('quantity')}</Label>
              <Input
                id="add-quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder={t('enterQuantity')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-unit">{tc('unit')}</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
              >
                <SelectTrigger id="add-unit">
                  <SelectValue placeholder={t('selectUnit')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="卷">{t('unitRoll')}</SelectItem>
                  <SelectItem value="张">{t('unitSheet')}</SelectItem>
                  <SelectItem value="个">{t('unitPiece')}</SelectItem>
                  <SelectItem value="箱">{t('unitBox')}</SelectItem>
                  <SelectItem value="kg">{t('unitKg')}</SelectItem>
                  <SelectItem value="㎡">{t('unitSqm')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-supplier">{tc('supplier')}</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, supplier: value }))}
              >
                <SelectTrigger id="add-supplier">
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-warehouse">{tc('warehouse')}</Label>
              <Select
                value={formData.warehouse}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, warehouse: value }))}
              >
                <SelectTrigger id="add-warehouse">
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
            <div className="space-y-2">
              <Label htmlFor="add-purchaseOrderNo">{t('purchaseOrderNo')}</Label>
              <div className="relative">
                <Input
                  id="add-purchaseOrderNo"
                  value={formData.purchaseOrderNo}
                  onChange={(e) => handlePoSearchChange(e.target.value)}
                  onFocus={() => {
                    if (poSearchResults.length > 0) setPoDropdownVisible(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setPoDropdownVisible(false), 200);
                  }}
                  placeholder={t('searchPurchaseOrderNo')}
                  autoComplete="off"
                />
                {poSearchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
                {poDropdownVisible && poSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {poSearchResults.map((po: any) => (
                      <div
                        key={po.id}
                        className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-b-0 transition-colors dark:border-slate-700"
                        onMouseDown={() => handlePoSelect(po)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-medium text-blue-600">
                            {po.po_no}
                          </span>
                          <span className="text-xs text-gray-400">{po.order_date || ''}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {tc('supplier')}: {po.supplier_name || '-'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {tc('quantity')}: {po.total_quantity || 0}
                          </span>
                          <span className="text-xs text-gray-500">
                            {tc('amount')}: ¥{Number(po.grand_total || 0).toFixed(2)}
                          </span>
                        </div>
                        {po.lines && po.lines.length > 0 && (
                          <div className="mt-1 text-xs text-gray-400">
                            {po.lines.slice(0, 2).map((line: any, idx: number) => (
                              <span key={idx} className="mr-2">
                                {line.material_name || line.material_code}
                                {line.order_qty ? ` ×${line.order_qty}${line.unit || ''}` : ''}
                              </span>
                            ))}
                            {po.lines.length > 2 && (
                              <span>{t('andMoreItems', { count: po.lines.length })}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-batchNo">{tc('batchNo')}</Label>
              <Input
                id="add-batchNo"
                value={formData.batchNo}
                onChange={(e) => setFormData((prev) => ({ ...prev, batchNo: e.target.value }))}
                placeholder={t('enterBatchNo')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-remark">{tc('remark')}</Label>
              <Input
                id="add-remark"
                value={formData.remark}
                onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder={t('remarkPlaceholder')}
              />
            </div>
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
