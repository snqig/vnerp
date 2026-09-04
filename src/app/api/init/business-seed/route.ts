import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const safeDelete = async (tableName: string) => {
      try {
        await conn.execute(`DELETE FROM ${tableName} WHERE deleted = 0 OR deleted IS NULL`);
      } catch (_e) {}
    };

    // 安全 INSERT：字段不匹配时跳过，不阻断全局
    const safeInsert = async (sql: string, params: unknown[], statKey?: string) => {
      try {
        await conn.execute(sql, params as any);
        if (statKey) stats[statKey] = (stats[statKey] || 0) + 1;
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

    // 清理即将插入的表
    await safeDelete('prd_bom_detail');
    await safeDelete('prd_bom');
    await safeDelete('pur_supplier');
    await safeDelete('inv_warehouse');

    // ===== 仓库种子数据（inv_inbound_order FK 依赖） =====
    const warehouses = [
      {
        warehouse_code: 'WH001',
        warehouse_name: ts('k_tkxvoe'),
        warehouse_type: 1,
        address: ts('k_11n8puw'),
      },
      {
        warehouse_code: 'WH002',
        warehouse_name: ts('k_llwvwj'),
        warehouse_type: 2,
        address: ts('k_127hdqr'),
      },
      {
        warehouse_code: 'WH003',
        warehouse_name: ts('k_93mh3v'),
        warehouse_type: 3,
        address: ts('k_4qppgv'),
      },
      {
        warehouse_code: 'WH004',
        warehouse_name: ts('k_6jdwbc'),
        warehouse_type: 4,
        address: ts('k_479sg4'),
      },
      {
        warehouse_code: 'WH005',
        warehouse_name: ts('k_359r5x'),
        warehouse_type: 5,
        address: ts('k_ys8vu6'),
      },
    ];
    for (const wh of warehouses) {
      await safeInsert(
        `INSERT IGNORE INTO inv_warehouse (warehouse_code, warehouse_name, warehouse_type, address, status, create_time, update_time, deleted) VALUES (?, ?, ?, ?, 1, NOW(), NOW(), 0)`,
        [wh.warehouse_code, wh.warehouse_name, wh.warehouse_type, wh.address]
      );
    }
    stats.inv_warehouse = warehouses.length;

    // ===== 供应商种子数据 =====
    const suppliers = [
      {
        supplier_code: 'SUP001',
        supplier_name: ts('k_p7kvw2'),
        short_name: ts('k_k0b4gk'),
        contact_name: ts('k_cajrc4'),
        contact_phone: '0769-12345678',
        address: ts('k_56izg7'),
      },
      {
        supplier_code: 'SUP002',
        supplier_name: ts('k_1dmfh48'),
        short_name: ts('k_1sdt4do'),
        contact_name: ts('k_57shg4'),
        contact_phone: '0755-87654321',
        address: ts('k_1k1npbx'),
      },
      {
        supplier_code: 'SUP003',
        supplier_name: ts('k_1dhcm6z'),
        short_name: ts('k_19r7na3'),
        contact_name: ts('k_nxfiar'),
        contact_phone: '020-11112222',
        address: ts('k_hznk92'),
      },
      {
        supplier_code: 'SUP004',
        supplier_name: ts('k_sscisi'),
        short_name: ts('k_1wpho2c'),
        contact_name: ts('k_w4ia8u'),
        contact_phone: '0757-33334444',
        address: ts('k_17z988p'),
      },
      {
        supplier_code: 'SUP005',
        supplier_name: ts('k_bmai82'),
        short_name: ts('k_1e1rrey'),
        contact_name: ts('k_1d0fmb5'),
        contact_phone: '0755-55556666',
        address: ts('k_1k1npbx'),
      },
      {
        supplier_code: 'SUP006',
        supplier_name: ts('k_125crav'),
        short_name: ts('k_67lccv'),
        contact_name: ts('k_ydadml'),
        contact_phone: '020-77778888',
        address: ts('k_hznk92'),
      },
    ];
    for (const sup of suppliers) {
      await safeInsert(
        `INSERT IGNORE INTO pur_supplier (supplier_code, supplier_name, short_name, supplier_type, address, contact_name, contact_phone, status, create_time, update_time, deleted) VALUES (?, ?, ?, 1, ?, ?, ?, 1, NOW(), NOW(), 0)`,
        [
          sup.supplier_code,
          sup.supplier_name,
          sup.short_name,
          sup.address,
          sup.contact_name,
          sup.contact_phone,
        ]
      );
    }
    stats.pur_supplier = suppliers.length;

    const customers = [
      {
        customer_name: ts('k_gx8egb'),
        customer_code: 'C001',
        contact_name: ts('k_100yj6q'),
        contact_phone: '13800138001',
        address: ts('k_1b09ez4'),
      },
      {
        customer_name: ts('k_1xr1xyd'),
        customer_code: 'C002',
        contact_name: ts('k_yi1f90'),
        contact_phone: '13800138002',
        address: ts('k_qjzddp'),
      },
      {
        customer_name: ts('k_14c5x1i'),
        customer_code: 'C003',
        contact_name: ts('k_l4triz'),
        contact_phone: '13800138003',
        address: ts('k_1etmiz3'),
      },
      {
        customer_name: ts('k_16xfpyk'),
        customer_code: 'C004',
        contact_name: ts('k_1dfmma9'),
        contact_phone: '13800138004',
        address: ts('k_76512l'),
      },
      {
        customer_name: ts('k_17waajm'),
        customer_code: 'C005',
        contact_name: ts('k_3725lm'),
        contact_phone: '13800138005',
        address: ts('k_1e1kor7'),
      },
    ];

    for (const customer of customers) {
      await safeInsert(
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

    const [customerRows] = await conn.execute(
      'SELECT id, customer_name FROM crm_customer ORDER BY id'
    );
    const customerMap: Record<string, number> = {};
    for (const row of customerRows) {
      customerMap[row.customer_name] = row.id;
    }

    const salesOrders = [
      { customer: ts('k_gx8egb'), order_no: 'SO20250101001', amount: 50000, status: 4 },
      { customer: ts('k_1xr1xyd'), order_no: 'SO20250101002', amount: 30000, status: 3 },
      { customer: ts('k_14c5x1i'), order_no: 'SO20250101003', amount: 45000, status: 2 },
      { customer: ts('k_16xfpyk'), order_no: 'SO20250101004', amount: 28000, status: 1 },
      { customer: ts('k_17waajm'), order_no: 'SO20250101005', amount: 35000, status: 4 },
      { customer: ts('k_gx8egb'), order_no: 'SO20250102001', amount: 42000, status: 3 },
      { customer: ts('k_1xr1xyd'), order_no: 'SO20250102002', amount: 38000, status: 2 },
      { customer: ts('k_14c5x1i'), order_no: 'SO20250102003', amount: 52000, status: 1 },
      { customer: ts('k_16xfpyk'), order_no: 'SO20250102004', amount: 31000, status: 4 },
      { customer: ts('k_17waajm'), order_no: 'SO20250102005', amount: 29000, status: 3 },
    ];

    for (const order of salesOrders) {
      const customerId = customerMap[order.customer];
      await safeInsert(
        `INSERT INTO sal_order (order_no, customer_id, order_date, delivery_date, status, total_amount, create_time, update_time, deleted) 
         VALUES (?, ?, DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 30) DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), ?, ?, NOW(), NOW(), 0)`,
        [order.order_no, customerId, order.status, order.amount]
      );

      const [orderRow] = await conn.execute('SELECT id FROM sal_order WHERE order_no = ?', [
        order.order_no,
      ]);
      const orderId = orderRow[0]?.id;
      if (!orderId) continue;

      await safeInsert(
        ts('k_1yvgu6j'),
        [orderId]
      );
    }
    stats.sal_order = salesOrders.length;

    const [orderRows] = await conn.execute('SELECT id, order_no FROM sal_order ORDER BY id');
    const orderMap: Record<string, number> = {};
    for (const row of orderRows) {
      orderMap[row.order_no] = row.id;
    }

    const receivables = [
      {
        order_no: 'SO20250101001',
        customer: ts('k_gx8egb'),
        amount: 50000,
        received: 50000,
        status: 'completed',
        due_date: '2025-02-15',
      },
      {
        order_no: 'SO20250101002',
        customer: ts('k_1xr1xyd'),
        amount: 30000,
        received: 15000,
        status: 'partial',
        due_date: '2025-02-20',
      },
      {
        order_no: 'SO20250101003',
        customer: ts('k_14c5x1i'),
        amount: 45000,
        received: 0,
        status: 'pending',
        due_date: '2025-02-25',
      },
      {
        order_no: 'SO20250101004',
        customer: ts('k_16xfpyk'),
        amount: 28000,
        received: 0,
        status: 'pending',
        due_date: '2025-03-01',
      },
      {
        order_no: 'SO20250101005',
        customer: ts('k_17waajm'),
        amount: 35000,
        received: 35000,
        status: 'completed',
        due_date: '2025-02-10',
      },
      {
        order_no: 'SO20250102001',
        customer: ts('k_gx8egb'),
        amount: 42000,
        received: 20000,
        status: 'partial',
        due_date: '2025-02-18',
      },
      {
        order_no: 'SO20250102002',
        customer: ts('k_1xr1xyd'),
        amount: 38000,
        received: 0,
        status: 'pending',
        due_date: '2025-02-22',
      },
      {
        order_no: 'SO20250102003',
        customer: ts('k_14c5x1i'),
        amount: 52000,
        received: 10000,
        status: 'partial',
        due_date: '2025-02-28',
      },
      {
        order_no: 'SO20250102004',
        customer: ts('k_16xfpyk'),
        amount: 31000,
        received: 31000,
        status: 'completed',
        due_date: '2025-02-08',
      },
      {
        order_no: 'SO20250102005',
        customer: ts('k_17waajm'),
        amount: 29000,
        received: 0,
        status: 'pending',
        due_date: '2025-02-28',
      },
    ];

    const recvStatusMap: Record<string, number> = {
      pending: 1,
      partial: 2,
      completed: 3,
    };
    for (const rec of receivables) {
      const customerId = customerMap[rec.customer];
      await safeInsert(
        `INSERT INTO fin_receivable (receivable_no, source_type, source_no, customer_id, amount, received_amount, balance, due_date, status, create_time, update_time, deleted)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
        [
          'RC' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3),
          rec.order_no,
          customerId,
          rec.amount,
          rec.received,
          rec.amount - rec.received,
          rec.due_date,
          recvStatusMap[rec.status] || 1,
        ]
      );
    }
    stats.fin_receivable = receivables.length;

    const workOrders = [
      {
        work_order_no: 'WO20250101001',
        product_name: ts('k_1j0rg22'),
        quantity: 5000,
        status: 4,
      },
      { work_order_no: 'WO20250101002', product_name: ts('k_g0xpw3'), quantity: 3000, status: 3 },
      { work_order_no: 'WO20250101003', product_name: ts('k_neqfoc'), quantity: 4500, status: 2 },
      { work_order_no: 'WO20250101004', product_name: ts('k_s148jm'), quantity: 2800, status: 1 },
      { work_order_no: 'WO20250101005', product_name: ts('k_1acikks'), quantity: 3500, status: 4 },
      { work_order_no: 'WO20250102001', product_name: ts('k_14gamlb'), quantity: 4200, status: 3 },
      { work_order_no: 'WO20250102002', product_name: ts('k_1n6fwqy'), quantity: 3800, status: 2 },
      { work_order_no: 'WO20250102003', product_name: ts('k_1htbr5b'), quantity: 5200, status: 1 },
    ];

    for (const wo of workOrders) {
      await safeInsert(
        `INSERT INTO prod_work_order (work_order_no, product_name, quantity, status, create_time, update_time, deleted) 
         VALUES (?, ?, ?, ?, NOW(), NOW(), 0)`,
        [wo.work_order_no, wo.product_name, wo.quantity, wo.status]
      );
    }
    stats.prod_work_order = workOrders.length;

    const standardCards = [
      {
        card_no: 'SC20250101001',
        customer_name: ts('k_gx8egb'),
        customer_code: 'C001',
        product_name: ts('k_1o50n6w'),
        process_flow1: ts('k_vikx64'),
        process_flow2: ts('k_rxvvu2'),
        print_type: ts('k_1ktcmcy'),
        finished_size: '100x150mm',
        tolerance: '±0.5mm',
        quality_manager: ts('k_1gmpisl'),
        packing_type: ts('k_ezkby8'),
        slice_per_box: '500',
        slice_per_bundle: '50',
      },
      {
        card_no: 'SC20250101002',
        customer_name: ts('k_1xr1xyd'),
        customer_code: 'C002',
        product_name: ts('k_h2sp88'),
        process_flow1: ts('k_10kemh4'),
        process_flow2: ts('k_rxvvu2'),
        print_type: ts('k_yepr6r'),
        finished_size: '300x400mm',
        tolerance: '±0.3mm',
        quality_manager: ts('k_1gmpisl'),
        packing_type: ts('k_ezkby8'),
        slice_per_box: '100',
        slice_per_bundle: '20',
      },
      {
        card_no: 'SC20250101003',
        customer_name: ts('k_14c5x1i'),
        customer_code: 'C003',
        product_name: ts('k_r31ofv'),
        process_flow1: ts('k_1c8r30v'),
        process_flow2: ts('k_rxvvu2'),
        print_type: ts('k_1ktcmcy'),
        finished_size: '80x120mm',
        tolerance: '±0.5mm',
        quality_manager: ts('k_1gmpisl'),
        packing_type: ts('k_ezkby8'),
        slice_per_box: '800',
        slice_per_bundle: '80',
      },
      {
        card_no: 'SC20250101004',
        customer_name: ts('k_16xfpyk'),
        customer_code: 'C004',
        product_name: ts('k_3inqvn'),
        process_flow1: ts('k_1moybml'),
        process_flow2: ts('k_rxvvu2'),
        print_type: ts('k_1et3ckb'),
        finished_size: '120x180mm',
        tolerance: '±0.5mm',
        quality_manager: ts('k_1gmpisl'),
        packing_type: ts('k_ezkby8'),
        slice_per_box: '600',
        slice_per_bundle: '60',
      },
      {
        card_no: 'SC20250101005',
        customer_name: ts('k_17waajm'),
        customer_code: 'C005',
        product_name: ts('k_1c0y8gb'),
        process_flow1: ts('k_awcr80'),
        process_flow2: ts('k_rxvvu2'),
        print_type: ts('k_1ktcmcy'),
        finished_size: '90x130mm',
        tolerance: '±0.5mm',
        quality_manager: ts('k_1gmpisl'),
        packing_type: ts('k_ezkby8'),
        slice_per_box: '700',
        slice_per_bundle: '70',
      },
    ];

    for (const sc of standardCards) {
      await safeInsert(
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
        product_name: ts('k_1j0rg22'),
        material_spec: ts('k_1n5cz3l'),
        plan_qty: 5000,
        main_label_no: 'LB20250101001',
        burdening_status: 3,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101001',
        create_user_name: ts('k_9nfhqc'),
      },
      {
        card_no: 'PC20250101002',
        work_order_no: 'WO20250101002',
        product_code: '2',
        product_name: ts('k_g0xpw3'),
        material_spec: ts('k_bgsx13'),
        plan_qty: 3000,
        main_label_no: 'LB20250101002',
        burdening_status: 2,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101002',
        create_user_name: ts('k_9nfhqc'),
      },
      {
        card_no: 'PC20250101003',
        work_order_no: 'WO20250101003',
        product_code: '3',
        product_name: ts('k_neqfoc'),
        material_spec: ts('k_77v52f'),
        plan_qty: 4500,
        main_label_no: 'LB20250101003',
        burdening_status: 2,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101003',
        create_user_name: ts('k_9nfhqc'),
      },
      {
        card_no: 'PC20250101004',
        work_order_no: 'WO20250101004',
        product_code: '4',
        product_name: ts('k_s148jm'),
        material_spec: ts('k_a6akfy'),
        plan_qty: 2800,
        main_label_no: 'LB20250101004',
        burdening_status: 1,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101004',
        create_user_name: ts('k_9nfhqc'),
      },
      {
        card_no: 'PC20250101005',
        work_order_no: 'WO20250101005',
        product_code: '5',
        product_name: ts('k_1acikks'),
        material_spec: ts('k_1yngxn5'),
        plan_qty: 3500,
        main_label_no: 'LB20250101005',
        burdening_status: 3,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250101005',
        create_user_name: ts('k_9nfhqc'),
      },
      {
        card_no: 'PC20250102001',
        work_order_no: 'WO20250102001',
        product_code: '1',
        product_name: ts('k_14gamlb'),
        material_spec: ts('k_1n5cz3l'),
        plan_qty: 4200,
        main_label_no: 'LB20250102001',
        burdening_status: 2,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250102001',
        create_user_name: ts('k_9nfhqc'),
      },
      {
        card_no: 'PC20250102002',
        work_order_no: 'WO20250102002',
        product_code: '2',
        product_name: ts('k_1n6fwqy'),
        material_spec: ts('k_bgsx13'),
        plan_qty: 3800,
        main_label_no: 'LB20250102002',
        burdening_status: 2,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250102002',
        create_user_name: ts('k_9nfhqc'),
      },
      {
        card_no: 'PC20250102003',
        work_order_no: 'WO20250102003',
        product_code: '3',
        product_name: ts('k_1htbr5b'),
        material_spec: ts('k_77v52f'),
        plan_qty: 5200,
        main_label_no: 'LB20250102003',
        burdening_status: 1,
        lock_status: 0,
        qr_code: 'DCERP:PC:PC20250102003',
        create_user_name: ts('k_9nfhqc'),
      },
    ];

    for (const pc of processCards) {
      await safeInsert(
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
        product_name: ts('k_1j0rg22'),
        qualified_qty: 5000,
        defect_qty: 0,
        inspector: ts('k_1gmpisl'),
        remark: ts('k_1jjht99'),
      },
      {
        work_order_no: 'WO20250101005',
        product_name: ts('k_1acikks'),
        qualified_qty: 3500,
        defect_qty: 0,
        inspector: ts('k_1gmpisl'),
        remark: ts('k_1jjht99'),
      },
    ];

    for (const fi of finalInspections) {
      await safeInsert(
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
        supplier: ts('k_p7kvw2'),
        material: ts('k_1nvc7li'),
        quantity: 500,
        status: 'completed',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250101002',
        supplier: ts('k_1dmfh48'),
        material: ts('k_445c63'),
        quantity: 200,
        status: 'pending',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250101003',
        supplier: ts('k_1dhcm6z'),
        material: ts('k_kd0omw'),
        quantity: 1000,
        status: 'pending',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250101004',
        supplier: ts('k_sscisi'),
        material: ts('k_qa51ew'),
        quantity: 300,
        status: 'completed',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250101005',
        supplier: ts('k_p7kvw2'),
        material: ts('k_1nvc7li'),
        quantity: 400,
        status: 'pending',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250102001',
        supplier: ts('k_bmai82'),
        material: ts('k_sonvqu'),
        quantity: 50,
        status: 'completed',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250102002',
        supplier: ts('k_125crav'),
        material: ts('k_1hv9vm0'),
        quantity: 800,
        status: 'pending',
        warehouse_id: 1,
      },
      {
        order_no: 'IN20250102003',
        supplier: ts('k_p7kvw2'),
        material: ts('k_1nvc7li'),
        quantity: 600,
        status: 'pending',
        warehouse_id: 1,
      },
    ];

    for (const order of inboundOrders) {
      await safeInsert(
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

      const [orderRow] = await conn.execute('SELECT id FROM inv_inbound_order WHERE order_no = ?', [
        order.order_no,
      ]);
      const orderId = orderRow[0]?.id;
      if (!orderId) continue;

      await safeInsert(
        ts('k_9l58zs'),
        [orderId, order.material, order.quantity, order.quantity * 10]
      );
    }
    stats.inv_inbound_order = inboundOrders.length;

    const labels = [
      {
        label_no: 'LB20250101001',
        material_code: 'MAT001',
        material_name: ts('k_1nvc7li'),
        quantity: 500,
        status: 1,
      },
      {
        label_no: 'LB20250101002',
        material_code: 'MAT002',
        material_name: ts('k_445c63'),
        quantity: 200,
        status: 1,
      },
      {
        label_no: 'LB20250101003',
        material_code: 'MAT003',
        material_name: ts('k_kd0omw'),
        quantity: 1000,
        status: 1,
      },
      {
        label_no: 'LB20250101004',
        material_code: 'MAT004',
        material_name: ts('k_qa51ew'),
        quantity: 300,
        status: 1,
      },
      {
        label_no: 'LB20250101005',
        material_code: 'MAT001',
        material_name: ts('k_1nvc7li'),
        quantity: 400,
        status: 1,
      },
      {
        label_no: 'LB20250102001',
        material_code: 'MAT005',
        material_name: ts('k_sonvqu'),
        quantity: 50,
        status: 1,
      },
      {
        label_no: 'LB20250102002',
        material_code: 'MAT006',
        material_name: ts('k_1hv9vm0'),
        quantity: 800,
        status: 1,
      },
      {
        label_no: 'LB20250102003',
        material_code: 'MAT001',
        material_name: ts('k_1nvc7li'),
        quantity: 600,
        status: 2,
      },
      {
        label_no: 'LB20250102004',
        material_code: 'MAT002',
        material_name: ts('k_445c63'),
        quantity: 150,
        status: 3,
      },
      {
        label_no: 'LB20250102005',
        material_code: 'MAT003',
        material_name: ts('k_kd0omw'),
        quantity: 900,
        status: 1,
      },
    ];

    for (const label of labels) {
      await safeInsert(
        `INSERT INTO inv_material_label (label_no, material_code, material_name, quantity, status, is_main_material, is_used, is_cut, warehouse_id, create_time, update_time, deleted) 
         VALUES (?, ?, ?, ?, ?, 1, 0, 0, 1, NOW(), NOW(), 0)`,
        [label.label_no, label.material_code, label.material_name, label.quantity, label.status]
      );
    }
    stats.inv_material_label = labels.length;

    const inventories = [
      { material_name: ts('k_1nvc7li'), material_code: 'MAT001', quantity: 1500, min_quantity: 500 },
      { material_name: ts('k_445c63'), material_code: 'MAT002', quantity: 350, min_quantity: 100 },
      { material_name: ts('k_kd0omw'), material_code: 'MAT003', quantity: 1900, min_quantity: 800 },
      { material_name: ts('k_qa51ew'), material_code: 'MAT004', quantity: 300, min_quantity: 200 },
      { material_name: ts('k_sonvqu'), material_code: 'MAT005', quantity: 50, min_quantity: 30 },
      { material_name: ts('k_1hv9vm0'), material_code: 'MAT006', quantity: 800, min_quantity: 500 },
    ];

    const matMap: Record<string, number> = {};
    try {
      const [matRows] = await conn.execute(
        'SELECT id, material_code FROM inv_material WHERE deleted = 0 LIMIT 20'
      );
      for (const row of matRows) {
        matMap[row.material_code] = row.id;
      }
    } catch (_e) {}

    for (const inv of inventories) {
      const materialId = matMap[inv.material_code] || 1;
      await safeInsert(
        ts('k_dtpbge'),
        [materialId, inv.material_name, inv.quantity, inv.quantity, inv.min_quantity]
      );
    }
    stats.inv_inventory = inventories.length;

    const inspections = [
      {
        inspection_no: 'QC20250101001',
        inspection_type: 1,
        inspection_result: 1,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250101002',
        inspection_type: 2,
        inspection_result: 1,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250101003',
        inspection_type: 3,
        inspection_result: 2,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250101004',
        inspection_type: 1,
        inspection_result: 1,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250101005',
        inspection_type: 2,
        inspection_result: 1,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250102001',
        inspection_type: 3,
        inspection_result: 1,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250102002',
        inspection_type: 1,
        inspection_result: 1,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250102003',
        inspection_type: 2,
        inspection_result: 2,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250102004',
        inspection_type: 3,
        inspection_result: 1,
        inspector: ts('k_1gmpisl'),
      },
      {
        inspection_no: 'QC20250102005',
        inspection_type: 1,
        inspection_result: 1,
        inspector: ts('k_1gmpisl'),
      },
    ];

    for (const inspection of inspections) {
      await safeInsert(
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

    // ===== BOM 种子数据 =====
    const boms = [
      {
        bom_name: ts('k_p2bmgf'),
        product_id: 1,
        total_cost: 0.85,
        remark: ts('k_11z56ke'),
      },
      {
        bom_name: ts('k_suxglb'),
        product_id: 2,
        total_cost: 1.2,
        remark: ts('k_1ckrg0v'),
      },
      { bom_name: ts('k_1umdu34'), product_id: 3, total_cost: 0.65, remark: ts('k_v3dnao') },
      { bom_name: ts('k_1yvrt5k'), product_id: 4, total_cost: 0.95, remark: ts('k_1lk51sm') },
      {
        bom_name: ts('k_17m5rts'),
        product_id: 5,
        total_cost: 0.75,
        remark: ts('k_kvf3pc'),
      },
    ];
    const [matRows2] = await conn.execute(
      'SELECT id, material_name FROM inv_material WHERE deleted = 0 ORDER BY id LIMIT 5'
    );
    const matList: Array<{ id: number; material_name: string }> = matRows2;
    for (const bom of boms) {
      await safeInsert(
        `INSERT INTO prd_bom (bom_name, product_id, version, total_cost, status, remark, create_time, update_time, deleted) VALUES (?, ?, '1.0', ?, 1, ?, NOW(), NOW(), 0)`,
        [bom.bom_name, bom.product_id, bom.total_cost, bom.remark]
      );
      const [bomRow] = await conn.execute('SELECT id FROM prd_bom WHERE bom_name = ?', [
        bom.bom_name,
      ]);
      const bomId = bomRow[0]?.id;
      if (!bomId) continue;
      // 为每个 BOM 添加明细：取前 3 个物料作为组成
      for (let i = 0; i < Math.min(3, matList.length); i++) {
        const mat = matList[i];
        await safeInsert(
          ts('k_1hfeni2'),
          [bomId, mat.id, mat.material_name, 100 + i * 50]
        );
      }
    }
    stats.prd_bom = boms.length;

    return stats;
  });

  return successResponse(result, ts('k_hgxj2u'));
});
