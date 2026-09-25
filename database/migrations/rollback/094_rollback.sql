-- 094_rollback.sql —— 回滚 20260921_reconcile_employee_department.sql
-- 按备份表还原 sys_employee 的 dept_id / dept_name（其余列本迁移未触碰）
UPDATE sys_employee e
JOIN `sys_employee_dept_bak_20260921` b ON b.id = e.id
SET e.dept_id   = b.dept_id,
    e.dept_name = b.dept_name,
    e.update_time = NOW();
-- 校验（应回到：10 行两列均与主数据不符/NULL 的原状）：
--   SELECT id, employee_no, name, dept_id, dept_name FROM sys_employee
--    WHERE id IN (2,3,4,5,6,7,8,9,10,1001) ORDER BY id;
