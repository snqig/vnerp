-- 进料检验主表
CREATE TABLE IF NOT EXISTS `qc_incoming_inspection` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspection_no` varchar(50) NOT NULL COMMENT '检验单号',
  `inspection_date` date NOT NULL COMMENT '检验日期',
  `supplier_name` varchar(100) NOT NULL COMMENT '供应商',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `specification` varchar(100) NOT NULL COMMENT '规格',
  `batch_no` varchar(50) NOT NULL COMMENT '批次号',
  `quantity` decimal(10,2) NOT NULL COMMENT '数量',
  `unit` varchar(20) NOT NULL COMMENT '单位',
  `inspection_type` varchar(20) NOT NULL COMMENT '检验类型',
  `inspection_result` varchar(20) NOT NULL COMMENT '检验结果',
  `inspector_name` varchar(50) NOT NULL COMMENT '检验员',
  `remark` text COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspection_no` (`inspection_no`),
  KEY `idx_inspection_date` (`inspection_date`),
  KEY `idx_supplier_name` (`supplier_name`),
  KEY `idx_material_name` (`material_name`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_inspection_result` (`inspection_result`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='进料检验主表';

-- 进料检验明细表
CREATE TABLE IF NOT EXISTS `qc_incoming_inspection_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspection_id` int NOT NULL COMMENT '检验单ID',
  `inspection_no` varchar(50) NOT NULL COMMENT '检验单号',
  `item_name` varchar(100) NOT NULL COMMENT '检验项目',
  `standard` varchar(255) NOT NULL COMMENT '标准要求',
  `actual_value` varchar(255) DEFAULT NULL COMMENT '实际值',
  `result` varchar(20) NOT NULL COMMENT '检验结果',
  `remark` text COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_inspection_id` (`inspection_id`),
  KEY `idx_inspection_no` (`inspection_no`),
  KEY `idx_item_name` (`item_name`),
  KEY `idx_result` (`result`),
  CONSTRAINT `fk_qc_incoming_item_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `qc_incoming_inspection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='进料检验明细表';

-- 插入示例数据
INSERT INTO `qc_incoming_inspection` (`inspection_no`, `inspection_date`, `supplier_name`, `material_code`, `material_name`, `specification`, `batch_no`, `quantity`, `unit`, `inspection_type`, `inspection_result`, `inspector_name`, `remark`) VALUES
('IQC20250303001', '2025-03-03', '恒翌达', 'MAT001', '厚0.3热缩套管', 'Ф32', 'B20250303001', 1000.00, 'M', 'sampling', 'pass', '张三', '检验合格'),
('IQC20250303002', '2025-03-03', '华通材料', 'MAT002', 'PVC绝缘胶带', '20mm*20m', 'B20250303002', 500.00, '卷', 'full', 'pass', '李四', '检验合格'),
('IQC20250302001', '2025-03-02', '江南电缆', 'MAT003', '铜芯线', '1.5mm²', 'B20250302001', 2000.00, 'M', 'sampling', 'reject', '张三', '部分线材直径不达标'),
('IQC20250301001', '2025-03-01', '恒翌达', 'MAT004', 'PE管', '25mm', 'B20250301001', 1500.00, 'M', 'sampling', 'pending', '李四', '待检验');

-- 插入示例明细数据
INSERT INTO `qc_incoming_inspection_item` (`inspection_id`, `inspection_no`, `item_name`, `standard`, `actual_value`, `result`, `remark`) VALUES
(1, 'IQC20250303001', '外观检查', '无划痕、变形、色差', '无划痕、无变形、无色差', 'pass', ''),
(1, 'IQC20250303001', '尺寸检查', 'Ф32±0.1mm', 'Ф32.05mm', 'pass', ''),
(1, 'IQC20250303001', '材质检查', '符合材质标准', '符合标准', 'pass', ''),
(2, 'IQC20250303002', '外观检查', '无破损、无异味', '无破损、无异味', 'pass', ''),
(2, 'IQC20250303002', '尺寸检查', '20mm*20m', '20mm*20.5m', 'pass', '长度略有盈余'),
(2, 'IQC20250303002', '粘性测试', '符合粘性要求', '符合要求', 'pass', ''),
(3, 'IQC20250302001', '外观检查', '无破损、无氧化', '无破损、无氧化', 'pass', ''),
(3, 'IQC20250302001', '尺寸检查', '1.5mm²±0.1mm²', '1.3mm²', 'reject', '直径偏小'),
(3, 'IQC20250302001', '电阻测试', '符合电阻要求', '符合要求', 'pass', '');
