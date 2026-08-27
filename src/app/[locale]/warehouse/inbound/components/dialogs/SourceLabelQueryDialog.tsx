'use client';

import { useState } from 'react';
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
import { Scissors, Search, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import type { SourceLabelData } from '../../types';

interface SourceLabelQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLabelFound: (label: SourceLabelData) => void;
}

export function SourceLabelQueryDialog({
  open,
  onOpenChange,
  onLabelFound,
}: SourceLabelQueryDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const [labelCode, setLabelCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundLabel, setFoundLabel] = useState<SourceLabelData | null>(null);
  const [error, setError] = useState('');

  const handleQuery = async () => {
    const code = labelCode.trim();
    if (!code) {
      setError('请输入或扫描标签编号');
      return;
    }

    setLoading(true);
    setError('');
    setFoundLabel(null);

    try {
      const response = await authFetch(
        `/api/warehouse/inbound/cutting?labelNo=${encodeURIComponent(code)}`
      );
      const result = await response.json();

      if (result.success) {
        setFoundLabel(result.data);
      } else {
        setError(result.message || '查询失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuery();
    }
  };

  const handleNext = () => {
    if (foundLabel) {
      onLabelFound(foundLabel);
      setLabelCode('');
      setFoundLabel(null);
      setError('');
    }
  };

  const handleClose = () => {
    setLabelCode('');
    setFoundLabel(null);
    setError('');
    onOpenChange(false);
  };

  const parsedWidth = foundLabel?.specification
    ? (() => {
        const match = foundLabel.specification.match(
          /^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?$/i
        );
        return match ? match[1] : null;
      })()
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            {t('materialCutting')}
          </DialogTitle>
          <DialogDescription>
            {'请输入或扫描母材标签编号，系统将自动校验是否可分切'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('sourceLabelNo')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入标签编号或扫码"
                value={labelCode}
                onChange={(e) => setLabelCode(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <Button onClick={handleQuery} disabled={loading} className="shrink-0 gap-2">
                <Search className="h-4 w-4" />
                {tc('search')}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2"
                style={{ borderColor: 'rgba(6,182,212,0.2)', borderTopColor: 'rgba(6,182,212,1)' }}
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700">{t('queryFailed')}</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {foundLabel && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">{'校验通过'}</span>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{t('sourceLabelInfo')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{t('labelNo')}：</span>
                    <span className="font-mono font-medium">{foundLabel.labelNo}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{tc('materialName')}：</span>
                    <span className="font-medium">{foundLabel.materialName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{tc('specification')}：</span>
                    <span className="font-medium">{foundLabel.specification || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{t('originalWidth')}：</span>
                    <span className="font-medium">
                      {parsedWidth ? `${parsedWidth}mm` : t('notParsed')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{tc('quantity')}：</span>
                    <span className="font-medium">
                      {foundLabel.quantity} {foundLabel.unit || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{tc('supplier')}：</span>
                    <span className="font-medium">{foundLabel.supplierName || '-'}</span>
                  </div>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {'可分切'}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!foundLabel}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Scissors className="h-4 w-4" />
            {'下一步分切'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
