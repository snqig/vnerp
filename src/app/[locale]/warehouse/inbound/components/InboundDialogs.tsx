'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  CuttingDialog,
  CuttingResultDialog,
  QRCodeDialog,
  PrintPreviewDialog,
  QRScanDialog,
  GenerateDialog,
  AddDialog,
  MixedAddDialog,
  AuditDialog,
  EditDialog,
} from './dialogs';
import type {
  InboundRecord,
  PrintLabel,
  ScanResult,
  InboundFormData,
  CuttingFormData,
  WarehouseCategory,
  Supplier,
  PurchaseOrder,
} from '../types';

interface InboundDialogsProps {
  isCuttingDialogOpen: boolean;
  setIsCuttingDialogOpen: Dispatch<SetStateAction<boolean>>;
  cuttingForm: CuttingFormData;
  setCuttingForm: Dispatch<SetStateAction<CuttingFormData>>;
  currentLabel: PrintLabel | null;
  handleCutting: () => Promise<void>;

  isCuttingResultOpen: boolean;
  setIsCuttingResultOpen: Dispatch<SetStateAction<boolean>>;
  printLabels: PrintLabel[];

  isQRCodeDialogOpen: boolean;
  setIsQRCodeDialogOpen: Dispatch<SetStateAction<boolean>>;
  qrCodeDataUrl: string;

  isPrintPreviewOpen: boolean;
  setIsPrintPreviewOpen: Dispatch<SetStateAction<boolean>>;

  isQRScanDialogOpen: boolean;
  setIsQRScanDialogOpen: Dispatch<SetStateAction<boolean>>;
  scanResult: ScanResult | null;

  isGenerateDialogOpen: boolean;
  setIsGenerateDialogOpen: Dispatch<SetStateAction<boolean>>;
  labelSupplier: string;
  setLabelSupplier: Dispatch<SetStateAction<string>>;
  suppliers: Supplier[];

  isAddDialogOpen: boolean;
  setIsAddDialogOpen: Dispatch<SetStateAction<boolean>>;
  formData: InboundFormData;
  setFormData: Dispatch<SetStateAction<InboundFormData>>;
  warehouseCategories: WarehouseCategory[];
  poSearchResults: PurchaseOrder[];
  poSearchLoading: boolean;
  poDropdownVisible: boolean;
  setPoDropdownVisible: Dispatch<SetStateAction<boolean>>;
  handlePoSearchChange: (value: string) => void;
  handlePoSelect: (po: Loose) => void;
  fetchInboundRecords: () => Promise<void>;

  isMixedAddDialogOpen: boolean;
  setIsMixedAddDialogOpen: Dispatch<SetStateAction<boolean>>;

  isAuditDialogOpen: boolean;
  setIsAuditDialogOpen: Dispatch<SetStateAction<boolean>>;
  currentRecord: InboundRecord | null;

  isEditDialogOpen: boolean;
  setIsEditDialogOpen: Dispatch<SetStateAction<boolean>>;
}

export function InboundDialogs(props: InboundDialogsProps) {
  const {
    isCuttingDialogOpen,
    setIsCuttingDialogOpen,
    cuttingForm,
    setCuttingForm,
    currentLabel,
    handleCutting,
    isCuttingResultOpen,
    setIsCuttingResultOpen,
    printLabels,
    isQRCodeDialogOpen,
    setIsQRCodeDialogOpen,
    qrCodeDataUrl,
    isPrintPreviewOpen,
    setIsPrintPreviewOpen,
    isQRScanDialogOpen,
    setIsQRScanDialogOpen,
    scanResult,
    isGenerateDialogOpen,
    setIsGenerateDialogOpen,
    labelSupplier,
    setLabelSupplier,
    suppliers,
    isAddDialogOpen,
    setIsAddDialogOpen,
    formData,
    setFormData,
    warehouseCategories,
    poSearchResults,
    poSearchLoading,
    poDropdownVisible,
    setPoDropdownVisible,
    handlePoSearchChange,
    handlePoSelect,
    fetchInboundRecords,
    isMixedAddDialogOpen,
    setIsMixedAddDialogOpen,
    isAuditDialogOpen,
    setIsAuditDialogOpen,
    currentRecord,
    isEditDialogOpen,
    setIsEditDialogOpen,
  } = props;

  return (
    <>
      <CuttingDialog
        open={isCuttingDialogOpen}
        onOpenChange={setIsCuttingDialogOpen}
        cuttingForm={cuttingForm}
        setCuttingForm={setCuttingForm}
        currentLabel={currentLabel}
        onCutting={handleCutting}
      />

      <CuttingResultDialog
        open={isCuttingResultOpen}
        onOpenChange={setIsCuttingResultOpen}
        printLabels={printLabels}
      />

      <QRCodeDialog
        open={isQRCodeDialogOpen}
        onOpenChange={setIsQRCodeDialogOpen}
        qrCodeDataUrl={qrCodeDataUrl}
      />

      <PrintPreviewDialog
        open={isPrintPreviewOpen}
        onOpenChange={setIsPrintPreviewOpen}
        printLabels={printLabels}
      />

      <QRScanDialog
        open={isQRScanDialogOpen}
        onOpenChange={setIsQRScanDialogOpen}
        scanResult={scanResult}
      />

      <GenerateDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        labelSupplier={labelSupplier}
        setLabelSupplier={setLabelSupplier}
        suppliers={suppliers}
      />

      <AddDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        formData={formData}
        setFormData={setFormData}
        suppliers={suppliers}
        poSearchResults={poSearchResults}
        poSearchLoading={poSearchLoading}
        poDropdownVisible={poDropdownVisible}
        setPoDropdownVisible={setPoDropdownVisible}
        handlePoSearchChange={handlePoSearchChange}
        handlePoSelect={handlePoSelect}
        onSuccess={fetchInboundRecords}
      />

      <MixedAddDialog
        open={isMixedAddDialogOpen}
        onOpenChange={setIsMixedAddDialogOpen}
        formData={formData}
        setFormData={setFormData}
        warehouseCategories={warehouseCategories}
        onSuccess={fetchInboundRecords}
      />

      <AuditDialog
        open={isAuditDialogOpen}
        onOpenChange={setIsAuditDialogOpen}
        currentRecord={currentRecord}
        onSuccess={fetchInboundRecords}
      />

      <EditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        formData={formData}
        setFormData={setFormData}
        currentRecord={currentRecord}
        suppliers={suppliers}
        warehouseCategories={warehouseCategories}
        onSuccess={fetchInboundRecords}
      />
    </>
  );
}
