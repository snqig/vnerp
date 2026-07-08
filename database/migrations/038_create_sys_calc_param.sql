-- =====================================================
-- Migration 038: Create sys_calc_param table
-- 统一管理 ERP 全模块硬编码计算参数（标准费率、材料占比、制造费用率、
-- MRP 提前期、排程工作时段、质量合格率阈值、网版磨损系数等）。
-- 消除"最大技术债务：硬编码参数散布在多处常量中"的风险。
-- =====================================================

CREATE TABLE IF NOT EXISTS `sys_calc_param` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '参数ID',
  `category` VARCHAR(50) NOT NULL COMMENT '分类: mrp/cost/schedule/qc/screen_plate/printing',
  `param_key` VARCHAR(100) NOT NULL COMMENT '参数键 (如 mrp.default_lead_time_days)',
  `param_value` VARCHAR(500) NOT NULL COMMENT '参数值 (字符串存储，由服务层转型)',
  `value_type` ENUM('int','decimal','boolean','string') NOT NULL DEFAULT 'string' COMMENT '值类型',
  `default_value` VARCHAR(500) COMMENT '代码内置默认值（用于 DB 不可用时兜底）',
  `description` VARCHAR(500) COMMENT '参数说明',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0-禁用 1-启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0-正常 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_param_key` (`param_key`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='计算参数配置表';

-- =====================================================
-- 种子数据：全量初始化 15 个核心计算参数
-- =====================================================

INSERT INTO `sys_calc_param` (`category`, `param_key`, `param_value`, `value_type`, `default_value`, `description`) VALUES
-- MRP 模块
('mrp',       'mrp.default_lead_time_days',         '7',     'int',     '7',     'MRP 默认采购提前期（天），当 inv_material 无 lead_time_days 时兜底'),
-- 成本核算模块
('cost',      'cost.standard_labor_rate',            '50',    'decimal', '50',    '标准人工费率（元/小时），用于成本差异分析'),
('cost',      'cost.standard_efficiency_per_hour',   '500',   'decimal', '500',   '标准生产效率（件/小时），用于标准工时计算'),
('cost',      'cost.material_cost_ratio',            '0.45',  'decimal', '0.45',  '材料成本占售价比例，用于估算标准材料成本'),
('cost',      'cost.overhead_rate',                  '0.15',  'decimal', '0.15',  '制造费用率（占材料成本比例），用于制造费用估算'),
('cost',      'cost.manufacturing_cost_ratio',       '0.5',   'decimal', '0.5',   '简化制造费用系数（占人工成本比例），API 手动计算路径使用'),
-- 生产排程模块
('schedule',  'schedule.working_hours_per_day',     '8',     'int',     '8',     '每日工作时长（小时），排程引擎使用'),
('schedule',  'schedule.work_start_hour',           '8',     'int',     '8',     '工作开始时间（24小时制），排程引擎使用'),
('schedule',  'schedule.search_days_ahead',          '30',    'int',     '30',    '排程搜索范围（天），向前搜索可用时间槽'),
('schedule',  'schedule.default_setup_time_minutes', '30',    'int',     '30',    '默认换模时间（分钟），排程间隔'),
('schedule',  'schedule.default_max_colors',         '4',     'int',     '4',     '设备默认最大色数，排程匹配使用'),
-- 质量管理模块
('qc',        'qc.pass_rate_threshold',              '98',    'decimal', '98',    '来料检验合格率阈值（%），≥此值判定合格'),
-- 网版成本模块
('screen_plate','screen_plate.wear_cost_ratio',      '0.1',   'decimal', '0.1',   '网版磨损成本系数，磨损成本 = 采购价 × 寿命比 × 此系数'),
-- 多色印刷模块
('printing',  'printing.default_loss_rate',          '0.15',  'decimal', '0.15',  '油墨默认损耗率（15%），配方损耗兜底值'),
-- 采购模块
('pur',       'pur.default_tax_rate',                '13',    'decimal', '13',    '采购订单默认税率（%），行级税率兜底'),
-- 销售模块
('sales',     'sales.default_payment_days',          '30',    'int',     '30',    '销售应收默认账期（天），应收单生成时使用')
ON DUPLICATE KEY UPDATE `update_time` = CURRENT_TIMESTAMP;
