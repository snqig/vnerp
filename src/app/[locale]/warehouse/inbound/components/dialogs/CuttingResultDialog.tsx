'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scissors, Eye, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { PrintLabel } from '../../types';

interface CuttingResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printLabels: PrintLabel[];
}

export function CuttingResultDialog({
  open,
  onOpenChange,
  printLabels,
}: CuttingResultDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');
  const [isGenerating, setIsGenerating] = useState(false);

  const buildLabelsHtml = async (_forPrint: boolean): Promise<string[]> => {
    return Promise.all(
      printLabels.map(async (label) => {
        const qrContent = `${label.labelNo}@001:type:CUT`;
        let qrDataUrl = '';
        try {
          qrDataUrl = await QRCode.toDataURL(qrContent, { width: 100, margin: 1 });
        } catch {
          // ignore
        }
        const isRem = label.isRemainder;
        return `
                    <div class="label-card" style="border-color: ${isRem ? '#eab308' : '#ea580c'};">
                      <div class="label-header">
                        <div class="label-title">
                          <div class="label-no">${label.labelNo}</div>
                          <div class="material-name">${label.materialName}</div>
                        </div>
                        <div class="status-badge" style="background:${isRem ? '#fef9c3' : '#ffedd5'};color:${isRem ? '#854d0e' : '#9a3412'};">${isRem ? '余料' : '分切'}</div>
                      </div>
                      <div class="label-info">
                        <div class="info-row"><span class="info-label">源标签：</span><span class="info-value">${label.sourceLabelNo}</span></div>
                        <div class="info-row"><span class="info-label">入库单号：</span><span class="info-value">${label.orderNo}</span></div>
                        <div class="info-row"><span class="info-label">${isRem ? '余料宽幅：' : '分切宽幅：'}</span><span class="info-value" style="color:${isRem ? '#eab308' : '#ea580c'};font-weight:600;">${label.cutWidth}mm</span></div>
                        <div class="info-row"><span class="info-label">规格：</span><span class="info-value">${label.specification || '-'}</span></div>
                        <div class="info-row"><span class="info-label">数量/单位：</span><span class="info-value">${label.quantity} ${label.unit}</span></div>
                        <div class="info-row"><span class="info-label">供应商：</span><span class="info-value">${label.supplier || '-'}</span></div>
                      </div>
                      <div class="qr-area">
                        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:80px;height:80px;" />` : ''}
                      </div>
                    </div>
                  `;
      })
    );
  };

  const handlePreview = async () => {
    const previewWindow = window.open('', '_blank', 'width=900,height=700');
    if (!previewWindow) {
      toast.error(t('printWindowBlocked'));
      return;
    }
    setIsGenerating(true);
    try {
      const labelsHtml = await buildLabelsHtml(false);
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>分切标签预览</title>
  <style>
    @page { size: A4; margin: 8mm; }
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 10mm; background: #f5f5f5; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 10mm; color: #333; }
    .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
    .label-card {
      border: 2px solid #ea580c; border-radius: 6px; padding: 4mm; background: #fff;
      page-break-inside: avoid; min-height: 55mm; display: flex; flex-direction: column;
    }
    .label-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; }
    .label-title { flex: 1; }
    .label-no { font-size: 13px; font-weight: bold; color: #111; }
    .material-name { font-size: 11px; font-weight: 600; color: #333; margin-top: 1mm; }
    .status-badge { font-size: 8px; font-weight: bold; padding: 1px 5px; border-radius: 8px; white-space: nowrap; margin-left: 2mm; }
    .label-info { flex: 1; }
    .info-row { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin: 0.5mm 0; }
    .info-label { color: #888; }
    .info-value { font-weight: 500; color: #333; }
    .qr-area { text-align: center; margin-top: 2mm; }
  </style>
</head>
<body>
  <h1>分切标签预览</h1>
  <div class="label-grid">
    ${labelsHtml.join('')}
  </div>
</body>
</html>`;
      previewWindow.document.write(html);
      previewWindow.document.close();
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('printWindowBlocked'));
      return;
    }
    setIsGenerating(true);
    try {
      const labelsHtml = await buildLabelsHtml(true);
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>分切标签打印</title>
  <style>
    @page { size: A4; margin: 8mm; }
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 0; }
    .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
    .label-card {
      border: 2px solid #ea580c; border-radius: 6px; padding: 4mm; background: #fff;
      page-break-inside: avoid; min-height: 55mm; display: flex; flex-direction: column;
    }
    .label-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; }
    .label-title { flex: 1; }
    .label-no { font-size: 13px; font-weight: bold; color: #111; }
    .material-name { font-size: 11px; font-weight: 600; color: #333; margin-top: 1mm; }
    .status-badge { font-size: 8px; font-weight: bold; padding: 1px 5px; border-radius: 8px; white-space: nowrap; margin-left: 2mm; }
    .label-info { flex: 1; }
    .info-row { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin: 0.5mm 0; }
    .info-label { color: #888; }
    .info-value { font-weight: 500; color: #333; }
    .qr-area { text-align: center; margin-top: 2mm; }
  </style>
</head>
<body>
  <div class="label-grid">
    ${labelsHtml.join('')}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;
      printWindow.document.write(html);
      printWindow.document.close();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto" resizable>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-orange-600" />
            {t('cuttingComplete')} - {t('qrCodeLabel')}
          </DialogTitle>
          <DialogDescription>
            {t('cuttingSuccessDesc', { count: printLabels.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {printLabels.map((label, index) => {
              const isRemainder = label.isRemainder;
              return (
                <div
                  key={label.id || index}
                  className={`border-2 rounded-lg p-3 ${isRemainder ? 'border-yellow-400 bg-yellow-50/30' : 'border-orange-300 bg-orange-50/30'}`}
                  style={{ minHeight: '200px' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {label.labelNo}
                      </h3>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                        {label.materialName}
                      </p>
                    </div>
                    <Badge
                      className={`${isRemainder ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'} text-xs shrink-0 ml-2`}
                    >
                      {isRemainder ? t('remainderMaterial') : t('cut')}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>{t('sourceLabel')}：</span>
                      <span className="font-medium">{label.sourceLabelNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('inboundNo')}：</span>
                      <span className="font-medium">{label.orderNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isRemainder ? t('remainderWidth') : t('cutWidth')}：</span>
                      <span
                        className={`font-medium ${isRemainder ? 'text-yellow-700' : 'text-orange-700'}`}
                      >
                        {label.cutWidth}mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{tc('specification')}：</span>
                      <span>{label.specification || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('qtyUnit')}：</span>
                      <span className="font-medium">
                        {label.quantity} {label.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{tc('supplier')}：</span>
                      <span>{label.supplier || '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('close')}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={handlePreview}
            disabled={isGenerating}
          >
            <Eye className="w-4 h-4" />
            {tc('preview')}
          </Button>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={handlePrint}
            disabled={isGenerating}
          >
            <Printer className="w-4 h-4" />
            {tc('print')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
