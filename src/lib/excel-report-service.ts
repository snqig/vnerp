import * as XLSX from '@e965/xlsx';
import { secureLog } from '@/lib/logger';

export interface ReportColumnGroup {
  header: string;
  children: ReportColumnLeaf[];
}

export interface ReportColumnLeaf {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: unknown, row: Record<string, unknown>) => string;
}

export type ReportColumnDef = ReportColumnGroup;

export interface ReportExportOptions {
  fileName: string;
  sheetName?: string;
  columnDefs: ReportColumnDef[];
  data: Record<string, unknown>[];
  title?: string;
  freezeRow?: number;
  freezeCol?: number;
}

function getLeafColumns(defs: ReportColumnDef[]): ReportColumnLeaf[] {
  return defs.flatMap((g) => g.children);
}

export function exportReportToExcel(options: ReportExportOptions): Buffer {
  const workbook = XLSX.utils.book_new();
  const wsData: unknown[][] = [];
  const { columnDefs, data, title } = options;

  if (title) wsData.push([title]);

  const topHeaders = columnDefs.map((g) => g.header);
  const subHeaders = columnDefs.flatMap((g) => g.children.map((c) => c.header));

  wsData.push(topHeaders);
  wsData.push(subHeaders);

  const leafCols = getLeafColumns(columnDefs);
  for (const row of data) {
    const rowData = leafCols.map((col) => {
      if (col.formatter) return col.formatter(row[col.key], row);
      return row[col.key] ?? '';
    });
    wsData.push(rowData);
  }

  const colCount = topHeaders.length;
  const rowCount = wsData.length;

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const merges: XLSX.Range[] = [];

  const titleOffset = title ? 1 : 0;

  for (let i = 0; i < colCount; i++) {
    const group = columnDefs[i];
    const childCount = group.children.length;
    if (childCount > 1) {
      const startCol = subHeaders.indexOf(group.children[0].header);
      const endCol = startCol + childCount - 1;
      merges.push({
        s: { r: titleOffset, c: startCol },
        e: { r: titleOffset, c: endCol },
      });
    }
  }

  if (title && colCount > 0) {
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } });
  }

  ws['!merges'] = merges;
  ws['!cols'] = leafCols.map((c) => ({ wch: c.width ?? 15 }));
  ws['!freeze'] = { xSplit: options.freezeCol ?? 0, ySplit: options.freezeRow ?? 2 };

  XLSX.utils.book_append_sheet(workbook, ws, options.sheetName ?? 'Report');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  secureLog('info', 'Report Excel exported', {
    fileName: options.fileName,
    rowCount: data.length,
  });

  return buffer as Buffer;
}
