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
import { useTranslations } from 'next-intl';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeDataUrl: string;
}

export function QRCodeDialog({ open, onOpenChange, qrCodeDataUrl }: QRCodeDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" resizable>
        <DialogHeader>
          <DialogTitle>{t('qrCodeLabel')}</DialogTitle>
          <DialogDescription>{t('scanQRCodeDesc')}</DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center">
          {qrCodeDataUrl && (
            <div className="mb-4 p-2 bg-card border rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeDataUrl} alt="QR Code" />
            </div>
          )}
          <p className="text-center text-sm text-gray-600">{t('scanQRCodeDetail')}</p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{tc('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
