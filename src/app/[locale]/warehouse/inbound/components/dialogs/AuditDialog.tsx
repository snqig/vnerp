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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import type { InboundRecord } from '../../types';

interface AuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRecord: InboundRecord | null;
  onSuccess: () => void;
}

export function AuditDialog({ open, onOpenChange, currentRecord, onSuccess }: AuditDialogProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');
  const [generateQr, setGenerateQr] = useState(true);

  const handleReject = async () => {
    if (!currentRecord) return;
    try {
      const response = await authFetch('/api/warehouse/inbound', {
        method: 'PUT',
        body: JSON.stringify({ id: currentRecord.id, status: 'rejected' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('auditRejected'));
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleApprove = async () => {
    if (!currentRecord) return;
    try {
      const response = await authFetch('/api/warehouse/inbound', {
        method: 'PUT',
        body: JSON.stringify({ id: currentRecord.id, status: 'approved' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('auditApproved'));
        onOpenChange(false);
        onSuccess();

        if (generateQr && currentRecord.items?.length) {
          try {
            const qrRes = await authFetch('/api/trace/qr/generate', {
              method: 'POST',
              body: JSON.stringify({
                items: currentRecord.items.map((item: Loose) => ({
                  materialId: item.material_id,
                  materialName: item.material_name,
                  batchNo: item.batch_no || '',
                  quantity: item.quantity || 0,
                  count: 1,
                })),
                operator: currentRecord.operator_name || '系统管理员',
              }),
            });
            const qrResult = await qrRes.json();
            if (qrResult.success) {
              toast.success(t('qrCodeGenerated'));
            }
          } catch {
            toast.error(t('qrCodeGenerateFailed'));
          }
        }
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error(tc('error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" resizable>
        <DialogHeader>
          <DialogTitle>{t('auditInboundOrder')}</DialogTitle>
          <DialogDescription>
            {t('confirmAuditOrder', { orderNo: currentRecord?.order_no || '' })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {currentRecord && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{tc('material')}：</span>
                <span>{currentRecord.items?.[0]?.material_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{tc('specification')}：</span>
                <span>{currentRecord.items?.[0]?.material_spec || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{tc('quantity')}：</span>
                <span>
                  {currentRecord.total_quantity} {t('pieces')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{tc('supplier')}：</span>
                <span>{currentRecord.supplier_name}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="generateQr"
            checked={generateQr}
            onCheckedChange={(v) => setGenerateQr(!!v)}
          />
          <Label htmlFor="generateQr" className="text-sm cursor-pointer">
            {t('generateQrOnApprove')}
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleReject}>
            {tc('reject')}
          </Button>
          <Button onClick={handleApprove}>{tc('approve')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
