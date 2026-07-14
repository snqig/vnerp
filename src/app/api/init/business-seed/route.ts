import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(async (_request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const safeDelete = async (tableName: string) => {
      try {
        await conn.execute(`DELETE FROM ${tableName} WHERE deleted = 0 OR deleted IS NULL`);
      } catch (_e) {}
    };

    await safeDelete('inv_inbound_item');
    await safeDelete('inv_inbound_order');
    await safeDelete('inv_material_label');
    await safeDelete('inv_inventory');
    await safeDelete('qc_inspection');
    await safeDelete('crm_customer');
    await safeDelete('fin_receivable');
    await safeDelete('finance_receipt');
    await safeDelete('prd_process_card');
    await safeDelete('qc_final_inspection');
    await safeDelete('prd_standard_card');
    await safeDelete('sal_order_item');
    await safeDelete('sal_order');
    await safeDelete('prod_work_order_item');
    await safeDelete('prod_work_order');

    // 清理可能存在的重复库存数据
    try {
      await conn.execute('DELETE FROM inv_inventory');
    } catch (_e) {}

    const customers = [
      {
        customer_name: '美的集团',
        customer_code: 'C001',
        contact_name: '张经理',
        contact_phone: '13800138001',
        address: '广东省佛山市顺德区',
      },
      {
        customer_name: '格力电器',
        customer_code: 'C002',
        contact_name: '李经理',
        contact_phone: '13800138002',
        address: '广东省珠海市香洲区',
      },
      {
        customer_name: '海尔集团',
        customer_code: 'C003',
        contact_name: '王经理',
        contact_phone: '13800138003',
        address: '山东省青岛市崂山区',
      },
      {
        customer_name: 'TCL集团',
        customer_code: 'C004',
        contact_name: '赵经理',
        contact_phone: '13800138004',
        address: '广东省惠州市惠城区',
      },
      {
        customer_name: '奥克斯集团',
        customer_code: 'C005',
        contact_name: '刘经理',
        contact_phone: '13800138005',
        address: '浙江省宁波市鄞州区',
      },
    ];

    for (const customer of customers) {
      await conn.execute(
        `INSERT INTO crm_customer (customer_name, customer_code, contact_name, contact_phone, address, customer_type, status, create_time, update_time) 
         VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [
          customer.customer_name,
          customer.customer_code,
          customer.contact_name,
          customer.contact_phone,
          customer.address,
        ]
      );
    }
    stats.crm_customer = customers.length;

    const [customerRows]: Loose = await conn.execute(
      'SELECT id, customer_name FROM crm_customer ORDER BY id'
    );
    const customerMap: Record<string, number> = {};
    for (const row of customerRows) {
      customerMap[row.customer_name] = row.id;
    }

    const salesOrders = [
      { customer: '美的集团', order_no: 'SO20250101001', amount: 50000, status: 4 },
      { customer: '格力电器', order_no: 'SO20250101002', amount: 30000, status: 3 },
      { customer: '海尔集团', order_no: 'SO20250101003', amount: 45000, status: 2 },
      { customer: 'TCL集团', order_no: 'SO20250101004', amount: 28000, status: 1 },
      { customer: '奥克斯集团', order_no: 'SO20250101005', amount: 35000, status: 4 },
      { customer: '美的集团', order_no: 'SO20250102001', amount: 42000, status: 3 },
      { customer: '格力电器', order_no: 'SO20250102002', amount: 38000, status: 2 },
      { customer: '海尔集团', order_no: 'SO20250102003', amount: 52000, status: 1 },
      { customer: 'TCL集团', order_no: 'SO20250102004', amount: 31000, status: 4 },
      { customer: '奥克斯集团', order_no: 'SO20250102005', amount: 29000, status: 3 },
    ];

    for (const order of salesOrders) {
      const customerId = customerMap[order.customer];
      await conn.execute(
        `INSERT INTO sal_order (order_no, customer_id, order_date, delivery_date, status, total_amount, create_time, update_time, deleted) 
         VALUES (?, ?, DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), ?, ?, NOW(), NOW(), 0)`,
        [order.order_no, customerId, order.status, order.amount]
      );

      const [orderRow]: Loose = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const orderId = orderRow[0].id;

      await conn.execute(
        `INSERT INTO sal_order_item (order_id, material_name, quantity, unit_price, total_price, unit, create_time) 
         VALUES (?, 'PET薄膜', 1000, 50, 50000, '张', NOW())`,
        [orderId]
      );
    }
    stats.sal_order = salesOrders.length;

    const [orderRows]: Loose = await conn.execute('SELECT id, order_no FROM sal_order ORDER BY id');
    const orderMap: Record<string, number> = {};
    for (const row of orderRows) {
      orderMap[row.order_no] = row.id;
    }

    const receivables = [
      {
        order_no: 'SO20250101001',
        customer: '美的集团',
        amount: 50000,
        received: 50000,
        status: 'completed',
        due_date: '2025-02-15',
      },
      {
        order_no: 'SO20250101002',
        customer: '格力电器',
        amount: 30000,
        received: 15000,
        status: 'partial',
        due_date: '2025-02-20',
      },
      {
        order_no: 'SO20250101003',
        customer: '海尔集团',
        amount: 45000,
        received: 0,
        status: 'pending',
        due_date: '2025-02-25',
      },
      {
        order_no: 'SO20250101004',
        customer: 'TCL集团',
        amount: 28000,
        received: 0,
        status: 'pending',
        due_date: '2025-03-01',
      },
      {
        order_no: 'SO20250101005',
        customer: '奥克斯集团',
        amount: 35000,
        received: 35000,
        status: 'completed',
        due_date: '2025-02-10',
      },
      {
        order_no: 'SO20250102001',
        customer: '美的集团',
        amount: 42000,
        received: 20000,
        status: 'partial',
        due_date: '2025-02-18',
      },
      {
        order_no: 'SO20250102002',
        customer: '格力电器',
        amount: 38000,
        received: 0,
        status: 'pending',
        due_date: '2025-02-22',
      },
      {
        order_no: 'SO20250102003',
        customer: '海尔集团',
        amount: 52000,
        received: 10000,
        status: 'partial',
        due_date: '2025-02-28',
      },
      {
        order_no: 'SO20250102004',
        customer: 'TCL集团',
        amount: 31000,
        received: 31000,
        status: 'completed',
        due_date: '2025-02-08',
      },
      {
        order_no: 'SO20250102005',
        customer: '奥克斯集团',
        amount: 29000,
        received: 0,
        status: 'pending',
        due_date: '2025-02-28',
      },
    ];

    for (const rec of receivables) {
      const customerId = customerMap[rec.customer];
      const salesOrderId = orderMap[rec.order_no];
      await conn.execute(
        `INSERT INTO fin_receivable (receivable_no, sales_order_id, sales_order_no, customer_id, customer_name, amount, received_amount, pending_amount, due_date, status, create_time, update_time, deleted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
        [
          'RC' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3),
          salesOrderId,
          rec.order_no,
          customerId,
          rec.customer,
          rec.amount,
          rec.received,
          rec.amount - rec.received,
          rec.due_date,
          rec.status,
        ]
      );
    }
    stats.fin_receivable = receivables.length;

    const workOrders = [
      {
        work_order_no: 'WO20250101001',
        product_name: '美的空调面板标签',
        quantity: 5000,
        status: 4,
      },
      { work_order_no: 'WO20250101002', product_name: '格力洗衣机面板', quantity: 3000, status: 3 },
      { work_order_no: 'WO20250101003', product_name: '海尔冰箱标签', quantity: 4500, status: 2 },
      { work_order_no: 'WO20250101004', product_name: 'TCL电视标签', quantity: 2800, status: 1 },
      { work_order_no: 'WO20250101005', product_name: '奥克斯空调标签', quantity: 3500, status: 4 },
      { work_order_no: 'WO20250102001', product_name: '美的微波炉标签', quantity: 4200, status: 3 },
      { work_order_no: 'WO20250102002', product_name: '格力空调标签', quantity: 3800, status: 2 },
      { work_order_no: 'WO20250102003', product_name: '海尔洗衣机标签', quantity: 5200, status: 1 },
    ];

    for (const wo of workOrders) {
      await conn.execute(
        `INSERT INTO prod_work_order (work_order_no, product_name, quantity, status, create_time, update_time, deleted) 
         VALUES (?, ?, ?, ?, NOW(), NOW(), 0)`,
        [wo.work_order_no, wo.product_name, wo.quantity, wo.status]
      );
    }
    stats.prod_work_order = workOrders.length;

    const standardCards = [
      {
        card_no: 'SC20250101001',
        customer_name: '美的集团',
        customer_code: 'C001',
        product_name: '空调面板标签',
        process_flow1: '开料-印刷-覆膜-模切',
        process_flow2: '检验-包装',
        print_type: '丝网印刷',
        finished_size: '100x150mm',
        tolerance: '±0.5mm',
        quality_manager: '周杰',
        packing_type: '纸箱包装',
        slice_per_box: '500',
        slice_per_bundle: '50',
      },
      {
        card_no: 'SC20250101002',
        customer_name: '格力电器',
        customer_code: 'C002',
        product_name: '洗衣机面板',
        process_flow1: '开料-印刷-UV固化',
        process_flow2: '检验-包装',
        print_type: 'UV印刷',
        finished_size: '300x400mm',
        tolerance: '±0.3mm',
        quality_manager: '周杰',
        packing_type: '纸箱包装',
        slice_per_box: '100',
        slice_per_bundle: '20',
      },
      {
        card_no: 'SC20250101003',
        customer_name: '海尔集团',
        customer_code: 'C003',
        product_name: '冰箱标签',
        process_flow1: '开料-印刷-烫金',
        process_flow2: '检验-包装',
        print_type: '丝网印刷',
        finished_size: '80x120mm',
        tolerance: '±0.5mm',
        quality_manager: '周杰',
        packing_type: '纸箱包装',
        slice_per_box: '800',
        slice_per_bundle: '80',
      },
      {
        card_no: 'SC20250101004',
        customer_name: 'TCL集团',
        customer_code: 'C004',
        product_name: '电视标签',
        process_flow1: '开料-印刷-覆膜',
        process_flow2: '检验-包装',
        print_type: '数码印刷',
        finished_size: '120x180mm',
        tolerance: '±0.5mm',
        quality_manager: '周杰',
        packing_type: '纸箱包装',
        slice_per_box: '600',
        slice_per_bundle: '60',
      },
      {
        card_no: 'SC20250101005',
        customer_name: '奥克斯集团',
        customer_code: 'C005',
        product_name: '空调标签',
        process_flow1: '开料-印刷',
        process_flow2: '检验-包装',
        print_type: '丝网印刷',
        finished_size: '90x130mm',
        tolerance: '±0.5mm',
        quality_manager: '周杰',
        packing_type: '纸箱包装',
        slice_per_box: '700',
        slice_per_bundle: '70',
      },
    ];

    for (const sc of standardCards) {
      await conn.execute(
        `INSERT INTO prd_standard_card (card_no, customer_name, customer_code, product_name, process_flow1, process_flow2, print_type, finished_size, tolerance, quality_manager, packing_type, slice_per_box, slice_per_bundle, date, create_time, update_time, deleted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW(), NOW(), 0)`,
        [
          sc.card_no,
          sc.customer_name,
          sc.customer_code,
          sc.product_name,
          sc.process_flow1,
          sc.process_flow2,
          sc.print_type,
          sc.finished_size,
          sc.tolerance,
          sc.quality_manager,
          sc.packing_type,
          sc.slice_per_box,
          sc.slice_per_bundle,
        ]
      );
    }
    stats.prd_standard_card = standardCards.length;

    const processCards = [
      {
        card_no: 'PC20250101001',
        work_order_no: 'WO20250101001',
        product_code: '1',
        product_name: '美的空调面板标签',
        material_spec: 'PET白色',
        plan_qty: 5000,
        main_label_no: 'LB20250101001',
        burdening_status: 3,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101001',
        create_user_name: '刘洋',
      },
      {
        card_no: 'PC20250101002',
        work_order_no: 'WO20250101002',
        product_code: '2',
        product_name: '格力洗衣机面板',
        material_spec: 'PET透明',
        plan_qty: 3000,
        main_label_no: 'LB20250101002',
        burdening_status: 2,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101002',
        create_user_name: '刘洋',
      },
      {
        card_no: 'PC20250101003',
        work_order_no: 'WO20250101003',
        product_code: '3',
        product_name: '海尔冰箱标签',
        material_spec: 'PVC白色',
        plan_qty: 4500,
        main_label_no: 'LB20250101003',
        burdening_status: 2,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101003',
        create_user_name: '刘洋',
      },
      {
        card_no: 'PC20250101004',
        work_order_no: 'WO20250101004',
        product_code: '4',
        product_name: 'TCL电视标签',
        material_spec: 'PET银色',
        plan_qty: 2800,
        main_label_no: 'LB20250101004',
        burdening_status: 1,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101004',
        create_user_name: '刘洋',
      },
      {
        card_no: 'PC20250101005',
        work_order_no: 'WO20250101005',
        product_code: '5',
        product_name: '奥克斯空调标签',
        material_spec: 'PET蓝色',
        plan_qty: 3500,
        main_label_no: 'LB20250101005',
        burdening_status: 3,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101005',
        create_user_name: '刘洋',
      },
      {
        card_no: 'PC20250102001',
        work_order_no: 'WO20250102001',
        product_code: '1',
        product_name: '美的微波炉标签',
        material_spec: 'PET白色',
        plan_qty: 4200,
        main_label_no: 'LB20250102001',
        burdening_status: 2,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250102001',
        create_user_name: '刘洋',
      },
      {
        card_no: 'PC20250102002',
        work_order_no: 'WO20250102002',
        product_code: '2',
        product_name: '格力空调标签',
        material_spec: 'PET透明',
        plan_qty: 3800,
        main_label_no: 'LB20250102002',
        burdening_status: 2,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250102002',
        create_user_name: '刘洋',
      },
      {
        card_no: 'PC20250102003',
        work_order_no: 'WO20250102003',
        product_code: '3',
        product_name: '海尔洗衣机标签',
        material_spec: 'PVC白色',
        plan_qty: 5200,
        main_label_no: 'LB20250102003',
        burdening_status: 1,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250102003',
        create_user_name: '刘洋',
      },
    ];

    for (const pc of processCards) {
      await conn.execute(
        `INSERT INTO prd_process_card (card_no, qr_code, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty, main_label_no, burdening_status, lock_status, create_user_name, create_time, update_time, deleted) 
         VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 10) DAY), ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
        [
          pc.card_no,
          pc.qr_code,
          pc.work_order_no,
          pc.product_code,
          pc.product_name,
          pc.material_spec,
          pc.plan_qty,
          pc.main_label_no,
          pc.burdening_status,
          pc.lock_status,
          pc.create_user_name,
        ]
      );
    }
    stats.prd_process_card = processCards.length;

    const finalInspections = [
      {
        work_order_no: 'WO20250101001',
        product_name: '美的空调面板标签',
        qualified_qty: 5000,
        defect_qty: 0,
        inspector: '周杰',
        remark: '检验合格',
      },
      {
        work_order_no: 'WO20250101005',
        product_name: '奥克斯空调标签',
        qualified_qty: 3500,
        defect_qty: 0,
        inspector: '周杰',
        remark: '检验合格',
      },
    ];

    for (const fi of finalInspections) {
      await conn.execute(
        `INSERT INTO qc_final_inspection (inspection_no, work_order_no, product_name, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name, remark, inspection_date, create_time, deleted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW(), 0)`,
        [
          'FI' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3),
          fi.work_order_no,
          fi.product_name,
          fi.work_order_no,
          fi.qualified_qty,
          fi.qualified_qty,
          fi.defect_qty,
          1,
          fi.inspector,
          fi.remark,
        ]
      );
    }
    stats.qc_final_inspection = finalInspections.length;

    const inboundOrders = [
      {
        order_no: 'IN20250101001',
        supplier: '东莞PET薄膜厂',
        material: 'PET薄膜',
        quantity: 500,
        status: 'completed',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250101002',
        supplier: '深圳油墨公司',
        material: 'UV油墨',
        quantity: 200,
        status: 'pending',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250101003',
        supplier: '广州不干胶厂',
        material: '不干胶',
        quantity: 1000,
        status: 'pending',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250101004',
        supplier: '佛山PVC厂',
        material: 'PVC薄膜',
        quantity: 300,
        status: 'completed',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250101005',
        supplier: '东莞PET薄膜厂',
        material: 'PET薄膜',
        quantity: 400,
        status: 'pending',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250102001',
        supplier: '深圳特种油墨',
        material: '导电银浆',
        quantity: 50,
        status: 'completed',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250102002',
        supplier: '广州保护膜厂',
        material: '保护膜',
        quantity: 800,
        status: 'pending',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250102003',
        supplier: '东莞PET薄膜厂',
        material: 'PET薄膜',
        quantity: 600,
        status: 'pending',
        warehouse_id: 1,
      },
    ];

    for (const order of inboundOrders) {
      await conn.execute(
        `INSERT INTO inv_inbound_order (order_no, supplier_name, warehouse_id, inbound_date, status, total_quantity, total_amount, create_time, update_time, deleted) 
         VALUES (?, ?, ?, DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY), ?, ?, ?, NOW(), NOW(), 0)`,
        [
          order.order_no,
          order.supplier,
          order.warehouse_id,
          order.status,
          order.quantity,
          order.quantity * 10,
        ]
      );

      const [orderRow]: Loose = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const orderId = orderRow[0].id;

      await conn.execute(
        `INSERT INTO inv_inbound_item (order_id, material_id, material_name, quantity, unit, unit_price, total_price, create_time) 
         VALUES (?, 1, ?, ?, '卷', 10, ?, NOW())`,
        [orderId, order.material, order.quantity, order.quantity * 10]
      );
    }
    stats.inv_inbound_order = inboundOrders.length;

    const labels = [
      {
        label_no: 'LB20250101001',
        material_code: 'MAT001',
        material_name: 'PET薄膜',
        quantity: 500,
        status: 1,
      },
      {
        label_no: 'LB20250101002',
        material_code: 'MAT002',
        material_name: 'UV油墨',
        quantity: 200,
        status: 1,
      },
      {
        label_no: 'LB20250101003',
        material_code: 'MAT003',
        material_name: '不干胶',
        quantity: 1000,
        status: 1,
      },
      {
        label_no: 'LB20250101004',
        material_code: 'MAT004',
        material_name: 'PVC薄膜',
        quantity: 300,
        status: 1,
      },
      {
        label_no: 'LB20250101005',
        material_code: 'MAT001',
        material_name: 'PET薄膜',
        quantity: 400,
        status: 1,
      },
      {
        label_no: 'LB20250102001',
        material_code: 'MAT005',
        material_name: '导电银浆',
        quantity: 50,
        status: 1,
      },
      {
        label_no: 'LB20250102002',
        material_code: 'MAT006',
        material_name: '保护膜',
        quantity: 800,
        status: 1,
      },
      {
        label_no: 'LB20250102003',
        material_code: 'MAT001',
        material_name: 'PET薄膜',
        quantity: 600,
        status: 2,
      },
      {
        label_no: 'LB20250102004',
        material_code: 'MAT002',
        material_name: 'UV油墨',
        quantity: 150,
        status: 3,
      },
      {
        label_no: 'LB20250102005',
        material_code: 'MAT003',
        material_name: '不干胶',
        quantity: 900,
        status: 1,
      },
    ];

    for (const label of labels) {
      await conn.execute(
        `INSERT INTO inv_material_label (label_no, material_code, material_name, quantity, status, is_main_material, is_used, is_cut, warehouse_id, create_time, update_time, deleted) 
         VALUES (?, ?, ?, ?, ?, 1, 0, 0, 1, NOW(), NOW(), 0)`,
        [label.label_no, label.material_code, label.material_name, label.quantity, label.status]
      );
    }
    stats.inv_material_label = labels.length;

    const inventories = [
      { material_name: 'PET薄膜', material_code: 'MAT001', quantity: 1500, min_quantity: 500 },
      { material_name: 'UV油墨', material_code: 'MAT002', quantity: 350, min_quantity: 100 },
      { material_name: '不干胶', material_code: 'MAT003', quantity: 1900, min_quantity: 800 },
      { material_name: 'PVC薄膜', material_code: 'MAT004', quantity: 300, min_quantity: 200 },
      { material_name: '导电银浆', material_code: 'MAT005', quantity: 50, min_quantity: 30 },
      { material_name: '保护膜', material_code: 'MAT006', quantity: 800, min_quantity: 500 },
    ];

    const [matRows]: Loose = await conn.execute(
      'SELECT id, material_code FROM bom_material WHERE deleted = 0 LIMIT 20'
    );
    const matMap: Record<string, number> = {};
    for (const row of matRows) {
      matMap[row.material_code] = row.id;
    }

    for (const inv of inventories) {
      const materialId = matMap[inv.material_code] || 1;
      await conn.execute(
        `INSERT IGNORE INTO inv_inventory (material_id, material_name, quantity, available_qty, safety_stock, warehouse_id, unit, create_time, update_time, deleted) 
         VALUES (?, ?, ?, ?, ?, 1, '卷', NOW(), NOW(), 0)`,
        [materialId, inv.material_name, inv.quantity, inv.quantity, inv.min_quantity]
      );
    }
    stats.inv_inventory = inventories.length;

    const inspections = [
      {
        inspection_no: 'QC20250101001',
        inspection_type: 1,
        inspection_result: 1,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250101002',
        inspection_type: 2,
        inspection_result: 1,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250101003',
        inspection_type: 3,
        inspection_result: 2,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250101004',
        inspection_type: 1,
        inspection_result: 1,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250101005',
        inspection_type: 2,
        inspection_result: 1,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250102001',
        inspection_type: 3,
        inspection_result: 1,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250102002',
        inspection_type: 1,
        inspection_result: 1,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250102003',
        inspection_type: 2,
        inspection_result: 2,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250102004',
        inspection_type: 3,
        inspection_result: 1,
        inspector: '周杰',
      },
      {
        inspection_no: 'QC20250102005',
        inspection_type: 1,
        inspection_result: 1,
        inspector: '周杰',
      },
    ];

    for (const inspection of inspections) {
      await conn.execute(
        `INSERT INTO qc_inspection (inspection_no, inspection_type, inspection_result, inspector, inspection_date, deleted) 
         VALUES (?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY), 0)`,
        [
          inspection.inspection_no,
          inspection.inspection_type,
          inspection.inspection_result,
          inspection.inspector,
        ]
      );
    }
    stats.qc_inspection = inspections.length;

    return stats;
  });

  return successResponse(result, '业务数据种子初始化成功');
});
