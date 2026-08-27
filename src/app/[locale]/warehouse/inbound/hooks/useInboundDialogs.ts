'use client';

import { useState } from 'react';
import type { InboundRecord, PrintLabel } from '../types';

export function useInboundDialogs() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMixedAddDialogOpen, setIsMixedAddDialogOpen] = useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [labelSupplier, setLabelSupplier] = useState('');
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
  const [isQRScanDialogOpen, setIsQRScanDialogOpen] = useState(false);
  const [isCuttingDialogOpen, setIsCuttingDialogOpen] = useState(false);
  const [isCuttingResultOpen, setIsCuttingResultOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printLabels, setPrintLabels] = useState<PrintLabel[]>([]);
  const [currentRecord, setCurrentRecord] = useState<InboundRecord | null>(null);
  const [currentLabel, setCurrentLabel] = useState<PrintLabel | null>(null);

  return {
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isMixedAddDialogOpen,
    setIsMixedAddDialogOpen,
    isAuditDialogOpen,
    setIsAuditDialogOpen,
    isGenerateDialogOpen,
    setIsGenerateDialogOpen,
    labelSupplier,
    setLabelSupplier,
    isQRCodeDialogOpen,
    setIsQRCodeDialogOpen,
    isQRScanDialogOpen,
    setIsQRScanDialogOpen,
    isCuttingDialogOpen,
    setIsCuttingDialogOpen,
    isCuttingResultOpen,
    setIsCuttingResultOpen,
    isPrintPreviewOpen,
    setIsPrintPreviewOpen,
    printLabels,
    setPrintLabels,
    currentRecord,
    setCurrentRecord,
    currentLabel,
    setCurrentLabel,
  };
}
