import { query } from './db';

export interface DocumentNumberingConfig {
  sales_order_prefix: string;
  purchase_order_prefix: string;
  work_order_prefix: string;
  sample_prefix: string;
  purchase_request_prefix: string;
  inbound_prefix: string;
  outbound_prefix: string;
  transfer_prefix: string;
  stocktaking_prefix: string;
  receivable_prefix: string;
  payable_prefix: string;
  voucher_prefix: string;
  receipt_prefix: string;
  payment_prefix: string;
  delivery_prefix: string;
  return_prefix: string;
  reconciliation_prefix: string;
  serial_length: number;
}

const DEFAULT_CONFIG: DocumentNumberingConfig = {
  sales_order_prefix: 'SO',
  purchase_order_prefix: 'PO',
  work_order_prefix: 'WO',
  sample_prefix: 'SP',
  purchase_request_prefix: 'PR',
  inbound_prefix: 'IN',
  outbound_prefix: 'OUT',
  transfer_prefix: 'TR',
  stocktaking_prefix: 'ST',
  receivable_prefix: 'REC',
  payable_prefix: 'PAY',
  voucher_prefix: 'VCH',
  receipt_prefix: 'RPT',
  payment_prefix: 'PMT',
  delivery_prefix: 'DL',
  return_prefix: 'RT',
  reconciliation_prefix: 'RC',
  serial_length: 6,
};

export async function getNumberingConfig(): Promise<DocumentNumberingConfig> {
  try {
    const rows: Loose = await query(
      'SELECT config_key, config_value FROM sys_config WHERE deleted = 0 AND config_key IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        'sales_order_prefix',
        'purchase_order_prefix',
        'work_order_prefix',
        'sample_prefix',
        'purchase_request_prefix',
        'inbound_prefix',
        'outbound_prefix',
        'transfer_prefix',
        'stocktaking_prefix',
        'receivable_prefix',
        'payable_prefix',
        'voucher_prefix',
        'receipt_prefix',
        'payment_prefix',
        'delivery_prefix',
        'return_prefix',
        'reconciliation_prefix',
        'serial_length',
      ]
    );
    const configs: Record<string, string> = {};
    rows.forEach((row: Loose) => {
      configs[row.config_key] = row.config_value;
    });
    return {
      sales_order_prefix: configs['sales_order_prefix'] || DEFAULT_CONFIG.sales_order_prefix,
      purchase_order_prefix:
        configs['purchase_order_prefix'] || DEFAULT_CONFIG.purchase_order_prefix,
      work_order_prefix: configs['work_order_prefix'] || DEFAULT_CONFIG.work_order_prefix,
      sample_prefix: configs['sample_prefix'] || DEFAULT_CONFIG.sample_prefix,
      purchase_request_prefix:
        configs['purchase_request_prefix'] || DEFAULT_CONFIG.purchase_request_prefix,
      inbound_prefix: configs['inbound_prefix'] || DEFAULT_CONFIG.inbound_prefix,
      outbound_prefix: configs['outbound_prefix'] || DEFAULT_CONFIG.outbound_prefix,
      transfer_prefix: configs['transfer_prefix'] || DEFAULT_CONFIG.transfer_prefix,
      stocktaking_prefix: configs['stocktaking_prefix'] || DEFAULT_CONFIG.stocktaking_prefix,
      receivable_prefix: configs['receivable_prefix'] || DEFAULT_CONFIG.receivable_prefix,
      payable_prefix: configs['payable_prefix'] || DEFAULT_CONFIG.payable_prefix,
      voucher_prefix: configs['voucher_prefix'] || DEFAULT_CONFIG.voucher_prefix,
      receipt_prefix: configs['receipt_prefix'] || DEFAULT_CONFIG.receipt_prefix,
      payment_prefix: configs['payment_prefix'] || DEFAULT_CONFIG.payment_prefix,
      delivery_prefix: configs['delivery_prefix'] || DEFAULT_CONFIG.delivery_prefix,
      return_prefix: configs['return_prefix'] || DEFAULT_CONFIG.return_prefix,
      reconciliation_prefix:
        configs['reconciliation_prefix'] || DEFAULT_CONFIG.reconciliation_prefix,
      serial_length: configs['serial_length']
        ? Number(configs['serial_length'])
        : DEFAULT_CONFIG.serial_length,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export type DocumentType =
  | 'sales_order'
  | 'purchase_order'
  | 'work_order'
  | 'sample'
  | 'purchase_request'
  | 'inbound'
  | 'outbound'
  | 'transfer'
  | 'stocktaking'
  // 采购全流程新增
  | 'inquiry' // 询价单
  | 'arrival_notice' // 到货通知单
  | 'iqc' // IQC质检单
  | 'purchase_reconcile' // 对账单
  | 'purchase_settlement' // 结算单
  | 'purchase_return' // 采购退货单
  // 生产全流程新增
  | 'material_pick' // 领料单
  | 'material_return' // 退料单
  | 'process_report' // 工序汇报单
  | 'finish_inbound' // 完工入库单
  // 批次管理新增
  | 'batch' // 批次号
  // 财务管理新增
  | 'receivable' // 应收单
  | 'payable' // 应付单
  | 'voucher' // 凭证
  | 'receipt' // 收款记录
  | 'payment' // 付款记录
  // 销售管理新增
  | 'delivery' // 发货单
  | 'return_order' // 退货单
  | 'reconciliation' // 对账单
  // MRP 运行
  | 'mrp_run'; // MRP 计划运行号

const DOCUMENT_PREFIX_MAP: Partial<Record<DocumentType, keyof DocumentNumberingConfig>> = {
  sales_order: 'sales_order_prefix',
  purchase_order: 'purchase_order_prefix',
  work_order: 'work_order_prefix',
  sample: 'sample_prefix',
  purchase_request: 'purchase_request_prefix',
  inbound: 'inbound_prefix',
  outbound: 'outbound_prefix',
  transfer: 'transfer_prefix',
  stocktaking: 'stocktaking_prefix',
  receivable: 'receivable_prefix',
  payable: 'payable_prefix',
  voucher: 'voucher_prefix',
  receipt: 'receipt_prefix',
  payment: 'payment_prefix',
  delivery: 'delivery_prefix',
  return_order: 'return_prefix',
  reconciliation: 'reconciliation_prefix',
};

const DOCUMENT_TABLE_MAP: Partial<Record<DocumentType, { table: string; field: string }>> = {
  sales_order: { table: 'sal_order', field: 'order_no' },
  purchase_order: { table: 'pur_purchase_order', field: 'po_no' },
  work_order: { table: 'prod_work_order', field: 'work_order_no' },
  sample: { table: 'sal_sample_order', field: 'order_no' },
  purchase_request: { table: 'pur_request', field: 'request_no' },
  inbound: { table: 'inv_inbound_order', field: 'order_no' },
  outbound: { table: 'inv_outbound_order', field: 'order_no' },
  transfer: { table: 'inv_transfer_order', field: 'transfer_no' },
  stocktaking: { table: 'inv_stocktaking', field: 'check_no' },
  receivable: { table: 'fin_receivable', field: 'receivable_no' },
  payable: { table: 'fin_payable', field: 'payable_no' },
  voucher: { table: 'fin_voucher', field: 'voucher_no' },
  receipt: { table: 'fin_receipt_record', field: 'receipt_no' },
  payment: { table: 'fin_payment_record', field: 'payment_no' },
  delivery: { table: 'sal_delivery', field: 'delivery_no' },
  return_order: { table: 'sal_return', field: 'return_no' },
  reconciliation: { table: 'sal_reconciliation', field: 'reconciliation_no' },
};

export function validateDocumentNoFormat(
  docNo: string,
  docType: DocumentType,
  config: DocumentNumberingConfig
): { valid: boolean; error?: string } {
  if (!docNo) {
    return { valid: false, error: '单据编号不能为空' };
  }

  const prefixKey = DOCUMENT_PREFIX_MAP[docType];
  if (!prefixKey) {
    return { valid: true }; // 如果没有配置该类型的前缀，跳过格式校验
  }
  const expectedPrefix = config[prefixKey] as string;
  const serialLength = config.serial_length;

  if (!docNo.startsWith(expectedPrefix)) {
    return { valid: false, error: `单据编号必须以 "${expectedPrefix}" 开头` };
  }

  const dateAndSerial = docNo.slice(expectedPrefix.length);
  const datePattern = /^\d{8}$/;
  const restAfterDate = dateAndSerial.slice(8);

  if (!datePattern.test(dateAndSerial.slice(0, 8))) {
    return { valid: false, error: '单据编号日期部分格式不正确，应为8位数字(YYYYMMDD)' };
  }

  if (!/^\d+$/.test(restAfterDate)) {
    return { valid: false, error: '单据编号流水号部分必须为数字' };
  }

  if (restAfterDate.length !== serialLength) {
    return { valid: false, error: `单据编号流水号长度必须为${serialLength}位` };
  }

  return { valid: true };
}

export async function checkDocumentNoDuplicate(
  docNo: string,
  docType: DocumentType,
  excludeId?: number
): Promise<{ duplicate: boolean; error?: string }> {
  const tableInfo = DOCUMENT_TABLE_MAP[docType];
  if (!tableInfo) {
    return { duplicate: false };
  }

  let sql = `SELECT id FROM ${tableInfo.table} WHERE ${tableInfo.field} = ? AND deleted = 0`;
  const params: Loose[] = [docNo];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  const rows: Loose = await query(sql, params);
  if (rows.length > 0) {
    return { duplicate: true, error: `单据编号 "${docNo}" 已存在，不能重复` };
  }

  return { duplicate: false };
}

export async function validateDocumentNo(
  docNo: string,
  docType: DocumentType,
  excludeId?: number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const config = await getNumberingConfig();

  const formatResult = validateDocumentNoFormat(docNo, docType, config);
  if (!formatResult.valid && formatResult.error) {
    errors.push(formatResult.error);
  }

  const dupResult = await checkDocumentNoDuplicate(docNo, docType, excludeId);
  if (dupResult.duplicate && dupResult.error) {
    errors.push(dupResult.error);
  }

  return { valid: errors.length === 0, errors };
}

export async function generateDocumentNo(docType: DocumentType): Promise<string> {
  const config = await getNumberingConfig();
  const prefixKey = DOCUMENT_PREFIX_MAP[docType];
  const prefix = prefixKey ? (config[prefixKey] as string) : 'DOC';
  const serialLength = config.serial_length;

  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefixWithDate = `${prefix}${dateStr}`;

  const tableInfo = DOCUMENT_TABLE_MAP[docType];
  let maxSerial = 0;

  if (tableInfo) {
    const rows: Loose = await query(
      `SELECT ${tableInfo.field} FROM ${tableInfo.table} WHERE ${tableInfo.field} LIKE ? AND deleted = 0`,
      [`${prefixWithDate}%`]
    );
    rows.forEach((row: Loose) => {
      const no = row[tableInfo.field];
      const serialPart = no.slice(prefixWithDate.length);
      const serialNum = parseInt(serialPart, 10);
      if (serialNum > maxSerial) {
        maxSerial = serialNum;
      }
    });
  }

  const nextSerial = maxSerial + 1;
  return `${prefixWithDate}${String(nextSerial).padStart(serialLength, '0')}`;
}
