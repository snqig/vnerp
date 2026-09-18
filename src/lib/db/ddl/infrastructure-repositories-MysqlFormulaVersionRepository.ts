/**
 * src/infrastructure/repositories/MysqlFormulaVersionRepository.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** UPDATE … */
export const UPDATE_STMT = `UPDATE dcprint_ink_formula_version
       SET status = 3, cancel_by = ?, cancel_time = NOW(), cancel_reason = '新版本生效自动归档', update_by = ?
       WHERE color_id = ? AND status = 2 AND is_deleted = 0 AND id != ?`;
