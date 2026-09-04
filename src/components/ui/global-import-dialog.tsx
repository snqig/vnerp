'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { GlobalImportService, ImportColumn, ImportResult } from '@/lib/global-import-service';
import { toast } from 'sonner';

export interface GlobalImportDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onOpenChange: (open: boolean) => void;
  /** 导入模板文件名 */
  templateFilename: string;
  /** 列定义 */
  columns: ImportColumn[];
  /** 示例数据 */
  sampleData?: Record<string, unknown>[];
  /** 模板说明 */
  templateDescription?: string;
  /** 导入确认回调 */
  onConfirm: (validRows: Record<string, unknown>[]) => Promise<void> | void;
  /** 自定义校验函数 */
  onValidate?: (row: Record<string, unknown>, rowIndex: number) => string | null;
  /** Dialog 标题 */
  title?: string;
}

export function GlobalImportDialog({
  open,
  onOpenChange,
  templateFilename,
  columns,
  sampleData,
  templateDescription,
  onConfirm,
  onValidate,
  title,
}: GlobalImportDialogProps) {
  const tc = useTranslations('Common');
  const ts = useTranslations('Common');
  const t = useTranslations('Common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDownloadTemplate = useCallback(async () => {
    try {
      await GlobalImportService.downloadTemplate({
        filename: templateFilename,
        columns,
        sampleData,
        description: templateDescription,
      });
      toast.success(t('templateDownloaded') || tc('templateDownloaded'));
    } catch (error) {
      toast.error(`${t('templateDownloadFailed') || tc('templateDownloadFailed')}: ${(error as Error).message}`);
    }
  }, [templateFilename, columns, sampleData, templateDescription, t]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      setImporting(true);
      try {
        const importResult = await GlobalImportService.parseAndValidate(file, {
          columns,
          onValidate,
        });
        setResult(importResult);

        if (importResult.hasErrors) {
          toast.warning(
            `${importResult.validCount} ${t('validRows') || tc('validRows')}, ${importResult.invalidCount} ${t('invalidRows') || tc('invalidRows')}`
          );
        } else {
          toast.success(`${importResult.validCount} ${t('rowsParsed') || tc('rowsParsed')}`);
        }
      } catch (error) {
        toast.error(`${t('parseFailed') || tc('parseFailed')}: ${(error as Error).message}`);
      } finally {
        setImporting(false);
      }
    },
    [columns, onValidate, t]
  );

  const handleConfirm = useCallback(async () => {
    if (!result || result.validRows.length === 0) return;

    setImporting(true);
    try {
      await onConfirm(result.validRows);
      toast.success(`${result.validRows.length} ${t('rowsImported') || tc('rowsImported')}`);
      handleClose();
    } catch (error) {
      toast.error(`${t('importFailed') || tc('importFailed')}: ${(error as Error).message}`);
    } finally {
      setImporting(false);
    }
  }, [result, onConfirm, t]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setResult(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {title || t('importData') || tc('importData')}
          </DialogTitle>
          <DialogDescription>
            {t('importDescription') || tc('importDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* 步骤 1: 下载模板 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium">
                  {t('step1DownloadTemplate') || tc('step1DownloadTemplate')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('templateDescription') || tc('templateDescription')}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              {t('downloadTemplate') || tc('downloadTemplate')}
            </Button>
          </div>

          {/* 步骤 2: 上传文件 */}
          <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2">
              <Upload className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium">
                  {t('step2UploadFile') || tc('step2UploadFile')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fileName || t('noFileSelected') || tc('noFileSelected')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? t('parsing') || tc('parsing') : t('selectFile') || tc('selectFile')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 步骤 3: 校验结果 */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">
                    {t('valid') || ts('k_kgwvlw')}: {result.validCount}
                  </span>
                </div>
                {result.invalidCount > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium">
                      {t('invalid') || tc('invalid')}: {result.invalidCount}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t('total') || ts('k_65h3fl')}: {result.totalRows}
                  </span>
                </div>
              </div>

              {/* 错误详情 */}
              {result.invalidRows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.invalidRows.slice(0, 20).map((row, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-medium">{tc('analysisRowsSuffix')}{row.rowIndex}:</span>{' '}
                          {row.errors.join('; ')}
                        </div>
                      ))}
                      {result.invalidRows.length > 20 && (
                        <div className="text-xs text-muted-foreground">
                          ...{t('andMore') || tc('andMore')} {result.invalidRows.length - 20}{' '}
                          {t('errors') || tc('errors')}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* 有效数据预览 */}
              {result.validRows.length > 0 && (
                <div className="rounded-lg border">
                  <div className="max-h-48 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns.map((col) => (
                            <TableHead key={col.key} className="text-xs">
                              {col.label}
                              {col.required && <span className="text-red-500 ml-0.5">*</span>}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.validRows.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            {columns.map((col) => (
                              <TableCell key={col.key} className="text-xs">
                                {String(row[col.key] ?? '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {result.validRows.length > 10 && (
                    <div className="border-t px-3 py-1.5 text-xs text-muted-foreground text-center">
                      {t('showingFirst') || tc('showingFirst')} 10 {t('of') || '/'} {result.validRows.length}{' '}
                      {t('rows') || tc('analysisRowsSuffix')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('cancel') || ts('k_1589w37')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!result || result.validRows.length === 0 || importing}
          >
            {importing
              ? t('importing') || ts('k_1rds3qh')
              : `${t('import') || ts('k_1m1mu7u')}${result ? ` (${result.validCount})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
