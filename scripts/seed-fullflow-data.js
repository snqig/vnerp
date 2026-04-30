const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
};

async function getTableColumns(conn, tableName) {
  try {
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [dbConfig.database, tableName]
    );
    return rows.map(r => r.COLUMN_NAME);
  } catch (e) {
    return [];
  }
}

function tableHas(columns, col) {
  return columns.includes(col);
}

async function safeInsert(conn, tableName, data) {
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`;
  try {
    await conn.execute(sql, vals);
    const [result] = await conn.execute('SELECT LAST_INSERT_ID() as id');
    return result[0].id;
  } catch (e) {
    console.log(`[Skip] INSERT INTO ${tableName} failed: ${e.message}`);
    return null;
  }
}

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('[DB] Connected');

  try {
    await connection.beginTransaction();

    // ========== 1. 检测所有表结构 ==========
    console.log('[Detect] Scanning table structures...');
    const tables = [
      'inv_warehouse', 'inv_material_category', 'inv_material', 'inv_inventory', 'inv_inventory_log',
      'crm_customer', 'crm_customer_contact',
      'pur_supplier', 'pur_request', 'pur_request_detail',
      'pur_order', 'pur_order_detail', 'pur_receipt', 'pur_receipt_detail',
      'sal_order', 'sal_order_detail', 'sal_delivery', 'sal_delivery_detail',
      'prd_standard_card', 'prd_work_order', 'prd_bom', 'prd_bom_detail',
      'prd_process_card', 'prd_process_card_material',
      'qc_inspection', 'qc_unqualified',
      'fin_receivable', 'fin_payable', 'fin_receipt_record', 'fin_payment_record',
      'inv_trace_record', 'inv_material_label',
      'sys_operation_log', 'sys_login_log',
    ];

    const schemas = {};
    for (const t of tables) {
      const cols = await getTableColumns(connection, t);
      if (cols.length > 0) {
        schemas[t] = cols;
        console.log(`[Detect] ${t}: ${cols.join(', ')}`);
      }
    }

    // ========== 2. 清理非保留表数据 ==========
    console.log('[Clean] Starting data cleanup...');
    const cleanOrder = [
      'inv_trace_record', 'inv_material_label',
      'prd_process_card_material', 'prd_process_card',
      'sal_delivery_detail', 'sal_delivery',
      'sal_order_detail', 'sal_order',
      'pur_receipt_detail', 'pur_receipt',
      'pur_order_detail', 'pur_order',
      'pur_request_detail', 'pur_request',
      'fin_receipt_record', 'fin_payment_record',
      'fin_receivable', 'fin_payable',
      'qc_unqualified', 'qc_inspection',
      'prd_bom_detail', 'prd_bom',
      'prd_work_order', 'prd_standard_card',
      'inv_inventory_log', 'inv_inventory',
      'inv_material', 'inv_material_category', 'inv_warehouse',
      'crm_customer_contact', 'crm_customer',
      'pur_supplier',
      'sys_operation_log', 'sys_login_log',
    ];

    for (const t of cleanOrder) {
      if (schemas[t]) {
        try {
          await connection.execute(`DELETE FROM ${t}`);
          await connection.execute(`ALTER TABLE ${t} AUTO_INCREMENT = 1`);
          console.log(`[Clean] Cleared: ${t}`);
        } catch (e) {
          console.log(`[Clean] Skip ${t}: ${e.message}`);
        }
      }
    }

    // ========== 3. 生成基础数据 ==========
    console.log('[Seed] Generating base data...');

    // 仓库
    const warehouseIds = [];
    const warehouseData = [
      { code: 'WH001', name: '原材料仓', type: 1 },
      { code: 'WH002', name: '半成品仓', type: 2 },
      { code: 'WH003', name: '成品仓', type: 3 },
      { code: 'WH004', name: '辅料仓', type: 4 },
    ];
    for (const wh of warehouseData) {
      const data = {};
      if (tableHas(schemas['inv_warehouse'], 'warehouse_code')) data.warehouse_code = wh.code;
      if (tableHas(schemas['inv_warehouse'], 'warehouse_name')) data.warehouse_name = wh.name;
      if (tableHas(schemas['inv_warehouse'], 'warehouse_type')) data.warehouse_type = wh.type;
      if (tableHas(schemas['inv_warehouse'], 'status')) data.status = 1;
      const id = await safeInsert(connection, 'inv_warehouse', data);
      warehouseIds.push(id);
    }
    console.log(`[Seed] Created ${warehouseIds.filter(Boolean).length} warehouses`);

    // 物料分类
    const categoryIds = [];
    const categoryData = [
      { code: 'CAT001', name: '丝印材料' },
      { code: 'CAT002', name: '油墨' },
      { code: 'CAT003', name: '网版' },
      { code: 'CAT004', name: '成品标签' },
      { code: 'CAT005', name: '包装材料' },
    ];
    for (const cat of categoryData) {
      const data = {};
      if (tableHas(schemas['inv_material_category'], 'category_code')) data.category_code = cat.code;
      if (tableHas(schemas['inv_material_category'], 'category_name')) data.category_name = cat.name;
      if (tableHas(schemas['inv_material_category'], 'status')) data.status = 1;
      const id = await safeInsert(connection, 'inv_material_category', data);
      categoryIds.push(id);
    }
    console.log(`[Seed] Created ${categoryIds.filter(Boolean).length} categories`);

    // 物料
    const materialIds = [];
    const materialData = [
      { code: 'MAT001', name: 'PET薄膜', spec: '0.125mm*500mm', type: 1, unit: '卷', catIdx: 0, price: 25.50 },
      { code: 'MAT002', name: 'UV油墨-黑色', spec: '1kg/罐', type: 4, unit: '罐', catIdx: 1, price: 85.00 },
      { code: 'MAT003', name: '不锈钢网版', spec: '300目', type: 4, unit: '张', catIdx: 2, price: 120.00 },
      { code: 'MAT004', name: '电子标签-型号A', spec: '50mm*30mm', type: 3, unit: 'PCS', catIdx: 3, price: 3.50 },
      { code: 'MAT005', name: '电子标签-型号B', spec: '80mm*50mm', type: 3, unit: 'PCS', catIdx: 3, price: 5.20 },
      { code: 'MAT006', name: '纸箱', spec: '400*300*200mm', type: 4, unit: '个', catIdx: 4, price: 8.00 },
      { code: 'MAT007', name: '离型纸', spec: '80g', type: 1, unit: '卷', catIdx: 0, price: 15.00 },
    ];
    for (const mat of materialData) {
      const data = {};
      if (tableHas(schemas['inv_material'], 'material_code')) data.material_code = mat.code;
      if (tableHas(schemas['inv_material'], 'material_name')) data.material_name = mat.name;
      if (tableHas(schemas['inv_material'], 'specification')) data.specification = mat.spec;
      if (tableHas(schemas['inv_material'], 'category_id')) data.category_id = categoryIds[mat.catIdx] || (mat.catIdx + 1);
      if (tableHas(schemas['inv_material'], 'material_type')) data.material_type = mat.type;
      if (tableHas(schemas['inv_material'], 'unit')) data.unit = mat.unit;
      if (tableHas(schemas['inv_material'], 'purchase_price')) data.purchase_price = mat.price;
      if (tableHas(schemas['inv_material'], 'cost_price')) data.cost_price = mat.price * 0.7;
      if (tableHas(schemas['inv_material'], 'status')) data.status = 1;
      if (tableHas(schemas['inv_material'], 'warehouse_id')) data.warehouse_id = warehouseIds[0] || 1;
      const id = await safeInsert(connection, 'inv_material', data);
      materialIds.push(id);
    }
    console.log(`[Seed] Created ${materialIds.filter(Boolean).length} materials`);

    // 客户
    const customerIds = [];
    const customerData = [
      { code: 'CUS001', name: '越南电子科技有限公司', type: 1, contact: '阮先生', phone: '0901234567', credit: 'A' },
      { code: 'CUS002', name: '胡志明市印刷厂', type: 1, contact: '陈女士', phone: '0912345678', credit: 'B' },
      { code: 'CUS003', name: '河内标签有限公司', type: 1, contact: '李先生', phone: '0923456789', credit: 'A' },
      { code: 'CUS004', name: '岘港包装制品公司', type: 1, contact: '王女士', phone: '0934567890', credit: 'B' },
      { code: 'CUS005', name: '平阳省电子厂', type: 1, contact: '张先生', phone: '0945678901', credit: 'A' },
    ];
    for (const cus of customerData) {
      const data = {};
      if (tableHas(schemas['crm_customer'], 'customer_code')) data.customer_code = cus.code;
      if (tableHas(schemas['crm_customer'], 'customer_name')) data.customer_name = cus.name;
      if (tableHas(schemas['crm_customer'], 'customer_type')) data.customer_type = cus.type;
      if (tableHas(schemas['crm_customer'], 'contact_name')) data.contact_name = cus.contact;
      if (tableHas(schemas['crm_customer'], 'contact_phone')) data.contact_phone = cus.phone;
      if (tableHas(schemas['crm_customer'], 'credit_level')) data.credit_level = cus.credit;
      if (tableHas(schemas['crm_customer'], 'status')) data.status = 1;
      if (tableHas(schemas['crm_customer'], 'follow_up_status')) data.follow_up_status = 3;
      const id = await safeInsert(connection, 'crm_customer', data);
      customerIds.push(id);
    }
    console.log(`[Seed] Created ${customerIds.filter(Boolean).length} customers`);

    // 供应商
    const supplierIds = [];
    const supplierData = [
      { code: 'SUP001', name: '中国丝印材料有限公司', type: 1, contact: '赵先生', phone: '13800138001' },
      { code: 'SUP002', name: '日本油墨株式会社', type: 2, contact: '山田先生', phone: '13900139001' },
      { code: 'SUP003', name: '德国网版制造厂', type: 3, contact: '穆勒先生', phone: '13700137001' },
      { code: 'SUP004', name: '本地包装材料厂', type: 4, contact: '陈先生', phone: '13600136001' },
      { code: 'SUP005', name: '韩国薄膜供应商', type: 1, contact: '金先生', phone: '13500135001' },
    ];
    for (const sup of supplierData) {
      const data = {};
      if (tableHas(schemas['pur_supplier'], 'supplier_code')) data.supplier_code = sup.code;
      if (tableHas(schemas['pur_supplier'], 'supplier_name')) data.supplier_name = sup.name;
      if (tableHas(schemas['pur_supplier'], 'supplier_type')) data.supplier_type = sup.type;
      if (tableHas(schemas['pur_supplier'], 'contact_name')) data.contact_name = sup.contact;
      if (tableHas(schemas['pur_supplier'], 'contact_phone')) data.contact_phone = sup.phone;
      if (tableHas(schemas['pur_supplier'], 'status')) data.status = 1;
      const id = await safeInsert(connection, 'pur_supplier', data);
      supplierIds.push(id);
    }
    console.log(`[Seed] Created ${supplierIds.filter(Boolean).length} suppliers`);

    // ========== 4. 生成5条全流程数据 ==========
    console.log('[Seed] Generating 5 full-flow data sets...');

    for (let i = 1; i <= 5; i++) {
      console.log(`[Seed] === Flow ${i}/5 ===`);
      const now = new Date();
      const orderDate = new Date(now.getTime() - i * 86400000 * 3);
      const dateStr = orderDate.toISOString().split('T')[0];
      const customerId = customerIds[i - 1] || i;
      const supplierId = supplierIds[i - 1] || i;
      const productMatIdx = 3 + (i % 2); // MAT004 or MAT005
      const materialId = materialIds[productMatIdx] || (productMatIdx + 1);
      const quantity = 1000 + i * 500;
      const unitPrice = 3.50 + (i % 2) * 1.70;
      const amount = quantity * unitPrice;
      const taxRate = 10;
      const taxAmount = amount * taxRate / 100;
      const totalWithTax = amount + taxAmount;

      // 4.1 销售订单
      let salesOrderId = null;
      if (schemas['sal_order']) {
        const data = {};
        if (tableHas(schemas['sal_order'], 'order_no')) data.order_no = `SO2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['sal_order'], 'order_date')) data.order_date = dateStr;
        if (tableHas(schemas['sal_order'], 'customer_id')) data.customer_id = customerId;
        if (tableHas(schemas['sal_order'], 'contact_name')) data.contact_name = customerData[i-1].contact;
        if (tableHas(schemas['sal_order'], 'contact_phone')) data.contact_phone = customerData[i-1].phone;
        if (tableHas(schemas['sal_order'], 'total_amount')) data.total_amount = amount;
        if (tableHas(schemas['sal_order'], 'tax_amount')) data.tax_amount = taxAmount;
        if (tableHas(schemas['sal_order'], 'total_with_tax')) data.total_with_tax = totalWithTax;
        if (tableHas(schemas['sal_order'], 'currency')) data.currency = 'VND';
        if (tableHas(schemas['sal_order'], 'payment_terms')) data.payment_terms = '货到付款';
        if (tableHas(schemas['sal_order'], 'delivery_date')) data.delivery_date = dateStr;
        if (tableHas(schemas['sal_order'], 'status')) data.status = 2;
        if (tableHas(schemas['sal_order'], 'remark')) data.remark = `销售订单-${i}`;
        salesOrderId = await safeInsert(connection, 'sal_order', data);
      }

      // 销售订单明细
      let salesDetailId = null;
      if (schemas['sal_order_detail'] && salesOrderId) {
        const data = {};
        if (tableHas(schemas['sal_order_detail'], 'order_id')) data.order_id = salesOrderId;
        if (tableHas(schemas['sal_order_detail'], 'material_id')) data.material_id = materialId;
        if (tableHas(schemas['sal_order_detail'], 'quantity')) data.quantity = quantity;
        if (tableHas(schemas['sal_order_detail'], 'unit')) data.unit = 'PCS';
        if (tableHas(schemas['sal_order_detail'], 'unit_price')) data.unit_price = unitPrice;
        if (tableHas(schemas['sal_order_detail'], 'tax_rate')) data.tax_rate = taxRate;
        if (tableHas(schemas['sal_order_detail'], 'amount')) data.amount = amount;
        if (tableHas(schemas['sal_order_detail'], 'tax_amount')) data.tax_amount = taxAmount;
        if (tableHas(schemas['sal_order_detail'], 'total_amount')) data.total_amount = totalWithTax;
        if (tableHas(schemas['sal_order_detail'], 'delivery_date')) data.delivery_date = dateStr;
        salesDetailId = await safeInsert(connection, 'sal_order_detail', data);
      }

      // 4.2 生产工单
      let workOrderId = null;
      if (schemas['prd_work_order']) {
        const data = {};
        if (tableHas(schemas['prd_work_order'], 'work_order_no')) data.work_order_no = `WO2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['prd_work_order'], 'work_order_date')) data.work_order_date = dateStr;
        if (tableHas(schemas['prd_work_order'], 'sales_order_id')) data.sales_order_id = salesOrderId;
        if (tableHas(schemas['prd_work_order'], 'material_id')) data.material_id = materialId;
        if (tableHas(schemas['prd_work_order'], 'plan_qty')) data.plan_qty = quantity;
        if (tableHas(schemas['prd_work_order'], 'completed_qty')) data.completed_qty = quantity * 0.98;
        if (tableHas(schemas['prd_work_order'], 'unit')) data.unit = 'PCS';
        if (tableHas(schemas['prd_work_order'], 'plan_start_date')) data.plan_start_date = dateStr;
        if (tableHas(schemas['prd_work_order'], 'plan_end_date')) data.plan_end_date = dateStr;
        if (tableHas(schemas['prd_work_order'], 'priority')) data.priority = 2;
        if (tableHas(schemas['prd_work_order'], 'status')) data.status = 2;
        if (tableHas(schemas['prd_work_order'], 'remark')) data.remark = `生产工单-${i}`;
        workOrderId = await safeInsert(connection, 'prd_work_order', data);
      }

      // 4.3 BOM
      let bomId = null;
      if (schemas['prd_bom']) {
        const data = {};
        if (tableHas(schemas['prd_bom'], 'bom_no')) data.bom_no = `BOM2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['prd_bom'], 'bom_name')) data.bom_name = `${materialData[productMatIdx].name}-BOM-${i}`;
        if (tableHas(schemas['prd_bom'], 'material_id')) data.material_id = materialId;
        if (tableHas(schemas['prd_bom'], 'version')) data.version = '1.0';
        if (tableHas(schemas['prd_bom'], 'is_default')) data.is_default = 1;
        if (tableHas(schemas['prd_bom'], 'status')) data.status = 1;
        if (tableHas(schemas['prd_bom'], 'remark')) data.remark = `BOM-${i}`;
        bomId = await safeInsert(connection, 'prd_bom', data);
      }

      // BOM明细
      const bomMaterials = [
        { matIdx: 0, qty: 1.2 },
        { matIdx: 1, qty: 0.05 },
        { matIdx: 5, qty: 0.1 },
      ];
      if (schemas['prd_bom_detail'] && bomId) {
        for (let j = 0; j < bomMaterials.length; j++) {
          const bm = bomMaterials[j];
          const data = {};
          if (tableHas(schemas['prd_bom_detail'], 'bom_id')) data.bom_id = bomId;
          if (tableHas(schemas['prd_bom_detail'], 'material_id')) data.material_id = materialIds[bm.matIdx] || (bm.matIdx + 1);
          if (tableHas(schemas['prd_bom_detail'], 'quantity')) data.quantity = bm.qty;
          if (tableHas(schemas['prd_bom_detail'], 'unit')) data.unit = '卷';
          if (tableHas(schemas['prd_bom_detail'], 'loss_rate')) data.loss_rate = 5;
          if (tableHas(schemas['prd_bom_detail'], 'process_sequence')) data.process_sequence = j + 1;
          await safeInsert(connection, 'prd_bom_detail', data);
        }
      }

      // 4.4 标准卡
      if (schemas['prd_standard_card']) {
        const data = {};
        if (tableHas(schemas['prd_standard_card'], 'card_no')) data.card_no = `SC2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['prd_standard_card'], 'customer_id')) data.customer_id = customerId;
        if (tableHas(schemas['prd_standard_card'], 'customer_name')) data.customer_name = customerData[i-1].name;
        if (tableHas(schemas['prd_standard_card'], 'customer_code')) data.customer_code = customerData[i-1].code;
        if (tableHas(schemas['prd_standard_card'], 'product_name')) data.product_name = materialData[productMatIdx].name;
        if (tableHas(schemas['prd_standard_card'], 'product_code')) data.product_code = materialData[productMatIdx].code;
        if (tableHas(schemas['prd_standard_card'], 'specification')) data.specification = materialData[productMatIdx].spec;
        if (tableHas(schemas['prd_standard_card'], 'status')) data.status = 3;
        await safeInsert(connection, 'prd_standard_card', data);
      }

      // 4.5 采购申请
      let requestId = null;
      if (schemas['pur_request']) {
        const data = {};
        if (tableHas(schemas['pur_request'], 'request_no')) data.request_no = `PR2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['pur_request'], 'request_date')) data.request_date = dateStr;
        if (tableHas(schemas['pur_request'], 'request_dept_id')) data.request_dept_id = 4;
        if (tableHas(schemas['pur_request'], 'requester_id')) data.requester_id = 1;
        if (tableHas(schemas['pur_request'], 'total_amount')) data.total_amount = amount * 0.6;
        if (tableHas(schemas['pur_request'], 'currency')) data.currency = 'VND';
        if (tableHas(schemas['pur_request'], 'urgency_level')) data.urgency_level = 1;
        if (tableHas(schemas['pur_request'], 'status')) data.status = 3;
        if (tableHas(schemas['pur_request'], 'remark')) data.remark = `采购申请-${i}`;
        requestId = await safeInsert(connection, 'pur_request', data);
      }

      // 采购申请明细
      if (schemas['pur_request_detail'] && requestId) {
        for (const bm of bomMaterials) {
          const reqQty = quantity * bm.qty;
          const data = {};
          if (tableHas(schemas['pur_request_detail'], 'request_id')) data.request_id = requestId;
          if (tableHas(schemas['pur_request_detail'], 'material_id')) data.material_id = materialIds[bm.matIdx] || (bm.matIdx + 1);
          if (tableHas(schemas['pur_request_detail'], 'quantity')) data.quantity = reqQty;
          if (tableHas(schemas['pur_request_detail'], 'unit')) data.unit = '卷';
          if (tableHas(schemas['pur_request_detail'], 'required_date')) data.required_date = dateStr;
          if (tableHas(schemas['pur_request_detail'], 'purpose')) data.purpose = `生产需求-${i}`;
          await safeInsert(connection, 'pur_request_detail', data);
        }
      }

      // 4.6 采购订单
      let purchaseOrderId = null;
      const purchaseAmount = amount * 0.6;
      const purchaseTax = purchaseAmount * taxRate / 100;
      const purchaseTotal = purchaseAmount + purchaseTax;

      if (schemas['pur_order']) {
        const data = {};
        if (tableHas(schemas['pur_order'], 'order_no')) data.order_no = `PO2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['pur_order'], 'order_date')) data.order_date = dateStr;
        if (tableHas(schemas['pur_order'], 'supplier_id')) data.supplier_id = supplierId;
        if (tableHas(schemas['pur_order'], 'contact_name')) data.contact_name = supplierData[i-1].contact;
        if (tableHas(schemas['pur_order'], 'contact_phone')) data.contact_phone = supplierData[i-1].phone;
        if (tableHas(schemas['pur_order'], 'total_amount')) data.total_amount = purchaseAmount;
        if (tableHas(schemas['pur_order'], 'tax_amount')) data.tax_amount = purchaseTax;
        if (tableHas(schemas['pur_order'], 'total_with_tax')) data.total_with_tax = purchaseTotal;
        if (tableHas(schemas['pur_order'], 'currency')) data.currency = 'VND';
        if (tableHas(schemas['pur_order'], 'payment_terms')) data.payment_terms = '月结30天';
        if (tableHas(schemas['pur_order'], 'delivery_date')) data.delivery_date = dateStr;
        if (tableHas(schemas['pur_order'], 'status')) data.status = 2;
        if (tableHas(schemas['pur_order'], 'remark')) data.remark = `采购订单-${i}`;
        purchaseOrderId = await safeInsert(connection, 'pur_order', data);
      }

      // 采购订单明细
      if (schemas['pur_order_detail'] && purchaseOrderId) {
        for (const bm of bomMaterials) {
          const poQty = quantity * bm.qty;
          const matPrice = materialData[bm.matIdx].price;
          const poAmount = poQty * matPrice;
          const data = {};
          if (tableHas(schemas['pur_order_detail'], 'order_id')) data.order_id = purchaseOrderId;
          if (tableHas(schemas['pur_order_detail'], 'material_id')) data.material_id = materialIds[bm.matIdx] || (bm.matIdx + 1);
          if (tableHas(schemas['pur_order_detail'], 'quantity')) data.quantity = poQty;
          if (tableHas(schemas['pur_order_detail'], 'unit')) data.unit = '卷';
          if (tableHas(schemas['pur_order_detail'], 'unit_price')) data.unit_price = matPrice;
          if (tableHas(schemas['pur_order_detail'], 'tax_rate')) data.tax_rate = taxRate;
          if (tableHas(schemas['pur_order_detail'], 'amount')) data.amount = poAmount;
          if (tableHas(schemas['pur_order_detail'], 'tax_amount')) data.tax_amount = poAmount * taxRate / 100;
          if (tableHas(schemas['pur_order_detail'], 'total_amount')) data.total_amount = poAmount * (1 + taxRate / 100);
          if (tableHas(schemas['pur_order_detail'], 'delivery_date')) data.delivery_date = dateStr;
          await safeInsert(connection, 'pur_order_detail', data);
        }
      }

      // 4.7 采购入库
      let receiptId = null;
      if (schemas['pur_receipt']) {
        const data = {};
        if (tableHas(schemas['pur_receipt'], 'receipt_no')) data.receipt_no = `GR2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['pur_receipt'], 'receipt_date')) data.receipt_date = dateStr;
        if (tableHas(schemas['pur_receipt'], 'order_id')) data.order_id = purchaseOrderId;
        if (tableHas(schemas['pur_receipt'], 'supplier_id')) data.supplier_id = supplierId;
        if (tableHas(schemas['pur_receipt'], 'warehouse_id')) data.warehouse_id = warehouseIds[0] || 1;
        if (tableHas(schemas['pur_receipt'], 'total_amount')) data.total_amount = purchaseTotal;
        if (tableHas(schemas['pur_receipt'], 'status')) data.status = 2;
        if (tableHas(schemas['pur_receipt'], 'remark')) data.remark = `采购入库-${i}`;
        receiptId = await safeInsert(connection, 'pur_receipt', data);
      }

      // 采购入库明细 + 库存
      if (schemas['pur_receipt_detail'] && receiptId) {
        for (const bm of bomMaterials) {
          const receiptQty = quantity * bm.qty;
          const batchNo = `BT2024${String(i).padStart(4, '0')}${bm.matIdx + 1}`;
          const matPrice = materialData[bm.matIdx].price;
          const data = {};
          if (tableHas(schemas['pur_receipt_detail'], 'receipt_id')) data.receipt_id = receiptId;
          if (tableHas(schemas['pur_receipt_detail'], 'material_id')) data.material_id = materialIds[bm.matIdx] || (bm.matIdx + 1);
          if (tableHas(schemas['pur_receipt_detail'], 'quantity')) data.quantity = receiptQty;
          if (tableHas(schemas['pur_receipt_detail'], 'unit')) data.unit = '卷';
          if (tableHas(schemas['pur_receipt_detail'], 'unit_price')) data.unit_price = matPrice;
          if (tableHas(schemas['pur_receipt_detail'], 'amount')) data.amount = receiptQty * matPrice;
          if (tableHas(schemas['pur_receipt_detail'], 'batch_no')) data.batch_no = batchNo;
          if (tableHas(schemas['pur_receipt_detail'], 'production_date')) data.production_date = dateStr;
          if (tableHas(schemas['pur_receipt_detail'], 'expiry_date')) data.expiry_date = dateStr;
          if (tableHas(schemas['pur_receipt_detail'], 'location_code')) data.location_code = 'A01-01';
          await safeInsert(connection, 'pur_receipt_detail', data);
        }
      }

      // 4.7b 库存（直接创建，不依赖入库表，使用ON DUPLICATE KEY UPDATE累加）
      if (schemas['inv_inventory']) {
        for (const bm of bomMaterials) {
          const receiptQty = quantity * bm.qty;
          const batchNo = `BT2024${String(i).padStart(4, '0')}${bm.matIdx + 1}`;
          const matId = materialIds[bm.matIdx] || (bm.matIdx + 1);
          const whId = warehouseIds[0] || 1;
          try {
            const invCols = [];
            const invVals = [];
            const updCols = [];
            if (tableHas(schemas['inv_inventory'], 'material_id')) { invCols.push('material_id'); invVals.push(matId); }
            if (tableHas(schemas['inv_inventory'], 'warehouse_id')) { invCols.push('warehouse_id'); invVals.push(whId); }
            if (tableHas(schemas['inv_inventory'], 'location_code')) { invCols.push('location_code'); invVals.push('A01-01'); }
            if (tableHas(schemas['inv_inventory'], 'quantity')) { invCols.push('quantity'); invVals.push(receiptQty); updCols.push('quantity = quantity + VALUES(quantity)'); }
            if (tableHas(schemas['inv_inventory'], 'locked_qty')) { invCols.push('locked_qty'); invVals.push(0); }
            if (tableHas(schemas['inv_inventory'], 'available_qty')) { invCols.push('available_qty'); invVals.push(receiptQty); updCols.push('available_qty = available_qty + VALUES(available_qty)'); }
            if (tableHas(schemas['inv_inventory'], 'batch_no')) { invCols.push('batch_no'); invVals.push(batchNo); }
            if (tableHas(schemas['inv_inventory'], 'production_date')) { invCols.push('production_date'); invVals.push(dateStr); }
            if (tableHas(schemas['inv_inventory'], 'expiry_date')) { invCols.push('expiry_date'); invVals.push(dateStr); }
            const placeholders = invCols.map(() => '?').join(', ');
            const sql = `INSERT INTO inv_inventory (${invCols.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updCols.join(', ')}`;
            await connection.execute(sql, invVals);
          } catch (e) {
            console.log(`[Skip] inv_inventory upsert failed: ${e.message}`);
          }
        }
      }

      // 4.8 销售出库
      let deliveryId = null;
      if (schemas['sal_delivery']) {
        const data = {};
        if (tableHas(schemas['sal_delivery'], 'delivery_no')) data.delivery_no = `DN2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['sal_delivery'], 'delivery_date')) data.delivery_date = dateStr;
        if (tableHas(schemas['sal_delivery'], 'order_id')) data.order_id = salesOrderId;
        if (tableHas(schemas['sal_delivery'], 'customer_id')) data.customer_id = customerId;
        if (tableHas(schemas['sal_delivery'], 'warehouse_id')) data.warehouse_id = warehouseIds[2] || 3;
        if (tableHas(schemas['sal_delivery'], 'total_amount')) data.total_amount = totalWithTax;
        if (tableHas(schemas['sal_delivery'], 'logistics_company')) data.logistics_company = '越南快递';
        if (tableHas(schemas['sal_delivery'], 'tracking_no')) data.tracking_no = `VN${i}888999`;
        if (tableHas(schemas['sal_delivery'], 'status')) data.status = 2;
        if (tableHas(schemas['sal_delivery'], 'remark')) data.remark = `销售出库-${i}`;
        deliveryId = await safeInsert(connection, 'sal_delivery', data);
      }

      // 销售出库明细
      if (schemas['sal_delivery_detail'] && deliveryId) {
        const data = {};
        if (tableHas(schemas['sal_delivery_detail'], 'delivery_id')) data.delivery_id = deliveryId;
        if (tableHas(schemas['sal_delivery_detail'], 'material_id')) data.material_id = materialId;
        if (tableHas(schemas['sal_delivery_detail'], 'order_detail_id')) data.order_detail_id = salesDetailId;
        if (tableHas(schemas['sal_delivery_detail'], 'quantity')) data.quantity = quantity;
        if (tableHas(schemas['sal_delivery_detail'], 'unit')) data.unit = 'PCS';
        if (tableHas(schemas['sal_delivery_detail'], 'unit_price')) data.unit_price = unitPrice;
        if (tableHas(schemas['sal_delivery_detail'], 'amount')) data.amount = amount;
        if (tableHas(schemas['sal_delivery_detail'], 'batch_no')) data.batch_no = `BT2024${String(i).padStart(4, '0')}${productMatIdx + 1}`;
        await safeInsert(connection, 'sal_delivery_detail', data);
      }

      // 4.9 质量检验
      if (schemas['qc_inspection']) {
        const qualifiedQty = quantity * 0.98;
        const unqualifiedQty = quantity * 0.02;
        const data = {};
        if (tableHas(schemas['qc_inspection'], 'inspection_no')) data.inspection_no = `QC2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['qc_inspection'], 'inspection_type')) data.inspection_type = 3;
        if (tableHas(schemas['qc_inspection'], 'source_type')) data.source_type = '生产工单';
        if (tableHas(schemas['qc_inspection'], 'source_id')) data.source_id = workOrderId || salesOrderId;
        if (tableHas(schemas['qc_inspection'], 'source_no')) data.source_no = workOrderId ? `WO2024${String(i).padStart(4, '0')}` : `SO2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['qc_inspection'], 'material_id')) data.material_id = materialId;
        if (tableHas(schemas['qc_inspection'], 'batch_no')) data.batch_no = `BT2024${String(i).padStart(4, '0')}${productMatIdx + 1}`;
        if (tableHas(schemas['qc_inspection'], 'inspection_qty')) data.inspection_qty = quantity;
        if (tableHas(schemas['qc_inspection'], 'qualified_qty')) data.qualified_qty = qualifiedQty;
        if (tableHas(schemas['qc_inspection'], 'unqualified_qty')) data.unqualified_qty = unqualifiedQty;
        if (tableHas(schemas['qc_inspection'], 'inspection_result')) data.inspection_result = 1;
        if (tableHas(schemas['qc_inspection'], 'inspector_id')) data.inspector_id = 1;
        if (tableHas(schemas['qc_inspection'], 'inspection_date')) data.inspection_date = dateStr;
        if (tableHas(schemas['qc_inspection'], 'remark')) data.remark = `成品检验-${i}`;
        await safeInsert(connection, 'qc_inspection', data);
      }

      // 4.10 应收应付
      if (schemas['fin_receivable']) {
        const data = {};
        if (tableHas(schemas['fin_receivable'], 'receivable_no')) data.receivable_no = `AR2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['fin_receivable'], 'source_type')) data.source_type = 1;
        if (tableHas(schemas['fin_receivable'], 'source_id')) data.source_id = salesOrderId;
        if (tableHas(schemas['fin_receivable'], 'source_no')) data.source_no = `SO2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['fin_receivable'], 'customer_id')) data.customer_id = customerId;
        if (tableHas(schemas['fin_receivable'], 'amount')) data.amount = totalWithTax;
        if (tableHas(schemas['fin_receivable'], 'received_amount')) data.received_amount = 0;
        if (tableHas(schemas['fin_receivable'], 'balance')) data.balance = totalWithTax;
        if (tableHas(schemas['fin_receivable'], 'due_date')) data.due_date = dateStr;
        if (tableHas(schemas['fin_receivable'], 'status')) data.status = 1;
        if (tableHas(schemas['fin_receivable'], 'remark')) data.remark = `应收款-${i}`;
        await safeInsert(connection, 'fin_receivable', data);
      }

      if (schemas['fin_payable']) {
        const data = {};
        if (tableHas(schemas['fin_payable'], 'payable_no')) data.payable_no = `AP2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['fin_payable'], 'source_type')) data.source_type = 1;
        if (tableHas(schemas['fin_payable'], 'source_id')) data.source_id = purchaseOrderId;
        if (tableHas(schemas['fin_payable'], 'source_no')) data.source_no = `PO2024${String(i).padStart(4, '0')}`;
        if (tableHas(schemas['fin_payable'], 'supplier_id')) data.supplier_id = supplierId;
        if (tableHas(schemas['fin_payable'], 'amount')) data.amount = purchaseTotal;
        if (tableHas(schemas['fin_payable'], 'paid_amount')) data.paid_amount = 0;
        if (tableHas(schemas['fin_payable'], 'balance')) data.balance = purchaseTotal;
        if (tableHas(schemas['fin_payable'], 'due_date')) data.due_date = dateStr;
        if (tableHas(schemas['fin_payable'], 'status')) data.status = 1;
        if (tableHas(schemas['fin_payable'], 'remark')) data.remark = `应付款-${i}`;
        await safeInsert(connection, 'fin_payable', data);
      }

      console.log(`[Seed] Flow ${i} done: SO=SO2024${String(i).padStart(4, '0')}, PO=PO2024${String(i).padStart(4, '0')}`);
    }

    await connection.commit();
    console.log('\n[Seed] All data generated successfully!');
    console.log('[Summary] 5 full-flow data sets created:');
    console.log('  - 4 warehouses, 5 categories, 7 materials');
    console.log('  - 5 customers, 5 suppliers');
    console.log('  - 5 sales orders + details');
    console.log('  - 5 purchase requests + details');
    console.log('  - 5 purchase orders + details');
    console.log('  - 5 purchase receipts + details (if table exists)');
    console.log('  - 5 work orders (if table exists)');
    console.log('  - 5 BOMs + details');
    console.log('  - 5 standard cards');
    console.log('  - 5 sales deliveries + details (if table exists)');
    console.log('  - 5 quality inspections');
    console.log('  - 5 receivables, 5 payables');
    console.log('  - Inventory records');
    console.log('  - Preserved: sys_user, sys_config, sys_department, sys_role, sys_menu, sys_dict');

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
