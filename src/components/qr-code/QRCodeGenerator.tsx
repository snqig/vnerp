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
    if (!formData.qr_type) {
      toast({ title: '请选择二维码类型', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();

      if (result.success) {
        setGeneratedQRCode(result.data?.qr_code);
        toast({ title: '二维码生成成功', description: result.data?.qr_code });
        onSuccess?.(result.data?.qr_code, result.data);
      } else {
        toast({ title: '生成失败', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' });
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
        生成二维码
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>生成二维码</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* 表单区域 */}
            <div className="space-y-4">
              <div>
                <Label>二维码类型 *</Label>
                <Select
                  value={formData.qr_type}
                  onValueChange={(v) => setFormData({ ...formData, qr_type: v as QRCodeType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">原料</SelectItem>
                    <SelectItem value="product">成品</SelectItem>
                    <SelectItem value="workorder">工单</SelectItem>
                    <SelectItem value="ink">油墨</SelectItem>
                    <SelectItem value="screen_plate">网版</SelectItem>
                    <SelectItem value="die">刀具</SelectItem>
                    <SelectItem value="shipment">出货</SelectItem>
                    <SelectItem value="ink_open">开罐</SelectItem>
                    <SelectItem value="ink_mixed">调色</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>关联单号</Label>
                <Input
                  value={formData.ref_no || ''}
                  onChange={(e) => setFormData({ ...formData, ref_no: e.target.value })}
                  placeholder="如 PO2024001"
                />
              </div>

              <div>
                <Label>批次号</Label>
                <Input
                  value={formData.batch_no || ''}
                  onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>物料编码</Label>
                  <Input
                    value={formData.material_code || ''}
                    onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>物料名称</Label>
                  <Input
                    value={formData.material_name || ''}
                    onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>数量</Label>
                  <Input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>单位</Label>
                  <Input
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="如: 米、KG、PCS"
                  />
                </div>
              </div>

              <div>
                <Label>规格型号</Label>
                <Input
                  value={formData.specification || ''}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>仓库</Label>
                  <Input
                    value={formData.warehouse_name || ''}
                    onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>供应商</Label>
                  <Input
                    value={formData.supplier_name || ''}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>生产日期</Label>
                  <Input
                    type="date"
                    value={formData.production_date || ''}
                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>有效期</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date || ''}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>备注</Label>
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
                    <CardTitle className="text-sm text-center">生成成功</CardTitle>
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
                      复制编码
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center text-muted-foreground">
                  <QrCode className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p>点击生成按钮创建二维码</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleReset}>
              重置
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              生成二维码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
