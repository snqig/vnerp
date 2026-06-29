'use client';

import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import type { QRCodeType, QRCodeGenerateParams } from './qr-code-types';

interface QRCodeGeneratorProps {
  onSuccess?: (qrCode: string, data: any) => void;
  initialType?: QRCodeType;
  showDialog?: boolean;
  onDialogChange?: (open: boolean) => void;
}

export function QRCodeGenerator({
  onSuccess,
  initialType = 'material',
  showDialog: externalShowDialog,
  onDialogChange,
}: QRCodeGeneratorProps) {
  const { toast } = useToast();
  const t = useTranslations('QRCode');
  const tc = useTranslations('Common');
  const [internalShowDialog, setInternalShowDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQRCode, setGeneratedQRCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<QRCodeGenerateParams>({
    qr_type: initialType,
  });

  const showDialog = externalShowDialog ?? internalShowDialog;
  const setShowDialog = (open: boolean) => {
    if (onDialogChange) {
      onDialogChange(open);
    } else {
      setInternalShowDialog(open);
    }
  };

  const handleGenerate = async () => {
    const ctx = { module: 'qrcode', action: 'generate' };
    logger.stepStart(ctx, 'handleGenerate', { qr_type: formData.qr_type });

    if (!formData.qr_type) {
      logger.branch(ctx, 'validate_type', '!formData.qr_type', true);
      toast({ title: t('selectType'), variant: 'destructive' });
      return;
    }
    logger.branch(ctx, 'validate_type', '!formData.qr_type', false);

    setIsGenerating(true);
    try {
      logger.info(ctx, '调用生成接口', { payload: formData });
      const res = await fetch('/api/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();

      if (result.success) {
        logger.stepEnd(ctx, 'handleGenerate', { qr_code: result.data?.qr_code });
        setGeneratedQRCode(result.data?.qr_code);
        toast({ title: t('generateSuccess'), description: result.data?.qr_code });
        onSuccess?.(result.data?.qr_code, result.data);
      } else {
        logger.warn(ctx, '生成接口返回失败', { message: result.message });
        toast({ title: t('generateFailed'), description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      logger.error(ctx, '生成异常', { error: error instanceof Error ? error.message : String(error) });
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setFormData({ qr_type: initialType });
    setGeneratedQRCode(null);
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)} variant="outline" size="sm">
        <QrCode className="h-4 w-4 mr-1" />
        {t('generateQRCode')}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('generateQRCode')}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* 表单区域 */}
            <div className="space-y-4">
              <div>
                <Label>{t('qrType')} *</Label>
                <Select
                  value={formData.qr_type}
                  onValueChange={(v) => setFormData({ ...formData, qr_type: v as QRCodeType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">{t('typeMaterial')}</SelectItem>
                    <SelectItem value="product">{t('typeProduct')}</SelectItem>
                    <SelectItem value="workorder">{t('typeWorkorder')}</SelectItem>
                    <SelectItem value="ink">{t('typeInk')}</SelectItem>
                    <SelectItem value="screen_plate">{t('typeScreenPlate')}</SelectItem>
                    <SelectItem value="die">{t('typeDie')}</SelectItem>
                    <SelectItem value="shipment">{t('typeShipment')}</SelectItem>
                    <SelectItem value="ink_open">{t('typeInkOpen')}</SelectItem>
                    <SelectItem value="ink_mixed">{t('typeInkMixed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('refNo')}</Label>
                <Input
                  value={formData.ref_no || ''}
                  onChange={(e) => setFormData({ ...formData, ref_no: e.target.value })}
                  placeholder={t('refNoPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('batchNo')}</Label>
                <Input
                  value={formData.batch_no || ''}
                  onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{t('materialCode')}</Label>
                  <Input
                    value={formData.material_code || ''}
                    onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('materialName')}</Label>
                  <Input
                    value={formData.material_name || ''}
                    onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{tc('quantity')}</Label>
                  <Input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{tc('unit')}</Label>
                  <Input
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder={t('unitPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <Label>{t('specification')}</Label>
                <Input
                  value={formData.specification || ''}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{tc('warehouse')}</Label>
                  <Input
                    value={formData.warehouse_name || ''}
                    onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{tc('supplier')}</Label>
                  <Input
                    value={formData.supplier_name || ''}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{t('productionDate')}</Label>
                  <Input
                    type="date"
                    value={formData.production_date || ''}
                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('expiryDate')}</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date || ''}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            {/* 预览区域 */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 bg-muted/30">
              {generatedQRCode ? (
                <Card className="w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-center">{t('generateSuccess')}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="bg-white p-2 rounded">
                      <QRCodeSVG value={generatedQRCode} size={160} level="H" includeMargin />
                    </div>
                    <p className="mt-2 font-mono text-sm font-medium">{generatedQRCode}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => navigator.clipboard.writeText(generatedQRCode)}
                    >
                      {t('copyCode')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center text-muted-foreground">
                  <QrCode className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p>{t('clickToGenerate')}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleReset}>
              {tc('reset')}
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t('generateQRCode')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
