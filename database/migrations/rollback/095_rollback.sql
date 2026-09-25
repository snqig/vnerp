-- ============================================================================
-- 回滚：20260921_department_restructure.sql
-- ============================================================================
-- 依赖该迁移建立的备份表：
--   sys_department_bak_20260921b  （改动前 102 行 = 14 存活 + 88 软删）
--   sys_employee_dept_bak_20260921b（改动前 11 行）
--
-- 回滚动作：
--   1) 把所有「改动前就存在」的部门行逐列还原（编码/名称/父级/排序/状态/软删标记）
--   2) 把本次新建的 14 个二级部门重新置为软删（id 不在备份表里的即为新建行）
--   3) 还原员工的 dept_id / dept_name
--
-- ⚠ 本回滚只适用于「未在回滚前再次人工改动过部门数据」的情况；
--   若期间又有新增部门被挂到新树上，第 2 步会一并把它们软删，需人工复核。
-- ============================================================================

START TRANSACTION;

-- 1) 还原所有改动前已存在的部门行
UPDATE sys_department d
  JOIN sys_department_bak_20260921b b ON d.id = b.id
   SET d.parent_id  = b.parent_id,
       d.dept_name  = b.dept_name,
       d.dept_code  = b.dept_code,
       d.sort_order = b.sort_order,
       d.leader_id  = b.leader_id,
       d.phone      = b.phone,
       d.email      = b.email,
       d.status     = b.status,
       d.deleted    = b.deleted,
       d.update_time = NOW();

-- 2) 本次新建的 14 个二级部门 → 重新软删
UPDATE sys_department
   SET deleted = 1, update_time = NOW()
 WHERE id NOT IN (SELECT id FROM sys_department_bak_20260921b);

-- 3) 还原员工部门归属
UPDATE sys_employee e
  JOIN sys_employee_dept_bak_20260921b b ON e.id = b.id
   SET e.dept_id   = b.dept_id,
       e.dept_name = b.dept_name,
       e.update_time = NOW();

COMMIT;
