'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface LabelPrintButtonProps {
  htmlTemplate: string;
  data: Record<string, string | number>;
  maxCopies?: number;
  onPrintStart?: () => void;
  onPrintEnd?: () => void;
}

function fillTemplate(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const val = data[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

export function LabelPrintButton({
  htmlTemplate,
  data,
  maxCopies = 50,
  onPrintStart,
  onPrintEnd,
}: LabelPrintButtonProps) {
  const t = useTranslations('trace');
  const [printing, setPrinting] = useState(false);

  const handlePrint = useCallback(() => {
    try {
      setPrinting(true);
      onPrintStart?.();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert(t('print.popup_blocked'));
        return;
      }
      const html = fillTemplate(htmlTemplate, data);
      printWindow.document.write(`
        <html>
          <head>
            <style>
              @media print {
                body { margin: 0; padding: 2mm; }
                .label { page-break-after: always; }
              }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } finally {
      setPrinting(false);
      onPrintEnd?.();
    }
  }, [htmlTemplate, data, onPrintStart, onPrintEnd, t]);

  return (
    <Button onClick={handlePrint} disabled={printing}>
      {printing ? t('print.printing') : t('print.print_button')}
    </Button>
  );
}
