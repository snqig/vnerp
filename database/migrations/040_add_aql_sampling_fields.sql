-- =====================================================
-- Migration 040: Add AQL sampling fields to qc_incoming_inspection
-- 补齐来料检验 AQL 抽样方案字段，支持 GB/T 2828.1 标准。
-- 当前为全检模式，本次新增抽样计算所需字段但不破坏现有逻辑。
-- =====================================================

ALTER TABLE `qc_incoming_inspection`
  ADD COLUMN IF NOT EXISTS `sample_size` INT DEFAULT NULL COMMENT 'AQL抽样样本量' AFTER `quantity`,
  ADD COLUMN IF NOT EXISTS `accept_qty` INT DEFAULT NULL COMMENT '合格判定数(Ac)' AFTER `sample_size`,
  ADD COLUMN IF NOT EXISTS `reject_qty` INT DEFAULT NULL COMMENT '不合格判定数(Re)' AFTER `accept_qty`,
  ADD COLUMN IF NOT EXISTS `aql_level` VARCHAR(10) DEFAULT NULL COMMENT 'AQL水平: 0.65/1.0/1.5/2.5/4.0' AFTER `reject_qty`,
  ADD COLUMN IF NOT EXISTS `inspection_standard` VARCHAR(50) DEFAULT NULL COMMENT '检验标准: GB/T 2828.1' AFTER `aql_level`;

-- =====================================================
-- AQL 抽样方案参考表 (GB/T 2828.1 单次正常抽样)
-- =====================================================
CREATE TABLE IF NOT EXISTS `qc_aql_sampling_plan` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `lot_size_min` INT NOT NULL COMMENT '批量下限',
  `lot_size_max` INT NOT NULL COMMENT '批量上限',
  `sample_size_code` VARCHAR(5) NOT NULL COMMENT '样本量字码: A,B,C,D,E,F,G,H,J,K,L',
  `sample_size` INT NOT NULL COMMENT '样本量 n',
  `aql_level` VARCHAR(10) NOT NULL COMMENT 'AQL水平: 0.65/1.0/1.5/2.5/4.0',
  `accept_qty` INT NOT NULL COMMENT '合格判定数 Ac',
  `reject_qty` INT NOT NULL COMMENT '不合格判定数 Re',
  `inspection_level` VARCHAR(10) NOT NULL DEFAULT 'II' COMMENT '检验水平: I/II/III',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan` (`lot_size_min`, `lot_size_max`, `aql_level`, `inspection_level`),
  KEY `idx_aql_level` (`aql_level`),
  KEY `idx_lot_size` (`lot_size_min`, `lot_size_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AQL抽样方案表(GB/T 2828.1)';

-- =====================================================
-- 种子数据：GB/T 2828.1 正常检验单次抽样方案 (检验水平 II)
-- 常用 AQL 水平: 0.65, 1.0, 1.5, 2.5, 4.0
-- =====================================================
INSERT INTO `qc_aql_sampling_plan` (`lot_size_min`, `lot_size_max`, `sample_size_code`, `sample_size`, `aql_level`, `accept_qty`, `reject_qty`, `inspection_level`) VALUES
-- 批量 2~8 (字码 A, n=2)
(2,    8,    'A', 2,  '4.0', 0, 1, 'II'),
-- 批量 9~15 (字码 B, n=3)
(9,    15,   'B', 3,  '4.0', 0, 1, 'II'),
-- 批量 16~25 (字码 C, n=5)
(16,   25,   'C', 5,  '4.0', 0, 1, 'II'),
(16,   25,   'C', 5,  '2.5', 0, 1, 'II'),
-- 批量 26~50 (字码 D, n=8)
(26,   50,   'D', 8,  '4.0', 1, 2, 'II'),
(26,   50,   'D', 8,  '2.5', 1, 2, 'II'),
(26,   50,   'D', 8,  '1.5', 0, 1, 'II'),
-- 批量 51~90 (字码 E, n=13)
(51,   90,   'E', 13, '4.0', 1, 2, 'II'),
(51,   90,   'E', 13, '2.5', 1, 2, 'II'),
(51,   90,   'E', 13, '1.5', 1, 2, 'II'),
(51,   90,   'E', 13, '1.0', 0, 1, 'II'),
-- 批量 91~150 (字码 F, n=20)
(91,   150,  'F', 20, '4.0', 2, 3, 'II'),
(91,   150,  'F', 20, '2.5', 1, 2, 'II'),
(91,   150,  'F', 20, '1.5', 1, 2, 'II'),
(91,   150,  'F', 20, '1.0', 1, 2, 'II'),
(91,   150,  'F', 20, '0.65', 0, 1, 'II'),
-- 批量 151~280 (字码 G, n=32)
(151,  280,  'G', 32, '4.0', 3, 4, 'II'),
(151,  280,  'G', 32, '2.5', 2, 3, 'II'),
(151,  280,  'G', 32, '1.5', 1, 2, 'II'),
(151,  280,  'G', 32, '1.0', 1, 2, 'II'),
(151,  280,  'G', 32, '0.65', 1, 2, 'II'),
-- 批量 281~500 (字码 H, n=50)
(281,  500,  'H', 50, '4.0', 5, 6, 'II'),
(281,  500,  'H', 50, '2.5', 3, 4, 'II'),
(281,  500,  'H', 50, '1.5', 2, 3, 'II'),
(281,  500,  'H', 50, '1.0', 1, 2, 'II'),
(281,  500,  'H', 50, '0.65', 1, 2, 'II'),
-- 批量 501~1200 (字码 J, n=80)
(501,  1200, 'J', 80, '4.0', 7, 8, 'II'),
(501,  1200, 'J', 80, '2.5', 5, 6, 'II'),
(501,  1200, 'J', 80, '1.5', 3, 4, 'II'),
(501,  1200, 'J', 80, '1.0', 2, 3, 'II'),
(501,  1200, 'J', 80, '0.65', 1, 2, 'II'),
-- 批量 1201~3200 (字码 K, n=125)
(1201, 3200, 'K', 125, '4.0', 10, 11, 'II'),
(1201, 3200, 'K', 125, '2.5', 7, 8, 'II'),
(1201, 3200, 'K', 125, '1.5', 5, 6, 'II'),
(1201, 3200, 'K', 125, '1.0', 3, 4, 'II'),
(1201, 3200, 'K', 125, '0.65', 2, 3, 'II'),
-- 批量 3201~10000 (字码 L, n=200)
(3201, 10000, 'L', 200, '4.0', 14, 15, 'II'),
(3201, 10000, 'L', 200, '2.5', 10, 11, 'II'),
(3201, 10000, 'L', 200, '1.5', 7, 8, 'II'),
(3201, 10000, 'L', 200, '1.0', 5, 6, 'II'),
(3201, 10000, 'L', 200, '0.65', 3, 4, 'II')
ON DUPLICATE KEY UPDATE `update_time` = CURRENT_TIMESTAMP;
