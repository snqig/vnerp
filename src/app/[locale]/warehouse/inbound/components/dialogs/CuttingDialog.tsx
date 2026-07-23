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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Scissors, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PrintLabel, CuttingFormData } from '../../types';
import { parseSpecWidth, calcCutSpec } from '../../types';

interface CuttingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuttingForm: CuttingFormData;
  setCuttingForm: React.Dispatch<React.SetStateAction<CuttingFormData>>;
  currentLabel: PrintLabel | null;
  onCutting: () => Promise<void>;
}

export function CuttingDialog({
  open,
  onOpenChange,
  cuttingForm,
  setCuttingForm,
  currentLabel,
  onCutting,
}: CuttingDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" resizable>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            {t('materialCutting')}
          </DialogTitle>
          <DialogDescription>{t('cuttingDesc')}</DialogDescription>
        </DialogHeader>
        {currentLabel &&
          (() => {
            const specWidth = parseSpecWidth(
              currentLabel.material_spec || currentLabel.specification || ''
            );
            return (
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{t('sourceLabelInfo')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">{t('labelNo')}：</span>
                      <span className="font-medium">
                        {currentLabel.order_no || currentLabel.labelNo}-
                        {(currentLabel.item?.idx ?? currentLabel.itemIdx ?? 0) + 1}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{tc('materialName')}：</span>
                      <span className="font-medium">
                        {currentLabel.material_name || currentLabel.materialName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('originalSpec')}：</span>
                      <span className="font-medium">
                        {currentLabel.material_spec || currentLabel.specification || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('originalWidth')}：</span>
                      <span className="font-medium">
                        {specWidth ? `${specWidth}mm` : t('notParsed')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{tc('quantity')}：</span>
                      <span className="font-medium">
                        {currentLabel.quantity || currentLabel.item?.quantity || 0}{' '}
                        {currentLabel.unit || currentLabel.item?.unit || ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{tc('supplier')}：</span>
                      <span className="font-medium">
                        {currentLabel.supplier_name || currentLabel.supplier || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('cutWidthMM')}</Label>
                  <Input
                    placeholder={t('cutWidthPlaceholder')}
                    value={cuttingForm.cutWidths}
                    onChange={(e) =>
                      setCuttingForm((prev) => ({ ...prev, cutWidths: e.target.value }))
                    }
                  />
                  <p className="text-xs text-gray-500">{t('cutWidthHint')}</p>
                </div>

                {cuttingForm.cutWidths &&
                  specWidth &&
                  (() => {
                    const widths = cuttingForm.cutWidths
                      .split('+')
                      .map((w) => parseFloat(w.trim()))
                      .filter((w) => !isNaN(w) && w > 0);
                    const totalWidth = widths.reduce((s, w) => s + w, 0);
                    const remainWidth = specWidth - totalWidth;
                    const isValid = totalWidth <= specWidth && widths.length > 0;
                    return (
                      <div
                        className={`rounded-lg p-4 space-y-3 ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{t('cutPreview')}</span>
                          {isValid ? (
                            <Badge className="bg-green-100 text-green-700">{tc('valid')}</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">{t('widthExceeded')}</Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          {widths.map((w, i) => {
                            const cutSpec = calcCutSpec(
                              currentLabel.material_spec || currentLabel.specification || '',
                              w
                            );
                            const cutQty =
                              specWidth > 0
                                ? Math.round(
                                    (currentLabel.quantity || currentLabel.item?.quantity || 0) *
                                      (w / specWidth) *
                                      100
                                  ) / 100
                                : 0;
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between text-sm bg-card rounded px-3 py-2"
                              >
                                <span>
                                  {t('cutNum', { num: i + 1 })}：{w}mm
                                </span>
                                <span className="text-gray-600">
                                  {tc('specification')}：{cutSpec} / {tc('quantity')}：{cutQty}{' '}
                                  {currentLabel.unit || currentLabel.item?.unit || ''}
                                </span>
                              </div>
                            );
                          })}
                          {remainWidth > 0 &&
                            (() => {
                              const remSpec = calcCutSpec(
                                currentLabel.material_spec || currentLabel.specification || '',
                                remainWidth
                              );
                              const remQty =
                                specWidth > 0
                                  ? Math.round(
                                      (currentLabel.quantity || currentLabel.item?.quantity || 0) *
                                        (remainWidth / specWidth) *
                                        100
                                    ) / 100
                                  : 0;
                              return (
                                <div className="flex items-center justify-between text-sm bg-yellow-50 rounded px-3 py-2 border border-yellow-200">
                                  <span>
                                    {t('remainderMaterial')}：{remainWidth}mm
                                  </span>
                                  <span className="text-yellow-700">
                                    {tc('specification')}：{remSpec} / {tc('quantity')}：{remQty}{' '}
                                    {currentLabel.unit || currentLabel.item?.unit || ''}
                                  </span>
                                </div>
                              );
                            })()}
                        </div>
                        <div className="text-xs text-gray-500 flex justify-between">
                          <span>
                            {t('originalWidth')}：{specWidth}mm
                          </span>
                          <span>
                            {t('cutTotal')}：{totalWidth}mm{' '}
                            {remainWidth >= 0
                              ? `| ${t('remainderMaterial')}：${remainWidth}mm`
                              : `| ${t('exceeded')}：${Math.abs(remainWidth)}mm`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                <div className="space-y-2">
                  <Label>{t('operator')}</Label>
                  <Input value={cuttingForm.operatorName} disabled />
                </div>
                <div className="space-y-2">
                  <Label>{tc('remark')}</Label>
                  <Textarea
                    placeholder={t('cuttingRemarkPlaceholder')}
                    value={cuttingForm.remark}
                    onChange={(e) =>
                      setCuttingForm((prev) => ({ ...prev, remark: e.target.value }))
                    }
                  />
                </div>
              </div>
            );
          })()}
        {!currentLabel && (
          <div className="py-8 text-center text-muted-foreground">
            <Scissors className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('cuttingNoLabelSelected')}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={onCutting} className="bg-blue-600 hover:bg-blue-700">
            <Scissors className="w-4 h-4 mr-1" />
            {t('confirmCut')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
