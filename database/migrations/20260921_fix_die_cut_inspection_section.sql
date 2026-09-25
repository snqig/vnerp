-- ============================================================================
-- 修复：出货检验科 (DEPT00503) 被误软删
-- ============================================================================
-- 现象：2026-09-21 08:26:03 由 20260921_department_restructure.sql 写入的
--       id=119 / DEPT00503 /「出货检验科」/ parent_id=9，在 08:31:24 被
--       一次外部会话软删（deleted=1）。迁移文件本身并未触碰该行，
--       是运行时（界面/接口）在部门管理页上删掉的。
--
-- 影响：sys_department 存活部门从 24 降为 23，品质部只剩 2 个科，
--       与用户确认的「品质部 ├── 来料检验科 ├── 制程检验科 └── 出货检验科」不符。
--
-- 口径：只复活这一行，**不做**「按 dept_code 全量复活」。
--       原因：sys_department.dept_code 上**没有唯一索引**（SHOW INDEX 实测只有
--       PRIMARY / idx_parent / idx_status / idx_leader），历史软删数据里存在
--       大量同码行（例如 DEPT001 总经办出现过十余次）。若按 dept_code 批量
--       `SET deleted = 0`，会把这些历史副本一并复活成重复部门。
--       通用化的「让库收敛到目录」能力已落在代码侧：
--       src/lib/department-catalog.ts 的 syncCanonicalDepartments()
--       （幂等、按 code 优先复活存活行、可选用 prune 软删目录外行），
--       init.ts 的 POST /api/init/department 即调用它。
--
-- 幂等性：重复执行无害。仅当存在同码行时才动作，且限制到「存活行优先、
--         否则最小 id」的那一行。
-- ============================================================================

START TRANSACTION;

UPDATE sys_department
   SET dept_code = 'DEPT00503',
       dept_name = '出货检验科',
       parent_id = (SELECT pid FROM (SELECT id AS pid FROM sys_department
                                      WHERE dept_code = 'DEPT005' AND deleted = 0
                                      ORDER BY id LIMIT 1) AS p),
       sort_order = 3,
       status = 1,
       deleted = 0,
       update_time = NOW()
 WHERE deleted = 1
   AND id = (
     COALESCE(
       (SELECT live_id FROM (SELECT MIN(id) AS live_id FROM sys_department
                              WHERE dept_code = 'DEPT00503' AND deleted = 0) AS l),
       (SELECT any_id FROM (SELECT MIN(id) AS any_id FROM sys_department
                             WHERE dept_code = 'DEPT00503') AS a)
     )
   );

COMMIT;
