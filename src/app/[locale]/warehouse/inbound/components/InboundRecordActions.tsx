'use client';

import {
  MoreHorizontal,
  Edit,
  CheckCircle2,
  QrCode,
  ArrowRightLeft,
  PackageMinus,
  Factory,
  Undo2,
  Truck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import type { InboundRecord } from '../types';

export type OutboundKind = 'raw' | 'workshop' | 'prodReturn' | 'purReturn';

interface InboundRecordActionsProps {
  record: InboundRecord;
  onEdit: () => void;
  onAudit: () => void;
  onPrint: () => void;
  onTransfer: () => void;
  onOutbound: (kind: OutboundKind) => void;
  onDelete: () => void;
}

export function InboundRecordActions({
  record,
  onEdit,
  onAudit,
  onPrint,
  onTransfer,
  onOutbound,
  onDelete,
}: InboundRecordActionsProps) {
  const ts = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const editable = record.status === 'draft' || record.status === 'pending' || record.status === 'rejected';
  const outboundable = record.status === 'approved' || record.status === 'completed';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <MoreHorizontal className="w-3 h-3" />
          {tc('operation')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {editable && (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4" />
              {tc('edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAudit}>
              <CheckCircle2 className="w-4 h-4" />
              {tc('audit')}
            </DropdownMenuItem>
          </>
        )}
        {outboundable && (
          <>
            <DropdownMenuItem onClick={onPrint}>
              <QrCode className="w-4 h-4" />
              {ts('printQRCode')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTransfer}>
              <ArrowRightLeft className="w-4 h-4" />
              {ts('k_1j10cql')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onOutbound('raw')}>
              <PackageMinus className="w-4 h-4" />
              {ts('k_i8a8h6')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOutbound('workshop')}>
              <Factory className="w-4 h-4" />
              {ts('k_1ujut5g')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOutbound('prodReturn')}>
              <Undo2 className="w-4 h-4" />
              {ts('k_18y1htk')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOutbound('purReturn')}>
              <Truck className="w-4 h-4" />
              {ts('k_ri2ei6')}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
          {tc('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
