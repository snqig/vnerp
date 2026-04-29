import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

// 创建打样订单管理相关表
export async function GET(request: NextRequest) {
  try {
    const results: string[] = [];

    // 检查表是否已存在
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('sal_sample_order', 'sal_sample_order_history')
    `);

    const existingTables = (tables as any[]).map(t => t.TABLE_NAME);

    // 1. 创建打样订单主表
    if (!existingTables.includes('sal_sample_order')) {
      await query(`
        CREATE TABLE IF NOT EXISTS sal_sample_order (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          order_no VARCHAR(50) NOT NULL COMMENT '打样订单号',
          notify_date DATE NOT NULL COMMENT '通知打样日期',
          customer_name VARCHAR(100) NOT NULL COMMENT '客户名称',
          product_name VARCHAR(200) NOT NULL COMMENT '品名',
          material_no VARCHAR(100) NOT NULL COMMENT '料号',
          version VARCHAR(20) DEFAULT 'A' COMMENT '版本',
          size_spec VARCHAR(100) COMMENT '尺寸规格',
          material_spec TEXT COMMENT '材料规格',
          quantity INT UNSIGNED DEFAULT 0 COMMENT '数量',
          customer_require_date DATE COMMENT '客户需求日期',
          actual_delivery_date DATE COMMENT '实际交样日期',
          delivery_status ENUM('pending', 'delivered', 'signed') DEFAULT 'pending' COMMENT '交付状态：pending-待交付,delivered-已交付,signed-已签样',
          remark TEXT COMMENT '备注',
          create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
          UNIQUE KEY uk_order_no (order_no),
          INDEX idx_customer (customer_name),
          INDEX idx_notify_date (notify_date),
          INDEX idx_delivery_status (delivery_status),
          INDEX idx_create_time (create_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打样订单主表'
      `);
      results.push('✅ 创建表: sal_sample_order');
    } else {
      results.push('✓ 表已存在: sal_sample_order');
    }

    // 2. 创建打样订单状态历史表
    if (!existingTables.includes('sal_sample_order_history')) {
      await query(`
        CREATE TABLE IF NOT EXISTS sal_sample_order_history (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          sample_order_id INT UNSIGNED NOT NULL COMMENT '打样订单ID',
          status_field VARCHAR(50) NOT NULL COMMENT '状态字段',
          old_value VARCHAR(200) COMMENT '旧值',
          new_value VARCHAR(200) COMMENT '新值',
          operator_id INT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
          operator_name VARCHAR(100) COMMENT '操作人名称',
          operate_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
          remark TEXT COMMENT '备注',
          INDEX idx_sample_order (sample_order_id),
          INDEX idx_operate_time (operate_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打样订单状态历史表'
      `);
      results.push('✅ 创建表: sal_sample_order_history');
    } else {
      results.push('✓ 表已存在: sal_sample_order_history');
    }

    // 3. 插入测试数据
    const testDataCount = await query(`
      SELECT COUNT(*) as count FROM sal_sample_order WHERE deleted = 0
    `);

    if ((testDataCount as any[])[0].count === 0) {
      await query(`
        INSERT INTO sal_sample_order (
          order_no, notify_date, customer_name, product_name, material_no, version, 
          size_spec, material_spec, quantity, customer_require_date, 
          actual_delivery_date, delivery_status, remark
        ) VALUES
        ('SP20251212001', '2025-12-12', '新普', 'ASUS-UM3406', '120QAE72H-DC', 'B', 
         '261.7*99.1', '0.033 KB-1+3M7533抗噪', 10, '2025-12-19', 
         NULL, 'signed', '签样'),
        ('SP20251212002', '2025-12-12', '新普', 'HP-RH03042XL', '120QA633H-DC', 'D', 
         '247.9*58.49', '0.033 KB-1+3M7533', 10, '2025-12-19', 
         '2026-01-06', 'signed', '签样'),
        ('SP20251212003', '2025-12-12', '新普', 'HP-SI03058XL', '120Q9663H', 'J', 
         '282.73*110.52', '0.033KB-1+3M7533抗噪', 10, '2025-12-19', 
         '2026-01-06', 'signed', '签样'),
        ('SP20251219001', '2025-12-19', '新普', 'HP_GM04070XL', '120QAN56H-DC', 'A', 
         '272.63*122.63', '0.036 TFB56FR(抗躁)+3M7533', 10, '2025-12-23', 
         NULL, 'signed', '签样'),
        ('SP20251219002', '2025-12-19', '新普', 'LENOVO_BLANC-COOK 57Wh', '120QAK02H-DC', 'A', 
         '319.4*83.9', '0.033 KB-1+3M7533', 10, '2025-12-23', 
         '2026-01-13', 'signed', '签样'),
        ('SP20251219003', '2025-12-19', '新普', 'HP_GM04070XL', '121-4141H-DC', 'A', 
         '248.4*98.4', '0.036 TFB56FR(抗躁)+3M7533', 10, '2025-12-23', 
         '2026-01-02', 'signed', '签样'),
        ('SP20251223001', '2025-12-23', '新普', 'MSI-13R2', '120QAH84-DC', 'D', 
         '176*52', '0.175 EFR65+3M7533', 10, '2025-12-26', 
         '2026-01-02', 'signed', '签样'),
        ('SP20251224001', '2025-12-24', '新普', 'HP_NA04080XL', '121-4087H-DC', '3', 
         '268.9*56.8', '0.036 TFB56FR(抗躁)+3M7533', 60, '2025-01-07', 
         '2026-01-06', 'delivered', '台湾Vincent'),
        ('SP20251224002', '2025-12-24', '新普', 'ASUS_C31N1911-1-X421', '120QAQ28H-DC', '1', 
         '291.29*87.59', '0.033 KB-1抗噪+3M7533', 153, '2025-12-31', 
         '2026-01-02', 'signed', '签样10,剩余样品订单'),
        ('SP20251224003', '2025-12-24', '新普', 'ASUS_C41N2402-1 X1607', '120QAQ30H-DC', '1', 
         '295.82*117.25', 'KP0611FD', 322, '2025-12-31', 
         '2026-01-02', 'signed', '签样10,剩余样品订单'),
        ('SP20251224004', '2025-12-24', '新普', 'ASUS_ X1605  NCM', '121-4247H-DC', '1', 
         '270.4*81.96', '0.033 KB-1抗噪+3M7533', 850, '2025-01-05', 
         '2026-01-05', 'delivered', '台湾Vincent'),
        ('SP20251224005', '2025-12-24', '新普', 'ASUS_ X1605  NCM', '120QAQ32H-DC', '1', 
         '296.31*107.85', '0.033 KB-1抗噪+3M7533', 850, '2025-01-05', 
         '2026-01-05', 'delivered', '台湾Vincent'),
        ('SP20251224006', '2025-12-24', '新普', 'ASUS_C31N1911-1-X421', '120QAQ28H-DC', '1', 
         '291.29*87.59', '0.033 KB-1抗噪+3M7533', 400, '2025-01-06', 
         '2026-01-06', 'delivered', '台湾Vincent'),
        ('SP20251224007', '2025-12-24', '新普', 'ASUS_C41N2402-1 X1607', '120QAQ30H-DC', '1', 
         '295.82*117.25', 'KP0611FD', 220, '2025-01-06', 
         '2026-01-06', 'delivered', '台湾Vincent')
      `);
      results.push('✅ 插入测试数据: 14条打样订单');
    } else {
      results.push(`✓ 测试数据已存在: ${(testDataCount as any[])[0].count}条`);
    }

    return successResponse({
      message: '打样订单管理表初始化完成',
      details: results
    });
  } catch (error: any) {
    console.error('创建打样订单管理表失败:', error);
    return errorResponse(`创建表失败: ${error.message}`, 500, 500);
  }
}
