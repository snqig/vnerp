/**
 * 生成5条全流程测试数据脚本
 * 保留: sys_user, sys_department, sys_role, sys_user_role, sys_menu, sys_role_menu, sys_dict_type, sys_dict_data, sys_config
 * 删除其他所有业务数据并重新生成
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
};

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('[DB] Connected to database');

  try {
    await connection.beginTransaction();

    // ========== 1. 清理非保留表数据 ==========
    console.log('[Clean] Starting data cleanup...');
    
    const tablesToClean = [
      'crm_customer_contact',
      'crm_customer_follow_up',
      'crm_customer',
      'pur_supplier_material',
      'pur_supplier',
      'pur_receipt_detail',
      'pur_receipt',
      'pur_order_detail',
      'pur_order',
      'pur_request_detail',
      'pur_request',
      'sal_delivery_detail',
      'sal_delivery',
      'sal_order_detail',
      'sal_order',
      'fin_receipt_record',
      'fin_payment_record',
      'fin_receivable',
      'fin_payable',
      'qc_unqualified',
      'qc_inspection',
      'inv_inventory_log',
      'inv_inventory',
      'inv_material',
      'inv_material_category',
      'inv_warehouse',
      'prd_bom_detail',
      'prd_bom',
      'prd_work_order',
      'prd_standard_card',
      'sys_operation_log',
      'sys_login_log',
    ];

    for (const table of tablesToClean) {
      try {
        await connection.execute(`DELETE FROM ${table}`);
        console.log(`[Clean] Cleared table: ${table}`);
      } catch (e) {
        console.log(`[Clean] Skip table ${table}: ${e.message}`);
      }
    }

    // 重置自增ID
    for (const table of tablesToClean) {
      try {
        await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (e) {
        // ignore
      }
    }

    console.log('[Clean] Data cleanup completed');

    // ========== 2. 生成基础数据 ==========
    console.log('[Seed] Generating base data...');

    // 仓库
    const warehouses = [
      { code: 'WH001', name: '原材料仓', type: 1 },
      { code: 'WH002', name: '半成品仓', type: 2 },
      { code: 'WH003', name: '成品仓', type: 3 },
      { code: 'WH004', name: '辅料仓', type: 4 },
    ];
    for (const wh of warehouses) {
      await connection.execute(
        `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, warehouse_type, status) VALUES (?, ?, ?, 1)`,
        [wh.code, wh.name, wh.type]
      );
    }
    console.log('[Seed] Created 4 warehouses');

    // 物料分类
    const categories = [
      { code: 'CAT001', name: '丝印材料' },
      { code: 'CAT002', name: '油墨' },
      { code: 'CAT003', name: '网版' },
      { code: 'CAT004', name: '成品标签' },
      { code: 'CAT005', name: '包装材料' },
    ];
    for (const cat of categories) {
      await connection.execute(
        `INSERT INTO inv_material_category (category_code, category_name, status) VALUES (?, ?, 1)`,
        [cat.code, cat.name]
      );
    }
    console.log('[Seed] Created 5 material categories');

    // 物料
    const materials = [
      { code: 'MAT001', name: 'PET薄膜', spec: '0.125mm*500mm', type: 1, unit: '卷', category: 1, price: 25.50 },
      { code: 'MAT002', name: 'UV油墨-黑色', spec: '1kg/罐', type: 4, unit: '罐', category: 2, price: 85.00 },
      { code: 'MAT003', name: '不锈钢网版', spec: '300目', type: 4, unit: '张', category: 3, price: 120.00 },
      { code: 'MAT004', name: '电子标签-型号A', spec: '50mm*30mm', type: 3, unit: 'PCS', category: 4, price: 3.50 },
      { code: 'MAT005', name: '电子标签-型号B', spec: '80mm*50mm', type: 3, unit: 'PCS', category: 4, price: 5.20 },
      { code: 'MAT006', name: '纸箱', spec: '400*300*200mm', type: 4, unit: '个', category: 5, price: 8.00 },
      { code: 'MAT007', name: '离型纸', spec: '80g', type: 1, unit: '卷', category: 1, price: 15.00 },
    ];
    for (const mat of materials) {
      await connection.execute(
        `INSERT INTO inv_material (material_code, material_name, specification, category_id, material_type, unit, purchase_price, cost_price, status, warehouse_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [mat.code, mat.name, mat.spec, mat.category, mat.type, mat.unit, mat.price, mat.price * 0.7]
      );
    }
    console.log('[Seed] Created 7 materials');

    // 客户
    const customers = [
      { code: 'CUS001', name: '越南电子科技有限公司', type: 1, contact: '阮先生', phone: '0901234567', credit: 'A' },
      { code: 'CUS002', name: '胡志明市印刷厂', type: 1, contact: '陈女士', phone: '0912345678', credit: 'B' },
      { code: 'CUS003', name: '河内标签有限公司', type: 1, contact: '李先生', phone: '0923456789', credit: 'A' },
      { code: 'CUS004', name: '岘港包装制品公司', type: 1, contact: '王女士', phone: '0934567890', credit: 'B' },
      { code: 'CUS005', name: '平阳省电子厂', type: 1, contact: '张先生', phone: '0945678901', credit: 'A' },
    ];
    for (const cus of customers) {
      await connection.execute(
        `INSERT INTO crm_customer (customer_code, customer_name, customer_type, contact_name, contact_phone, credit_level, status, follow_up_status) 
         VALUES (?, ?, ?, ?, ?, ?, 1, 3)`,
        [cus.code, cus.name, cus.type, cus.contact, cus.phone, cus.credit]
      );
    }
    console.log('[Seed] Created 5 customers');

    // 供应商
    const suppliers = [
      { code: 'SUP001', name: '中国丝印材料有限公司', type: 1, contact: '赵先生', phone: '13800138001' },
      { code: 'SUP002', name: '日本油墨株式会社', type: 2, contact: '山田先生', phone: '13900139001' },
      { code: 'SUP003', name: '德国网版制造厂', type: 3, contact: '穆勒先生', phone: '13700137001' },
      { code: 'SUP004', name: '本地包装材料厂', type: 4, contact: '陈先生', phone: '13600136001' },
      { code: 'SUP005', name: '韩国薄膜供应商', type: 1, contact: '金先生', phone: '13500135001' },
    ];
    for (const sup of suppliers) {
      await connection.execute(
        `INSERT INTO pur_supplier (supplier_code, supplier_name, supplier_type, contact_name, contact_phone, status) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        [sup.code, sup.name, sup.type, sup.contact, sup.phone]
      );
    }
    console.log('[Seed] Created 5 suppliers');

    // ========== 3. 生成5条全流程数据 ==========
    console.log('[Seed] Generating 5 full-flow data sets...');

    for (let i = 1; i <= 5; i++) {
      console.log(`[Seed] Processing flow ${i}/5...`);
      
      const now = new Date();
      const orderDate = new Date(now.getTime() - i * 86400000 * 3);
      const dateStr = orderDate.toISOString().split('T')[0];
      
      // 3.1 销售订单
      const salesOrderNo = `SO2024${String(i).padStart(4, '0')}`;
      const customerId = i;
      const materialId = 3 + (i % 2); // MAT004 or MAT005
      const quantity = 1000 + i * 500;
      const unitPrice = 3.50 + (i % 2) * 1.70;
      const amount = quantity * unitPrice;
      const taxRate = 10;
      const taxAmount = amount * taxRate / 100;
      const totalWithTax = amount + taxAmount;

      await connection.execute(
        `INSERT INTO sal_order (order_no, order_date, customer_id, contact_name, contact_phone, 
         total_amount, tax_amount, total_with_tax, currency, payment_terms, delivery_date, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VND', '货到付款', DATE_ADD(?, INTERVAL 7 DAY), 2, ?)`,
        [salesOrderNo, dateStr, customerId, customers[i-1].contact, customers[i-1].phone,
         amount, taxAmount, totalWithTax, dateStr, `销售订单-${i}`]
      );
      const [salesOrderResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
      const salesOrderId = salesOrderResult[0].id;

      // 销售订单明细
      await connection.execute(
        `INSERT INTO sal_order_detail (order_id, material_id, quantity, unit, unit_price, tax_rate, 
         amount, tax_amount, total_amount, delivery_date)
         VALUES (?, ?, ?, 'PCS', ?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL 7 DAY))`,
        [salesOrderId, materialId, quantity, unitPrice, taxRate, amount, taxAmount, totalWithTax, dateStr]
      );

      // 3.2 生产工单 (如果表存在)
      let workOrderId = null;
      let workOrderNo = null;
      try {
        workOrderNo = `WO2024${String(i).padStart(4, '0')}`;
        await connection.execute(
          `INSERT INTO prd_work_order (work_order_no, work_order_date, sales_order_id, material_id, 
           plan_qty, unit, plan_start_date, plan_end_date, priority, status, remark)
           VALUES (?, ?, ?, ?, ?, 'PCS', ?, DATE_ADD(?, INTERVAL 5 DAY), 2, 2, ?)`,
          [workOrderNo, dateStr, salesOrderId, materialId, quantity, dateStr, dateStr, `生产工单-${i}`]
        );
        const [workOrderResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
        workOrderId = workOrderResult[0].id;
      } catch (e) {
        console.log(`[Skip] prd_work_order table not found, using sales order as reference`);
        workOrderNo = `WO-REF-SO${i}`;
      }

      // 3.3 BOM
      const bomNo = `BOM2024${String(i).padStart(4, '0')}`;
      await connection.execute(
        `INSERT INTO prd_bom (bom_no, material_id, version, is_default, status, remark)
         VALUES (?, ?, '1.0', 1, 1, ?)`,
        [bomNo, materialId, `BOM-${i}`]
      );
      const [bomResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
      const bomId = bomResult[0].id;

      // BOM明细
      const bomMaterials = [
        { matId: 1, qty: 1.2 },  // PET薄膜
        { matId: 2, qty: 0.05 }, // UV油墨
        { matId: 6, qty: 0.1 },  // 纸箱
      ];
      for (const bomMat of bomMaterials) {
        await connection.execute(
          `INSERT INTO prd_bom_detail (bom_id, material_id, quantity, unit, loss_rate, process_sequence)
           VALUES (?, ?, ?, '卷', 5, ?)`,
          [bomId, bomMat.matId, bomMat.qty, bomMaterials.indexOf(bomMat) + 1]
        );
      }

      // 3.4 采购申请
      const requestNo = `PR2024${String(i).padStart(4, '0')}`;
      await connection.execute(
        `INSERT INTO pur_request (request_no, request_date, request_dept_id, requester_id, 
         total_amount, currency, urgency_level, status, remark)
         VALUES (?, ?, 4, 1, ?, 'VND', 1, 3, ?)`,
        [requestNo, dateStr, amount * 0.6, `采购申请-${i}`]
      );
      const [requestResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
      const requestId = requestResult[0].id;

      // 采购申请明细
      for (const bomMat of bomMaterials) {
        const reqQty = quantity * bomMat.qty;
        await connection.execute(
          `INSERT INTO pur_request_detail (request_id, material_id, quantity, unit, required_date, purpose)
           VALUES (?, ?, ?, '卷', DATE_ADD(?, INTERVAL 3 DAY), ?)`,
          [requestId, bomMat.matId, reqQty, dateStr, `生产需求-${i}`]
        );
      }

      // 3.5 采购订单
      const purchaseOrderNo = `PO2024${String(i).padStart(4, '0')}`;
      const supplierId = i;
      const purchaseAmount = amount * 0.6;
      const purchaseTax = purchaseAmount * taxRate / 100;
      const purchaseTotal = purchaseAmount + purchaseTax;

      await connection.execute(
        `INSERT INTO pur_order (order_no, order_date, supplier_id, contact_name, contact_phone,
         total_amount, tax_amount, total_with_tax, currency, payment_terms, delivery_date, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VND', '月结30天', DATE_ADD(?, INTERVAL 10 DAY), 2, ?)`,
        [purchaseOrderNo, dateStr, supplierId, suppliers[i-1].contact, suppliers[i-1].phone,
         purchaseAmount, purchaseTax, purchaseTotal, dateStr, `采购订单-${i}`]
      );
      const [purchaseOrderResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
      const purchaseOrderId = purchaseOrderResult[0].id;

      // 采购订单明细
      for (const bomMat of bomMaterials) {
        const poQty = quantity * bomMat.qty;
        const matPrice = materials[bomMat.matId - 1].price;
        const poAmount = poQty * matPrice;
        await connection.execute(
          `INSERT INTO pur_order_detail (order_id, material_id, quantity, unit, unit_price, tax_rate,
           amount, tax_amount, total_amount, delivery_date)
           VALUES (?, ?, ?, '卷', ?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL 10 DAY))`,
          [purchaseOrderId, bomMat.matId, poQty, matPrice, taxRate, poAmount, poAmount * taxRate / 100, 
           poAmount * (1 + taxRate / 100), dateStr]
        );
      }

      // 3.6 采购入库
      const receiptNo = `GR2024${String(i).padStart(4, '0')}`;
      await connection.execute(
        `INSERT INTO pur_receipt (receipt_no, receipt_date, order_id, supplier_id, warehouse_id, 
         total_amount, status, remark)
         VALUES (?, ?, ?, ?, 1, ?, 2, ?)`,
        [receiptNo, dateStr, purchaseOrderId, supplierId, purchaseTotal, `采购入库-${i}`]
      );
      const [receiptResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
      const receiptId = receiptResult[0].id;

      // 采购入库明细 + 库存
      for (const bomMat of bomMaterials) {
        const receiptQty = quantity * bomMat.qty;
        const batchNo = `BT2024${String(i).padStart(4, '0')}${bomMat.matId}`;
        
        await connection.execute(
          `INSERT INTO pur_receipt_detail (receipt_id, material_id, quantity, unit, unit_price, 
           amount, batch_no, production_date, expiry_date, location_code)
           VALUES (?, ?, ?, '卷', ?, ?, ?, ?, DATE_ADD(?, INTERVAL 365 DAY), 'A01-01')`,
          [receiptId, bomMat.matId, receiptQty, materials[bomMat.matId - 1].price, 
           receiptQty * materials[bomMat.matId - 1].price, batchNo, dateStr, dateStr]
        );

        // 库存
        await connection.execute(
          `INSERT INTO inv_inventory (material_id, warehouse_id, location_code, quantity, 
           locked_qty, available_qty, batch_no, production_date, expiry_date)
           VALUES (?, ?, 'A01-01', ?, 0, ?, ?, ?, DATE_ADD(?, INTERVAL 365 DAY))`,
          [bomMat.matId, 1, receiptQty, receiptQty, batchNo, dateStr, dateStr]
        );
      }

      // 3.7 销售出库
      const deliveryNo = `DN2024${String(i).padStart(4, '0')}`;
      await connection.execute(
        `INSERT INTO sal_delivery (delivery_no, delivery_date, order_id, customer_id, warehouse_id,
         total_amount, logistics_company, tracking_no, status, remark)
         VALUES (?, ?, ?, ?, 3, ?, '越南快递', ?, 2, ?)`,
        [deliveryNo, dateStr, salesOrderId, customerId, totalWithTax, `VN${i}888999`, `销售出库-${i}`]
      );
      const [deliveryResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
      const deliveryId = deliveryResult[0].id;

      // 销售出库明细
      await connection.execute(
        `INSERT INTO sal_delivery_detail (delivery_id, material_id, order_detail_id, quantity, 
         unit, unit_price, amount, batch_no)
         VALUES (?, ?, 1, ?, 'PCS', ?, ?, ?)`,
        [deliveryId, materialId, quantity, unitPrice, amount, `BT2024${String(i).padStart(4, '0')}${materialId}`]
      );

      // 3.8 质量检验
      const inspectionNo = `QC2024${String(i).padStart(4, '0')}`;
      const qualifiedQty = quantity * 0.98;
      const unqualifiedQty = quantity * 0.02;
      
      await connection.execute(
        `INSERT INTO qc_inspection (inspection_no, inspection_type, source_type, source_id, source_no,
         material_id, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result,
         inspector_id, inspection_date, remark)
         VALUES (?, 3, '生产工单', ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        [inspectionNo, workOrderId || salesOrderId, workOrderNo || `SO${salesOrderNo}`, materialId, `BT2024${String(i).padStart(4, '0')}${materialId}`,
         quantity, qualifiedQty, unqualifiedQty, dateStr, `成品检验-${i}`]
      );

      // 3.9 应收应付
      const receivableNo = `AR2024${String(i).padStart(4, '0')}`;
      await connection.execute(
        `INSERT INTO fin_receivable (receivable_no, source_type, source_id, source_no, customer_id,
         amount, received_amount, balance, due_date, status, remark)
         VALUES (?, 1, ?, ?, ?, ?, 0, ?, DATE_ADD(?, INTERVAL 30 DAY), 1, ?)`,
        [receivableNo, salesOrderId, salesOrderNo, customerId, totalWithTax, totalWithTax, dateStr, `应收款-${i}`]
      );

      const payableNo = `AP2024${String(i).padStart(4, '0')}`;
      await connection.execute(
        `INSERT INTO fin_payable (payable_no, source_type, source_id, source_no, supplier_id,
         amount, paid_amount, balance, due_date, status, remark)
         VALUES (?, 1, ?, ?, ?, ?, 0, ?, DATE_ADD(?, INTERVAL 30 DAY), 1, ?)`,
        [payableNo, purchaseOrderId, purchaseOrderNo, supplierId, purchaseTotal, purchaseTotal, dateStr, `应付款-${i}`]
      );

      console.log(`[Seed] Flow ${i} completed: SO=${salesOrderNo}, PO=${purchaseOrderNo}, WO=${workOrderNo}`);
    }

    await connection.commit();
    console.log('[Seed] All data generated successfully!');
    console.log('[Summary]');
    console.log('  - 4 warehouses');
    console.log('  - 5 material categories');
    console.log('  - 7 materials');
    console.log('  - 5 customers');
    console.log('  - 5 suppliers');
    console.log('  - 5 sales orders with details');
    console.log('  - 5 purchase requests with details');
    console.log('  - 5 purchase orders with details');
    console.log('  - 5 purchase receipts with details');
    console.log('  - 5 work orders');
    console.log('  - 5 BOMs with details');
    console.log('  - 5 sales deliveries with details');
    console.log('  - 5 quality inspections');
    console.log('  - 5 receivables');
    console.log('  - 5 payables');
    console.log('  - Inventory records');

  } catch (error) {
    await connection.rollback();
    console.error('[Error] Transaction failed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('[DB] Connection closed');
  }
}

main().catch(console.error);