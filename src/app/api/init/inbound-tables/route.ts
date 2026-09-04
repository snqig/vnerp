import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
// 创建入库管理相关表
const _CREATE_TABLES_SQL = `
-- 1. 入库订单主表
CREATE TABLE IF NOT EXISTS inv_inbound_order (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_no VARCHAR(50) NOT NULL COMMENT '入库单号',
    order_type ENUM('purchase', 'return', 'transfer', 'other') DEFAULT 'purchase' COMMENT '入库类型',
    warehouse_id INT UNSIGNED NOT NULL COMMENT '仓库ID',
    supplier_id INT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
    supplier_name VARCHAR(100) DEFAULT NULL COMMENT '供应商名称',
    total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
    total_quantity DECIMAL(12,3) DEFAULT 0 COMMENT '总数量',
    status ENUM('draft', 'pending', 'approved', 'completed', 'cancelled') DEFAULT 'draft' COMMENT '状态',
    inbound_date DATE DEFAULT NULL COMMENT '入库日期',
    remark TEXT COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    INDEX idx_order_no (order_no),
    INDEX idx_warehouse (warehouse_id),
    INDEX idx_status (status),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库订单主表';

-- 2. 入库订单明细表
CREATE TABLE IF NOT EXISTS inv_inbound_item (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_id INT UNSIGNED NOT NULL COMMENT '入库订单ID',
    material_id INT UNSIGNED NOT NULL COMMENT '物料ID',
    material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
    material_spec VARCHAR(200) DEFAULT NULL COMMENT '物料规格',
    batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号',
    quantity DECIMAL(12,3) NOT NULL COMMENT '数量',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
    total_price DECIMAL(12,2) DEFAULT 0 COMMENT '总价',
    warehouse_location VARCHAR(50) DEFAULT NULL COMMENT '库位',
    produce_date DATE DEFAULT NULL COMMENT '生产日期',
    expire_date DATE DEFAULT NULL COMMENT '有效期至',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_order_id (order_id),
    INDEX idx_material (material_id),
    INDEX idx_batch_no (batch_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库订单明细表';

-- 3. 库存批次表
CREATE TABLE IF NOT EXISTS inv_inventory_batch (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    batch_no VARCHAR(50) NOT NULL COMMENT '批次号',
    material_id INT UNSIGNED NOT NULL COMMENT '物料ID',
    material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
    warehouse_id INT UNSIGNED NOT NULL COMMENT '仓库ID',
    warehouse_name VARCHAR(100) DEFAULT NULL COMMENT '仓库名称',
    quantity DECIMAL(12,3) DEFAULT 0 COMMENT '总数量',
    available_qty DECIMAL(12,3) DEFAULT 0 COMMENT '可用数量',
    locked_qty DECIMAL(12,3) DEFAULT 0 COMMENT '锁定数量',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
    produce_date DATE DEFAULT NULL COMMENT '生产日期',
    expire_date DATE DEFAULT NULL COMMENT '有效期至',
    inbound_date DATE DEFAULT NULL COMMENT '入库日期',
    status ENUM('normal', 'frozen', 'expired') DEFAULT 'normal' COMMENT '状态',
    version INT UNSIGNED DEFAULT 1 COMMENT '乐观锁版本号',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_batch_no (batch_no),
    INDEX idx_material (material_id),
    INDEX idx_warehouse (warehouse_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存批次表';
`;

// GET - 检查并创建表
export const GET = withPermission(
  async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
    try {
      // 检查表是否存在
      const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('inv_inbound_order', 'inv_inbound_item', 'inv_inventory_batch')
    `);

      const existingTables = (tables as DbRow[]).map((t) => t.TABLE_NAME);
      const results: string[] = [];

      // 创建入库订单主表
      if (!existingTables.includes('inv_inbound_order')) {
        await query(ts('k_1yw7bpa'));
        results.push(ts('k_fxzb49'));
      } else {
        results.push(ts('k_1xl8dn8'));
      }

      // 创建入库订单明细表
      if (!existingTables.includes('inv_inbound_item')) {
        await query(ts('k_1kkze5m'));
        results.push(ts('k_1ubdjbk'));
      } else {
        results.push(ts('k_1idsunn'));
      }

      // 创建库存批次表
      if (!existingTables.includes('inv_inventory_batch')) {
        await query(ts('k_rdgv2l'));
        results.push(ts('k_1u7a4kc'));
      } else {
        results.push(ts('k_18r5tqt'));
      }

      // 插入测试数据
      const orderCount = await query(
        'SELECT COUNT(*) as count FROM inv_inbound_order WHERE deleted = 0'
      );
      if ((orderCount as DbRow[])[0].count === 0) {
        // 添加入库订单测试数据
        await query(ts('k_1ecjvlf'));

        // 添加入库明细
        await query(ts('k_15udk0b'));

        // 添加库存批次
        await query(ts('k_1nqnq8z'));

        results.push(ts('k_1hua2zz'));
      } else {
        results.push(ts('k_svxaq'));
      }

      return successResponse({
        message: ts('k_c6cpzo'),
        details: results,
      });
    } catch (error) {
      return errorResponse(`创建表失败: ${(error as Error).message}`, 500, 500);
    }
  },
  { errorMessage: '初始化入库管理表失败' }
);
