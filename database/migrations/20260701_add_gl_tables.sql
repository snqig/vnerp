-- ========================================================
-- 总账模块表结构补丁（2026-07-01）
-- 修复 fin_voucher_line 等总账表缺失导致测试失败
-- 依据：src/lib/general-ledger.ts 中的 SQL 语句反推
-- ========================================================

-- 会计科目表
CREATE TABLE IF NOT EXISTS `fin_account` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '科目ID',
  `account_code` VARCHAR(20) NOT NULL COMMENT '科目编码',
  `account_name` VARCHAR(100) NOT NULL COMMENT '科目名称',
  `full_name` VARCHAR(200) COMMENT '全称（含父级）',
  `parent_id` INT UNSIGNED COMMENT '父级科目ID',
  `level` TINYINT DEFAULT 1 COMMENT '层级（1=一级）',
  `account_type` TINYINT NOT NULL COMMENT '类型: 1=资产, 2=负债, 3=权益, 4=成本, 5=损益',
  `balance_direction` TINYINT NOT NULL COMMENT '余额方向: 1=借, 2=贷',
  `is_leaf` TINYINT DEFAULT 1 COMMENT '是否末级: 0=否, 1=是',
  `assist_types` VARCHAR(200) COMMENT '辅助核算类型（JSON 数组）',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account_code` (`account_code`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_type` (`account_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会计科目表';

-- 会计期间表
CREATE TABLE IF NOT EXISTS `fin_period` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '期间ID',
  `period_code` VARCHAR(10) NOT NULL COMMENT '期间编码（如 2026-07）',
  `period_name` VARCHAR(20) COMMENT '期间名称（如 2026年7月）',
  `start_date` DATE NOT NULL COMMENT '开始日期',
  `end_date` DATE NOT NULL COMMENT '结束日期',
  `is_closed` TINYINT DEFAULT 0 COMMENT '是否已结账: 0=否, 1=是',
  `status` TINYINT DEFAULT 0 COMMENT '状态: 0=开放, 1=结账中, 2=已关闭',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_code` (`period_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会计期间表';

-- 凭证主表
CREATE TABLE IF NOT EXISTS `fin_voucher` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '凭证ID',
  `voucher_no` VARCHAR(50) NOT NULL COMMENT '凭证编号',
  `period_code` VARCHAR(10) NOT NULL COMMENT '所属期间',
  `voucher_date` DATE NOT NULL COMMENT '凭证日期',
  `voucher_type` TINYINT NOT NULL COMMENT '类型: 1=收, 2=付, 3=转, 4=调整',
  `source_type` VARCHAR(50) COMMENT '来源类型（sale/purchase/payment/receipt/cost 等）',
  `source_id` BIGINT UNSIGNED COMMENT '来源单据ID',
  `source_no` VARCHAR(50) COMMENT '来源单据号',
  `total_debit` DECIMAL(18,2) DEFAULT 0 COMMENT '借方合计（新版总账）',
  `total_credit` DECIMAL(18,2) DEFAULT 0 COMMENT '贷方合计（新版总账）',
  `total_amount` DECIMAL(18,2) DEFAULT 0 COMMENT '凭证总额（旧版 FinanceVoucherHandler 兼容）',
  `status` TINYINT DEFAULT 0 COMMENT '状态: 0=草稿, 1=已提交, 2=已审核, 3=已记账, 4=已作废',
  `summary` TEXT COMMENT '摘要（新版总账）',
  `remark` VARCHAR(500) COMMENT '备注（旧版 FinanceVoucherHandler 兼容）',
  `attachment_count` INT DEFAULT 0 COMMENT '附件数',
  `deleted` TINYINT DEFAULT 0 COMMENT '软删除: 0=正常, 1=已删除',
  `created_by` VARCHAR(50) COMMENT '制单人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（旧版兼容）',
  `audited_by` VARCHAR(50) COMMENT '审核人',
  `audited_at` DATETIME COMMENT '审核时间',
  `posted_by` VARCHAR(50) COMMENT '记账人',
  `posted_at` DATETIME COMMENT '记账时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_voucher_no` (`voucher_no`),
  KEY `idx_period` (`period_code`),
  KEY `idx_source` (`source_type`, `source_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会计凭证主表';

-- 凭证明细表
CREATE TABLE IF NOT EXISTS `fin_voucher_line` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `voucher_id` BIGINT UNSIGNED NOT NULL COMMENT '凭证ID',
  `line_no` INT NOT NULL COMMENT '行号',
  `account_id` INT UNSIGNED NOT NULL COMMENT '科目ID',
  `account_code` VARCHAR(20) COMMENT '科目编码（冗余）',
  `account_name` VARCHAR(100) COMMENT '科目名称（冗余）',
  `summary` VARCHAR(500) COMMENT '摘要（新版总账）',
  `debit_amount` DECIMAL(18,2) DEFAULT 0 COMMENT '借方金额（新版总账）',
  `credit_amount` DECIMAL(18,2) DEFAULT 0 COMMENT '贷方金额（新版总账）',
  `debit_account` VARCHAR(100) COMMENT '借方科目名称（旧版 FinanceVoucherHandler 兼容）',
  `credit_account` VARCHAR(100) COMMENT '贷方科目名称（旧版 FinanceVoucherHandler 兼容）',
  `amount` DECIMAL(18,2) DEFAULT 0 COMMENT '金额（旧版 FinanceVoucherHandler 兼容）',
  `description` VARCHAR(500) COMMENT '描述（旧版 FinanceVoucherHandler 兼容）',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（旧版兼容）',
  `customer_id` BIGINT UNSIGNED COMMENT '客户ID（辅助核算）',
  `supplier_id` BIGINT UNSIGNED COMMENT '供应商ID（辅助核算）',
  `department_id` INT UNSIGNED COMMENT '部门ID（辅助核算）',
  `project_id` INT UNSIGNED COMMENT '项目ID（辅助核算）',
  PRIMARY KEY (`id`),
  KEY `idx_voucher` (`voucher_id`),
  KEY `idx_account` (`account_id`),
  CONSTRAINT `fk_voucher_line_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `fin_voucher` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会计凭证明细表';

-- 科目余额表
CREATE TABLE IF NOT EXISTS `fin_account_balance` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '余额ID',
  `period_code` VARCHAR(10) NOT NULL COMMENT '期间编码',
  `account_id` INT UNSIGNED NOT NULL COMMENT '科目ID',
  `account_code` VARCHAR(20) COMMENT '科目编码（冗余）',
  `begin_debit` DECIMAL(18,2) DEFAULT 0 COMMENT '期初借方',
  `begin_credit` DECIMAL(18,2) DEFAULT 0 COMMENT '期初贷方',
  `current_debit` DECIMAL(18,2) DEFAULT 0 COMMENT '本期借方发生',
  `current_credit` DECIMAL(18,2) DEFAULT 0 COMMENT '本期贷方发生',
  `year_debit` DECIMAL(18,2) DEFAULT 0 COMMENT '本年累计借方',
  `year_credit` DECIMAL(18,2) DEFAULT 0 COMMENT '本年累计贷方',
  `end_debit` DECIMAL(18,2) DEFAULT 0 COMMENT '期末借方',
  `end_credit` DECIMAL(18,2) DEFAULT 0 COMMENT '期末贷方',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_account` (`period_code`, `account_id`),
  KEY `idx_account` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科目余额表';
