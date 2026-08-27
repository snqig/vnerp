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
import { Badge } from '@/components/ui/badge';
import { Package, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ScanResult } from '../../types';

interface QRScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanResult: ScanResult | null;
}

export function QRScanDialog({ open, onOpenChange, scanResult }: QRScanDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" resizable>
        <DialogHeader>
          <DialogTitle>{t('scanQueryResult')}</DialogTitle>
          <DialogDescription>{t('materialDetailInfo')}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {scanResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">{scanResult.materialName}</h3>
                  <p className="text-sm text-gray-600">{scanResult.materialCode}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">{tc('specification')}：</span>
                  <span>{scanResult.specification}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{tc('supplier')}：</span>
                  <span>{scanResult.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('inboundTime')}：</span>
                  <span>{scanResult.inboundTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{tc('status')}：</span>
                  <Badge
                    className={
                      scanResult.status === 'IN'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }
                  >
                    {scanResult.status === 'IN' ? tc('stockedIn') : tc('stockedOut')}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('pleaseScanQuery')}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{tc('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
