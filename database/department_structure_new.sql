-- 越南达昌科技有限公司系统 - 新部门架构设计
-- 生成日期: 2026-03-26
-- 部门结构:
--   管理部
--   业务部
--   生产部
--     ├── 模切
--     ├── 商标
--     └── 其他
--   打样中心
--   采购部
--     ├── 采购
--     └── 仓库
--   品质部

-- 清空现有部门数据
DELETE FROM `sys_department`;

-- 重置自增ID
ALTER TABLE `sys_department` AUTO_INCREMENT = 1;

-- 插入新的部门架构数据
-- 一级部门
INSERT INTO `sys_department` (`code`, `name`, `parent_id`, `manager_name`, `sort_order`, `description`, `status`) VALUES
('DEPT001', '管理部', 0, '张经理', 1, '公司管理部门，负责整体运营管理', 1),
('DEPT002', '业务部', 0, '李经理', 2, '业务部门，负责客户开发和业务拓展', 1),
('DEPT003', '生产部', 0, '王经理', 3, '生产部门，负责产品生产制造', 1),
('DEPT004', '打样中心', 0, '赵主管', 4, '负责产品打样和样品制作', 1),
('DEPT005', '采购部', 0, '钱经理', 5, '采购部门，负责物料采购和供应商管理', 1),
('DEPT006', '品质部', 0, '孙经理', 6, '品质部门，负责质量检验和管控', 1);

-- 生产部子部门
INSERT INTO `sys_department` (`code`, `name`, `parent_id`, `manager_name`, `sort_order`, `description`, `status`) VALUES
('DEPT00301', '模切', 3, '周主管', 1, '模切工序生产组', 1),
('DEPT00302', '商标', 3, '吴主管', 2, '商标印刷生产组', 1),
('DEPT00303', '其他', 3, '郑主管', 3, '其他生产工序组', 1);

-- 采购部子部门
INSERT INTO `sys_department` (`code`, `name`, `parent_id`, `manager_name`, `sort_order`, `description`, `status`) VALUES
('DEPT00501', '采购', 5, '陈主管', 1, '物料采购组', 1),
('DEPT00502', '仓库', 5, '刘主管', 2, '仓库管理组', 1);

-- 查询验证
SELECT 
    d1.id as '部门ID',
    d1.code as '部门编码',
    d1.name as '部门名称',
    CASE 
        WHEN d1.parent_id = 0 THEN '-'
        ELSE d2.name 
    END as '上级部门',
    d1.manager_name as '负责人',
    d1.sort_order as '排序',
    CASE 
        WHEN d1.status = 1 THEN '启用'
        ELSE '停用'
    END as '状态'
FROM sys_department d1
LEFT JOIN sys_department d2 ON d1.parent_id = d2.id
ORDER BY d1.parent_id, d1.sort_order;
