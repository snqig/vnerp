import * as XLSX from 'xlsx';
import { ZodSchema, z } from 'zod';
import { secureLog } from '@/lib/logger';

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: any, row: any) => string;
}

export interface ExportOptions {
  fileName: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: any[];
  title?: string;
  author?: string;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: ImportValidationError[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface ImportTemplate {
  sheetName: string;
  headers: string[];
  sampleData?: any[];
  validationRules?: Record<
    string,
    {
      required?: boolean;
      type?: 'string' | 'number' | 'date' | 'boolean';
      min?: number;
      max?: number;
      pattern?: string;
      enum?: string[];
      custom?: (value: any) => boolean | string;
    }
  >;
}

export class ExcelExportService {
  static exportToExcel(options: ExportOptions): Buffer {
    const workbook = XLSX.utils.book_new();
    const worksheetData: any[][] = [];

    if (options.title) {
      worksheetData.push([options.title]);
      worksheetData.push([]);
    }

    const headers = options.columns.map((col) => col.header);
    worksheetData.push(headers);

    for (const row of options.data) {
      const rowData = options.columns.map((col) => {
        const value = row[col.key];
        if (col.formatter) {
          return col.formatter(value, row);
        }
        return value ?? '';
      });
      worksheetData.push(rowData);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    if (options.columns.length > 0) {
      worksheet['!cols'] = options.columns.map((col) => ({
        wch: col.width || 15,
      }));
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Sheet1');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    secureLog('info', 'Excel exported', {
      fileName: options.fileName,
      rowCount: options.data.length,
    });

    return buffer as Buffer;
  }

  static exportToCSV(options: Omit<ExportOptions, 'fileName'>): string {
    const worksheetData: any[][] = [];

    if (options.title) {
      worksheetData.push([options.title]);
      worksheetData.push([]);
    }

    const headers = options.columns.map((col) => col.header);
    worksheetData.push(headers);

    for (const row of options.data) {
      const rowData = options.columns.map((col) => {
        const value = row[col.key];
        if (col.formatter) {
          return col.formatter(value, row);
        }
        return value ?? '';
      });
      worksheetData.push(rowData);
    }

    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(worksheetData));

    secureLog('info', 'CSV exported', {
      rowCount: options.data.length,
    });

    return csv;
  }

  static generateTemplate(template: ImportTemplate): Buffer {
    const workbook = XLSX.utils.book_new();
    const worksheetData: any[][] = [];

    // 注意: 模板生成时无法获取locale,这些文本需要在调用时传入翻译后的文本
    worksheetData.push([template.sheetName + ' - Import Template']);
    worksheetData.push(['Note: Columns marked with * are required']);
    worksheetData.push([]);

    const headers = template.headers.map((h, index) => {
      const rule = template.validationRules?.[index.toString()];
      if (rule?.required) {
        return h + ' *';
      }
      return h;
    });
    worksheetData.push(headers);

    if (template.sampleData && template.sampleData.length > 0) {
      worksheetData.push([]);
      worksheetData.push(['Sample Data:']);
      for (const sample of template.sampleData) {
        worksheetData.push(Object.values(sample));
      }
    }

    worksheetData.push([]);
    worksheetData.push(['Instructions:']);
    worksheetData.push(['1. Columns with * are required']);
    worksheetData.push(['2. Date format: YYYY-MM-DD']);
    worksheetData.push(['3. Number format: No commas']);

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return buffer as Buffer;
  }
}

export class ExcelImportService {
  static parseExcelFile(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    return data;
  }

  static async importWithValidation<T>(
    buffer: Buffer,
    schema: ZodSchema<T>,
    options?: {
      skipEmptyRows?: boolean;
      headerRow?: number;
    }
  ): Promise<ImportResult<T>> {
    const data = this.parseExcelFile(buffer);

    const errors: ImportValidationError[] = [];
    const validData: T[] = [];
    const skipEmpty = options?.skipEmptyRows ?? true;
    const headerRow = options?.headerRow ?? 2;

    for (let i = headerRow; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 1;

      if (skipEmpty && this.isEmptyRow(row)) {
        continue;
      }

      const result = schema.safeParse(row);

      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            row: rowNumber,
            field: issue.path.join('.'),
            message: issue.message,
            value: (row as any)[issue.path[0] as string],
          });
        }
      } else {
        validData.push(result.data);
      }
    }

    return {
      success: errors.length === 0,
      data: validData,
      errors,
      totalRows: data.length - headerRow,
      validRows: validData.length,
      invalidRows: errors.length > 0 ? Math.ceil(errors.length / 3) : 0,
    };
  }

  static validateAgainstTemplate(data: any[], template: ImportTemplate): ImportValidationError[] {
    const errors: ImportValidationError[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2;

      for (const [fieldKey, rules] of Object.entries(template.validationRules || {})) {
        const fieldIndex = parseInt(fieldKey);
        const headerName = template.headers[fieldIndex];
        const value = row[headerName];

        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({
            row: rowNumber,
            field: headerName,
            message: 'Required field cannot be empty',
            value,
          });
          continue;
        }

        if (value === undefined || value === null || value === '') {
          continue;
        }

        if (rules.type === 'number') {
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              row: rowNumber,
              field: headerName,
              message: 'Must be a valid number',
              value,
            });
          } else {
            if (rules.min !== undefined && numValue < rules.min) {
              errors.push({
                row: rowNumber,
                field: headerName,
                message: `Cannot be less than ${rules.min}`,
                value,
              });
            }
            if (rules.max !== undefined && numValue > rules.max) {
              errors.push({
                row: rowNumber,
                field: headerName,
                message: `Cannot be greater than ${rules.max}`,
                value,
              });
            }
          }
        }

        if (rules.type === 'date') {
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            errors.push({
              row: rowNumber,
              field: headerName,
              message: 'Invalid date format, please use YYYY-MM-DD',
              value,
            });
          }
        }

        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push({
            row: rowNumber,
            field: headerName,
            message: 'Must be text',
            value,
          });
        }

        if (rules.pattern) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(String(value))) {
            errors.push({
              row: rowNumber,
              field: headerName,
              message: 'Invalid format',
              value,
            });
          }
        }

        if (rules.enum && rules.enum.length > 0) {
          if (!rules.enum.includes(String(value))) {
            errors.push({
              row: rowNumber,
              field: headerName,
              message: `Value must be one of: ${rules.enum.join(', ')}`,
              value,
            });
          }
        }

        if (rules.custom) {
          const customResult = rules.custom(value);
          if (customResult !== true && typeof customResult === 'string') {
            errors.push({
              row: rowNumber,
              field: headerName,
              message: customResult,
              value,
            });
          }
        }
      }
    }

    return errors;
  }

  private static isEmptyRow(row: any): boolean {
    return Object.values(row).every(
      (value) => value === undefined || value === null || value === ''
    );
  }
}

export const materialImportSchema = z.object({
  '物料编码 *': z.string().min(1, '物料编码不能为空'),
  '物料名称 *': z.string().min(1, '物料名称不能为空'),
  规格型号: z.string().optional(),
  单位: z.string().optional(),
  分类: z.string().optional(),
  安全库存: z.coerce.number().min(0).optional(),
  '采购提前期(天)': z.coerce.number().min(0).optional(),
  备注: z.string().optional(),
});

export const customerImportSchema = z.object({
  '客户编码 *': z.string().min(1, '客户编码不能为空'),
  '客户名称 *': z.string().min(1, '客户名称不能为空'),
  联系人: z.string().optional(),
  联系电话: z.string().optional(),
  地址: z.string().optional(),
  备注: z.string().optional(),
});

export const supplierImportSchema = z.object({
  '供应商编码 *': z.string().min(1, '供应商编码不能为空'),
  '供应商名称 *': z.string().min(1, '供应商名称不能为空'),
  联系人: z.string().optional(),
  联系电话: z.string().optional(),
  地址: z.string().optional(),
  备注: z.string().optional(),
});
