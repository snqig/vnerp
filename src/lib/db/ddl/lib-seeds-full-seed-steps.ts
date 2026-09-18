/**
 * src/lib/seeds/full-seed-steps.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** INSERT … */
export const INSERT_INTO_INV_INBOUND_ORDER = `INSERT INTO inv_inbound_order (order_no, supplier_name, inbound_date, warehouse_id, po_id, po_no, grn_type, total_quantity, total_amount, status, remark) VALUES (?, ?, ?, ?, ?, ?, 'po', ?, ?, 'approved', '采购入库')`;

/** INSERT … */
export const INSERT_INTO_PRD_WORK_REPORT = `INSERT INTO prd_work_report (report_no, work_order_id, work_order_no, process_name, process_seq, equipment_id, operator_name, plan_qty, completed_qty, qualified_qty, defective_qty, scrap_qty, start_time, end_time, work_hours, is_first_piece, first_piece_status, first_piece_inspector, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, '张师傅', ?, ?, ?, ?, 0, ?, ?, 8, ?, ?, '李质检', '', NOW())`;
