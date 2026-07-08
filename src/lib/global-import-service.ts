/**
 * @module global-import-service
 * @description 全局统一导入服务 — 支持 Excel/CSV 文件解析、Zod 校验、错误报告。
 *   前端通用，配合 <GlobalImportDialog> 组件使用。
 *
 *   使用方式:
 *   ```ts
 *   const result = await GlobalImportService.parseAndValidate(file, {
 *     columns: [
 *       { key: 'materialCode', label: '物料编码', required: true },
 *       { key: 'materialName', label: '物料名称', required: true },
 *       { key: 'quantity', label: '数量', type: 'number', required: true },
 *     ],
 *     onValidate: (row) => {
 *       if (row.quantity <= 0) return '数量必须大于0';
 *       return null;
 *     },
 *   });
 *   // result.validRows, result.invalidRows, result.errors
 *   ```
 */

import * as XLSX from 'xlsx';

// ──────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────

export interface ImportColumn {
  /** 数据键 */
  key: string;
  /** 列标题（用于匹配 Excel 列头） */
  label: string;
  /** 是否必填 */
  required?: boolean;
  /** 值类型 */
  type?: 'string' | 'number' | 'date';
  /** 默认值 */
  defaultValue?: any;
}

export interface ImportOptions {
  /** 列定义 */
  columns: ImportColumn[];
  /** 自定义校验函数（返回错误消息或 null） */
  onValidate?: (row: Record<string, any>, rowIndex: number) => string | null;
  /** 跳过空行 */
  skipEmptyRows?: boolean;
  /** 最大行数 */
  maxRows?: number;
}

export interface ImportRowResult {
  row: Record<string, any>;
  rowIndex: number;
  valid: boolean;
  errors: string[];
}

export interface ImportResult {
  /** 有效行 */
  validRows: Record<string, any>[];
  /** 无效行 */
  invalidRows: ImportRowResult[];
  /** 总行数 */
  totalRows: number;
  /** 有效行数 */
  validCount: number;
  /** 无效行数 */
  invalidCount: number;
  /** 是否有错误 */
  hasErrors: boolean;
}

export interface ImportTemplateOptions {
  /** 模板文件名 */
  filename: string;
  /** 列定义 */
  columns: ImportColumn[];
  /** 示例数据 */
  sampleData?: Record<string, any>[];
  /** 模板说明 */
  description?: string;
}

// ──────────────────────────────────────────────
// 服务实现
// ──────────────────────────────────────────────

class GlobalImportServiceClass {
  /**
   * 解析 Excel/CSV 文件并校验
   */
  async parseAndValidate(
    file: File,
    options: ImportOptions
  ): Promise<ImportResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // 转为 JSON，使用列标题作为 key
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false,
    });

    return this.validateData(rawData, options);
  }

  /**
   * 校验已解析的数据
   */
  validateData(
    rawData: Record<string, any>[],
    options: ImportOptions
  ): ImportResult {
    const { columns, onValidate, skipEmptyRows = true, maxRows = 10000 } = options;

    // 列标题 → 列定义的映射（支持模糊匹配）
    const labelToColumn = new Map<string, ImportColumn>();
    for (const col of columns) {
      labelToColumn.set(col.label, col);
      labelToColumn.set(col.key, col);
      // 去空格匹配
      labelToColumn.set(col.label.trim(), col);
    }

    const validRows: Record<string, any>[] = [];
    const invalidRows: ImportRowResult[] = [];
    const totalRows = Math.min(rawData.length, maxRows);

    for (let i = 0; i < totalRows; i++) {
      const rawRow = rawData[i];

      // 跳过空行
      if (skipEmptyRows && this.isEmptyRow(rawRow)) {
        continue;
      }

      // 映射列
      const mappedRow: Record<string, any> = {};
      const errors: string[] = [];

      for (const col of columns) {
        let value: any = '';

        // 尝试匹配列标题
        for (const [label, colDef] of labelToColumn.entries()) {
          if (colDef.key === col.key && rawRow[label] !== undefined && rawRow[label] !== '') {
            value = rawRow[label];
            break;
          }
        }

        // 类型转换
        if (col.type === 'number') {
          value = value === '' || value === null ? null : parseFloat(value);
          if (isNaN(value as number)) value = null;
        } else if (col.type === 'date') {
          if (value) {
            const date = new Date(value);
            value = isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
          }
        }

        // 默认值
        if ((value === null || value === '' || value === undefined) && col.defaultValue !== undefined) {
          value = col.defaultValue;
        }

        // 必填校验
        if (col.required && (value === null || value === '' || value === undefined)) {
          errors.push(`列"${col.label}"不能为空`);
        }

        mappedRow[col.key] = value;
      }

      // 自定义校验
      if (onValidate) {
        const customError = onValidate(mappedRow, i);
        if (customError) {
          errors.push(customError);
        }
      }

      if (errors.length > 0) {
        invalidRows.push({ row: mappedRow, rowIndex: i + 1, valid: false, errors });
      } else {
        validRows.push(mappedRow);
      }
    }

    return {
      validRows,
      invalidRows,
      totalRows,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      hasErrors: invalidRows.length > 0,
    };
  }

  /**
   * 生成导入模板
   */
  async downloadTemplate(options: ImportTemplateOptions): Promise<void> {
    const { filename, columns, sampleData, description } = options;

    const header = columns.map((c) => c.label);
    const sheetData: (string | number)[][] = [];

    if (description) {
      sheetData.push([description]);
      sheetData.push([]);
    }

    sheetData.push(header);

    // 添加示例数据
    if (sampleData && sampleData.length > 0) {
      for (const sample of sampleData) {
        sheetData.push(
          columns.map((col) => sample[col.key] ?? '')
        );
      }
    }

    // 添加说明行
    sheetData.push([]);
    sheetData.push(['字段说明:']);
    for (const col of columns) {
      const req = col.required ? ' (必填)' : ' (选填)';
      const type = col.type ? ` [${col.type}]` : '';
      sheetData.push([`${col.label}${req}${type}`]);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = columns.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入模板');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const { saveAs } = await import('file-saver');
    saveAs(blob, `${filename}_导入模板.xlsx`);
  }

  /**
   * 检查是否为空行
   */
  private isEmptyRow(row: Record<string, any>): boolean {
    return Object.values(row).every(
      (v) => v === '' || v === null || v === undefined
    );
  }
}

export const GlobalImportService = new GlobalImportServiceClass();
