import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

// 辅助函数：检查列是否存在
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = ? 
     AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return (result as any[]).length > 0;
}

// 辅助函数：安全地添加列
async function addColumnSafe(tableName: string, columnDef: string) {
  try {
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`);
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      return;
    }
    throw e;
  }
}

export async function GET(request: NextRequest) {
  try {
    const results: string[] = [];

    // 1. 业务订单主表
    const bizOrderExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_order_header'`
    );

    if ((bizOrderExists as any[]).length === 0) {
      await query(`
        CREATE TABLE biz_order_header (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          order_no VARCHAR(50) NOT NULL COMMENT '业务订单号',
          order_type ENUM('SALE', 'MFG', 'SUB', 'STOCK') NOT NULL COMMENT '订单类型',
          order_category VARCHAR(50) DEFAULT NULL COMMENT '订单类别',
          customer_id INT UNSIGNED DEFAULT NULL COMMENT '客户ID',
          customer_name VARCHAR(100) DEFAULT NULL COMMENT '客户名称',
          product_id INT UNSIGNED DEFAULT NULL COMMENT '产品ID',
          product_name VARCHAR(200) DEFAULT NULL COMMENT '产品名称',
          product_spec VARCHAR(500) DEFAULT NULL COMMENT '产品规格',
          status TINYINT UNSIGNED DEFAULT 10 COMMENT '状态',
          req_qty DECIMAL(14,3) DEFAULT 0 COMMENT '需求数量',
          ordered_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已转采购数量',
          received_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已收货数量',
          consumed_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已消耗数量',
          delivery_date DATE DEFAULT NULL COMMENT '交货日期',
          priority TINYINT UNSIGNED DEFAULT 5 COMMENT '优先级',
          is_strict_by_order TINYINT(1) DEFAULT 1 COMMENT '是否严格按单',
          tolerance_percent DECIMAL(5,2) DEFAULT 5.00 COMMENT '容差百分比',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          confirm_by INT UNSIGNED DEFAULT NULL COMMENT '确认人ID',
          confirm_time DATETIME DEFAULT NULL COMMENT '确认时间',
          close_by INT UNSIGNED DEFAULT NULL COMMENT '关闭人ID',
          close_time DATETIME DEFAULT NULL COMMENT '关闭时间',
          close_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
          deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
          UNIQUE KEY uk_order_no (order_no),
          INDEX idx_order_type (order_type),
          INDEX idx_status (status),
          INDEX idx_customer (customer_id),
          INDEX idx_delivery_date (delivery_date),
          INDEX idx_create_time (create_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务订单主表'
      `);
      results.push('✅ 创建表: biz_order_header');
    } else {
      results.push('✓ 表已存在: biz_order_header');
    }

    // 2. 业务订单行表
    const bizOrderLineExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_order_line'`
    );

    if ((bizOrderLineExists as any[]).length === 0) {
      await query(`
        CREATE TABLE biz_order_line (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          order_id INT UNSIGNED NOT NULL COMMENT '业务订单ID',
          line_no INT UNSIGNED NOT NULL COMMENT '行号',
          material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
          material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
          material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
          material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
          unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
          req_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '需求数量',
          ordered_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已转采购数量',
          received_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已收货数量',
          consumed_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已消耗数量',
          available_to_receive DECIMAL(14,3) DEFAULT 0 COMMENT '已收货待消耗',
          require_date DATE DEFAULT NULL COMMENT '需求日期',
          is_strict_by_order TINYINT(1) DEFAULT 1 COMMENT '是否严格按单',
          closed_flag TINYINT(1) DEFAULT 0 COMMENT '行关闭标志',
          closed_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          UNIQUE KEY uk_order_line (order_id, line_no),
          INDEX idx_material (material_id),
          INDEX idx_material_code (material_code),
          INDEX idx_require_date (require_date),
          FOREIGN KEY (order_id) REFERENCES biz_order_header(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务订单行表'
      `);
      results.push('✅ 创建表: biz_order_line');
    } else {
      results.push('✓ 表已存在: biz_order_line');
    }

    // 3. 采购申请表
    const prExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request'`
    );

    if ((prExists as any[]).length === 0) {
      await query(`
        CREATE TABLE pur_request (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          pr_no VARCHAR(50) NOT NULL COMMENT '采购申请号',
          order_type ENUM('SALE', 'MFG', 'SUB', 'STOCK') NOT NULL COMMENT '需求类型',
          source_order_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单ID',
          source_order_no VARCHAR(50) DEFAULT NULL COMMENT '来源业务订单号',
          request_date DATE NOT NULL COMMENT '申请日期',
          require_date DATE NOT NULL COMMENT '需求日期',
          total_qty DECIMAL(14,3) DEFAULT 0 COMMENT '总数量',
          total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '总金额',
          status TINYINT UNSIGNED DEFAULT 10 COMMENT '状态',
          priority TINYINT UNSIGNED DEFAULT 5 COMMENT '优先级',
          request_by INT UNSIGNED DEFAULT NULL COMMENT '申请人ID',
          request_dept VARCHAR(50) DEFAULT NULL COMMENT '申请部门',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          audit_by INT UNSIGNED DEFAULT NULL COMMENT '审批人ID',
          audit_time DATETIME DEFAULT NULL COMMENT '审批时间',
          deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
          UNIQUE KEY uk_pr_no (pr_no),
          INDEX idx_source_order (source_order_id),
          INDEX idx_status (status),
          INDEX idx_request_date (request_date),
          INDEX idx_require_date (require_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请表'
      `);
      results.push('✅ 创建表: pur_request');
    } else {
      results.push('✓ 表已存在: pur_request');
    }

    // 4. 采购申请行表
    const prLineExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request_line'`
    );

    if ((prLineExists as any[]).length === 0) {
      await query(`
        CREATE TABLE pur_request_line (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          pr_id INT UNSIGNED NOT NULL COMMENT '采购申请ID',
          line_no INT UNSIGNED NOT NULL COMMENT '行号',
          source_order_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单ID',
          source_order_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单行ID',
          material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
          material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
          material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
          material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
          unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
          req_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '申请数量',
          ordered_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已转PO数量',
          unit_price DECIMAL(14,4) DEFAULT 0 COMMENT '预估单价',
          amount DECIMAL(14,2) DEFAULT 0 COMMENT '预估金额',
          require_date DATE DEFAULT NULL COMMENT '需求日期',
          suggested_supplier_id INT UNSIGNED DEFAULT NULL COMMENT '建议供应商ID',
          suggested_supplier_name VARCHAR(100) DEFAULT NULL COMMENT '建议供应商',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          UNIQUE KEY uk_pr_line (pr_id, line_no),
          INDEX idx_source_order (source_order_id, source_order_line_id),
          INDEX idx_material (material_id),
          FOREIGN KEY (pr_id) REFERENCES pur_request(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请行表'
      `);
      results.push('✅ 创建表: pur_request_line');
    } else {
      results.push('✓ 表已存在: pur_request_line');
    }

    // 5. 修改采购订单行表
    const poLineColumns = [
      { name: 'source_order_id', def: "source_order_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单ID'" },
      { name: 'source_order_line_id', def: "source_order_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单行ID'" },
      { name: 'source_order_no', def: "source_order_no VARCHAR(50) DEFAULT NULL COMMENT '来源业务订单号'" },
      { name: 'pr_id', def: "pr_id INT UNSIGNED DEFAULT NULL COMMENT '来源采购申请ID'" },
      { name: 'pr_line_id', def: "pr_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源采购申请行ID'" },
      { name: 'is_strict_by_order', def: "is_strict_by_order TINYINT(1) DEFAULT 1 COMMENT '是否严格按单'" },
    ];

    let poLineUpdated = false;
    for (const col of poLineColumns) {
      if (!await columnExists('pur_purchase_order_line', col.name)) {
        await addColumnSafe('pur_purchase_order_line', col.def);
        poLineUpdated = true;
      }
    }

    // 添加索引
    try {
      await query(`CREATE INDEX idx_source_order ON pur_purchase_order_line(source_order_id, source_order_line_id)`);
    } catch (e) { /* 索引可能已存在 */ }
    try {
      await query(`CREATE INDEX idx_pr ON pur_purchase_order_line(pr_id, pr_line_id)`);
    } catch (e) { /* 索引可能已存在 */ }

    if (poLineUpdated) {
      results.push('✅ 更新表: pur_purchase_order_line (添加来源标识)');
    } else {
      results.push('✓ 表已更新: pur_purchase_order_line');
    }

    // 6. 修改入库明细表
    const inboundItemColumns = [
      { name: 'source_order_id', def: "source_order_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单ID'" },
      { name: 'source_order_line_id', def: "source_order_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单行ID'" },
      { name: 'is_consumed', def: "is_consumed TINYINT(1) DEFAULT 0 COMMENT '是否已关联消耗'" },
    ];

    let inboundItemUpdated = false;
    for (const col of inboundItemColumns) {
      if (!await columnExists('inv_inbound_item', col.name)) {
        await addColumnSafe('inv_inbound_item', col.def);
        inboundItemUpdated = true;
      }
    }

    // 添加索引
    try {
      await query(`CREATE INDEX idx_source_order_item ON inv_inbound_item(source_order_id, source_order_line_id)`);
    } catch (e) { /* 索引可能已存在 */ }

    if (inboundItemUpdated) {
      results.push('✅ 更新表: inv_inbound_item (添加来源标识)');
    } else {
      results.push('✓ 表已更新: inv_inbound_item');
    }

    // 7. 业务订单与PO关联表
    const linkExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'link_order_po'`
    );

    if ((linkExists as any[]).length === 0) {
      await query(`
        CREATE TABLE link_order_po (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          order_id INT UNSIGNED NOT NULL COMMENT '业务订单ID',
          order_line_id INT UNSIGNED NOT NULL COMMENT '业务订单行ID',
          po_id INT UNSIGNED NOT NULL COMMENT '采购订单ID',
          po_line_id INT UNSIGNED NOT NULL COMMENT '采购订单行ID',
          link_type ENUM('DIRECT', 'MERGE', 'SPLIT') DEFAULT 'DIRECT' COMMENT '关联类型',
          link_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '关联数量',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          UNIQUE KEY uk_link (order_line_id, po_line_id),
          INDEX idx_order (order_id),
          INDEX idx_po (po_id),
          FOREIGN KEY (order_id) REFERENCES biz_order_header(id) ON DELETE CASCADE,
          FOREIGN KEY (po_id) REFERENCES pur_purchase_order(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务订单与PO关联表'
      `);
      results.push('✅ 创建表: link_order_po');
    } else {
      results.push('✓ 表已存在: link_order_po');
    }

    // 8. 消耗记录表
    const consumptionExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_consumption'`
    );

    if ((consumptionExists as any[]).length === 0) {
      await query(`
        CREATE TABLE biz_consumption (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          order_id INT UNSIGNED NOT NULL COMMENT '业务订单ID',
          order_line_id INT UNSIGNED NOT NULL COMMENT '业务订单行ID',
          material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
          material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
          consumption_type ENUM('ISSUE', 'DELIVERY', 'RETURN') DEFAULT 'ISSUE' COMMENT '消耗类型',
          consumption_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '消耗数量',
          source_grn_id INT UNSIGNED DEFAULT NULL COMMENT '来源入库单ID',
          source_grn_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源入库单行ID',
          warehouse_id INT UNSIGNED DEFAULT NULL COMMENT '仓库ID',
          batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号',
          reference_no VARCHAR(100) DEFAULT NULL COMMENT '参考单号',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          INDEX idx_order (order_id, order_line_id),
          INDEX idx_material (material_id),
          INDEX idx_grn (source_grn_id),
          INDEX idx_create_time (create_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务订单消耗记录表'
      `);
      results.push('✅ 创建表: biz_consumption');
    } else {
      results.push('✓ 表已存在: biz_consumption');
    }

    // 9. 容差配置表
    const toleranceExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_tolerance_config'`
    );

    if ((toleranceExists as any[]).length === 0) {
      await query(`
        CREATE TABLE order_tolerance_config (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
          material_code VARCHAR(50) DEFAULT NULL COMMENT '物料编码',
          order_type VARCHAR(20) DEFAULT 'PURCHASE' COMMENT '订单类型',
          over_delivery_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '超交容差%',
          under_delivery_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '短交容差%',
          price_tolerance DECIMAL(5,2) DEFAULT 2.00 COMMENT '价格容差%',
          action_on_exceed ENUM('BLOCK', 'WARNING', 'APPROVAL') DEFAULT 'WARNING' COMMENT '超额处理',
          is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认配置',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          UNIQUE KEY uk_config (material_id, order_type),
          INDEX idx_material (material_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='容差配置表'
      `);
      results.push('✅ 创建表: order_tolerance_config');
    } else {
      results.push('✓ 表已存在: order_tolerance_config');
    }

    // 10. 状态变更历史表
    const historyExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history'`
    );

    if ((historyExists as any[]).length === 0) {
      await query(`
        CREATE TABLE order_status_history (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
          order_type ENUM('BIZ', 'PR', 'PO', 'GRN') NOT NULL COMMENT '订单类型',
          order_id INT UNSIGNED NOT NULL COMMENT '订单ID',
          order_no VARCHAR(50) NOT NULL COMMENT '订单号',
          old_status VARCHAR(50) NOT NULL COMMENT '原状态',
          new_status VARCHAR(50) NOT NULL COMMENT '新状态',
          change_reason VARCHAR(200) DEFAULT NULL COMMENT '变更原因',
          trigger_by VARCHAR(50) DEFAULT NULL COMMENT '触发来源',
          operator_id INT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
          operator_name VARCHAR(100) DEFAULT NULL COMMENT '操作人',
          operate_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
          INDEX idx_order (order_type, order_id),
          INDEX idx_operate_time (operate_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='状态变更历史表'
      `);
      results.push('✅ 创建表: order_status_history');
    } else {
      results.push('✓ 表已存在: order_status_history');
    }

    // 插入测试数据
    const orderCount = await query(`SELECT COUNT(*) as count FROM biz_order_header WHERE deleted = 0`);
    if ((orderCount as any[])[0].count === 0) {
      await query(`
        INSERT INTO biz_order_header (order_no, order_type, customer_name, product_name, status, req_qty, delivery_date, remark)
        VALUES ('SO20250101001', 'SALE', '新普科技', 'ASUS笔记本标签', 20, 10000, '2025-02-15', '测试销售订单')
      `);

      await query(`
        INSERT INTO biz_order_line (order_id, line_no, material_code, material_name, material_spec, unit, req_qty, require_date)
        SELECT id, 1, 'MAT001', '白色PET膜', '100M×1.5M, 0.1mm', '卷', 100, '2025-01-20'
        FROM biz_order_header WHERE order_no = 'SO20250101001'
      `);

      results.push('✅ 插入测试数据: 1个业务订单');
    }

    // 插入容差配置
    const toleranceCount = await query(`SELECT COUNT(*) as count FROM order_tolerance_config WHERE is_default = 1`);
    if ((toleranceCount as any[])[0].count === 0) {
      await query(`
        INSERT INTO order_tolerance_config (order_type, over_delivery_tolerance, under_delivery_tolerance, price_tolerance, action_on_exceed, is_default)
        VALUES ('PURCHASE', 5.00, 5.00, 2.00, 'WARNING', 1)
      `);
      results.push('✅ 插入默认容差配置');
    }

    return successResponse({
      message: '三层勾稽模型表初始化完成',
      details: results
    });
  } catch (error: any) {
    console.error('初始化失败:', error);
    return errorResponse(`初始化失败: ${error.message}`, 500, 500);
  }
}
