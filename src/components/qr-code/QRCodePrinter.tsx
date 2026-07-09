'use client';

import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';

type LabelType = 'material' | 'small' | 'finished' | 'shipping' | 'workorder' | 'ink';

interface LabelTemplate {
  type: LabelType;
  nameKey: string;
  width: number;
  height: number;
  fields: string[];
}

const labelTemplates: LabelTemplate[] = [
  {
    type: 'material',
    nameKey: 'labelMaterial',
    width: 60,
    height: 40,
    fields: ['qrCode', 'materialName', 'batchNo', 'quantity', 'unit', 'supplier'],
  },
  {
    type: 'small',
    nameKey: 'labelSmall',
    width: 50,
    height: 30,
    fields: ['qrCode', 'materialName', 'quantity', 'parentBatch'],
  },
  {
    type: 'finished',
    nameKey: 'labelFinished',
    width: 80,
    height: 60,
    fields: ['qrCode', 'productName', 'workOrderNo', 'quantity', 'date', 'quality'],
  },
  {
    type: 'shipping',
    nameKey: 'labelShipping',
    width: 100,
    height: 80,
    fields: ['qrCode', 'orderNo', 'customerName', 'quantity', 'address', 'date'],
  },
  {
    type: 'workorder',
    nameKey: 'labelWorkorder',
    width: 100,
    height: 80,
    fields: ['qrCode', 'workOrderNo', 'productName', 'quantity', 'processFlow', 'planDate'],
  },
  {
    type: 'ink',
    nameKey: 'labelInk',
    width: 60,
    height: 40,
    fields: ['qrCode', 'inkName', 'batchNo', 'quantity', 'color', 'expiryDate'],
  },
];

interface PrintData {
  materialName?: string;
  batchNo?: string;
  quantity?: number;
  unit?: string;
  supplier?: string;
  productName?: string;
  workOrderNo?: string;
  date?: string;
  quality?: string;
  customerName?: string;
  orderNo?: string;
  address?: string;
  inkName?: string;
  color?: string;
  expiryDate?: string;
  parentBatch?: string;
  processFlow?: string;
  planDate?: string;
}

interface QRCodePrinterProps {
  qrCode: string;
  labelType?: LabelType;
  printData?: PrintData;
  showDialog?: boolean;
  onDialogChange?: (open: boolean) => void;
  onPrintSuccess?: (result: Loose) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: 'print' | 'preview' | 'both';
}

export function QRCodePrinter({
  qrCode,
  labelType = 'material',
  printData = {},
  showDialog: externalShowDialog,
  onDialogChange,
  onPrintSuccess,
  variant = 'outline',
  size = 'sm',
  icon = 'both',
}: QRCodePrinterProps) {
  const { toast } = useToast();
  const t = useTranslations('QRCode');
  const tc = useTranslations('Common');
  const [internalShowDialog, setInternalShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<LabelTemplate>(
    labelTemplates.find((tpl) => tpl.type === labelType) || labelTemplates[0]
  );
  const [copies, setCopies] = useState(1);

  const showDialog = externalShowDialog ?? internalShowDialog;
  const setShowDialog = (open: boolean) => {
    if (onDialogChange) {
      onDialogChange(open);
    } else {
      setInternalShowDialog(open);
    }
  };

  const handlePrint = async () => {
    const ctx = { module: 'qrcode', action: 'print' };
    logger.stepStart(ctx, 'handlePrint', {
      qr_code: qrCode,
      label_type: selectedLabel.type,
      copies,
    });

    setIsPrinting(true);
    try {
      const payload = {
        qr_code: qrCode,
        label_type: selectedLabel.type,
        label_spec: `L-${selectedLabel.width}x${selectedLabel.height}`,
        copies,
        data: printData,
      };
      logger.info(ctx, '调用打印接口', { payload });
      const res = await fetch('/api/qrcode/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        logger.stepEnd(ctx, 'handlePrint', { result: result.data });
        toast({ title: t('printJobSent'), description: t('printCopiesSent', { count: copies }) });
        onPrintSuccess?.(result.data);
        setShowDialog(false);
      } else {
        logger.warn(ctx, '打印接口返回失败', { message: result.message });
        toast({ title: t('printFailed'), description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      logger.error(ctx, '打印异常', {
        error: error instanceof Error ? error.message : String(error),
      });
      toast({
        title: t('printFailed'),
        description: t('printServiceError'),
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const renderLabelPreview = () => {
    const template = selectedLabel;
    const scale = 2;
    const width = template.width * scale * 3;
    const height = template.height * scale * 3;

    return (
      <div
        className="bg-white border-2 border-dashed border-gray-300 rounded shadow-sm"
        style={{ width, height, padding: '12px' }}
      >
        <div className="flex gap-3 h-full">
          <div className="flex-shrink-0 flex items-center">
            <QRCodeSVG value={qrCode} size={Math.min(width * 0.35, 80)} level="H" />
          </div>
          <div className="flex-1 flex flex-col justify-center text-xs space-y-1 overflow-hidden">
            <div className="font-bold text-sm truncate">
              {printData.materialName || printData.productName || t('defaultMaterialName')}
            </div>
            <div className="font-mono text-[10px] text-gray-500 truncate">{qrCode}</div>
            {template.fields.includes('batchNo') && printData.batchNo && (
              <div className="truncate">
                {tc('batch')}: {printData.batchNo}
              </div>
            )}
            {template.fields.includes('quantity') && printData.quantity && (
              <div className="truncate">
                {tc('quantity')}: {printData.quantity} {printData.unit || ''}
              </div>
            )}
            {template.fields.includes('supplier') && printData.supplier && (
              <div className="truncate">
                {tc('supplier')}: {printData.supplier}
              </div>
            )}
            {template.fields.includes('workOrderNo') && printData.workOrderNo && (
              <div className="truncate">
                {tc('workOrder')}: {printData.workOrderNo}
              </div>
            )}
            {template.fields.includes('quality') && printData.quality && (
              <div className="truncate">
                {t('quality')}: {printData.quality}
              </div>
            )}
            {template.fields.includes('date') && printData.date && (
              <div className="truncate">
                {tc('date')}: {printData.date}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {icon === 'print' && (
        <Button variant={variant} size={size} onClick={() => setShowDialog(true)}>
          <Printer className="h-4 w-4 mr-1" />
          {tc('print')}
        </Button>
      )}
      {icon === 'preview' && (
        <Button variant={variant} size={size} onClick={() => setShowPreview(true)}>
          <Eye className="h-4 w-4 mr-1" />
          {tc('preview')}
        </Button>
      )}
      {icon === 'both' && (
        <div className="flex gap-2">
          <Button variant={variant} size={size} onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-1" />
            {tc('preview')}
          </Button>
          <Button variant={variant} size={size} onClick={() => setShowDialog(true)}>
            <Printer className="h-4 w-4 mr-1" />
            {tc('print')}
          </Button>
        </div>
      )}

      {/* 预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('labelPreview')} - {t(selectedLabel.nameKey)}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">{renderLabelPreview()}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 打印配置对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('printConfig')}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('labelTemplate')}</Label>
              <Select
                value={selectedLabel.type}
                onValueChange={(v) => {
                  const ctx = { module: 'qrcode', action: 'select_template' };
                  const template = labelTemplates.find((tpl) => tpl.type === v);
                  if (template) {
                    logger.branch(ctx, 'select_template', `type=${v}`, true, { template });
                    setSelectedLabel(template);
                  } else {
                    logger.warn(ctx, '未找到匹配模板', { type: v });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {labelTemplates.map((tpl) => (
                    <SelectItem key={tpl.type} value={tpl.type}>
                      {t(tpl.nameKey)} ({tpl.width}x{tpl.height}mm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('printCopies')}</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-4 bg-muted/30">
            <div className="text-sm text-muted-foreground mb-2">
              {t('labelPreview')} ({selectedLabel.width}x{selectedLabel.height}mm)
            </div>
            <div className="flex justify-center">{renderLabelPreview()}</div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handlePrint} disabled={isPrinting}>
              {isPrinting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Printer className="h-4 w-4 mr-1" />
              {t('confirmPrint')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
