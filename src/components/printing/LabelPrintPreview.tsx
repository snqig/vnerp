'use client';

import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';

export interface LabelData {
  id?: string;
  qrCode?: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  batchNo?: string;
  quantity?: number;
  unit?: string;
  warehouseName?: string;
  supplierName?: string;
  labelNo?: string;
  [key: string]: Loose;
}

export interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'inch';
}

export const PRESET_TEMPLATES: Record<string, LabelTemplate> = {
  '60x40': { id: '60x40', name: '60mm x 40mm', width: 60, height: 40, unit: 'mm' },
  '80x50': { id: '80x50', name: '80mm x 50mm', width: 80, height: 50, unit: 'mm' },
};

const SingleLabel: React.FC<{
  data: LabelData;
  template: LabelTemplate;
}> = ({ data, template }) => {
  const t = useTranslations('QRCode');
  const tc = useTranslations('Common');
  const widthUnit = template.unit === 'mm' ? 'mm' : 'in';
  const style: React.CSSProperties = {
    width: `${template.width}${widthUnit}`,
    height: `${template.height}${widthUnit}`,
    border: '1px solid #ddd',
    padding: '6px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '10px',
    fontFamily: 'Arial, sans-serif',
  };

  return (
    <div style={style} className="bg-white">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #eee',
          paddingBottom: '4px',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{t('labelMaterial')}</span>
        <span style={{ fontSize: '8px', color: '#666' }}>{data.labelNo}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
        {/* 二维码占位 */}
        <div
          style={{
            width: '30%',
            minWidth: '28mm',
            border: '1px dashed #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            color: '#999',
          }}
        >
          <div className="text-center">
            <div>{tc('qrCode')}</div>
            <div style={{ wordBreak: 'break-all', fontSize: '6px', marginTop: '2px' }}>
              {data.qrCode || 'QR'}
            </div>
          </div>
        </div>
        {/* 内容 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {data.materialCode && (
            <div>
              <span style={{ fontWeight: 'bold' }}>{t('materialCode')}:</span> {data.materialCode}
            </div>
          )}
          {data.materialName && (
            <div>
              <span style={{ fontWeight: 'bold' }}>{t('materialName')}:</span> {data.materialName}
            </div>
          )}
          {data.batchNo && (
            <div>
              <span style={{ fontWeight: 'bold' }}>{tc('batch')}:</span> {data.batchNo}
            </div>
          )}
          {data.quantity && (
            <div>
              <span style={{ fontWeight: 'bold' }}>{tc('quantity')}:</span> {data.quantity}
              {data.unit || ''}
            </div>
          )}
          {data.warehouseName && (
            <div>
              <span style={{ fontWeight: 'bold' }}>{tc('warehouse')}:</span> {data.warehouseName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LabelPrintPreview: React.FC<{
  labels: LabelData[];
  onClose?: () => void;
  defaultTemplate?: string;
}> = ({ labels, onClose, defaultTemplate = '60x40' }) => {
  const t = useTranslations('QRCode');
  const tc = useTranslations('Common');
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>(
    PRESET_TEMPLATES[defaultTemplate] || PRESET_TEMPLATES['60x40']
  );
  const [copies, setCopies] = useState(1);
  const [zoom, setZoom] = useState(1);
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: t('labelMaterialPrint'),
  });

  const printLabels = React.useMemo(() => {
    const ctx = { module: 'qrcode', action: 'build_print_labels' };
    logger.debug(ctx, '构建打印标签列表', {
      labelsCount: labels.length,
      copies,
    });
    return labels.flatMap((label) => new Array(copies).fill(label));
  }, [labels, copies]);

  const onPrintClick = () => {
    const ctx = { module: 'qrcode', action: 'preview_print' };
    logger.stepStart(ctx, 'handlePrint', {
      templateId: selectedTemplate.id,
      labelsCount: labels.length,
      copies,
      zoom,
    });
    try {
      handlePrint();
      logger.stepEnd(ctx, 'handlePrint', { status: 'triggered' });
    } catch (error) {
      logger.error(ctx, '触发打印异常', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  return (
    <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>{t('labelPrintPreview')}</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>{t('template')}</Label>
              <Select
                value={selectedTemplate.id}
                onValueChange={(v) =>
                  setSelectedTemplate(PRESET_TEMPLATES[v] || PRESET_TEMPLATES['60x40'])
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PRESET_TEMPLATES).map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>{t('copies')}</Label>
              <Input
                type="number"
                min="1"
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                className="w-16"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((p) => Math.max(0.5, p - 0.25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span>{(zoom * 100).toFixed(0)}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((p) => Math.min(3, p + 0.25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-auto bg-gray-100 p-6">
        <div
          ref={componentRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            backgroundColor: '#fff',
            padding: '16px',
            border: '1px dashed #ccc',
          }}
        >
          {printLabels.map((label, idx) => (
            <SingleLabel key={`${label.id}-${idx}`} data={label} template={selectedTemplate} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {t('totalLabelsCount', { labels: labels.length, copies, total: printLabels.length })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button onClick={onPrintClick} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            {tc('print')}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
};

export const LabelPrintTrigger: React.FC<{
  labels: LabelData[];
  children?: React.ReactNode;
  defaultTemplate?: string;
}> = ({ labels, children, defaultTemplate = '60x40' }) => {
  const tc = useTranslations('Common');
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="flex items-center gap-2">
            <Printer className="h-4 w-4" /> {tc('print')}
          </Button>
        )}
      </DialogTrigger>
      <LabelPrintPreview
        labels={labels}
        onClose={() => setOpen(false)}
        defaultTemplate={defaultTemplate}
      />
    </Dialog>
  );
};
