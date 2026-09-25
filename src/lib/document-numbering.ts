import { query, transaction, type SqlValue } from './db';
import type { DbConnection } from '@/types/db';
import type { DbRow } from '@/types/db';
import type mysql from 'mysql2/promise';

// ---------------------------------------------------------------------------
// 模板串模型（纯函数，不访问数据库）
// 语法见 docs/superpowers/specs/2026-09-22-document-numbering-design.md 第 3 节
// ---------------------------------------------------------------------------

export type DocumentNumberContext = Record<string, string | number | null | undefined>;

export class DocumentNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentNumberError';
  }
}

/** 日期/时刻占位符（{TS:n} 带参数，单独判断） */
const DATE_TOKENS = [
  'YYYYMMDDHHmmss',
  'YYYYMMDD',
  'YYMMDD',
  'YYYYMM',
  'MMDD',
  'HHmmss',
  'YYYY',
  'YY',
  'MM',
  'DD',
] as const;

/** 命中即判定「按日重置」的占位符（最细粒度优先） */
const DAILY_TOKENS = ['DD', 'MMDD', 'YYMMDD', 'YYYYMMDD', 'HHmmss', 'YYYYMMDDHHmmss'];

/** 命中即判定「按月重置」的占位符 */
const MONTHLY_TOKENS = ['MM', 'YYYYMM'];

const PLACEHOLDER_RE = /\{([^{}]*)\}/g;
const TS_RE = /^TS:\d+$/;
const SEQ_RE = /^SEQ:(\d+)$/;
const VAR_RE = /^[A-Z][A-Z0-9_]*$/;

export interface ParsedTemplate {
  /** {SEQ:n} 之前的片段 */
  prefix: string;
  /** {SEQ:n} 之后的片段 */
  suffix: string;
  /** 流水补零位数；模板不含 {SEQ:n} 时为 null（派生编号，不消费流水） */
  seqLength: number | null;
  /** 需要调用方通过 ctx 提供的变量名（大写） */
  variables: string[];
}

function readTokens(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER_RE)].map((m) => m[1]);
}

/**
 * 校验模板合法性。
 * 规则：{SEQ:n} 数量 0 或 1、n∈[1,10]、不得有未知占位符、不得为空、
 * 至少含一个非流水片段（纯 {SEQ:n} 无法定位业务）。
 */
export function validateDocumentNoTemplate(template: string): {
  valid: boolean;
  errors: string[];
  placeholders: string[];
} {
  if (!template || !template.trim()) {
    return { valid: false, errors: ['模板不能为空'], placeholders: [] };
  }

  const errors: string[] = [];
  const placeholders = readTokens(template);

  const opens = (template.match(/\{/g) || []).length;
  const closes = (template.match(/\}/g) || []).length;
  if (opens !== closes) {
    errors.push('模板中存在未闭合的花括号');
  }

  let seqCount = 0;
  for (const token of placeholders) {
    if ((DATE_TOKENS as readonly string[]).includes(token) || TS_RE.test(token)) continue;

    const seqMatch = SEQ_RE.exec(token);
    if (seqMatch) {
      seqCount += 1;
      const len = Number(seqMatch[1]);
      if (len < 1 || len > 10) {
        errors.push(`{SEQ:n} 的 n 必须在 1-10 之间，当前为 ${len}`);
      }
      continue;
    }

    if (VAR_RE.test(token)) continue;
    errors.push(`无法识别的占位符 {${token}}`);
  }

  if (seqCount > 1) {
    errors.push('模板最多只能包含一个 {SEQ:n}');
  }

  const literal = template.replace(PLACEHOLDER_RE, '').trim();
  // 仅当整串就是孤零零一个 {SEQ:n} 时才算「纯流水」——
  // 形如 {SC_TYPE}{YYYYMMDD}{SEQ:4} 的模板虽然没有字面量，但有业务变量可定位，合法
  if (!literal && placeholders.length <= 1 && seqCount === 1) {
    errors.push('模板至少需要包含一个非流水片段');
  }

  return { valid: errors.length === 0, errors, placeholders };
}

/**
 * 推导流水重置周期（不单独配置，避免与模板矛盾）。
 * 判定顺序：按日 → 按月 → 按年 → 不重置（最细粒度优先）。
 */
export function resolveResetPeriod(template: string): 'daily' | 'monthly' | 'yearly' | 'global' {
  const tokens = readTokens(template);
  if (tokens.some((t) => DAILY_TOKENS.includes(t) || TS_RE.test(t))) return 'daily';
  if (tokens.some((t) => MONTHLY_TOKENS.includes(t))) return 'monthly';
  if (tokens.some((t) => t === 'YYYY' || t === 'YY')) return 'yearly';
  return 'global';
}

/** 按 {SEQ:n} 把模板切成前/后两段，并收集所需的上下文变量 */
export function parseTemplate(template: string): ParsedTemplate {
  const variables = readTokens(template).filter(
    (t) =>
      !(DATE_TOKENS as readonly string[]).includes(t) &&
      !TS_RE.test(t) &&
      !SEQ_RE.test(t) &&
      VAR_RE.test(t)
  );

  const seqToken = /\{(SEQ:\d+)\}/.exec(template);
  if (!seqToken) {
    return { prefix: template, suffix: '', seqLength: null, variables };
  }

  const start = seqToken.index;
  const end = start + seqToken[0].length;
  const seqLength = Number(SEQ_RE.exec(seqToken[1])![1]);
  return {
    prefix: template.slice(0, start),
    suffix: template.slice(end),
    seqLength,
    variables,
  };
}

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
  eco_prefix: string;
  mrp_run_prefix: string;
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
  eco_prefix: 'ECO',
  mrp_run_prefix: 'MRP',
  serial_length: 6,
};

export async function getNumberingConfig(): Promise<DocumentNumberingConfig> {
  try {
    const rows = await query<DbRow>(
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
        'eco_prefix',
        'serial_length',
        'order.prefix',
        'purchase.prefix',
        'inbound.prefix',
        'outbound.prefix',
      ]
    );
    const configs: Record<string, string> = {};
    rows.forEach((row: DbRow) => {
      configs[String(row.config_key)] = String(row.config_value);
    });
    // 命名空间前缀配置（系统配置中心）覆盖对应的扁平前缀字段
    if (configs['order.prefix']) configs['sales_order_prefix'] = configs['order.prefix'];
    if (configs['purchase.prefix']) configs['purchase_order_prefix'] = configs['purchase.prefix'];
    if (configs['inbound.prefix']) configs['inbound_prefix'] = configs['inbound.prefix'];
    if (configs['outbound.prefix']) configs['outbound_prefix'] = configs['outbound.prefix'];
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
      eco_prefix: configs['eco_prefix'] || DEFAULT_CONFIG.eco_prefix,
      mrp_run_prefix: configs['mrp_run_prefix'] || DEFAULT_CONFIG.mrp_run_prefix,
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
  // PLM 工程变更
  | 'eco' // 工程变更单
  // MRP 运算批次
  | 'mrp_run';

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
  purchase_reconcile: 'reconciliation_prefix',
  eco: 'eco_prefix',
  mrp_run: 'mrp_run_prefix',
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
  purchase_reconcile: { table: 'pur_purchase_reconciliation', field: 'reconciliation_no' },
  eco: { table: 'plm_eco', field: 'eco_no' },
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
  const params: SqlValue[] = [docNo];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  const rows = await query<DbRow>(sql, params);
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

/**
 * 生成单据编号（并发安全）
 * @description 使用 MySQL 命名锁（GET_LOCK）串行化同一单据类型 + 同日前缀的编号生成，
 *   避免并发请求下 maxSerial + 1 产生重复编号。锁名按 `doc_no:{type}:{yyyyMMdd}` 区分，
 *   不同单据类型/日期互不阻塞。可选传入事务连接（conn），锁与业务写入同事务同连接，保证一致性。
 * @param docType - 单据类型
 * @param conn - 可选的事务连接；不传时自动开启短事务包裹（锁随事务提交释放）
 * @returns 生成的单据编号
 */
export async function generateDocumentNo(
  docType: DocumentType,
  conn?: DbConnection
): Promise<string> {
  const config = await getNumberingConfig();
  const prefixKey = DOCUMENT_PREFIX_MAP[docType];
  const prefix = prefixKey ? (config[prefixKey] as string) : 'DOC';
  const serialLength = config.serial_length;

  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefixWithDate = `${prefix}${dateStr}`;

  const tableInfo = DOCUMENT_TABLE_MAP[docType];
  // 命名锁名：单据类型 + 日期，串行化同日同类型编号生成
  const lockName = `doc_no:${docType}:${dateStr}`;

  const generateWithLock = async (c: DbConnection) => {
    // 获取命名锁（最多等待 10 秒），锁在连接级别生效，与事务提交/回滚独立
    const [lockRows] = await c.query<mysql.RowDataPacket[]>(
      'SELECT GET_LOCK(?, 10) AS locked',
      [lockName]
    );
    const locked = lockRows?.[0]?.locked;
    if (locked !== 1) {
      throw new Error(`获取单据编号锁失败（${docType} ${dateStr}），请稍后重试`);
    }
    try {
      let maxSerial = 0;
      if (tableInfo) {
        // 注意：此处不限制 deleted=0。软删除的单据行仍占用唯一键（uk_xxx_no），
        // 若只在未删除行里取最大流水号，删除后重建会 regenerate 相同单号 → 唯一键冲突 500。
        // 因此把已软删除的行也计入最大流水号，使被占用的号被永久跳过（单据号不重复使用）。
        const [rows] = await c.query<mysql.RowDataPacket[]>(
          `SELECT ${tableInfo.field} FROM ${tableInfo.table} WHERE ${tableInfo.field} LIKE ?`,
          [`${prefixWithDate}%`]
        );
        rows.forEach((row) => {
          const no = String(row[tableInfo.field] || '');
          const serialPart = no.slice(prefixWithDate.length);
          const serialNum = parseInt(serialPart, 10);
          if (!Number.isNaN(serialNum) && serialNum > maxSerial) {
            maxSerial = serialNum;
          }
        });
      }
      const nextSerial = maxSerial + 1;
      return `${prefixWithDate}${String(nextSerial).padStart(serialLength, '0')}`;
    } finally {
      // 释放命名锁
      await c.query('SELECT RELEASE_LOCK(?)', [lockName]);
    }
  };

  if (conn) {
    return generateWithLock(conn);
  }
  return transaction((c) => generateWithLock(c));
}
