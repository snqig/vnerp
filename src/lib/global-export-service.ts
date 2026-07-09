/**
 * @module global-export-service
 * @description 全局统一导出服务 — 支持 Excel/PDF/Word/CSV/Print 五种格式。
 *   前端通用，无需后端配合。所有表格页面统一调用本服务。
 *
 *   支持的导出格式:
 *   - Excel (.xlsx) — 基于 SheetJS (xlsx)
 *   - PDF (.pdf) — 基于 jsPDF + autoTable
 *   - Word (.docx) — 基于 docx 库
 *   - CSV (.csv) — 原生实现，带 BOM
 *   - Print — 浏览器原生打印
 *
 *   使用方式:
 *   ```ts
 *   GlobalExportService.export({
 *     format: 'excel',
 *     filename: '销售订单列表',
 *     title: '销售订单列表',
 *     columns: [
 *       { key: 'orderNo', label: '订单号', width: 20 },
 *       { key: 'customer', label: '客户', width: 30 },
 *     ],
 *     data: [
 *       { orderNo: 'SO-001', customer: '客户A' },
 *     ],
 *   });
 *   ```
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';

// ──────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────

export type ExportFormat = 'excel' | 'pdf' | 'word' | 'csv' | 'print';

export interface ExportColumn {
  /** 数据键 */
  key: string;
  /** 列标题 */
  label: string;
  /** 列宽（Excel 列宽 / PDF 列宽百分比） */
  width?: number;
  /** 值格式化函数 */
  formatter?: (value: Loose, row: Loose) => string | number;
}

export interface ExportOptions {
  /** 导出格式 */
  format: ExportFormat;
  /** 文件名（不含扩展名） */
  filename: string;
  /** 报表标题（显示在文档顶部） */
  title?: string;
  /** 列定义 */
  columns: ExportColumn[];
  /** 数据行 */
  data: Record<string, Loose>[];
  /** 副标题/描述 */
  subtitle?: string;
  /** 是否横向（仅 PDF） */
  landscape?: boolean;
  /** 页脚信息 */
  footer?: string;
  /** 导出时间（默认当前时间） */
  exportTime?: Date;
}

// ──────────────────────────────────────────────
// 服务实现
// ──────────────────────────────────────────────

class GlobalExportServiceClass {
  /**
   * 统一导出入口
   */
  async export(options: ExportOptions): Promise<void> {
    switch (options.format) {
      case 'excel':
        return this.exportToExcel(options);
      case 'pdf':
        return this.exportToPDF(options);
      case 'word':
        return this.exportToWord(options);
      case 'csv':
        return this.exportToCSV(options);
      case 'print':
        return this.print(options);
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  // ─── Excel 导出 ───

  async exportToExcel(options: ExportOptions): Promise<void> {
    const { filename, title, columns, data, exportTime } = options;
    const now = exportTime || new Date();

    // 构建工作表数据
    const header = columns.map((c) => c.label);
    const rows = data.map((row) =>
      columns.map((col) => {
        const rawValue = row[col.key];
        if (col.formatter) return col.formatter(rawValue, row);
        return rawValue ?? '';
      })
    );

    // 添加标题行和导出时间
    const sheetData: (string | number)[][] = [];
    if (title) {
      sheetData.push([title]);
      sheetData.push([`导出时间: ${now.toLocaleString('zh-CN')}`]);
      sheetData.push([]);
    }
    sheetData.push(header);
    sheetData.push(...rows);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // 设置列宽
    ws['!cols'] = columns.map((c) => ({ wch: c.width || 15 }));

    // 合并标题行
    if (title) {
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
      ];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${filename}.xlsx`);
  }

  // ─── PDF 导出 ───

  async exportToPDF(options: ExportOptions): Promise<void> {
    const { filename, title, columns, data, subtitle, landscape, footer, exportTime } = options;
    const now = exportTime || new Date();

    const doc = new jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 设置中文字体（使用 jsPDF 内置的 Helvetica 作为 fallback）
    // 注: 完整中文支持需嵌入中文字体文件，此处用英文标题 + 中文数据

    // 标题
    if (title) {
      doc.setFontSize(16);
      doc.text(title, 14, 15);
    }

    // 副标题/导出时间
    doc.setFontSize(9);
    doc.setTextColor(128);
    const subtitleText = subtitle
      ? `${subtitle}  |  ${now.toLocaleString('zh-CN')}`
      : `Export: ${now.toLocaleString('zh-CN')}`;
    doc.text(subtitleText, 14, title ? 21 : 15);
    doc.setTextColor(0);

    // 表格
    const head = [columns.map((c) => c.label)];
    const body = data.map((row) =>
      columns.map((col) => {
        const rawValue = row[col.key];
        if (col.formatter) return String(col.formatter(rawValue, row));
        return String(rawValue ?? '');
      })
    );

    autoTable(doc, {
      head,
      body,
      startY: title ? 25 : 19,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: columns.reduce(
        (acc, col, idx) => {
          if (col.width) {
            acc[idx] = { cellWidth: col.width };
          }
          return acc;
        },
        {} as Record<number, { cellWidth: number }>
      ),
    });

    // 页脚
    const finalY = (doc as Loose).lastAutoTable?.finalY || 25;
    if (footer) {
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(footer, 14, finalY + 10);
    }

    // 页码
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${i} / ${pageCount}`,
        doc.internal.pageSize.getWidth() - 30,
        doc.internal.pageSize.getHeight() - 8
      );
    }

    doc.save(`${filename}.pdf`);
  }

  // ─── Word 导出 ───

  async exportToWord(options: ExportOptions): Promise<void> {
    const { filename, title, columns, data, subtitle, exportTime } = options;
    const now = exportTime || new Date();

    // 标题段落
    const children: (Paragraph | Table)[] = [];

    if (title) {
      children.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: subtitle
              ? `${subtitle}  |  导出时间: ${now.toLocaleString('zh-CN')}`
              : `导出时间: ${now.toLocaleString('zh-CN')}`,
            size: 18,
            color: '808080',
          }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );

    children.push(new Paragraph({ text: '' })); // 空行

    // 表格
    const headerRow = new TableRow({
      tableHeader: true,
      children: columns.map(
        (col) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: col.label, bold: true, size: 20 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: '2563EB' },
          })
      ),
    });

    const dataRows = data.map(
      (row) =>
        new TableRow({
          children: columns.map((col) => {
            const rawValue = row[col.key];
            const displayValue = col.formatter
              ? String(col.formatter(rawValue, row))
              : String(rawValue ?? '');
            return new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: displayValue, size: 20 })],
                }),
              ],
            });
          }),
        })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    children.push(table);

    if (options.footer) {
      children.push(new Paragraph({ text: '' }));
      children.push(
        new Paragraph({
          children: [new TextRun({ text: options.footer, size: 16, color: '808080' })],
        })
      );
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  }

  // ─── CSV 导出 ───

  async exportToCSV(options: ExportOptions): Promise<void> {
    const { filename, columns, data, exportTime } = options;
    const _now = exportTime || new Date();

    const header = columns.map((c) => this.escapeCSV(c.label)).join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const rawValue = row[col.key];
          const value = col.formatter ? col.formatter(rawValue, row) : (rawValue ?? '');
          return this.escapeCSV(String(value));
        })
        .join(',')
    );

    // BOM + 内容
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  }

  // ─── 打印 ───

  async print(options: ExportOptions): Promise<void> {
    const { title, columns, data, subtitle, exportTime } = options;
    const now = exportTime || new Date();

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) {
      alert('请允许弹出窗口以使用打印功能');
      return;
    }

    const head = columns.map((c) => `<th>${c.label}</th>`).join('');
    const body = data
      .map(
        (row) =>
          `<tr>${columns
            .map((col) => {
              const rawValue = row[col.key];
              const value = col.formatter ? col.formatter(rawValue, row) : (rawValue ?? '');
              return `<td>${value}</td>`;
            })
            .join('')}</tr>`
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title || '打印'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; }
          h1 { font-size: 18px; text-align: center; margin-bottom: 5px; }
          .meta { text-align: right; font-size: 11px; color: #64748b; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #2563EB; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; }
          td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        ${title ? `<h1>${title}</h1>` : ''}
        <div class="meta">${subtitle ? `${subtitle} | ` : ''}导出时间: ${now.toLocaleString('zh-CN')}</div>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
        ${options.footer ? `<div class="footer">${options.footer}</div>` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  // ─── 工具方法 ───

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

export const GlobalExportService = new GlobalExportServiceClass();
