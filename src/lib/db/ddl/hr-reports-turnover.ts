/**
 * src/app/api/hr/reports/turnover/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** SELECT … */
export const SELECT_STMT = `SELECT
        COALESCE(dept_name, '未分配') as dept_name,
        COUNT(*) as total,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as resigned
      FROM sys_employee WHERE deleted = 0
      GROUP BY dept_name
      ORDER BY total DESC`;
