-- ============================================================================
-- 20260925_backfill_sys_user_department.sql
-- 目的：回填 sys_user.department_id —— 消除「设置/用户列表 部门列全空」
-- ----------------------------------------------------------------------------
-- 根因（2026-09-25 DB 取证）：
--   /settings/user 列表部门列 = /api/system/user GET 的
--     LEFT JOIN sys_department d ON u.department_id = d.id → d.dept_name
--   该 JOIN 本身无缺陷；但 sys_user 10/10 行 department_id 全部为 NULL：
--   · 旧版种子（settings-seed）按部门**显示名**（i18n key）反查 id，切语言/改名即
--     静默失配 → department_id 落 NULL（见 settings-seed/route.ts:354-356 注释）；
--   · 后已改为按 dept_code 解析，但 INSERT IGNORE 不更新存量行 → 10 行残留 NULL。
--
-- 归属口径（三角互证，唯一真相源）：
--   ① settings-seed/route.ts:271-352 的 dept_code 意图（权威）；
--   ② sys_user_role 实际角色语义佐证（业务经理→业务部 等）；
--   ③ 现行 sys_department(deleted=0) 按名唯一命中（20260921 部门重构后的 id 空间）。
--
-- 映射（username / dept_code / 部门名 → 现行 id）：
--   admin      DEPT001   总经办   → 11
--   zhangwei   DEPT002   业务部   → 2
--   lina       DEPT002   业务部   → 2
--   wangqiang  DEPT004   工程技术部 → 3
--   liuyang    DEPT003   生产部   → 4
--   chenming   DEPT00602 仓储科   → 121（供应链部 id=7 下属）
--   zhaolei    DEPT00602 仓储科   → 121
--   sunli      DEPT00601 采购科   → 120（供应链部 id=7 下属）
--   zhoujie    DEPT005   品质部   → 9
--   wufang     DEPT00701 会计科   → 122（财务部 id=16 下属）
--
-- 幂等性：WHERE 含「department_id IS NULL」判定，重复执行 affectedRows = 0，
--         且不会覆盖此后的人工合法修改（与 20260921_reconcile_employee_department 同款守卫）。
--
-- 回滚（按备份表还原）：
--   UPDATE sys_user u JOIN sys_user_dept_bak_20260925 b ON b.id = u.id
--     SET u.department_id = b.department_id;
-- 备份表：sys_user_dept_bak_20260925（由执行脚本创建，含 id/department_id）
--
-- 迁移后自检（应得 10/10 行 dept_name 非空、aligned=1）：
--   SELECT u.id, u.username, u.department_id, d.dept_name,
--          (d.deleted = 0) AS aligned
--     FROM sys_user u LEFT JOIN sys_department d ON d.id = u.department_id
--    WHERE u.deleted = 0 ORDER BY u.id;
-- ============================================================================

-- admin 超级管理员：总经办 → 11
UPDATE sys_user SET department_id = 11
 WHERE username = 'admin' AND deleted = 0 AND department_id IS NULL;

-- zhangwei 业务经理：业务部 → 2
UPDATE sys_user SET department_id = 2
 WHERE username = 'zhangwei' AND deleted = 0 AND department_id IS NULL;

-- lina 业务员：业务部 → 2
UPDATE sys_user SET department_id = 2
 WHERE username = 'lina' AND deleted = 0 AND department_id IS NULL;

-- wangqiang 工程师：工程技术部 → 3
UPDATE sys_user SET department_id = 3
 WHERE username = 'wangqiang' AND deleted = 0 AND department_id IS NULL;

-- liuyang 生产主管：生产部 → 4
UPDATE sys_user SET department_id = 4
 WHERE username = 'liuyang' AND deleted = 0 AND department_id IS NULL;

-- chenming 仓管员：仓储科 → 121
UPDATE sys_user SET department_id = 121
 WHERE username = 'chenming' AND deleted = 0 AND department_id IS NULL;

-- zhaolei 仓库主管：仓储科 → 121
UPDATE sys_user SET department_id = 121
 WHERE username = 'zhaolei' AND deleted = 0 AND department_id IS NULL;

-- sunli 采购员：采购科 → 120
UPDATE sys_user SET department_id = 120
 WHERE username = 'sunli' AND deleted = 0 AND department_id IS NULL;

-- zhoujie 品质检验员：品质部 → 9
UPDATE sys_user SET department_id = 9
 WHERE username = 'zhoujie' AND deleted = 0 AND department_id IS NULL;

-- wufang 财务：会计科 → 122
UPDATE sys_user SET department_id = 122
 WHERE username = 'wufang' AND deleted = 0 AND department_id IS NULL;
