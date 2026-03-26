-- ========================================================
-- 标准卡表结构更新
-- 根据 print 页面和 input 页面需求重新设计
-- ========================================================

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS `prd_standard_card`;

-- 创建新的标准卡表
CREATE TABLE `prd_standard_card` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标准卡ID',
  
  -- ========== 基础信息 ==========
  `card_no` VARCHAR(50) NOT NULL COMMENT '标准卡编号',
  `customer_name` VARCHAR(100) COMMENT '客户名称',
  `customer_code` VARCHAR(50) COMMENT '客户代码',
  `product_name` VARCHAR(100) COMMENT '产品名称',
  `version` VARCHAR(10) COMMENT '版本',
  `date` DATE COMMENT '日期',
  `document_code` VARCHAR(50) COMMENT '文件编号',
  
  -- ========== 产品规格 ==========
  `finished_size` VARCHAR(50) COMMENT '成品尺寸',
  `tolerance` VARCHAR(50) COMMENT '公差',
  
  -- ========== 材料信息 ==========
  `material_name` VARCHAR(100) COMMENT '材料名称',
  `material_type` VARCHAR(20) COMMENT '材料类型(硬胶/软胶)',
  
  -- ========== 排版信息 ==========
  `layout_type` VARCHAR(50) COMMENT '排版方式',
  `spacing` VARCHAR(20) COMMENT '间距',
  `spacing_value` VARCHAR(20) COMMENT '间距值',
  `sheet_width` VARCHAR(20) COMMENT '片材宽',
  `sheet_length` VARCHAR(20) COMMENT '片材长',
  
  -- ========== 纸芯与卷料 ==========
  `core_type` VARCHAR(20) COMMENT '纸芯类型(1#/2#/3#)',
  `paper_direction` VARCHAR(20) COMMENT '出纸方向',
  `roll_width` VARCHAR(20) COMMENT '卷料宽度',
  `paper_edge` VARCHAR(20) COMMENT '纸边',
  
  -- ========== 工艺信息 ==========
  `standard_usage` VARCHAR(50) COMMENT '标准用量',
  `jump_distance` VARCHAR(20) COMMENT '跳距',
  `process_flow1` VARCHAR(100) COMMENT '工艺流程1',
  `process_flow2` VARCHAR(100) COMMENT '工艺流程2',
  `print_type` VARCHAR(50) COMMENT '表面处理(胶印/卷料丝印/片料丝印/轮转印)',
  `first_jump_distance` VARCHAR(20) COMMENT '第一跳距',
  
  -- ========== 印序数据(JSON格式存储7行) ==========
  `sequences` JSON COMMENT '印序数据',
  
  -- ========== 膜信息 ==========
  `film_manufacturer` VARCHAR(100) COMMENT '膜厂商',
  `film_code` VARCHAR(50) COMMENT '膜编号',
  `film_size` VARCHAR(50) COMMENT '膜规格',
  
  -- ========== 加工方式 ==========
  `process_method` VARCHAR(20) COMMENT '工艺方式(模切/冲压)',
  `stamping_method` VARCHAR(50) COMMENT '冲压方法',
  `mold_code` VARCHAR(50) COMMENT '模具编号',
  
  -- ========== 排版方向 ==========
  `layout_method` VARCHAR(50) COMMENT '排版方式',
  `layout_way` VARCHAR(50) COMMENT '排版方向',
  `jump_distance2` VARCHAR(20) COMMENT '跳距2',
  
  -- ========== 麦拉信息 ==========
  `mylar_material` VARCHAR(100) COMMENT '麦拉材料',
  `mylar_specs` VARCHAR(50) COMMENT '麦拉规格',
  `mylar_layout` VARCHAR(50) COMMENT '麦拉排版',
  `mylar_jump` VARCHAR(20) COMMENT '麦拉跳距',
  
  -- ========== 背胶信息 ==========
  `adhesive_type` VARCHAR(50) COMMENT '背胶种类',
  `adhesive_manufacturer` VARCHAR(100) COMMENT '背胶厂商',
  `adhesive_code` VARCHAR(50) COMMENT '背胶编号',
  `adhesive_size` VARCHAR(50) COMMENT '背胶尺寸',
  `dashed_knife` TINYINT DEFAULT 0 COMMENT '加虚线刀: 0-否, 1-是',
  
  -- ========== 切片方式 ==========
  `slice_per_row` VARCHAR(20) COMMENT 'PCS/排',
  `slice_per_roll` VARCHAR(20) COMMENT 'PCS/卷',
  `slice_per_bundle` VARCHAR(20) COMMENT 'PCS/扎',
  `slice_per_bag` VARCHAR(20) COMMENT 'PCS/袋',
  `slice_per_box` VARCHAR(20) COMMENT 'PCS/箱',
  
  -- ========== 存放位置 ==========
  `back_knife_mold` VARCHAR(50) COMMENT '背胶刀模存放',
  `back_mylar_mold` VARCHAR(50) COMMENT '背麦拉刀模存放',
  
  -- ========== 离型纸信息 ==========
  `release_paper_code` VARCHAR(50) COMMENT '离型纸编号',
  `release_paper_type` VARCHAR(50) COMMENT '离型纸种类',
  `release_paper_specs` VARCHAR(50) COMMENT '离型纸规格',
  
  -- ========== 包装信息 ==========
  `padding_material` VARCHAR(100) COMMENT '垫纸材料',
  `packing_material` VARCHAR(100) COMMENT '打包材料',
  `glue_type` VARCHAR(50) COMMENT '滴胶类型(硬胶/软胶/PU胶/其它)',
  `packing_type` VARCHAR(50) COMMENT '包装类型',
  
  -- ========== 颜色信息 ==========
  `special_color` VARCHAR(200) COMMENT '专色配比',
  `color_formula` VARCHAR(200) COMMENT '颜色配方',
  
  -- ========== 文件与备注 ==========
  `file_path` VARCHAR(500) COMMENT '电脑图档存储路径',
  `sample_info` VARCHAR(200) COMMENT '样品信息',
  `notes` TEXT COMMENT '注意事项',
  
  -- ========== 签名区域 ==========
  `creator` VARCHAR(50) COMMENT '制表',
  `reviewer` VARCHAR(50) COMMENT '审核',
  `factory_manager` VARCHAR(50) COMMENT '厂务',
  `quality_manager` VARCHAR(50) COMMENT '品管',
  `sales` VARCHAR(50) COMMENT '业务',
  `approver` VARCHAR(50) COMMENT '核准',
  
  -- ========== 系统字段 ==========
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-草稿, 2-待审核, 3-已启用, 4-已归档',
  `creator_id` BIGINT UNSIGNED COMMENT '创建人ID',
  `reviewer_id` BIGINT UNSIGNED COMMENT '审核人ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_card_no` (`card_no`),
  KEY `idx_customer` (`customer_name`),
  KEY `idx_product` (`product_name`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准卡表';

-- 插入测试数据
INSERT INTO `prd_standard_card` (
  `card_no`, `customer_name`, `customer_code`, `product_name`, `version`, `date`, `document_code`,
  `finished_size`, `tolerance`, `material_name`, `material_type`, `layout_type`, `spacing`, `spacing_value`,
  `sheet_width`, `sheet_length`, `core_type`, `paper_direction`, `roll_width`, `paper_edge`,
  `standard_usage`, `jump_distance`, `process_flow1`, `process_flow2`, `print_type`, `first_jump_distance`,
  `sequences`, `film_manufacturer`, `film_code`, `film_size`, `process_method`, `stamping_method`, `mold_code`,
  `layout_method`, `layout_way`, `jump_distance2`, `mylar_material`, `mylar_specs`, `mylar_layout`, `mylar_jump`,
  `adhesive_type`, `adhesive_manufacturer`, `adhesive_code`, `adhesive_size`, `dashed_knife`,
  `slice_per_row`, `slice_per_roll`, `slice_per_bundle`, `slice_per_bag`, `slice_per_box`,
  `back_knife_mold`, `back_mylar_mold`, `release_paper_code`, `release_paper_type`, `release_paper_specs`,
  `padding_material`, `packing_material`, `glue_type`, `packing_type`,
  `special_color`, `color_formula`, `file_path`, `sample_info`, `notes`,
  `creator`, `reviewer`, `factory_manager`, `quality_manager`, `sales`, `approver`, `status`
) VALUES (
  'SC20260317002', '小米科技有限公司', 'CUST001', '平板电脑保护套', 'V2.0', '2026-03-16', 'DOC20260317001',
  '250x180mm', '±0.5', 'PU皮革', '软胶', '自动排版', '标准', '5mm',
  '300', '400', '2#', '纵向', '320', '3mm',
  '1000', '10', '印刷→模切→包装', '检验→入库', '轮转印', '5',
  '[{"id":1,"color":"红色","inkCode":"INK001","linCode":"LIN001","storageLocation":"A01","plateCode":"PLT001","mesh":"300","plateStorage":"B01","printSide":"正面"},{"id":2,"color":"蓝色","inkCode":"INK002","linCode":"LIN002","storageLocation":"A02","plateCode":"PLT002","mesh":"350","plateStorage":"B02","printSide":"反面"},{"id":3,"color":"黑色","inkCode":"INK003","linCode":"LIN003","storageLocation":"A03","plateCode":"PLT003","mesh":"300","plateStorage":"B03","printSide":"正面"},{"id":4,"color":"白色","inkCode":"INK004","linCode":"LIN004","storageLocation":"A04","plateCode":"PLT004","mesh":"350","plateStorage":"B04","printSide":"反面"},{"id":5,"color":"黄色","inkCode":"INK005","linCode":"LIN005","storageLocation":"A05","plateCode":"PLT005","mesh":"300","plateStorage":"B05","printSide":"正面"},{"id":6,"color":"绿色","inkCode":"INK006","linCode":"LIN006","storageLocation":"A06","plateCode":"PLT006","mesh":"350","plateStorage":"B06","printSide":"反面"},{"id":7,"color":"紫色","inkCode":"INK007","linCode":"LIN007","storageLocation":"A07","plateCode":"PLT007","mesh":"300","plateStorage":"B07","printSide":"正面"}]',
  '3M', 'FILM001', '250x180', '冲压', '热压', 'MOLD001',
  '横向排版', '从左到右', '8', 'PET', '0.1mm', '单排', '5',
  '亚克力', '3M', 'ADH001', '250x180', 0,
  '10', '100', '50', '20', '10',
  '仓库A', '仓库B', 'RP001', '离型纸A', '250x180',
  '海绵', '纸箱', 'PU胶', 'PCS/箱',
  'C:100 M:0 Y:0 K:0', '配方A', '/files/design.pdf', '样品A', '注意防潮',
  '张三', '李四', '王五', '赵六', '钱七', '孙八', 3
);
