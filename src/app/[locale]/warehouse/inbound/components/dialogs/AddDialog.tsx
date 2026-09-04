'use client';

import { useEffect, useState } from 'react';
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
import { RefreshCw, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { CurrencySelect } from '@/components/ui/currency-select';
import type { InboundFormData, Supplier, PurchaseOrder } from '../../types';
import { INITIAL_FORM_DATA } from '../../types';

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: InboundFormData;
  setFormData: React.Dispatch<React.SetStateAction<InboundFormData>>;
  suppliers: Supplier[];
  poSearchResults: PurchaseOrder[];
  poSearchLoading: boolean;
  poDropdownVisible: boolean;
  setPoDropdownVisible: React.Dispatch<React.SetStateAction<boolean>>;
  handlePoSearchChange: (value: string) => void;
  handlePoSelect: (po: Loose) => void;
  handlePoLineSelect: (po: Loose, line: Loose) => void;
  handlePoToggleExpand: (poId: number) => void;
  expandedPoId: number | null;
  onSuccess: () => void;
}

export function AddDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  suppliers,
  poSearchResults,
  poSearchLoading,
  poDropdownVisible,
  setPoDropdownVisible,
  handlePoSearchChange,
  handlePoSelect,
  handlePoLineSelect,
  handlePoToggleExpand,
  expandedPoId,
  onSuccess,
}: AddDialogProps) {
  const ts = useTranslations('Warehouse');
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  // 创建成功后由后端返回并展示的入库单号
  const [createdOrderNo, setCreatedOrderNo] = useState<string | null>(null);

  // 对话框重新打开/关闭时清除已生成的单号，避免残留
  useEffect(() => {
    if (!open) setCreatedOrderNo(null);
  }, [open]);

  const resetForm = () => setFormData({ ...INITIAL_FORM_DATA });

  const handleFinish = () => {
    setCreatedOrderNo(null);
    resetForm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.materialName || !formData.quantity) {
      toast.error(t('materialNameRequired'));
      return;
    }
    if (!formData.warehouse) {
      toast.error(t('selectWarehouse'));
      return;
    }
    try {
      const quantity = parseFloat(formData.quantity);
      const unitPrice = formData.unitPrice ?? 0;

      // 从采购订单入库：走 from-po API，携带 po_id 和 line_no 关联
      if (formData.poId && formData.lineNo) {
        const response = await authFetch('/api/warehouse/inbound/from-po', {
          method: 'POST',
          body: JSON.stringify({
            po_id: formData.poId,
            warehouse_id: formData.warehouse ? Number(formData.warehouse) : null,
            items: [
              {
                line_no: formData.lineNo,
                material_id: formData.materialId,
                material_code: formData.materialCode,
                material_name: formData.materialName,
                material_spec: formData.specification,
                unit: formData.unit || ts('k_1v8rak6'),
                batch_no: formData.batchNo,
                quantity,
                unit_price: unitPrice,
              },
            ],
          }),
        });
        const result = await response.json();
        if (result.success) {
          setCreatedOrderNo(result.data?.order_no || result.data?.orderNo || null);
          toast.success(t('inboundOrderCreated'));
          onSuccess();
        } else {
          toast.error(result.message || t('createInboundFailed'));
        }
        return;
      }

      // 普通入库（无 PO 关联）
      const response = await authFetch('/api/warehouse/inbound', {
        method: 'POST',
        body: JSON.stringify({
          warehouse_id: formData.warehouse ? Number(formData.warehouse) : null,
          supplier_name: formData.supplier,
          inbound_date: new Date().toISOString().split('T')[0],
          currency: formData.currency,
          remark: formData.remark,
          items: [
            {
              material_id: formData.materialId || 0,
              material_name: formData.materialName,
              material_spec: formData.specification,
              batch_no: formData.batchNo,
              quantity,
              unit: formData.unit || ts('k_1v8rak6'),
              unit_price: unitPrice,
            },
          ],
        }),
      });
      const result = await response.json();
      if (result.success) {
        setCreatedOrderNo(result.data?.order_no || result.data?.orderNo || null);
        toast.success(t('inboundOrderCreated'));
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
        {createdOrderNo && (
          <div className="mb-2 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t('inboundOrderCreated')}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {t('inboundNo')}：
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-100">
                    {createdOrderNo}
                  </span>
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (createdOrderNo && navigator.clipboard) {
                    navigator.clipboard.writeText(createdOrderNo).catch(() => undefined);
                  }
                }}
              >
                {tc('copy')}
              </Button>
            </div>
          </div>
        )}
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
                  <SelectItem value={ts('k_1v8rak6')}>{t('unitRoll')}</SelectItem>
                  <SelectItem value={ts('k_accfpb')}>{t('unitSheet')}</SelectItem>
                  <SelectItem value={ts('k_d5a1x9')}>{t('unitPiece')}</SelectItem>
                  <SelectItem value={ts('k_1e2x02k')}>{t('unitBox')}</SelectItem>
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
                    .filter((s: Loose) => s.status !== 0 && s.status !== 'inactive')
                    .map((s: Loose) => (
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
              <WarehouseSelect
                value={formData.warehouse}
                onChange={(warehouseId) =>
                  setFormData((prev) => ({ ...prev, warehouse: warehouseId }))
                }
                placeholder={t('selectWarehouse')}
                className="w-full"
              />
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
                  <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-80 overflow-y-auto">
                    {poSearchResults.map((po: Loose) => {
                      const isExpanded = expandedPoId === po.id;
                      const hasLines = po.lines && po.lines.length > 0;
                      return (
                        <div key={po.id} className="border-b last:border-b-0 dark:border-slate-700">
                          {/* PO 头：点击展开明细行 */}
                          <div
                            className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                            onMouseDown={() => hasLines && handlePoToggleExpand(po.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                {hasLines ? (
                                  isExpanded ? (
                                    <ChevronDown className="h-3 w-3 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-gray-400" />
                                  )
                                ) : null}
                                <span className="font-mono text-sm font-medium text-blue-600">
                                  {po.po_no}
                                </span>
                              </span>
                              <span className="text-xs text-gray-400">{po.order_date || ''}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 ml-5">
                              <span className="text-xs text-gray-500">
                                {tc('supplier')}: {po.supplier_name || '-'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {tc('quantity')}: {po.total_quantity || 0}
                              </span>
                              <span className="text-xs text-gray-500">
                                {tc('amount')}: ¥{Number(po.grand_total || 0).toFixed(2)}
                              </span>
                              {hasLines && (
                                <span className="text-xs text-blue-500">
                                  {isExpanded ? ts('k_c3apla') : `展开 ${po.lines.length} 行明细`}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* 明细行列表：展开时显示，点击具体行入库 */}
                          {isExpanded && hasLines && (
                            <div className="bg-muted/30">
                              {po.lines.map((line: Loose, idx: number) => {
                                const orderQty = Number(line.order_qty || 0);
                                const receivedQty = Number(line.received_qty || 0);
                                const remaining = orderQty - receivedQty;
                                const fullyReceived = remaining <= 0;
                                return (
                                  <div
                                    key={idx}
                                    className={`px-3 py-2 ml-5 border-l-2 border-blue-200 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-600 cursor-pointer flex items-center justify-between transition-colors ${
                                      fullyReceived ? 'opacity-50 pointer-events-none' : ''
                                    }`}
                                    onMouseDown={() => !fullyReceived && handlePoLineSelect(po, line)}
                                    title={fullyReceived ? ts('k_12r0uxt') : ts('k_n5h1r')}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Package className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                      <span className="text-sm truncate">
                                        {line.material_name || line.material_code || '-'}
                                      </span>
                                      <span className="text-xs text-gray-400 flex-shrink-0">
                                        {line.material_code || ''}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                                      <span className="text-gray-500">{tc('analysisRowsSuffix')}{line.line_no || idx + 1}</span>
                                      <span className="text-gray-500">
                                        {ts('k_1a4a885')}{orderQty}
                                        {line.unit || ''}
                                      </span>
                                      <span className="text-gray-500">
                                        {ts('k_r0v8nt')}{receivedQty}
                                      </span>
                                      <span className={fullyReceived ? 'text-red-500' : 'text-green-600 font-medium'}>
                                        {ts('k_1p58vpw')}{remaining}
                                        {line.unit || ''}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
              <Label>{tc('currency')}</Label>
              <CurrencySelect
                value={formData.currency}
                onChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          {createdOrderNo ? (
            <Button onClick={handleFinish}>{tc('complete')}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSubmit}>{t('confirmInbound')}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
