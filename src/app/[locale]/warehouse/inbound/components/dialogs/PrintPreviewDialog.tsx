'use client';

import { useState, useEffect } from 'react';
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
import { Printer, Loader2, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { PrintLabel } from '../../types';

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printLabels: PrintLabel[];
}

export function PrintPreviewDialog({ open, onOpenChange, printLabels }: PrintPreviewDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQrDataUrls({});
      return;
    }
    let cancelled = false;
    setQrLoading(true);
    (async () => {
      const map: Record<string, string> = {};
      for (const label of printLabels) {
        if (cancelled) return;
        const key = label.id || label.labelNo;
        if (map[key]) continue;
        try {
          const qrContent = `${label.labelNo || label.orderNo}@001:type:IN`;
          map[key] = await QRCode.toDataURL(qrContent, { width: 120, margin: 1 });
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) {
        setQrDataUrls(map);
        setQrLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, printLabels]);

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('printWindowBlocked'));
      return;
    }
    setIsGenerating(true);
    try {
      const labelsHtml = await Promise.all(
        printLabels.map(async (label) => {
          const qrContent = `${label.labelNo || label.orderNo}@001:type:IN`;
          let qrDataUrl = '';
          try {
            qrDataUrl = await QRCode.toDataURL(qrContent, { width: 100, margin: 1 });
          } catch {
            // ignore
          }

          return `
                    <div class="label-card">
                      <div class="label-header">
                        <div class="label-title">
                          <div class="label-no">${label.labelNo}</div>
                          <div class="material-name">${label.materialName}</div>
                        </div>
                        <div class="status-badge">已入库</div>
                      </div>
                      <div class="label-info">
                        <div class="info-row"><span class="info-label">入库单号：</span><span class="info-value">${label.orderNo}</span></div>
                        <div class="info-row"><span class="info-label">规格：</span><span class="info-value">${label.specification || '-'}</span></div>
                        <div class="info-row"><span class="info-label">数量/单位：</span><span class="info-value">${label.quantity || label.item?.quantity || 0} ${label.unit || label.item?.unit || ''}</span></div>
                        <div class="info-row"><span class="info-label">供应商：</span><span class="info-value">${label.supplier || '-'}</span></div>
                        <div class="info-row"><span class="info-label">入库时间：</span><span class="info-value">${label.inboundTime ? new Date(label.inboundTime).toLocaleString('zh-CN') : '-'}</span></div>
                      </div>
                      <div class="qr-area">
                        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:80px;height:80px;" />` : ''}
                      </div>
                    </div>
                  `;
        })
      );

      const html = `<!DOCTYPE html>
<html>
<head>
  <title>二维码标签打印</title>
  <style>
    @page { size: A4; margin: 8mm; }
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 0; }
    .label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
    .label-card {
      border: 2px solid #333; border-radius: 6px; padding: 4mm;
      page-break-inside: avoid; min-height: 55mm; display: flex; flex-direction: column;
    }
    .label-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; }
    .label-title { flex: 1; }
    .label-no { font-size: 13px; font-weight: bold; color: #111; }
    .material-name { font-size: 11px; font-weight: 600; color: #333; margin-top: 1mm; }
    .status-badge {
      background: #d1fae5; color: #065f46; font-size: 8px; font-weight: bold;
      padding: 1px 5px; border-radius: 8px; white-space: nowrap; margin-left: 2mm;
    }
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {t('qrCodeLabelPrintPreview')}
          </DialogTitle>
          <DialogDescription>{t('labelsToPrint', { count: printLabels.length })}</DialogDescription>
        </DialogHeader>
        <div id="print-area" className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {printLabels.map((label, index) => {
              return (
                <div
                  key={label.id || index}
                  className="border-2 border-gray-800 rounded-lg p-3 print-label-card"
                  style={{ minHeight: '180px' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                        {label.labelNo}
                      </h3>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">
                        {label.materialName}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs shrink-0 ml-2">
                      {tc('stockedIn')}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>{t('inboundNo')}：</span>
                      <span className="font-medium">{label.orderNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{tc('specification')}：</span>
                      <span>{label.specification || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('qtyUnit')}：</span>
                      <span className="font-medium">
                        {label.quantity || label.item?.quantity || 0}{' '}
                        {label.unit || label.item?.unit || ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{tc('supplier')}：</span>
                      <span>{label.supplier || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('inboundTime')}：</span>
                      <span>
                        {label.inboundTime
                          ? new Date(label.inboundTime).toLocaleString('zh-CN')
                          : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-center">
                    {qrLoading ? (
                      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    ) : qrDataUrls[label.id || label.labelNo] ? (
                      <img
                        src={qrDataUrls[label.id || label.labelNo]}
                        alt="QR"
                        className="w-16 h-16"
                      />
                    ) : (
                      <QrCode className="h-12 w-12 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
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
