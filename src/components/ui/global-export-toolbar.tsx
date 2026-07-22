'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  Printer,
  File as FileIcon,
  Upload,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { GlobalExportService, ExportColumn } from '@/lib/global-export-service';
import { toast } from 'sonner';

export interface GlobalExportToolbarProps {
  /** 导出文件名（不含扩展名） */
  filename: string;
  /** 报表标题 */
  title?: string;
  /** 列定义 */
  columns: ExportColumn[];
  /** 数据 */
  data: Record<string, Loose>[];
  /** 副标题 */
  subtitle?: string;
  /** 是否横向（PDF） */
  landscape?: boolean;
  /** 页脚 */
  footer?: string;
  /** 导入按钮回调（不传则不显示导入按钮） */
  onImport?: () => void;
  /** 额外按钮 */
  extraActions?: React.ReactNode;
  /** 允许的导出格式（默认全部） */
  formats?: ('excel' | 'pdf' | 'word' | 'csv' | 'print')[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 按钮文字 */
  buttonText?: string;
  /** 按钮大小 */
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function GlobalExportToolbar({
  filename,
  title,
  columns,
  data,
  subtitle,
  landscape,
  footer,
  onImport,
  extraActions,
  formats = ['excel', 'pdf', 'word', 'csv', 'print'],
  disabled = false,
  buttonText,
  size = 'sm',
}: GlobalExportToolbarProps) {
  const t = useTranslations('Common');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(
    async (format: 'excel' | 'pdf' | 'word' | 'csv' | 'print') => {
      if (data.length === 0) {
        toast.warning(t('noDataToExport') || '暂无可导出的数据');
        return;
      }

      setExporting(true);
      const formatLabels: Record<string, string> = {
        excel: 'Excel',
        pdf: 'PDF',
        word: 'Word',
        csv: 'CSV',
        print: '打印',
      };

      try {
        await GlobalExportService.export({
          format,
          filename,
          title: title || filename,
          columns,
          data,
          subtitle,
          landscape,
          footer,
        });
        toast.success(`${formatLabels[format]} ${t('exportSuccess') || '导出成功'}`);
      } catch (error) {
        console.error('Export error:', error);
        toast.error(
          `${formatLabels[format]} ${t('exportFailed') || '导出失败'}: ${(error as Error).message}`
        );
      } finally {
        setExporting(false);
      }
    },
    [filename, title, columns, data, subtitle, landscape, footer, t]
  );

  const icons = {
    excel: <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />,
    pdf: <FileText className="mr-2 h-4 w-4 text-red-600" />,
    word: <FileType className="mr-2 h-4 w-4 text-blue-600" />,
    csv: <FileIcon className="mr-2 h-4 w-4 text-orange-600" />,
    print: <Printer className="mr-2 h-4 w-4 text-gray-600" />,
  };

  const labels: Record<string, string> = {
    excel: 'Excel (.xlsx)',
    pdf: 'PDF (.pdf)',
    word: 'Word (.docx)',
    csv: 'CSV (.csv)',
    print: t('print') || '打印',
  };

  return (
    <div className="flex items-center gap-2">
      {extraActions}

      {onImport && (
        <Button variant="outline" size={size} onClick={onImport}>
          <Upload className="mr-2 h-4 w-4" />
          {t('import') || '导入'}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled={disabled || exporting || data.length === 0}
          >
            {exporting ? (
              <CheckCircle2 className="mr-2 h-4 w-4 animate-pulse" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {buttonText || t('export') || '导出'}
            <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {formats.map((fmt, _idx) => (
            <DropdownMenuItem
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="cursor-pointer"
            >
              {icons[fmt]}
              <span>{labels[fmt]}</span>
            </DropdownMenuItem>
          ))}
          {formats.length > 1 && formats.includes('print') && <DropdownMenuSeparator />}
        </DropdownMenuContent>
      </DropdownMenu>

      {data.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {data.length} {t('records') || '条'}
        </span>
      )}
    </div>
  );
}
