'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Printer, Download, FileText, FileSpreadsheet, File } from 'lucide-react';

interface TableExportToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onPrint: () => void;
  onExportPDF: () => void;
  onExportXLS: () => void;
  onExportWORD: () => void;
}

export function TableExportToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onPrint,
  onExportPDF,
  onExportXLS,
  onExportWORD,
}: TableExportToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {selectedCount > 0 && (
        <span className="text-sm text-muted-foreground mr-1">
          已选 {selectedCount}/{totalCount} 项
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={onPrint}
      >
        <Printer className="h-3.5 w-3.5 mr-1.5" />
        打印
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            导出
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportPDF}>
            <FileText className="h-4 w-4 mr-2 text-red-500" />
            导出 PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportXLS}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            导出 XLS
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportWORD}>
            <File className="h-4 w-4 mr-2 text-blue-500" />
            导出 WORD
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function exportToCSV(data: Record<string, any>[], filename: string, columns: { key: string; header: string }[]) {
  const BOM = '\uFEFF';
  const headerRow = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = String(row[c.key] ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(',')
  );
  const csv = BOM + headerRow + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToHTML(data: Record<string, any>[], filename: string, columns: { key: string; header: string }[], title: string) {
  const headerCells = columns.map(c => `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;font-weight:bold;text-align:left">${c.header}</th>`).join('');
  const rows = data.map(row =>
    '<tr>' + columns.map(c => `<td style="border:1px solid #ccc;padding:6px 10px">${String(row[c.key] ?? '')}</td>`).join('') + '</tr>'
  ).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:'Microsoft YaHei',sans-serif;padding:20px}h1{font-size:18px;margin-bottom:12px}table{border-collapse:collapse;width:100%}</style></head><body><h1>${title}</h1><table>${headerCells}${rows}</table></body></html>`;
  return html;
}

export function printTable(data: Record<string, any>[], columns: { key: string; header: string }[], title: string) {
  const html = exportToHTML(data, 'print', columns, title);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  }
}

export function exportTableToPDF(data: Record<string, any>[], filename: string, columns: { key: string; header: string }[], title: string) {
  const html = exportToHTML(data, filename, columns, title);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  }
}

export function exportTableToXLS(data: Record<string, any>[], filename: string, columns: { key: string; header: string }[]) {
  const BOM = '\uFEFF';
  const headerRow = columns.map(c => c.header).join('\t');
  const rows = data.map(row =>
    columns.map(c => String(row[c.key] ?? '')).join('\t')
  );
  const xls = BOM + headerRow + '\n' + rows.join('\n');
  const blob = new Blob([xls], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportTableToWORD(data: Record<string, any>[], filename: string, columns: { key: string; header: string }[], title: string) {
  const headerCells = columns.map(c => `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;font-weight:bold">${c.header}</th>`).join('');
  const rows = data.map(row =>
    '<tr>' + columns.map(c => `<td style="border:1px solid #ccc;padding:6px 10px">${String(row[c.key] ?? '')}</td>`).join('') + '</tr>'
  ).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:'Microsoft YaHei',sans-serif;padding:20px}h1{font-size:18px;margin-bottom:12px}table{border-collapse:collapse;width:100%}</style></head><body><h1>${title}</h1><table>${headerCells}${rows}</table></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.doc`;
  link.click();
  URL.revokeObjectURL(link.href);
}
