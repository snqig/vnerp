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
  sampleData?: Record<string, Loose>[];
  /** 模板说明 */
  templateDescription?: string;
  /** 导入确认回调 */
  onConfirm: (validRows: Record<string, Loose>[]) => Promise<void> | void;
  /** 自定义校验函数 */
  onValidate?: (row: Record<string, Loose>, rowIndex: number) => string | null;
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
      toast.success(t('templateDownloaded') || '模板下载成功');
    } catch (error) {
      toast.error(`${t('templateDownloadFailed') || '模板下载失败'}: ${(error as Error).message}`);
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
            `${importResult.validCount} ${t('validRows') || '行有效'}, ${importResult.invalidCount} ${t('invalidRows') || '行有错误'}`
          );
        } else {
          toast.success(`${importResult.validCount} ${t('rowsParsed') || '行解析成功'}`);
        }
      } catch (error) {
        toast.error(`${t('parseFailed') || '解析失败'}: ${(error as Error).message}`);
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
      toast.success(`${result.validRows.length} ${t('rowsImported') || '行导入成功'}`);
      handleClose();
    } catch (error) {
      toast.error(`${t('importFailed') || '导入失败'}: ${(error as Error).message}`);
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
            {title || t('importData') || '数据导入'}
          </DialogTitle>
          <DialogDescription>
            {t('importDescription') || '下载模板填写数据后上传，支持 .xlsx / .csv 格式'}
          </DialogDescription>
        </DialogHeader>

        {/* 步骤 1: 下载模板 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium">
                  {t('step1DownloadTemplate') || '步骤 1: 下载导入模板'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('templateDescription') || '填写数据时请遵循模板格式'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              {t('downloadTemplate') || '下载模板'}
            </Button>
          </div>

          {/* 步骤 2: 上传文件 */}
          <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2">
              <Upload className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium">
                  {t('step2UploadFile') || '步骤 2: 上传填写好的文件'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fileName || t('noFileSelected') || '未选择文件'}
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
              {importing ? t('parsing') || '解析中...' : t('selectFile') || '选择文件'}
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
                    {t('valid') || '有效'}: {result.validCount}
                  </span>
                </div>
                {result.invalidCount > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium">
                      {t('invalid') || '无效'}: {result.invalidCount}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t('total') || '总计'}: {result.totalRows}
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
                          <span className="font-medium">行 {row.rowIndex}:</span>{' '}
                          {row.errors.join('; ')}
                        </div>
                      ))}
                      {result.invalidRows.length > 20 && (
                        <div className="text-xs text-muted-foreground">
                          ...{t('andMore') || '还有'} {result.invalidRows.length - 20}{' '}
                          {t('errors') || '条错误'}
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
                      {t('showingFirst') || '显示前'} 10 {t('of') || '/'} {result.validRows.length}{' '}
                      {t('rows') || '行'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('cancel') || '取消'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!result || result.validRows.length === 0 || importing}
          >
            {importing
              ? t('importing') || '导入中...'
              : `${t('import') || '导入'}${result ? ` (${result.validCount})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
