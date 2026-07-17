'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import {
  ArrowDownLeft,
  CheckCircle2,
  QrCode,
  Printer,
  Scissors,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/auth-fetch';

import type { InboundItem, PrintLabel, ScanResult, InboundFormData, InboundRecord } from './types';
import { statusConfig, INITIAL_FORM_DATA, isCuttableMaterial } from './types';

import { InboundToolbar } from './components/InboundToolbar';
import { InboundStatsCards } from './components/InboundStatsCards';
import { InboundDialogs } from './components/InboundDialogs';
import { useInboundData } from './hooks/useInboundData';
import { useInboundDialogs } from './hooks/useInboundDialogs';
import { usePurchaseOrderSearch } from './hooks/usePurchaseOrderSearch';
import { useCutting } from './hooks/useCutting';
import { usePrintLabels } from './hooks/usePrintLabels';
import { mapRecordsToLabels, filterApprovedRecords } from './utils/mapRecordsToLabels';

export default function InboundManagementPage() {
  // 翻译钩子
  const locale = useLocale();
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const _router = useRouter();
  const { user } = useAuth();
  const {
    setSearchQuery,
    isLoading,
    inboundRecords,
    selectedRecords,
    setSelectedRecords,
    warehouseCategories,
    suppliers,
    fetchInboundRecords,
    handleRefresh,
    totalInboundToday,
    totalInboundMonth,
  } = useInboundData();
  const { handlePrintLabels } = usePrintLabels(inboundRecords);

  const {
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
  } = useInboundDialogs();

  // 标签选择状态
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  // 二维码状态
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrCodeLabelId, setQrCodeLabelId] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // 删除确认对话框状态
  const [deleteTarget, setDeleteTarget] = useState<InboundRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { cuttingForm, setCuttingForm, handleCutting } = useCutting({
    currentLabel,
    user,
    fetchInboundRecords,
    setPrintLabels,
    setIsCuttingResultOpen,
    setIsCuttingDialogOpen,
  });

  // 表单状态
  const [formData, setFormData] = useState<InboundFormData>({ ...INITIAL_FORM_DATA });

  const {
    poSearchResults,
    poSearchLoading,
    poDropdownVisible,
    setPoDropdownVisible,
    handlePoSearchChange,
    handlePoSelect,
  } = usePurchaseOrderSearch(setFormData);

  // 生成二维码
  const generateQRCode = useCallback(
    async (labelId: string, labelNo: string) => {
      try {
        const qrContent = `${labelNo}@001:type:IN`;
        const dataUrl = await QRCode.toDataURL(qrContent, {
          width: 150,
          margin: 1,
        });
        setQrCodeDataUrl(dataUrl);
        setQrCodeLabelId(labelId);
        setIsQRCodeDialogOpen(true);
      } catch {
        toast.error(t('qrCodeGenerateFailed'));
      }
    },
    [t]
  );

  const handleQRCodeView = useCallback(
    async (label: PrintLabel) => {
      if (!label.id) {
        toast.error(t('scanQueryFailed'));
        return;
      }
      try {
        const response = await authFetch(`/api/warehouse/inbound/labels/${label.id}/qrcode`);
        const result = await response.json();
        if (result.success) {
          setQrCodeDataUrl(result.data?.qrCode || '');
          setQrCodeLabelId(label.id);
          setIsQRCodeDialogOpen(true);
        } else {
          toast.error(t('scanQueryFailed'));
        }
      } catch {
        toast.error(t('scanQueryFailed'));
      }
    },
    [t]
  );

  // 状态选项
  const _statusOptions = [
    { value: 'all', label: tc('all') },
    { value: 'draft', label: tc('draft') },
    { value: 'pending', label: tc('pending') },
    { value: 'approved', label: tc('approved') },
    { value: 'rejected', label: tc('rejected') },
  ];

  // 日期范围选项
  const _dateRangeOptions = [
    { value: 'all', label: tc('all') },
    { value: 'today', label: tc('today') },
    { value: 'week', label: tc('thisWeek') },
    { value: 'month', label: tc('thisMonth') },
  ];

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    try {
      const response = await authFetch(`/api/warehouse/inbound?id=${targetId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('deletedWithUndo'), {
          duration: 5000,
          action: {
            label: t('undo'),
            onClick: async () => {
              try {
                const restoreResp = await authFetch(`/api/warehouse/inbound?id=${targetId}`, {
                  method: 'PATCH',
                });
                const restoreResult = await restoreResp.json();
                if (restoreResult.success) {
                  toast.success(t('restoreSuccess'));
                  await fetchInboundRecords();
                } else {
                  toast.error(restoreResult.message || t('restoreFailed'));
                }
              } catch {
                toast.error(t('restoreFailed'));
              }
            },
          },
        });
        await fetchInboundRecords();
      } else {
        toast.error(result.message || t('deleteFailed'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('deleteFailed'));
    }
    setDeleteTarget(null);
  };

  return (
    <MainLayout title={t('inboundManagement')}>
      <div className="space-y-6">
        {/* 操作按钮 */}
        <InboundToolbar
          isLoading={isLoading}
          inboundRecords={inboundRecords}
          selectedRecords={selectedRecords}
          onRefresh={handleRefresh}
          onResetSearch={() => setSearchQuery('')}
          onOpenAddDialog={() => setIsAddDialogOpen(true)}
          onOpenMixedAddDialog={() => setIsMixedAddDialogOpen(true)}
          onOpenGenerateDialog={() => setIsGenerateDialogOpen(true)}
          onOpenCuttingDialog={() => setIsCuttingDialogOpen(true)}
          onOpenQRScanDialog={() => setIsQRScanDialogOpen(true)}
          onPrintLabels={setPrintLabels}
          onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
        />

        {/* 统计卡片 */}
        <InboundStatsCards
          totalInboundToday={totalInboundToday}
          totalInboundMonth={totalInboundMonth}
          inboundRecords={inboundRecords}
        />

        {/* 入库记录列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="h-5 w-5" />
                  {t('inboundRecords')}
                </CardTitle>
                {selectedRecords.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t('selectedCount', { count: selectedRecords.length })}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setSelectedRecords([])}>
                      {t('cancelSelect')}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        const selectedApproved = filterApprovedRecords(
                          inboundRecords.filter((r) => selectedRecords.includes(r.id))
                        );
                        if (selectedApproved.length === 0) {
                          toast.error(t('selectApprovedForPrint'));
                          return;
                        }
                        const labels = mapRecordsToLabels(selectedApproved);
                        setPrintLabels(labels);
                        setIsPrintPreviewOpen(true);
                      }}
                    >
                      <Printer className="w-3 h-3" />
                      {t('printSelectedQRCode')}
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription>{t('manageInboundRecords')}</CardDescription>
            </CardHeader>
            <CardContent>
              {inboundRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">{t('noInboundRecords')}</div>
              ) : (
                <div className="space-y-3">
                  {/* 全选行 */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Checkbox
                      checked={
                        selectedRecords.length === inboundRecords.length &&
                        inboundRecords.length > 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRecords(inboundRecords.map((r) => r.id));
                        } else {
                          setSelectedRecords([]);
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedRecords.length === inboundRecords.length && inboundRecords.length > 0
                        ? t('cancelSelectAll')
                        : t('selectAll')}
                    </span>
                  </div>
                  {inboundRecords.map((record) => {
                    const statusInfo = statusConfig[record.status] || statusConfig.draft;
                    const firstItem = record.items?.[0] || ({} as Partial<InboundItem>);
                    const materialSummary =
                      (record.items?.length || 0) > 1
                        ? `${firstItem.material_name} 等${record.items?.length}项`
                        : firstItem.material_name || '-';
                    const specQty = firstItem.material_spec
                      ? `${firstItem.material_spec} / ${firstItem.quantity || 0} ${firstItem.unit || ''}`
                      : `共 ${record.total_quantity || 0} 件`;
                    return (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 mr-4">
                          <Checkbox
                            checked={selectedRecords.includes(record.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRecords((prev) => [...prev, record.id]);
                              } else {
                                setSelectedRecords((prev) => prev.filter((id) => id !== record.id));
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                          <div>
                            <p className="text-xs text-gray-500">{t('inboundNo')}</p>
                            <p className="font-medium text-sm">{record.order_no}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{tc('material')}</p>
                            <p className="font-medium text-sm">{materialSummary}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{t('specQty')}</p>
                            <p className="text-sm">{specQty}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{tc('supplier')}</p>
                            <p className="text-sm">{record.supplier_name || '-'}</p>
                          </div>
                          <div>
                            <Badge className={statusInfo.color}>{tc(statusInfo.labelKey)}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {(record.status === 'approved' || record.status === 'completed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => {
                                const labels = mapRecordsToLabels([record]);
                                setPrintLabels(labels);
                                setIsPrintPreviewOpen(true);
                              }}
                            >
                              <QrCode className="w-3 h-3" />
                              {t('printQRCode')}
                            </Button>
                          )}
                          {(record.status === 'draft' || record.status === 'pending') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentRecord(record);
                                  setFormData({
                                    materialCode: String(firstItem.material_id || ''),
                                    materialName: firstItem.material_name || '',
                                    specification: firstItem.material_spec || '',
                                    quantity: String(firstItem.quantity || ''),
                                    unit: firstItem.unit || '',
                                    supplier: record.supplier_name || '',
                                    warehouse: String(record.warehouse_id || ''),
                                    purchaseOrderNo: '',
                                    batchNo: firstItem.batch_no || '',
                                    remark: record.remark || '',
                                    isMixed: false,
                                    mixedMaterialRemark: '',
                                    colorCode: '',
                                    machineNo: '',
                                    width: '',
                                    isRawMaterial: false,
                                    currency: record.currency || 'CNY',
                                    baseCurrency: record.base_currency || '',
                                  });
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                {tc('edit')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentRecord(record);
                                  setIsAuditDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {tc('audit')}
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDeleteTarget(record);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {tc('delete')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 标签管理 - 新增标签列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    {t('labelManagement')}
                  </CardTitle>
                  <CardDescription>{t('labelManagementDesc')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLabels.size > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {t('selectedLabelsCount', { count: selectedLabels.size })}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLabels(new Set())}
                      >
                        {t('cancelSelect')}
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-blue-600 hover:bg-blue-700"
                        onClick={async () => {
                          const allLabels = mapRecordsToLabels(
                            filterApprovedRecords(inboundRecords)
                          );
                          const selected = allLabels.filter((l) => selectedLabels.has(l.id));
                          setPrintLabels(selected);
                          setIsPrintPreviewOpen(true);
                        }}
                      >
                        <Printer className="w-3 h-3" />
                        {t('printSelectedLabels')}
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => handlePrintLabels()}>
                    <Printer className="w-4 h-4 mr-2" />
                    {t('printAllLabels')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {inboundRecords.filter((r) => r.status === 'approved' || r.status === 'completed')
                .length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('noApprovedRecordsForLabels')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 全选标签 */}
                  {(() => {
                    const allLabels = mapRecordsToLabels(filterApprovedRecords(inboundRecords));
                    const allSelected =
                      allLabels.length > 0 && allLabels.every((l) => selectedLabels.has(l.id));
                    return (
                      <div className="col-span-full flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLabels(new Set(allLabels.map((l) => l.id)));
                            } else {
                              setSelectedLabels(new Set());
                            }
                          }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {allSelected ? t('cancelSelectAllLabels') : t('selectAllLabels')}
                        </span>
                      </div>
                    );
                  })()}
                  {mapRecordsToLabels(filterApprovedRecords(inboundRecords))
                    .map((label) => ({
                      ...label,
                      status: 'IN',
                      qrCode: label.labelNo,
                    }))
                    .map((label) => (
                      <motion.div
                        key={label.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${selectedLabels.has(label.id) ? 'border-blue-400 bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedLabels.has(label.id)}
                              onCheckedChange={(checked) => {
                                setSelectedLabels((prev) => {
                                  const next = new Set(prev);
                                  if (checked) {
                                    next.add(label.id);
                                  } else {
                                    next.delete(label.id);
                                  }
                                  return next;
                                });
                              }}
                            />
                            <div>
                              <h3 className="font-medium text-lg">{label.labelNo}</h3>
                              <p className="text-sm text-gray-600">{label.materialName}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700">{tc('stockedIn')}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('inboundNo')}：</span>
                            <span className="font-medium">{label.orderNo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{tc('specification')}：</span>
                            <span>{label.specification || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('qtyUnit')}：</span>
                            <span>
                              {label.item?.quantity || 0} {label.item?.unit || ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{tc('supplier')}：</span>
                            <span>{label.supplier || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('inboundTime')}：</span>
                            <span>
                              {label.inboundTime
                                ? new Date(label.inboundTime).toLocaleString(locale)
                                : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateQRCode(label.id, label.labelNo)}
                            className="flex-1 min-w-[80px]"
                          >
                            <QrCode className="w-3 h-3 mr-1" />
                            {t('qrCode')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 min-w-[80px] text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => {
                              setPrintLabels([label]);
                              setIsPrintPreviewOpen(true);
                            }}
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            {tc('print')}
                          </Button>
                          {isCuttableMaterial(label.materialName) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCurrentLabel({
                                  ...label,
                                  material_name: label.materialName,
                                  material_spec: label.specification,
                                  supplier_name: label.supplier,
                                  order_no: label.orderNo,
                                  quantity: label.item?.quantity || 0,
                                  unit: label.item?.unit || '',
                                  batch_no: label.item?.batch_no || '',
                                  material_code: label.item?.material_code || '',
                                });
                                setCuttingForm((prev) => ({ ...prev, cutWidths: '', remark: '' }));
                                setIsCuttingDialogOpen(true);
                              }}
                              className="flex-1 min-w-[80px] text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <Scissors className="w-3 h-3 mr-1" />
                              {t('cut')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQRCodeView(label)}
                            className="flex-1 min-w-[80px]"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {tc('details')}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 删除确认对话框 */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.status === 'approved' || deleteTarget?.status === 'completed'
                  ? t('deleteWarningMessage')
                  : t('confirmDeleteInbound')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
              >
                {tc('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 对话框组件 */}
        <InboundDialogs
          isCuttingDialogOpen={isCuttingDialogOpen}
          setIsCuttingDialogOpen={setIsCuttingDialogOpen}
          cuttingForm={cuttingForm}
          setCuttingForm={setCuttingForm}
          currentLabel={currentLabel}
          handleCutting={handleCutting}
          isCuttingResultOpen={isCuttingResultOpen}
          setIsCuttingResultOpen={setIsCuttingResultOpen}
          printLabels={printLabels}
          isQRCodeDialogOpen={isQRCodeDialogOpen}
          setIsQRCodeDialogOpen={setIsQRCodeDialogOpen}
          qrCodeDataUrl={qrCodeDataUrl}
          isPrintPreviewOpen={isPrintPreviewOpen}
          setIsPrintPreviewOpen={setIsPrintPreviewOpen}
          isQRScanDialogOpen={isQRScanDialogOpen}
          setIsQRScanDialogOpen={setIsQRScanDialogOpen}
          scanResult={scanResult}
          isGenerateDialogOpen={isGenerateDialogOpen}
          setIsGenerateDialogOpen={setIsGenerateDialogOpen}
          labelSupplier={labelSupplier}
          setLabelSupplier={setLabelSupplier}
          suppliers={suppliers}
          isAddDialogOpen={isAddDialogOpen}
          setIsAddDialogOpen={setIsAddDialogOpen}
          formData={formData}
          setFormData={setFormData}
          warehouseCategories={warehouseCategories}
          poSearchResults={poSearchResults}
          poSearchLoading={poSearchLoading}
          poDropdownVisible={poDropdownVisible}
          setPoDropdownVisible={setPoDropdownVisible}
          handlePoSearchChange={handlePoSearchChange}
          handlePoSelect={handlePoSelect}
          fetchInboundRecords={fetchInboundRecords}
          isMixedAddDialogOpen={isMixedAddDialogOpen}
          setIsMixedAddDialogOpen={setIsMixedAddDialogOpen}
          isAuditDialogOpen={isAuditDialogOpen}
          setIsAuditDialogOpen={setIsAuditDialogOpen}
          currentRecord={currentRecord}
          isEditDialogOpen={isEditDialogOpen}
          setIsEditDialogOpen={setIsEditDialogOpen}
        />
      </div>
    </MainLayout>
  );
}
