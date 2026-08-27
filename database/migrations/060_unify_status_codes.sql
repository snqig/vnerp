-- 060: 状态码统一 (varchar→tinyint)
-- 将 inv_inbound_order, inv_outbound_order, prod_work_order 的 varchar 状态列改为 tinyint

-- ========================================
-- 状态码映射表
-- ========================================
-- inv_inbound_order.status: 'pending'=1, 'approved'=2, 'cancelled'=3
-- inv_inbound_order.qc_status: 'pending'=0, 'passed'=1, 'failed'=2
-- inv_outbound_order.status: 'draft'=1, 'pending'=2, 'approved'=3, 'shipped'=4, 'cancelled'=5
-- inv_outbound_order.audit_status: 'pending'=0, 'approved'=1, 'rejected'=2
-- prod_work_order.status: 'pending'=1, 'scheduled'=2, 'in_progress'=3, 'completed'=4, 'cancelled'=5
-- prod_work_order.priority: 'low'=1, 'normal'=2, 'high'=3, 'urgent'=4

-- ========================================
-- 阶段 1: 添加新列
-- ========================================
ALTER TABLE inv_inbound_order
  ADD COLUMN status_new TINYINT NOT NULL DEFAULT 1 COMMENT '状态(新)' AFTER status,
  ADD COLUMN qc_status_new TINYINT NOT NULL DEFAULT 0 COMMENT '质检状态(新)' AFTER qc_status;

ALTER TABLE inv_outbound_order
  ADD COLUMN status_new TINYINT NOT NULL DEFAULT 1 COMMENT '状态(新)' AFTER status,
  ADD COLUMN audit_status_new TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态(新)' AFTER audit_status;

ALTER TABLE prod_work_order
  ADD COLUMN status_new TINYINT NOT NULL DEFAULT 1 COMMENT '状态(新)' AFTER status,
  ADD COLUMN priority_new TINYINT NOT NULL DEFAULT 2 COMMENT '优先级(新)' AFTER priority;

-- ========================================
-- 阶段 2: 数据迁移
-- ========================================
-- inv_inbound_order.status
UPDATE inv_inbound_order SET status_new = 1 WHERE status = 'pending';
UPDATE inv_inbound_order SET status_new = 2 WHERE status = 'approved';
UPDATE inv_inbound_order SET status_new = 3 WHERE status = 'cancelled';

-- inv_inbound_order.qc_status
UPDATE inv_inbound_order SET qc_status_new = 0 WHERE qc_status = 'pending';
UPDATE inv_inbound_order SET qc_status_new = 1 WHERE qc_status = 'passed';
UPDATE inv_inbound_order SET qc_status_new = 2 WHERE qc_status = 'failed';

-- inv_outbound_order.status
UPDATE inv_outbound_order SET status_new = 1 WHERE status = 'draft';
UPDATE inv_outbound_order SET status_new = 2 WHERE status = 'pending';
UPDATE inv_outbound_order SET status_new = 3 WHERE status = 'approved';
UPDATE inv_outbound_order SET status_new = 4 WHERE status = 'shipped';
UPDATE inv_outbound_order SET status_new = 5 WHERE status = 'cancelled';

-- inv_outbound_order.audit_status
UPDATE inv_outbound_order SET audit_status_new = 0 WHERE audit_status = 'pending';
UPDATE inv_outbound_order SET audit_status_new = 1 WHERE audit_status = 'approved';
UPDATE inv_outbound_order SET audit_status_new = 2 WHERE audit_status = 'rejected';

-- prod_work_order.status
UPDATE prod_work_order SET status_new = 1 WHERE status = 'pending';
UPDATE prod_work_order SET status_new = 2 WHERE status = 'scheduled';
UPDATE prod_work_order SET status_new = 3 WHERE status = 'in_progress';
UPDATE prod_work_order SET status_new = 4 WHERE status = 'completed';
UPDATE prod_work_order SET status_new = 5 WHERE status = 'cancelled';

-- prod_work_order.priority
UPDATE prod_work_order SET priority_new = 1 WHERE priority = 'low';
UPDATE prod_work_order SET priority_new = 2 WHERE priority = 'normal';
UPDATE prod_work_order SET priority_new = 3 WHERE priority = 'high';
UPDATE prod_work_order SET priority_new = 4 WHERE priority = 'urgent';

-- ========================================
-- 阶段 3: 删除旧列，重命名新列
-- ========================================
-- 注意: 执行此阶段前确保应用代码已更新为使用新列名
-- ALTER TABLE inv_inbound_order DROP COLUMN status, RENAME COLUMN status_new TO status;
-- ALTER TABLE inv_inbound_order DROP COLUMN qc_status, RENAME COLUMN qc_status_new TO qc_status;
-- ALTER TABLE inv_outbound_order DROP COLUMN status, RENAME COLUMN status_new TO status;
-- ALTER TABLE inv_outbound_order DROP COLUMN audit_status, RENAME COLUMN audit_status_new TO audit_status;
-- ALTER TABLE prod_work_order DROP COLUMN status, RENAME COLUMN status_new TO status;
-- ALTER TABLE prod_work_order DROP COLUMN priority, RENAME COLUMN priority_new TO priority;
