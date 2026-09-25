-- ============================================================================
-- 20260921_reconcile_employee_department.sql
-- 目的：归并 sys_employee 的 dept_id 与 dept_name —— 消除「列表与编辑弹窗部门不一致」
-- ----------------------------------------------------------------------------
-- 根因（2026-09-21 运行时取证）：
--   sys_employee 同时持有两个部门字段且从不同步：
--     · dept_id   (int)     —— 编辑弹窗的 <Select> 用它取值，选项来自 sys_department(deleted=0)
--     · dept_name (varchar) —— 列表页 `SELECT * FROM sys_employee` 直接渲染它
--   列表读 dept_name、弹窗读 dept_id；而弹窗保存时只写 dept_id（EmployeeFormDialog 的
--   onValueChange 仅 setForm({dept_id})），PUT 的 payload `...form` 又把**旧** dept_name 原样带回
--   → 每编辑一次就再造一次分叉。存量数据已高度不一致（10/10 行列表与弹窗不符）。
--
-- 归并口径（本迁移唯一真相源判定）：
--   **以 dept_name 为语义真相**，dept_id 由 dept_name 精确匹配 sys_department(deleted=0) 反查。
--   依据：① dept_name 覆盖 10/11 行，dept_id 仅 6/11 且其中 4 行明显错位；
--         ② 与 section（科室）相互佐证 —— 如 EMP002 李四 section='品质检验' ⇒ 品质部，而非 dept_id 指的 管理部。
--
-- 特例（显式记录，均为可逆）：
--   · id=1001 EMP001 张三：dept_name 为空，dept_id=1 → 按 dept_id 反查回填 dept_name='管理部'
--   · id=6    EMP006 孙八：dept_name='管理层'，sys_department 全表（含已软删）**从无**同名行
--                          → 归一为「管理部」(id=1)：取名称最近者，不改用 section 推断。
--                          （备选口径：其 section='总经理室' 亦可指向 总经办 id=11；如需改判，回滚后改此条即可。）
--
-- 幂等性：每条 UPDATE 的 WHERE 均含「等于迁移前旧值」的判定，
--         重复执行时 affectedRows = 0，且不会覆盖此后的人工合法修改。
--
-- 回滚：database/migrations/rollback/094_rollback.sql（按备份表还原两列）
-- 备份表：sys_employee_dept_bak_20260921（由执行脚本创建，含 id/dept_id/dept_name）
--
-- 迁移前留痕：
--   SELECT id, employee_no, name, dept_id, dept_name FROM sys_employee
--    WHERE id IN (2,3,4,5,6,7,8,9,10,1001) ORDER BY id;
--
-- 迁移后自检（应得 dept_id 与 dept_name 逐行自洽，无 NULL 错配）：
--   SELECT e.id, e.name, e.dept_id, e.dept_name, d.dept_name AS master_name,
--          (e.dept_id = d.id) AS aligned
--     FROM sys_employee e LEFT JOIN sys_department d ON d.id = e.dept_id AND d.deleted = 0
--    ORDER BY e.id;
-- ============================================================================


-- ---------------- dept_id 错位：按 dept_name 反查修正（4 行） ----------------
-- EMP002 李四：品质部 → id=9（原 1=管理部）
UPDATE sys_employee SET dept_id = 9,  dept_name = '品质部', update_time = NOW()
 WHERE id = 2 AND dept_name = '品质部' AND (dept_id IS NULL OR dept_id <> 9);

-- EMP003 王五：生产部 → id=4（原 2=业务部）
UPDATE sys_employee SET dept_id = 4,  dept_name = '生产部', update_time = NOW()
 WHERE id = 3 AND dept_name = '生产部' AND (dept_id IS NULL OR dept_id <> 4);

-- EMP004 赵六：品质部 → id=9（原 2=业务部）
UPDATE sys_employee SET dept_id = 9,  dept_name = '品质部', update_time = NOW()
 WHERE id = 4 AND dept_name = '品质部' AND (dept_id IS NULL OR dept_id <> 9);

-- EMP005 钱七：销售部 → id=12（原 3=工程技术部）
UPDATE sys_employee SET dept_id = 12, dept_name = '销售部', update_time = NOW()
 WHERE id = 5 AND dept_name = '销售部' AND (dept_id IS NULL OR dept_id <> 12);


-- ---------------- dept_id 空缺：按 dept_name 反查补齐（4 行） ----------------
-- EMP007 周九：生产部 → id=4
UPDATE sys_employee SET dept_id = 4,  dept_name = '生产部', update_time = NOW()
 WHERE id = 7 AND dept_name = '生产部' AND dept_id IS NULL;

-- EMP008 吴十：品质部 → id=9
UPDATE sys_employee SET dept_id = 9,  dept_name = '品质部', update_time = NOW()
 WHERE id = 8 AND dept_name = '品质部' AND dept_id IS NULL;

-- EMP009 郑冬：生产部 → id=4
UPDATE sys_employee SET dept_id = 4,  dept_name = '生产部', update_time = NOW()
 WHERE id = 9 AND dept_name = '生产部' AND dept_id IS NULL;

-- EMP010 陈明：销售部 → id=12
UPDATE sys_employee SET dept_id = 12, dept_name = '销售部', update_time = NOW()
 WHERE id = 10 AND dept_name = '销售部' AND dept_id IS NULL;


-- ---------------- 无同名部门：归一（1 行） ----------------
-- EMP006 孙八：「管理层」→ 管理部(id=1)
UPDATE sys_employee SET dept_id = 1, dept_name = '管理部', update_time = NOW()
 WHERE id = 6 AND dept_name = '管理层' AND dept_id IS NULL;


-- ---------------- 反向：dept_name 空缺，按 dept_id 回填（1 行） ----------------
-- EMP001 张三：dept_id=1 → dept_name='管理部'
UPDATE sys_employee SET dept_id = 1, dept_name = '管理部', update_time = NOW()
 WHERE id = 1001 AND dept_id = 1 AND (dept_name IS NULL OR dept_name = '');
