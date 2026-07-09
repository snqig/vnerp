'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { InboundRecord } from '../types';
import { generatePrintContent } from '../utils/generatePrintContent';

export function usePrintLabels(inboundRecords: InboundRecord[]) {
  const t = useTranslations('Warehouse');

  const handlePrintLabels = useCallback(async () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error(t('printWindowBlocked'));
        return;
      }

      const printContent = generatePrintContent(inboundRecords, t('printPreview'));

      printWindow.document.write(printContent);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } catch {
      toast.error(t('printFailed'));
    }
  }, [inboundRecords, t]);

  return { handlePrintLabels };
}
