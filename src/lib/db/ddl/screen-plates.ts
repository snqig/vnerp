/**
 * src/app/api/screen-plates/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** INSERT */
export const INSERT_INTO_SCREEN_PLATE_HISTORY = `
    INSERT INTO screen_plate_history (screen_plate_id, action, operator_name, remark)
    VALUES (?, 'Created', ?, '网版创建')
  `;

/** INSERT */
export const INSERT_INTO_SCREEN_PLATE_HISTORY_2 = `
    INSERT INTO screen_plate_history (screen_plate_id, action, operator_name, remark)
    VALUES (?, 'Scrapped', ?, '网版删除')
  `;
