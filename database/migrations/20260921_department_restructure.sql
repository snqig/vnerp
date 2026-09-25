-- ============================================================================
-- 部门主数据重建：严格按「总经办 > 部 > 科/室/车间」三层结构
-- ============================================================================
-- 目标结构（用户 2026-09-21 确认）：
--   总经办
--   ├── 业务部      ├── 销售科  └── 客服科
--   ├── 生产部      ├── 生产计划科  ├── 模切车间  └── 商标车间
--   ├── 工程技术部  ├── 技术科  └── 工程科
--   ├── 品质部      ├── 来料检验科  ├── 制程检验科  └── 出货检验科
--   ├── 供应链部    ├── 采购科  └── 仓储科
--   ├── 财务部      ├── 会计科  └── 出纳科
--   └── 行政人事部  ├── 行政科  └── 人事科
-- 合计 1 + 7 + 16 = 24 个存活部门。
--
-- 落库口径：
--   * 总经办 parent_id = NULL（树根，与用户确认）
--   * 7 个部 parent_id = 总经办.id
--   * 16 个科/室/车间 parent_id = 对应部.id
--
-- 存量处理（改动前存活 14 行）：
--   复用 10 行 id（保住 sys_employee.dept_id / 任何外部按 id 的引用）：
--     11 总经办(原名已对) 2 业务部 4 生产部 3 工程技术部 9 品质部
--     7 仓库管理部→供应链部  16 财务部 10 财务行政部→行政人事部
--     5 模切车间 6 商标车间（原挂已软删的 id=97，改挂生产部）
--   新建 14 行（16 个二级中扣掉复用的模切/商标）
--   软删 4 行（新结构无对应，且已把其下员工改派）：1 管理部 8 采购部 12 销售部 15 仓库部
--   顺带消灭 4 组重复 dept_code（DEPT001/002/005/006 各有两行）
--
-- ⚠ 唯一性：sys_department.dept_code 上**没有**唯一索引（实测 SHOW INDEX 只有
--   PRIMARY / idx_parent / idx_status / idx_leader），故可自由重排编码；
--   本次不新增唯一索引——因为历史上 88 行已软删数据里存在大量同码行
--   （如 DEPT001 总经办 出现十余次），加索引会直接失败。留作后续专项。
--
-- 回滚：rollback/095_rollback.sql（基于本文件建立的备份表）
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) 备份（DDL 隐式提交，必须在任何改动之前）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_department_bak_20260921b LIKE sys_department;
INSERT IGNORE INTO sys_department_bak_20260921b SELECT * FROM sys_department;

CREATE TABLE IF NOT EXISTS sys_employee_dept_bak_20260921b LIKE sys_employee;
INSERT IGNORE INTO sys_employee_dept_bak_20260921b SELECT * FROM sys_employee;

-- ---------------------------------------------------------------------------
-- 1) 主体改动（显式事务，保证 DML 原子性）
-- ---------------------------------------------------------------------------
START TRANSACTION;

-- 1.1 树根：总经办（复用 id=11，原 dept_code 已是 DEPT001）
UPDATE sys_department
   SET dept_code = 'DEPT001', dept_name = '总经办', parent_id = NULL,
       sort_order = 1, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 11;

-- 1.2 一级部门（7 个部），统一挂到总经办(id=11)
UPDATE sys_department
   SET dept_code = 'DEPT002', dept_name = '业务部', parent_id = 11,
       sort_order = 1, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 2;

UPDATE sys_department
   SET dept_code = 'DEPT003', dept_name = '生产部', parent_id = 11,
       sort_order = 2, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 4;

UPDATE sys_department
   SET dept_code = 'DEPT004', dept_name = '工程技术部', parent_id = 11,
       sort_order = 3, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 3;

UPDATE sys_department
   SET dept_code = 'DEPT005', dept_name = '品质部', parent_id = 11,
       sort_order = 4, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 9;

UPDATE sys_department
   SET dept_code = 'DEPT006', dept_name = '供应链部', parent_id = 11,
       sort_order = 5, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 7;

UPDATE sys_department
   SET dept_code = 'DEPT007', dept_name = '财务部', parent_id = 11,
       sort_order = 6, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 16;

UPDATE sys_department
   SET dept_code = 'DEPT008', dept_name = '行政人事部', parent_id = 11,
       sort_order = 7, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 10;

-- 1.3 二级：复用既有模切车间(id=5) / 商标车间(id=6)，从已软删的 id=97 改挂生产部(id=4)
UPDATE sys_department
   SET dept_code = 'DEPT00302', dept_name = '模切车间', parent_id = 4,
       sort_order = 2, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 5;

UPDATE sys_department
   SET dept_code = 'DEPT00303', dept_name = '商标车间', parent_id = 4,
       sort_order = 3, status = 1, deleted = 0, update_time = NOW()
 WHERE id = 6;

-- 1.4 二级：新建 14 个（幂等——先软删同码残留，再插入）
UPDATE sys_department SET deleted = 1, update_time = NOW()
 WHERE deleted = 0
   AND dept_code IN ('DEPT00201','DEPT00202','DEPT00301','DEPT00401','DEPT00402',
                     'DEPT00501','DEPT00502','DEPT00503','DEPT00601','DEPT00602',
                     'DEPT00701','DEPT00702','DEPT00801','DEPT00802');

INSERT INTO sys_department (dept_code, dept_name, parent_id, sort_order, status, create_time, update_time, deleted)
VALUES
  ('DEPT00201', '销售科',     2,  1, 1, NOW(), NOW(), 0),
  ('DEPT00202', '客服科',     2,  2, 1, NOW(), NOW(), 0),
  ('DEPT00301', '生产计划科', 4,  1, 1, NOW(), NOW(), 0),
  ('DEPT00401', '技术科',     3,  1, 1, NOW(), NOW(), 0),
  ('DEPT00402', '工程科',     3,  2, 1, NOW(), NOW(), 0),
  ('DEPT00501', '来料检验科', 9,  1, 1, NOW(), NOW(), 0),
  ('DEPT00502', '制程检验科', 9,  2, 1, NOW(), NOW(), 0),
  ('DEPT00503', '出货检验科', 9,  3, 1, NOW(), NOW(), 0),
  ('DEPT00601', '采购科',     7,  1, 1, NOW(), NOW(), 0),
  ('DEPT00602', '仓储科',     7,  2, 1, NOW(), NOW(), 0),
  ('DEPT00701', '会计科',     16, 1, 1, NOW(), NOW(), 0),
  ('DEPT00702', '出纳科',     16, 2, 1, NOW(), NOW(), 0),
  ('DEPT00801', '行政科',     10, 1, 1, NOW(), NOW(), 0),
  ('DEPT00802', '人事科',     10, 2, 1, NOW(), NOW(), 0);

-- 1.5 员工改派：仅 4 人所在部门被合并掉，需要换归属
--     销售部(12) → 业务部(2)；管理部(1) → 总经办(11)
UPDATE sys_employee SET dept_id = 2,  update_time = NOW() WHERE id IN (5, 10);
UPDATE sys_employee SET dept_id = 11, update_time = NOW() WHERE id IN (6, 1001);

-- 1.6 dept_name 全量重算（dept_name 是 dept_id 的派生冗余列，唯一真相源是 sys_department）
UPDATE sys_employee e
  JOIN sys_department d ON d.id = e.dept_id AND d.deleted = 0
   SET e.dept_name = d.dept_name
 WHERE e.deleted = 0;

-- 1.7 软删新结构中已无对应的 4 个旧部门（其员工已于 1.5 改派）
UPDATE sys_department
   SET deleted = 1, update_time = NOW()
 WHERE id IN (1, 8, 12, 15);

COMMIT;

-- ---------------------------------------------------------------------------
-- 2) 自检（应输出 24 / 8 / 16 / 0 / 0）
--    存活总数 / 总经办下的部数 / 部下的科数 / 悬空 parent / 重复存活编码
-- ---------------------------------------------------------------------------
