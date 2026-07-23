'use client';

import { motion } from 'framer-motion';
import {
  Plus,
  RefreshCw,
  RotateCcw,
  Printer,
  Barcode,
  Beaker,
  ScanLine,
  Scissors,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { InboundRecord, PrintLabel } from '../types';
import { mapRecordsToLabels, filterApprovedRecords } from '../utils/mapRecordsToLabels';

interface InboundToolbarProps {
  isLoading: boolean;
  inboundRecords: InboundRecord[];
  selectedRecords: (string | number)[];
  onRefresh: () => void;
  onResetSearch: () => void;
  onOpenAddDialog: () => void;
  onOpenMixedAddDialog: () => void;
  onOpenGenerateDialog: () => void;
  onOpenQRScanDialog: () => void;
  onOpenSourceLabelQuery: () => void;
  onPrintLabels: (labels: PrintLabel[]) => void;
  onOpenPrintPreview: () => void;
}

export function InboundToolbar({
  isLoading,
  inboundRecords,
  selectedRecords,
  onRefresh,
  onResetSearch,
  onOpenAddDialog,
  onOpenMixedAddDialog,
  onOpenGenerateDialog,
  onOpenQRScanDialog,
  onOpenSourceLabelQuery,
  onPrintLabels,
  onOpenPrintPreview,
}: InboundToolbarProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const handlePrintAll = () => {
    const approvedRecords = filterApprovedRecords(inboundRecords);
    if (approvedRecords.length === 0) {
      toast.error(t('noApprovedForPrint'));
      return;
    }
    const labels = mapRecordsToLabels(approvedRecords);
    if (selectedRecords.length > 0) {
      const selectedLabels = labels.filter((l) => selectedRecords.includes(l.record.id));
      onPrintLabels(selectedLabels.length > 0 ? selectedLabels : labels);
    } else {
      onPrintLabels(labels);
    }
    onOpenPrintPreview();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl shadow-sm border"
    >
      <Button onClick={onOpenAddDialog} className="gap-2 bg-green-600 hover:bg-green-700">
        <Plus className="w-4 h-4" />
        {tc('add')}
      </Button>
      <Button onClick={onOpenMixedAddDialog} variant="outline" className="gap-2">
        <Beaker className="w-4 h-4" />
        {t('mixedMaterialAdd')}
      </Button>
      <Button onClick={onOpenGenerateDialog} variant="outline" className="gap-2">
        <Barcode className="w-4 h-4" />
        {t('generateLabel')}
      </Button>
      <Button onClick={onOpenQRScanDialog} variant="outline" className="gap-2">
        <ScanLine className="w-4 h-4" />
        {t('qrCodeQuery')}
      </Button>
      <Button
        onClick={onOpenSourceLabelQuery}
        variant="outline"
        className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
      >
        <Scissors className="w-4 h-4" />
        {t('materialCutting')}
      </Button>
      <div className="w-px h-8 bg-slate-200 dark:bg-slate-600 mx-2" />
      <Button onClick={handlePrintAll} className="gap-2 bg-blue-600 hover:bg-blue-700">
        <Printer className="w-4 h-4" />
        {t('printQRCode')}
      </Button>
      <div className="w-px h-8 bg-slate-200 dark:bg-slate-600 mx-2" />
      <Button onClick={onRefresh} variant="outline" className="gap-2" disabled={isLoading}>
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        {tc('refresh')}
      </Button>
      <Button onClick={onResetSearch} variant="outline" className="gap-2">
        <RotateCcw className="w-4 h-4" />
        {tc('reset')}
      </Button>
    </motion.div>
  );
}
