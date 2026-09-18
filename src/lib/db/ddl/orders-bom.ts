/**
 * src/app/api/orders/bom/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** INSERT … */
export const INSERT_INTO_BOM_VERSION_HISTORY = `INSERT INTO bom_version_history (bom_id, version, change_type, change_content, change_reason, operate_time)
       VALUES (?, ?, 'DELETE', '删除BOM', 'BOM删除', NOW())`;
