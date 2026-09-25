/**
 * 编号规则的单据类型清单与默认模板。
 *
 * 设计要点：
 *   - 本文件只存「模板串」，纯 ASCII 占位符，不含任何业务文案，
 *     因此不需要 i18n；单据类型的中文名存放在 sys_config.config_name（迁移 088 写入）。
 *   - 模板语法见 docs/superpowers/specs/2026-09-22-document-numbering-design.md 第 3 节。
 *   - 默认值原则：等于收敛前的现有行为；与现有行为不同的一律在上表「变更」列有记录。
 */

/** docType → 默认模板 */
export const DEFAULT_TEMPLATES: Record<string, string> = {
  // 销售
  sales_order: 'ORD{YYYYMMDD}{SEQ:6}',
  sample_order: 'SP{YYYYMMDD}{SEQ:4}',
  delivery: 'DL{YYYYMMDD}{SEQ:6}',
  shipment: 'SH{YYYYMMDD}{SEQ:4}',
  return_order: 'RT{YYYYMMDD}{SEQ:6}',
  reconciliation: 'RC{YYYYMMDD}{SEQ:6}',
  quote: 'QT{YYYYMMDD}{SEQ:5}',
  // 采购
  purchase_request: 'PR{YYYYMMDD}{SEQ:6}',
  purchase_order: 'PO{YYYYMMDD}{SEQ:6}',
  purchase_return: 'PRT{YYYYMMDD}{SEQ:6}',
  purchase_reconcile: 'RC{YYYYMMDD}{SEQ:6}',
  contract_review: 'CR{YYYYMMDD}{SEQ:4}',
  // 生产
  work_order: 'WO{YYYYMMDD}{SEQ:6}',
  sample_work_order: 'SWO{YYYYMMDD}{SEQ:5}',
  material_requisition: 'MR{YYYYMMDD}{SEQ:4}',
  material_issue: 'MI{YYYYMMDD}{SEQ:4}',
  material_pick: 'MP{YYYYMMDD}{SEQ:4}',
  material_return: 'MRT{YYYYMMDD}{SEQ:4}',
  process_report: 'WR{YYYYMMDD}{SEQ:4}',
  production_process: 'PCS{YYYYMMDD}{SEQ:4}',
  production_schedule: 'PS{YYYYMMDD}{SEQ:4}',
  finish_inbound: 'FI{YYYYMMDD}{SEQ:4}',
  mrp_run: 'MRP{YYYYMMDD}{SEQ:4}',
  bom: 'BOM{YYYYMMDD}{SEQ:3}',
  // 仓库
  inbound: 'INB{YYYYMMDD}{SEQ:6}',
  outbound: 'OTB{YYYYMMDD}{SEQ:6}',
  sales_outbound: 'SOB{YYYYMMDD}{SEQ:6}',
  production_inbound: 'PI{YYYYMMDD}{SEQ:4}',
  transfer: 'TR{YYYYMMDD}{SEQ:6}',
  stocktaking: 'ST{YYYYMMDD}{SEQ:6}',
  split_order: 'FJ{YYYYMMDD}{SEQ:4}',
  material_label: 'LBL-{YYYYMMDD}-{SEQ:4}',
  cutting_record: 'CUT{YYYYMMDD}{SEQ:4}',
  cutting_label: 'LBL{YYYYMMDD}{SEQ:4}',
  inbound_label: 'IL{YYYYMMDD}{SEQ:5}',
  // 批次与库存事务（含派生标识）
  batch: 'B{YYMMDD}{SEQ:4}',
  batch_whole_split: 'SP{YYYYMMDD}{SEQ:4}',
  batch_slit: 'SC{YYYYMMDD}{SEQ:4}',
  batch_work_order: 'WO{WO_NO}{TS:6}',
  batch_finish_order: 'FN{FINISH_ORDER_ID}',
  batch_transfer: 'TRF-{TRANSFER_NO}-{MATERIAL_CODE}',
  batch_outsource: 'OR{RECEIVE_NO}{ID}',
  batch_ink_mixed: 'MIX{YYYYMMDD}{SEQ:4}',
  batch_ink_dispatch: 'INK{YYYYMMDD}{SEQ:4}',
  batch_small: 'SM-{PARENT_QR}-{TS}',
  batch_remainder: 'RM-{PARENT_QR}-{TS}',
  inventory_trans: 'TRX{YYYYMMDDHHmmss}{SEQ:4}',
  cost_trans: 'COST{WO_NO}{TS:6}{SEQ:2}',
  // 质检
  incoming_inspection: 'IQC{YYYYMMDD}{SEQ:3}',
  process_inspection: 'QI{YYYYMMDD}{SEQ:4}',
  final_inspection: 'FPR{YYYYMMDD}{SEQ:4}',
  unqualified: 'UQ-{YYYYMMDD}-{SEQ:4}',
  unqualified_handle: 'UNQ-{YYYY}-{MMDD}-{SEQ:3}',
  lab_test: 'LAB-{YYYYMMDD}-{SEQ:4}',
  // 财务
  receivable: 'REC{YYYYMMDD}{SEQ:6}',
  payable: 'PAY{YYYYMMDD}{SEQ:6}',
  receipt: 'RPT{YYYYMMDD}{SEQ:6}',
  payment: 'PMT{YYYYMMDD}{SEQ:6}',
  voucher: 'VCH{YYYYMMDD}{SEQ:6}',
  invoice_purchase: 'PI{YYYYMMDD}{SEQ:3}',
  invoice_sales: 'SI{YYYYMMDD}{SEQ:3}',
  expense: 'EXP{YYYYMMDD}{SEQ:3}',
  // 样品 / 标准卡 / 印前
  sample_process_card: 'SPC{YYYYMMDD}{SEQ:5}',
  sample_process_template: 'SPT{YYYYMMDD}{SEQ:5}',
  standard_card: '{SC_TYPE}{YYYYMMDD}{SEQ:4}',
  standard_card_version: '{CARD_NO}-V{VERSION}',
  mass_process_card: '{CARD_NO}-M',
  sample_to_mass: 'STM-{YYYYMMDD}-{SEQ:3}',
  process_card: 'PC{YYYYMMDD}{SEQ:4}',
  trace: 'TRC{YYYYMMDD}{SEQ:6}',
  material_qr: 'MAT{MATERIAL_ID}{TS}',
  ink_color: 'CLR{YYYYMMDD}{SEQ:4}',
  ink_formula_version: 'V{MAJOR}.{MINOR}',
  // 设备 / 人事
  equipment: 'EQ-{YYYYMMDD}-{SEQ:4}',
  maintenance_plan: 'MP{YYYYMMDD}{SEQ:4}',
  maintenance_record: 'EQMR{YYYYMMDD}{SEQ:4}',
  equipment_scrap: 'BF{YYYYMMDD}{SEQ:4}',
  equipment_repair: 'WX{YYYYMMDD}{SEQ:4}',
  equipment_calibration: 'JD{YYYYMMDD}{SEQ:4}',
  die: 'DIE{YYYYMMDD}{SEQ:4}',
  die_maintenance: 'MT{YYYYMMDD}{SEQ:4}',
  employee: 'EMP{YYYYMMDD}-{SEQ:4}',
};

/** 全部受管的单据类型（配置页用它渲染完整清单） */
export const NUMBERING_DOC_TYPES: string[] = Object.keys(DEFAULT_TEMPLATES);

/** 取某 docType 的默认模板；未登记返回 undefined */
export function getDefaultTemplate(docType: string): string | undefined {
  return DEFAULT_TEMPLATES[docType];
}
