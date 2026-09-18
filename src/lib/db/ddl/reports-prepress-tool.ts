/**
 * src/app/api/reports/prepress/tool/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** SELECT … */
export const SELECT_STMT = `SELECT
      t.tool_code, t.tool_name,
      CASE WHEN t.tool_type = 1 THEN '刀模' WHEN t.tool_type = 2 THEN '网版' ELSE '其他' END as tool_type_label,
      u.use_count, u.amortized_cost, u.process_name, u.use_time
    FROM dcprint_tool_usage u
    INNER JOIN dcprint_tool t ON t.id = u.tool_id
    WHERE u.use_time >= ?
    ORDER BY u.use_time DESC
    LIMIT 20`;
