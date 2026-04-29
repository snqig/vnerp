import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const truncateTables = [
      'fin_payment_record', 'fin_receipt_record', 'fin_payable', 'fin_receivable',
      'qc_unqualified', 'qc_inspection',
      'prd_work_report', 'prod_work_order_item', 'prod_work_order',
      'prd_bom_detail', 'prd_bom',
      'sal_reconciliation_detail', 'sal_reconciliation',
      'sal_return_order_item', 'sal_return_order',
      'sal_delivery_order_item', 'sal_delivery_order',
      'inv_inventory_transaction',
      'inv_outbound_item', 'inv_outbound_order',
      'inv_inventory_log', 'inv_inventory_batch', 'inv_inventory',
      'inv_inbound_item', 'inv_inbound_order',
      'sal_order_detail', 'sal_order',
      'sal_sample_order',
      'pur_receipt_detail', 'pur_receipt',
      'pur_purchase_order_line', 'pur_purchase_order',
      'pur_order_detail', 'pur_order',
      'pur_request_detail', 'pur_request',
      'prd_process_route_step', 'prd_process_route',
      'prd_die_template',
      'eqp_maintenance_record', 'eqp_maintenance_plan', 'eqp_equipment',
      'inv_material',
      'pur_supplier',
      'crm_customer_contact', 'crm_customer',
      'inv_warehouse', 'inv_location',
      'inv_material_label', 'inv_cutting_record', 'inv_cutting_detail',
      'prd_process_card', 'prd_process_card_material',
      'inv_trace_record', 'inv_trace_detail', 'inv_scan_log',
      'ink_opening_record',
    ];

    for (const table of truncateTables) {
      try {
        await conn.execute(`DELETE FROM ${table}`);
        await conn.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (e: any) {}
    }

    const warehouses = [
      { code: 'WH001', name: '原材料仓', type: 1, address: 'A栋1楼' },
      { code: 'WH002', name: '半成品仓', type: 2, address: 'A栋2楼' },
      { code: 'WH003', name: '成品仓', type: 3, address: 'B栋1楼' },
      { code: 'WH004', name: '油墨辅料仓', type: 4, address: 'A栋3楼' },
    ];
    for (const wh of warehouses) {
      await conn.execute(`INSERT INTO inv_warehouse (warehouse_code, warehouse_name, warehouse_type, address, status) VALUES (?, ?, ?, ?, 1)`, [wh.code, wh.name, wh.type, wh.address]);
    }
    stats.warehouses = warehouses.length;

    const suppliers = [
      { code: 'SUP001', name: '东莞PET薄膜有限公司', type: 1, contact: '李经理', phone: '0769-22223333', settlement: '月结30天' },
      { code: 'SUP002', name: '深圳特种油墨科技有限公司', type: 2, contact: '王总', phone: '0755-88889999', settlement: '月结60天' },
      { code: 'SUP003', name: '广州不干胶材料厂', type: 1, contact: '张经理', phone: '020-33334444', settlement: '货到付款' },
      { code: 'SUP004', name: '浙江PVC材料有限公司', type: 1, contact: '陈工', phone: '0571-66667777', settlement: '月结45天' },
      { code: 'SUP005', name: '上海感光材料科技有限公司', type: 2, contact: '黄经理', phone: '021-11112222', settlement: '月结30天' },
    ];
    for (const s of suppliers) {
      await conn.execute(`INSERT INTO pur_supplier (supplier_code, supplier_name, supplier_type, contact_name, contact_phone, payment_terms, status) VALUES (?, ?, ?, ?, ?, ?, 1)`, [s.code, s.name, s.type, s.contact, s.phone, s.settlement]);
    }
    stats.suppliers = suppliers.length;

    const customers = [
      { code: 'CUS001', name: '美的集团', type: 1, contact: '赵采购', phone: '0757-88880001', industry: '家电' },
      { code: 'CUS002', name: '格力电器', type: 1, contact: '钱经理', phone: '0756-88880002', industry: '家电' },
      { code: 'CUS003', name: '华为技术', type: 1, contact: '孙主管', phone: '0755-88880003', industry: '电子' },
      { code: 'CUS004', name: '比亚迪股份', type: 1, contact: '李采购', phone: '0755-88880004', industry: '新能源' },
      { code: 'CUS005', name: '迈瑞医疗', type: 1, contact: '周经理', phone: '0755-88880005', industry: '医疗' },
      { code: 'CUS006', name: '小米科技', type: 1, contact: '吴主管', phone: '010-88880006', industry: '电子' },
      { code: 'CUS007', name: '海尔集团', type: 1, contact: '郑采购', phone: '0532-88880007', industry: '家电' },
      { code: 'CUS008', name: '大疆创新', type: 1, contact: '冯经理', phone: '0755-88880008', industry: '电子' },
      { code: 'CUS009', name: '宁德时代', type: 1, contact: '陈主管', phone: '0593-88880009', industry: '新能源' },
      { code: 'CUS010', name: '联想集团', type: 1, contact: '褚经理', phone: '010-88880010', industry: '电子' },
    ];
    for (const c of customers) {
      await conn.execute(`INSERT INTO crm_customer (customer_code, customer_name, customer_type, contact_name, contact_phone, industry, status) VALUES (?, ?, ?, ?, ?, ?, 1)`, [c.code, c.name, c.type, c.contact, c.phone, c.industry]);
    }
    stats.customers = customers.length;

    const materials = [
      { code: 'MAT001', name: 'PET薄膜透明125μm', spec: '1000×1200mm', type: 1, unit: '张', cat: 1, pp: 8.50, sp: 12.00 },
      { code: 'MAT002', name: 'PET薄膜白色188μm', spec: '1000×1200mm', type: 1, unit: '张', cat: 1, pp: 12.00, sp: 18.00 },
      { code: 'MAT003', name: 'PVC薄膜透明0.15mm', spec: '920×1100mm', type: 1, unit: '张', cat: 1, pp: 6.50, sp: 10.00 },
      { code: 'MAT004', name: '不干胶PET银色', spec: '600mm×200m', type: 1, unit: '卷', cat: 1, pp: 85.00, sp: 120.00 },
      { code: 'MAT005', name: '不干胶PVC白色', spec: '600mm×200m', type: 1, unit: '卷', cat: 1, pp: 65.00, sp: 95.00 },
      { code: 'MAT006', name: '丝印油墨-黑色', spec: '溶剂型/SK-1000', type: 4, unit: 'kg', cat: 2, pp: 85.00, sp: 120.00 },
      { code: 'MAT007', name: '丝印油墨-白色', spec: 'UV型/SK-2000', type: 4, unit: 'kg', cat: 2, pp: 95.00, sp: 135.00 },
      { code: 'MAT008', name: '导电银浆', spec: 'AG-500', type: 4, unit: 'kg', cat: 2, pp: 850.00, sp: 1200.00 },
      { code: 'MAT009', name: 'UV光油', spec: 'UV-500透明', type: 4, unit: 'kg', cat: 2, pp: 120.00, sp: 168.00 },
      { code: 'MAT010', name: '网版感光胶', spec: 'SP-200', type: 4, unit: 'kg', cat: 2, pp: 180.00, sp: 250.00 },
      { code: 'MAT011', name: '空调控制面板标签', spec: '120×80mm', type: 3, unit: '张', cat: 4, pp: 0.80, sp: 2.50 },
      { code: 'MAT012', name: '洗衣机控制面板', spec: '180×100mm', type: 3, unit: '张', cat: 4, pp: 1.20, sp: 3.80 },
      { code: 'MAT013', name: '手机电池标签', spec: '50×30mm', type: 3, unit: '张', cat: 4, pp: 0.15, sp: 0.45 },
      { code: 'MAT014', name: '新能源电池标签', spec: '150×80mm', type: 3, unit: '张', cat: 4, pp: 2.50, sp: 5.50 },
      { code: 'MAT015', name: '医疗设备面板', spec: '200×150mm', type: 3, unit: '张', cat: 4, pp: 3.50, sp: 7.80 },
      { code: 'MAT016', name: '工业设备铭牌', spec: '100×60mm', type: 3, unit: '张', cat: 4, pp: 0.45, sp: 1.35 },
      { code: 'MAT017', name: '电子元器件标签', spec: '40×20mm', type: 3, unit: '张', cat: 4, pp: 0.08, sp: 0.25 },
      { code: 'MAT018', name: '电池防伪标签', spec: '80×50mm', type: 3, unit: '张', cat: 4, pp: 0.35, sp: 0.95 },
      { code: 'MAT019', name: '汽车仪表盘面板', spec: '250×120mm', type: 3, unit: '张', cat: 4, pp: 2.80, sp: 6.50 },
      { code: 'MAT020', name: '智能家居面板', spec: '150×100mm', type: 3, unit: '张', cat: 4, pp: 1.50, sp: 3.20 },
    ];
    for (const m of materials) {
      await conn.execute(`INSERT INTO inv_material (material_code, material_name, specification, material_type, unit, category_id, purchase_price, sale_price, safety_stock, is_batch_managed, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100, 1, 1)`, [m.code, m.name, m.spec, m.type, m.unit, m.cat, m.pp, m.sp]);
    }
    stats.materials = materials.length;

    const equipmentList = [
      { code: 'EQP001', name: '全自动丝印机', type: 1, brand: '东远', model: 'DY-600S', loc: '丝印车间A1', cap: 8000, oee: 85.5 },
      { code: 'EQP002', name: '半自动丝印机', type: 1, brand: '东远', model: 'DY-300S', loc: '丝印车间A2', cap: 4000, oee: 78.6 },
      { code: 'EQP003', name: '精密丝印机', type: 1, brand: '东远', model: 'DY-200P', loc: '精密丝印车间A3', cap: 2000, oee: 82.3 },
      { code: 'EQP004', name: 'UV晒版机', type: 5, brand: '大明', model: 'DM-UV800', loc: '晒版车间B1', cap: 50, oee: 90.0 },
      { code: 'EQP005', name: '隧道式烘干线', type: 5, brand: '华力', model: 'HL-IR3000', loc: '烘干车间C1', cap: 12000, oee: 88.1 },
      { code: 'EQP006', name: 'IR红外烘干炉', type: 5, brand: '华力', model: 'HL-IR1500', loc: '烘干车间C2', cap: 8000, oee: 80.4 },
      { code: 'EQP007', name: '全自动模切机', type: 3, brand: '旭恒', model: 'XH-1050MQ', loc: '模切车间D1', cap: 9000, oee: 86.7 },
      { code: 'EQP008', name: '半自动模切机', type: 3, brand: '旭恒', model: 'XH-700MQ', loc: '模切车间D2', cap: 5000, oee: 79.3 },
      { code: 'EQP009', name: '张力测试仪', type: 4, brand: '新月', model: 'XY-T200', loc: '质检车间E1', cap: 500, oee: 95.0 },
      { code: 'EQP010', name: '视觉全检机', type: 4, brand: '创科', model: 'CK-V1000', loc: '质检车间E2', cap: 20000, oee: 92.0 },
    ];
    for (const eq of equipmentList) {
      await conn.execute(`INSERT INTO eqp_equipment (equipment_code, equipment_name, equipment_type, brand, model, location, rated_capacity, oee, availability, performance, quality_rate, current_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`, [eq.code, eq.name, eq.type, eq.brand, eq.model, eq.loc, eq.cap, eq.oee, Math.round(eq.oee * 0.95 * 10) / 10, Math.round(eq.oee * 0.97 * 10) / 10, Math.round(eq.oee * 1.02 * 10) / 10]);
    }
    stats.equipment = equipmentList.length;

    const dieTemplates = [
      { code: 'DT001', name: '空调面板丝网版', type: 2, spec: '120×80mm', max: 50000, cur: 12000 },
      { code: 'DT002', name: '洗衣机面板丝网版', type: 2, spec: '180×100mm', max: 40000, cur: 8000 },
      { code: 'DT003', name: '手机电池标签丝网版', type: 2, spec: '50×30mm', max: 100000, cur: 35000 },
      { code: 'DT004', name: '电池标签丝网版(导电银浆)', type: 2, spec: '150×80mm', max: 60000, cur: 15000 },
      { code: 'DT005', name: '医疗面板丝网版', type: 2, spec: '200×150mm', max: 30000, cur: 5000 },
      { code: 'DT006', name: '工业铭牌丝网版', type: 2, spec: '100×60mm', max: 80000, cur: 20000 },
      { code: 'DT007', name: '元器件标签丝网版', type: 2, spec: '40×20mm', max: 120000, cur: 40000 },
      { code: 'DT008', name: '防伪标签模切刀版', type: 1, spec: '80×50mm', max: 80000, cur: 18000 },
      { code: 'DT009', name: '仪表盘面板丝网版', type: 2, spec: '250×120mm', max: 30000, cur: 3000 },
      { code: 'DT010', name: '智能面板模切刀版', type: 1, spec: '150×100mm', max: 50000, cur: 10000 },
    ];
    for (const dt of dieTemplates) {
      await conn.execute(`INSERT INTO prd_die_template (template_code, template_name, template_type, specification, max_usage, current_usage, remaining_usage, warning_usage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`, [dt.code, dt.name, dt.type, dt.spec, dt.max, dt.cur, dt.max - dt.cur, Math.round(dt.max * 0.2)]);
    }
    stats.dieTemplates = dieTemplates.length;

    const processRoutes = [
      { code: 'PR001', name: '丝印面板标准工艺', pid: 11, steps: [
        { s: 1, n: '晒版', t: 6, st: 15, su: 30, fp: 1 },
        { s: 2, n: '调墨', t: 6, st: 10, su: 15, fp: 0 },
        { s: 3, n: '丝印印刷', t: 1, st: 20, su: 30, fp: 1 },
        { s: 4, n: '烘干', t: 6, st: 8, su: 10, fp: 0 },
        { s: 5, n: '模切', t: 3, st: 10, su: 20, fp: 0 },
        { s: 6, n: '全检', t: 4, st: 5, su: 5, fp: 0 },
      ]},
      { code: 'PR002', name: '丝印标签标准工艺', pid: 13, steps: [
        { s: 1, n: '晒版', t: 6, st: 12, su: 25, fp: 1 },
        { s: 2, n: '调墨', t: 6, st: 8, su: 12, fp: 0 },
        { s: 3, n: '丝印印刷', t: 1, st: 15, su: 25, fp: 1 },
        { s: 4, n: '烘干', t: 6, st: 6, su: 8, fp: 0 },
        { s: 5, n: '全检', t: 4, st: 4, su: 5, fp: 0 },
      ]},
      { code: 'PR003', name: '导电银浆丝印工艺', pid: 14, steps: [
        { s: 1, n: '晒版', t: 6, st: 15, su: 30, fp: 1 },
        { s: 2, n: '调墨(银浆)', t: 6, st: 12, su: 20, fp: 1 },
        { s: 3, n: '丝印(导电线路)', t: 1, st: 18, su: 30, fp: 1 },
        { s: 4, n: '烘干', t: 6, st: 10, su: 12, fp: 0 },
        { s: 5, n: '丝印(绝缘层)', t: 1, st: 15, su: 20, fp: 0 },
        { s: 6, n: '烘干', t: 6, st: 10, su: 12, fp: 0 },
        { s: 7, n: '全检', t: 4, st: 6, su: 8, fp: 0 },
      ]},
      { code: 'PR004', name: '双色丝印工艺', pid: 12, steps: [
        { s: 1, n: '晒版', t: 6, st: 15, su: 30, fp: 1 },
        { s: 2, n: '调墨', t: 6, st: 10, su: 15, fp: 0 },
        { s: 3, n: '丝印(一色)', t: 1, st: 15, su: 25, fp: 1 },
        { s: 4, n: '烘干', t: 6, st: 8, su: 10, fp: 0 },
        { s: 5, n: '丝印(二色)', t: 1, st: 15, su: 25, fp: 0 },
        { s: 6, n: '烘干', t: 6, st: 8, su: 10, fp: 0 },
        { s: 7, n: '模切', t: 3, st: 8, su: 15, fp: 0 },
        { s: 8, n: '全检', t: 4, st: 5, su: 5, fp: 0 },
      ]},
      { code: 'PR005', name: '丝印铭牌标准工艺', pid: 16, steps: [
        { s: 1, n: '晒版', t: 6, st: 12, su: 25, fp: 1 },
        { s: 2, n: '调墨', t: 6, st: 8, su: 12, fp: 0 },
        { s: 3, n: '丝印印刷', t: 1, st: 12, su: 20, fp: 1 },
        { s: 4, n: '烘干', t: 6, st: 6, su: 8, fp: 0 },
        { s: 5, n: '模切', t: 3, st: 6, su: 12, fp: 0 },
        { s: 6, n: '全检', t: 4, st: 3, su: 5, fp: 0 },
      ]},
    ];
    for (const pr of processRoutes) {
      await conn.execute(`INSERT INTO prd_process_route (route_code, route_name, product_id, version, is_default, status) VALUES (?, ?, ?, '1.0', 1, 1)`, [pr.code, pr.name, pr.pid]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const routeId = rows[0].id;
      for (const step of pr.steps) {
        await conn.execute(`INSERT INTO prd_process_route_step (route_id, step_seq, step_name, step_type, standard_time, setup_time, is_key_process, is_first_piece_required, quality_check) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [routeId, step.s, step.n, step.t, step.st, step.su, step.fp ? 1 : 0, step.fp, step.fp ? 1 : 0]);
      }
    }
    stats.processRoutes = processRoutes.length;

    const salesOrders = [
      { no: 'SO20260401001', cid: 1, date: '2026-04-01', delivery: '2026-04-15', items: [{ mid: 11, qty: 50000, price: 2.50 }] },
      { no: 'SO20260401002', cid: 2, date: '2026-04-01', delivery: '2026-04-18', items: [{ mid: 12, qty: 30000, price: 3.80 }] },
      { no: 'SO20260402003', cid: 3, date: '2026-04-02', delivery: '2026-04-20', items: [{ mid: 13, qty: 200000, price: 0.45 }] },
      { no: 'SO20260402004', cid: 4, date: '2026-04-02', delivery: '2026-04-22', items: [{ mid: 14, qty: 80000, price: 5.50 }] },
      { no: 'SO20260403005', cid: 5, date: '2026-04-03', delivery: '2026-04-16', items: [{ mid: 15, qty: 20000, price: 7.80 }] },
      { no: 'SO20260403006', cid: 6, date: '2026-04-03', delivery: '2026-04-17', items: [{ mid: 16, qty: 100000, price: 1.35 }] },
      { no: 'SO20260404007', cid: 7, date: '2026-04-04', delivery: '2026-04-19', items: [{ mid: 17, qty: 300000, price: 0.25 }] },
      { no: 'SO20260405008', cid: 8, date: '2026-04-05', delivery: '2026-04-25', items: [{ mid: 18, qty: 150000, price: 0.95 }] },
      { no: 'SO20260406009', cid: 9, date: '2026-04-06', delivery: '2026-04-20', items: [{ mid: 19, qty: 40000, price: 6.50 }] },
      { no: 'SO20260407010', cid: 10, date: '2026-04-07', delivery: '2026-04-28', items: [{ mid: 20, qty: 60000, price: 3.20 }] },
    ];
    const saleOrderIds: number[] = [];
    for (const order of salesOrders) {
      let totalAmount = 0;
      for (const item of order.items) totalAmount += item.qty * item.price;
      await conn.execute(`INSERT INTO sal_order (order_no, order_date, customer_id, total_amount, total_with_tax, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, 2)`, [order.no, order.date, order.cid, totalAmount, Math.round(totalAmount * 1.13 * 100) / 100, order.delivery]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const orderId = rows[0].id;
      saleOrderIds.push(orderId);
      for (const item of order.items) {
        const amount = item.qty * item.price;
        await conn.execute(`INSERT INTO sal_order_detail (order_id, material_id, quantity, unit_price, amount, total_amount, delivered_qty) VALUES (?, ?, ?, ?, ?, ?, 0)`, [orderId, item.mid, item.qty, item.price, amount, Math.round(amount * 1.13 * 100) / 100]);
        const [matRows]: any = await conn.execute(`SELECT material_name, unit FROM inv_material WHERE id = ?`, [item.mid]);
        const mat = matRows[0];
        await conn.execute(`INSERT INTO sal_order_item (order_id, material_name, quantity, unit, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`, [orderId, mat?.material_name || '', item.qty, mat?.unit || '个', item.price, amount]);
      }
    }
    stats.salesOrders = salesOrders.length;

    const bomList = [
      { name: '空调面板标签BOM', pid: 11, items: [{ mid: 1, qty: 55000, unit: '张', loss: 10 }, { mid: 6, qty: 5, unit: 'kg', loss: 0 }, { mid: 10, qty: 0.5, unit: 'kg', loss: 0 }] },
      { name: '洗衣机面板BOM', pid: 12, items: [{ mid: 2, qty: 33000, unit: '张', loss: 10 }, { mid: 7, qty: 4, unit: 'kg', loss: 0 }, { mid: 10, qty: 0.5, unit: 'kg', loss: 0 }] },
      { name: '手机电池标签BOM', pid: 13, items: [{ mid: 3, qty: 220000, unit: '张', loss: 10 }, { mid: 8, qty: 0.5, unit: 'kg', loss: 0 }, { mid: 6, qty: 3, unit: 'kg', loss: 0 }] },
      { name: '新能源电池标签BOM', pid: 14, items: [{ mid: 3, qty: 88000, unit: '张', loss: 10 }, { mid: 8, qty: 1, unit: 'kg', loss: 0 }, { mid: 9, qty: 2, unit: 'kg', loss: 0 }] },
      { name: '医疗设备面板BOM', pid: 15, items: [{ mid: 1, qty: 22000, unit: '张', loss: 10 }, { mid: 7, qty: 3, unit: 'kg', loss: 0 }, { mid: 9, qty: 2, unit: 'kg', loss: 0 }] },
      { name: '工业铭牌BOM', pid: 16, items: [{ mid: 1, qty: 110000, unit: '张', loss: 10 }, { mid: 6, qty: 8, unit: 'kg', loss: 0 }, { mid: 10, qty: 0.5, unit: 'kg', loss: 0 }] },
      { name: '元器件标签BOM', pid: 17, items: [{ mid: 5, qty: 310, unit: '卷', loss: 5 }, { mid: 6, qty: 6, unit: 'kg', loss: 0 }, { mid: 9, qty: 3, unit: 'kg', loss: 0 }] },
      { name: '电池防伪标签BOM', pid: 18, items: [{ mid: 4, qty: 165, unit: '卷', loss: 5 }, { mid: 7, qty: 4, unit: 'kg', loss: 0 }, { mid: 9, qty: 2, unit: 'kg', loss: 0 }] },
      { name: '汽车仪表盘面板BOM', pid: 19, items: [{ mid: 2, qty: 44000, unit: '张', loss: 10 }, { mid: 7, qty: 5, unit: 'kg', loss: 0 }, { mid: 8, qty: 0.8, unit: 'kg', loss: 0 }] },
      { name: '智能家居面板BOM', pid: 20, items: [{ mid: 2, qty: 66000, unit: '张', loss: 10 }, { mid: 6, qty: 4, unit: 'kg', loss: 0 }, { mid: 9, qty: 2, unit: 'kg', loss: 0 }] },
    ];
    const bomIds: number[] = [];
    for (const bom of bomList) {
      let totalCost = 0;
      for (const item of bom.items) {
        const [matRows]: any = await conn.execute(`SELECT purchase_price FROM inv_material WHERE id = ?`, [item.mid]);
        totalCost += item.qty * (matRows[0]?.purchase_price || 0);
      }
      await conn.execute(`INSERT INTO prd_bom (bom_name, product_id, version, total_cost, status, create_time) VALUES (?, ?, '1.0', ?, 1, NOW())`, [bom.name, bom.pid, Math.round(totalCost * 100) / 100]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const bomId = rows[0].id;
      bomIds.push(bomId);
      for (const item of bom.items) {
        const [matRows]: any = await conn.execute(`SELECT material_name, purchase_price, unit FROM inv_material WHERE id = ?`, [item.mid]);
        const mat = matRows[0];
        await conn.execute(`INSERT INTO prd_bom_detail (bom_id, material_id, material_name, quantity, unit, loss_rate, unit_cost, total_cost, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`, [bomId, item.mid, mat?.material_name || '', item.qty, item.unit || mat?.unit, item.loss, mat?.purchase_price || 0, item.qty * (mat?.purchase_price || 0)]);
      }
    }
    stats.boms = bomList.length;

    const purchaseOrders = [
      { no: 'PO20260401001', sid: 1, sname: '东莞PET薄膜有限公司', date: '2026-04-01', delivery: '2026-04-08', items: [{ mid: 1, mcode: 'MAT001', mname: 'PET薄膜透明125μm', mspec: '1000×1200mm', qty: 500000, price: 8.50, unit: '张' }, { mid: 2, mcode: 'MAT002', mname: 'PET薄膜白色188μm', mspec: '1000×1200mm', qty: 200000, price: 12.00, unit: '张' }] },
      { no: 'PO20260401002', sid: 2, sname: '深圳特种油墨科技有限公司', date: '2026-04-01', delivery: '2026-04-10', items: [{ mid: 6, mcode: 'MAT006', mname: '丝印油墨-黑色', mspec: '溶剂型/SK-1000', qty: 100, price: 85.00, unit: 'kg' }, { mid: 7, mcode: 'MAT007', mname: '丝印油墨-白色', mspec: 'UV型/SK-2000', qty: 80, price: 95.00, unit: 'kg' }, { mid: 8, mcode: 'MAT008', mname: '导电银浆', mspec: 'AG-500', qty: 10, price: 850.00, unit: 'kg' }] },
      { no: 'PO20260402003', sid: 3, sname: '广州不干胶材料厂', date: '2026-04-02', delivery: '2026-04-09', items: [{ mid: 4, mcode: 'MAT004', mname: '不干胶PET银色', mspec: '600mm×200m', qty: 300, price: 85.00, unit: '卷' }, { mid: 5, mcode: 'MAT005', mname: '不干胶PVC白色', mspec: '600mm×200m', qty: 500, price: 65.00, unit: '卷' }] },
      { no: 'PO20260403004', sid: 4, sname: '浙江PVC材料有限公司', date: '2026-04-03', delivery: '2026-04-15', items: [{ mid: 3, mcode: 'MAT003', mname: 'PVC薄膜透明0.15mm', mspec: '920×1100mm', qty: 400000, price: 6.50, unit: '张' }] },
      { no: 'PO20260404005', sid: 5, sname: '上海感光材料科技有限公司', date: '2026-04-04', delivery: '2026-04-12', items: [{ mid: 9, mcode: 'MAT009', mname: 'UV光油', mspec: 'UV-500透明', qty: 50, price: 120.00, unit: 'kg' }, { mid: 10, mcode: 'MAT010', mname: '网版感光胶', mspec: 'SP-200', qty: 20, price: 180.00, unit: 'kg' }] },
    ];
    for (const po of purchaseOrders) {
      let totalAmount = 0;
      let totalQty = 0;
      for (const item of po.items) { totalAmount += item.qty * item.price; totalQty += item.qty; }
      const taxAmount = Math.round(totalAmount * 0.13 * 100) / 100;
      const grandTotal = Math.round(totalAmount * 1.13 * 100) / 100;
      await conn.execute(`INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, order_date, delivery_date, total_amount, total_quantity, tax_rate, tax_amount, grand_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, 13.00, ?, ?, 30)`, 
        [po.no, po.sid, po.sname, po.date, po.delivery, totalAmount, totalQty, taxAmount, grandTotal]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const poId = rows[0].id;
      for (let i = 0; i < po.items.length; i++) {
        const item = po.items[i];
        const amount = item.qty * item.price;
        const lineTax = Math.round(amount * 0.13 * 100) / 100;
        const lineTotal = Math.round(amount * 1.13 * 100) / 100;
        await conn.execute(`INSERT INTO pur_purchase_order_line (po_id, line_no, material_id, material_code, material_name, material_spec, unit, order_qty, unit_price, amount, tax_rate, tax_amount, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 13.00, ?, ?)`, 
          [poId, i + 1, item.mid, item.mcode, item.mname, item.mspec, item.unit, item.qty, item.price, amount, lineTax, lineTotal]);
      }
    }
    stats.purchaseOrders = purchaseOrders.length;

    const inboundOrders = [
      { no: 'IN20260408001', supplier: '东莞PET薄膜有限公司', date: '2026-04-08', wh: 1, poId: 1, poNo: 'PO20260401001', items: [{ mid: 1, name: 'PET薄膜透明125μm', spec: '1000×1200mm', qty: 500000, unit: '张', price: 8.50, batch: 'B20260408A' }] },
      { no: 'IN20260409002', supplier: '深圳特种油墨科技有限公司', date: '2026-04-09', wh: 4, poId: 2, poNo: 'PO20260401002', items: [{ mid: 6, name: '丝印油墨-黑色', spec: '溶剂型/SK-1000', qty: 100, unit: 'kg', price: 85.00, batch: 'B20260409A' }, { mid: 8, name: '导电银浆', spec: 'AG-500', qty: 10, unit: 'kg', price: 850.00, batch: 'B20260409B' }] },
      { no: 'IN20260409003', supplier: '广州不干胶材料厂', date: '2026-04-09', wh: 4, poId: 3, poNo: 'PO20260402003', items: [{ mid: 4, name: '不干胶PET银色', spec: '600mm×200m', qty: 300, unit: '卷', price: 85.00, batch: 'B20260409C' }] },
      { no: 'IN20260415004', supplier: '浙江PVC材料有限公司', date: '2026-04-15', wh: 1, poId: 4, poNo: 'PO20260403004', items: [{ mid: 3, name: 'PVC薄膜透明0.15mm', spec: '920×1100mm', qty: 400000, unit: '张', price: 6.50, batch: 'B20260415A' }] },
      { no: 'IN20260412005', supplier: '上海感光材料科技有限公司', date: '2026-04-12', wh: 4, poId: 5, poNo: 'PO20260404005', items: [{ mid: 9, name: 'UV光油', spec: 'UV-500透明', qty: 50, unit: 'kg', price: 120.00, batch: 'B20260412A' }, { mid: 10, name: '网版感光胶', spec: 'SP-200', qty: 20, unit: 'kg', price: 180.00, batch: 'B20260412B' }] },
    ];
    for (const io of inboundOrders) {
      let totalQty = 0;
      let totalAmt = 0;
      for (const item of io.items) { totalQty += item.qty; totalAmt += item.qty * item.price; }
      await conn.execute(`INSERT INTO inv_inbound_order (order_no, supplier_name, inbound_date, warehouse_id, po_id, po_no, grn_type, total_quantity, total_amount, status, remark) VALUES (?, ?, ?, ?, ?, ?, 'po', ?, ?, 'approved', '采购入库')`, [io.no, io.supplier, io.date, io.wh, io.poId, io.poNo, totalQty, totalAmt]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const orderId = rows[0].id;
      for (const item of io.items) {
        await conn.execute(`INSERT INTO inv_inbound_item (order_id, material_id, material_name, material_spec, quantity, unit, unit_price, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [orderId, item.mid, item.name, item.spec, item.qty, item.unit, item.price, item.batch]);
      }
    }
    stats.inboundOrders = inboundOrders.length;

    const inventoryData = [
      { mid: 1, name: 'PET薄膜透明125μm', wh: 1, whname: '原材料仓', qty: 412000, cost: 8.50, unit: '张' },
      { mid: 2, name: 'PET薄膜白色188μm', wh: 1, whname: '原材料仓', qty: 200000, cost: 12.00, unit: '张' },
      { mid: 3, name: 'PVC薄膜透明0.15mm', wh: 1, whname: '原材料仓', qty: 380000, cost: 6.50, unit: '张' },
      { mid: 4, name: '不干胶PET银色', wh: 4, whname: '油墨辅料仓', qty: 280, cost: 85.00, unit: '卷' },
      { mid: 5, name: '不干胶PVC白色', wh: 4, whname: '油墨辅料仓', qty: 450, cost: 65.00, unit: '卷' },
      { mid: 6, name: '丝印油墨-黑色', wh: 4, whname: '油墨辅料仓', qty: 92, cost: 85.00, unit: 'kg' },
      { mid: 7, name: '丝印油墨-白色', wh: 4, whname: '油墨辅料仓', qty: 68, cost: 95.00, unit: 'kg' },
      { mid: 8, name: '导电银浆', wh: 4, whname: '油墨辅料仓', qty: 8, cost: 850.00, unit: 'kg' },
      { mid: 9, name: 'UV光油', wh: 4, whname: '油墨辅料仓', qty: 38, cost: 120.00, unit: 'kg' },
      { mid: 10, name: '网版感光胶', wh: 4, whname: '油墨辅料仓', qty: 15, cost: 180.00, unit: 'kg' },
    ];
    for (const inv of inventoryData) {
      await conn.execute(`INSERT INTO inv_inventory (material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_cost, total_cost, safety_stock, version) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 100, 1)`, 
        [inv.mid, inv.name, inv.wh, inv.whname, inv.qty, inv.qty, inv.unit, inv.cost, inv.qty * inv.cost]);
    }
    stats.inventory = inventoryData.length;

    for (const inv of inventoryData) {
      const batchNo = `B${String(inv.mid).padStart(6, '0')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
      await conn.execute(`INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, version) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURDATE(), 'normal', 1)`, 
        [batchNo, inv.mid, inv.name, inv.wh, inv.whname, inv.qty, inv.qty, inv.unit, inv.cost]);
    }
    stats.inventoryBatch = inventoryData.length;

    const workOrders = [
      { no: 'WO20260401001', soi: 0, bi: 0, pname: '空调控制面板标签', qty: 50000, unit: '张', status: 'completed', psd: '2026-04-02', ped: '2026-04-14', asd: '2026-04-02', aed: '2026-04-13' },
      { no: 'WO20260401002', soi: 1, bi: 1, pname: '洗衣机控制面板', qty: 30000, unit: '张', status: 'completed', psd: '2026-04-02', ped: '2026-04-17', asd: '2026-04-02', aed: '2026-04-16' },
      { no: 'WO20260402003', soi: 2, bi: 2, pname: '手机电池标签', qty: 200000, unit: '张', status: 'producing', psd: '2026-04-03', ped: '2026-04-19', asd: '2026-04-03', aed: null },
      { no: 'WO20260402004', soi: 3, bi: 3, pname: '新能源电池标签', qty: 80000, unit: '张', status: 'producing', psd: '2026-04-03', ped: '2026-04-21', asd: '2026-04-04', aed: null },
      { no: 'WO20260403005', soi: 4, bi: 4, pname: '医疗设备面板', qty: 20000, unit: '张', status: 'completed', psd: '2026-04-04', ped: '2026-04-15', asd: '2026-04-04', aed: '2026-04-14' },
      { no: 'WO20260403006', soi: 5, bi: 5, pname: '工业设备铭牌', qty: 100000, unit: '张', status: 'completed', psd: '2026-04-04', ped: '2026-04-16', asd: '2026-04-04', aed: '2026-04-15' },
      { no: 'WO20260404007', soi: 6, bi: 6, pname: '电子元器件标签', qty: 300000, unit: '张', status: 'confirmed', psd: '2026-04-05', ped: '2026-04-18', asd: null, aed: null },
      { no: 'WO20260405008', soi: 7, bi: 7, pname: '电池防伪标签', qty: 150000, unit: '张', status: 'confirmed', psd: '2026-04-06', ped: '2026-04-24', asd: null, aed: null },
      { no: 'WO20260406009', soi: 8, bi: 8, pname: '汽车仪表盘面板', qty: 40000, unit: '张', status: 'pending', psd: '2026-04-07', ped: '2026-04-19', asd: null, aed: null },
      { no: 'WO20260407010', soi: 9, bi: 9, pname: '智能家居面板', qty: 60000, unit: '张', status: 'pending', psd: '2026-04-08', ped: '2026-04-27', asd: null, aed: null },
    ];
    for (const wo of workOrders) {
      const cname = customers[salesOrders[wo.soi].cid - 1]?.name || '';
      await conn.execute(`INSERT INTO prod_work_order (work_order_no, order_id, order_no, bom_id, customer_name, product_name, quantity, unit, status, priority, plan_start_date, plan_end_date, actual_start_date, actual_end_date, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, NOW())`, 
        [wo.no, saleOrderIds[wo.soi], salesOrders[wo.soi].no, bomIds[wo.bi], cname, wo.pname, wo.qty, wo.unit, wo.status, wo.psd, wo.ped, wo.asd, wo.aed]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const woId = rows[0].id;
      const soItem = salesOrders[wo.soi].items[0];
      await conn.execute(`INSERT INTO prod_work_order_item (work_order_id, line_no, material_id, material_name, quantity, unit, unit_price, total_price) VALUES (?, 1, ?, ?, ?, ?, ?, ?)`, 
        [woId, soItem.mid, materials[soItem.mid - 1]?.name || '', soItem.qty, wo.unit, soItem.price, soItem.qty * soItem.price]);
    }
    stats.workOrders = workOrders.length;

    const workReports = [
      { no: 'WR20260402001', woid: 1, wono: 'WO20260401001', proc: '晒版', seq: 1, eqp: 4, plan: 50000, comp: 50000, qual: 50000, def: 0, start: '2026-04-02 08:00', end: '2026-04-02 18:00', fp: 2 },
      { no: 'WR20260404001', woid: 1, wono: 'WO20260401001', proc: '丝印印刷', seq: 3, eqp: 1, plan: 50000, comp: 50000, qual: 49200, def: 800, start: '2026-04-04 08:00', end: '2026-04-06 16:00', fp: 2 },
      { no: 'WR20260408001', woid: 1, wono: 'WO20260401001', proc: '模切', seq: 5, eqp: 7, plan: 49200, comp: 49200, qual: 48800, def: 400, start: '2026-04-08 08:00', end: '2026-04-09 18:00', fp: 0 },
      { no: 'WR20260403002', woid: 2, wono: 'WO20260401002', proc: '晒版', seq: 1, eqp: 4, plan: 30000, comp: 30000, qual: 30000, def: 0, start: '2026-04-03 08:00', end: '2026-04-03 18:00', fp: 2 },
      { no: 'WR20260405002', woid: 2, wono: 'WO20260401002', proc: '丝印印刷', seq: 3, eqp: 2, plan: 30000, comp: 30000, qual: 29500, def: 500, start: '2026-04-05 08:00', end: '2026-04-08 16:00', fp: 2 },
      { no: 'WR20260404003', woid: 5, wono: 'WO20260403005', proc: '晒版', seq: 1, eqp: 4, plan: 20000, comp: 20000, qual: 20000, def: 0, start: '2026-04-04 08:00', end: '2026-04-04 18:00', fp: 2 },
      { no: 'WR20260406003', woid: 5, wono: 'WO20260403005', proc: '丝印印刷', seq: 3, eqp: 3, plan: 20000, comp: 20000, qual: 19800, def: 200, start: '2026-04-06 08:00', end: '2026-04-08 16:00', fp: 2 },
      { no: 'WR20260405004', woid: 6, wono: 'WO20260403006', proc: '晒版', seq: 1, eqp: 4, plan: 100000, comp: 100000, qual: 100000, def: 0, start: '2026-04-05 08:00', end: '2026-04-05 18:00', fp: 2 },
      { no: 'WR20260407004', woid: 6, wono: 'WO20260403006', proc: '丝印印刷', seq: 3, eqp: 1, plan: 100000, comp: 100000, qual: 98500, def: 1500, start: '2026-04-07 08:00', end: '2026-04-10 16:00', fp: 2 },
      { no: 'WR20260412004', woid: 6, wono: 'WO20260403006', proc: '模切', seq: 5, eqp: 7, plan: 98500, comp: 98500, qual: 97800, def: 700, start: '2026-04-12 08:00', end: '2026-04-14 16:00', fp: 0 },
    ];
    for (const wr of workReports) {
      await conn.execute(`INSERT INTO prd_work_report (report_no, work_order_id, work_order_no, process_name, process_seq, equipment_id, operator_name, plan_qty, completed_qty, qualified_qty, defective_qty, scrap_qty, start_time, end_time, work_hours, is_first_piece, first_piece_status, first_piece_inspector, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, '张师傅', ?, ?, ?, ?, 0, ?, ?, 8, ?, ?, '李质检', '', NOW())`, 
        [wr.no, wr.woid || 1, wr.wono, wr.proc, wr.seq, wr.eqp, wr.plan, wr.comp, wr.qual, wr.def, wr.start, wr.end, wr.fp ? 1 : 0, wr.fp || null]);
    }
    stats.workReports = workReports.length;

    const deliveryOrders = [
      { no: 'DN20260415001', soi: 0, cid: 1, cname: '美的集团股份有限公司', date: '2026-04-15', items: [{ mid: 11, name: '空调控制面板标签', spec: '120×80mm', qty: 48800, unit: '张', price: 2.50 }], sign: 1, status: 3 },
      { no: 'DN20260418002', soi: 1, cid: 2, cname: '格力电器股份有限公司', date: '2026-04-18', items: [{ mid: 12, name: '洗衣机控制面板', spec: '180×100mm', qty: 29500, unit: '张', price: 3.80 }], sign: 1, status: 3 },
      { no: 'DN20260420003', soi: 2, cid: 3, cname: '华为技术有限公司', date: '2026-04-20', items: [{ mid: 13, name: '手机电池标签', spec: '50×30mm', qty: 150000, unit: '张', price: 0.45 }], sign: 0, status: 2 },
      { no: 'DN20260422004', soi: 3, cid: 4, cname: '比亚迪股份有限公司', date: '2026-04-22', items: [{ mid: 14, name: '新能源电池标签', spec: '150×80mm', qty: 70000, unit: '张', price: 5.50 }], sign: 0, status: 2 },
      { no: 'DN20260416005', soi: 4, cid: 5, cname: '迈瑞医疗设备有限公司', date: '2026-04-16', items: [{ mid: 15, name: '医疗设备面板', spec: '200×150mm', qty: 19800, unit: '张', price: 7.80 }], sign: 1, status: 3 },
      { no: 'DN20260417006', soi: 5, cid: 6, cname: '小米科技有限公司', date: '2026-04-17', items: [{ mid: 16, name: '工业设备铭牌', spec: '100×60mm', qty: 97800, unit: '张', price: 1.35 }], sign: 1, status: 3 },
      { no: 'DN20260419007', soi: 6, cid: 7, cname: '海尔集团股份有限公司', date: '2026-04-19', items: [{ mid: 17, name: '电子元器件标签', spec: '40×20mm', qty: 280000, unit: '张', price: 0.25 }], sign: 0, status: 2 },
      { no: 'DN20260425008', soi: 7, cid: 8, cname: '大疆创新科技有限公司', date: '2026-04-25', items: [{ mid: 18, name: '电池防伪标签', spec: '80×50mm', qty: 140000, unit: '张', price: 0.95 }], sign: 0, status: 1 },
      { no: 'DN20260420009', soi: 8, cid: 9, cname: '宁德时代新能源科技股份有限公司', date: '2026-04-20', items: [{ mid: 19, name: '汽车仪表盘面板', spec: '250×120mm', qty: 35000, unit: '张', price: 6.50 }], sign: 0, status: 1 },
      { no: 'DN20260428010', soi: 9, cid: 10, cname: '联想集团股份有限公司', date: '2026-04-28', items: [{ mid: 20, name: '智能家居面板', spec: '150×100mm', qty: 55000, unit: '张', price: 3.20 }], sign: 0, status: 1 },
    ];
    for (const dn of deliveryOrders) {
      let totalQty = 0, totalAmount = 0;
      for (const item of dn.items) { totalQty += item.qty; totalAmount += item.qty * item.price; }
      await conn.execute(`INSERT INTO sal_delivery_order (delivery_no, order_no, customer_id, customer_name, delivery_date, total_qty, total_amount, sign_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [dn.no, salesOrders[dn.soi].no, dn.cid, dn.cname, dn.date, totalQty, totalAmount, dn.sign, dn.status]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const dnId = rows[0].id;
      for (const item of dn.items) {
        await conn.execute(`INSERT INTO sal_delivery_order_item (delivery_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount, sign_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [dnId, item.mid, item.name, item.spec, item.qty, item.unit, item.price, item.qty * item.price, dn.sign ? item.qty : 0]);
      }
    }
    stats.deliveryOrders = deliveryOrders.length;

    const returnOrders = [
      { no: 'RT20260416001', soi: 0, dnNo: 'DN20260415001', cid: 1, cname: '美的集团股份有限公司', date: '2026-04-16', type: 1, reason: '丝印偏色，色差超出标准范围', items: [{ mid: 11, name: '空调控制面板标签', spec: '120×80mm', qty: 2000, unit: '张', price: 2.50 }] },
      { no: 'RT20260418002', soi: 4, dnNo: 'DN20260416005', cid: 5, cname: '迈瑞医疗设备有限公司', date: '2026-04-18', type: 3, reason: '丝印套位偏差，与图纸要求不符', items: [{ mid: 15, name: '医疗设备面板', spec: '200×150mm', qty: 500, unit: '张', price: 7.80 }] },
    ];
    for (const rt of returnOrders) {
      let totalQty = 0, totalAmount = 0;
      for (const item of rt.items) { totalQty += item.qty; totalAmount += item.qty * item.price; }
      await conn.execute(`INSERT INTO sal_return_order (return_no, order_no, delivery_no, customer_id, customer_name, return_date, return_type, return_reason, total_qty, total_amount, inspection_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, 3)`, 
        [rt.no, salesOrders[rt.soi].no, rt.dnNo, rt.cid, rt.cname, rt.date, rt.type, rt.reason, totalQty, totalAmount]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const rtId = rows[0].id;
      for (const item of rt.items) {
        await conn.execute(`INSERT INTO sal_return_order_item (return_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount, qualified_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [rtId, item.mid, item.name, item.spec, item.qty, item.unit, item.price, item.qty * item.price, Math.round(item.qty * 0.8)]);
      }
    }
    stats.returnOrders = returnOrders.length;

    const outboundOrders = [
      { no: 'OUT20260402001', type: 'production', wh: 1, whname: '原材料仓', date: '2026-04-02', status: 'completed', items: [{ mid: 1, name: 'PET薄膜透明125μm', spec: '1000×1200mm', qty: 55000, unit: '张', price: 8.50 }] },
      { no: 'OUT20260403002', type: 'production', wh: 4, whname: '油墨辅料仓', date: '2026-04-03', status: 'completed', items: [{ mid: 6, name: '丝印油墨-黑色', spec: '溶剂型/SK-1000', qty: 8, unit: 'kg', price: 85.00 }] },
      { no: 'OUT20260415003', type: 'sale', wh: 3, whname: '成品仓', date: '2026-04-15', status: 'completed', items: [{ mid: 11, name: '空调控制面板标签', spec: '120×80mm', qty: 48800, unit: '张', price: 2.50 }] },
      { no: 'OUT20260418004', type: 'sale', wh: 3, whname: '成品仓', date: '2026-04-18', status: 'completed', items: [{ mid: 12, name: '洗衣机控制面板', spec: '180×100mm', qty: 29500, unit: '张', price: 3.80 }] },
      { no: 'OUT20260417006', type: 'sale', wh: 3, whname: '成品仓', date: '2026-04-17', status: 'completed', items: [{ mid: 16, name: '工业设备铭牌', spec: '100×60mm', qty: 97800, unit: '张', price: 1.35 }] },
    ];
    for (const ob of outboundOrders) {
      let totalQty = 0, totalAmount = 0;
      for (const item of ob.items) { totalQty += item.qty; totalAmount += item.qty * item.price; }
      await conn.execute(`INSERT INTO inv_outbound_order (order_no, order_date, outbound_type, warehouse_id, warehouse_name, total_qty, total_amount, status, audit_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`, 
        [ob.no, ob.date, ob.type, ob.wh, ob.whname, totalQty, totalAmount, ob.status]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const obId = rows[0].id;
      for (const item of ob.items) {
        await conn.execute(`INSERT INTO inv_outbound_item (order_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [obId, item.mid, item.name, item.spec, item.qty, item.unit, item.price, item.qty * item.price]);
      }
    }
    stats.outboundOrders = outboundOrders.length;

    const transList = [
      { no: 'TR20260408001', type: 'in', stype: 'inbound', mid: 1, mcode: 'MAT001', wh: 1, qty: 500000, cost: 8.50, ref: 'IN20260408001' },
      { no: 'TR20260409002', type: 'in', stype: 'inbound', mid: 6, mcode: 'MAT006', wh: 4, qty: 100, cost: 85.00, ref: 'IN20260409002' },
      { no: 'TR20260409003', type: 'in', stype: 'inbound', mid: 8, mcode: 'MAT008', wh: 4, qty: 10, cost: 850.00, ref: 'IN20260409002' },
      { no: 'TR20260409004', type: 'in', stype: 'inbound', mid: 4, mcode: 'MAT004', wh: 4, qty: 300, cost: 85.00, ref: 'IN20260409003' },
      { no: 'TR20260415005', type: 'in', stype: 'inbound', mid: 3, mcode: 'MAT003', wh: 1, qty: 400000, cost: 6.50, ref: 'IN20260415004' },
      { no: 'TR20260412006', type: 'in', stype: 'inbound', mid: 9, mcode: 'MAT009', wh: 4, qty: 50, cost: 120.00, ref: 'IN20260412005' },
      { no: 'TR20260402007', type: 'out', stype: 'production', mid: 1, mcode: 'MAT001', wh: 1, qty: 55000, cost: 8.50, ref: 'OUT20260402001' },
      { no: 'TR20260403008', type: 'out', stype: 'production', mid: 6, mcode: 'MAT006', wh: 4, qty: 8, cost: 85.00, ref: 'OUT20260403002' },
      { no: 'TR20260415009', type: 'out', stype: 'sale', mid: 11, mcode: 'MAT011', wh: 3, qty: 48800, cost: 0.80, ref: 'OUT20260415003' },
      { no: 'TR20260417010', type: 'out', stype: 'sale', mid: 16, mcode: 'MAT016', wh: 3, qty: 97800, cost: 0.45, ref: 'OUT20260417006' },
    ];
    for (const tr of transList) {
      await conn.execute(`INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, material_id, material_code, warehouse_id, quantity, unit_cost, total_cost, reference_no, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, 
        [tr.no, tr.type, tr.stype, tr.mid, tr.mcode, tr.wh, tr.qty, tr.cost, tr.qty * tr.cost, tr.ref]);
    }
    stats.transactions = transList.length;

    const inspections = [
      { no: 'QI20260408001', type: 1, source: '采购入库', sno: 'IN20260408001', mid: 1, batch: 'B20260408A', qty: 500000, qual: 499500, unqual: 500, result: 1 },
      { no: 'QI20260409002', type: 1, source: '采购入库', sno: 'IN20260409002', mid: 6, batch: 'B20260409A', qty: 100, qual: 100, unqual: 0, result: 1 },
      { no: 'QI20260409003', type: 1, source: '采购入库', sno: 'IN20260409003', mid: 4, batch: 'B20260409C', qty: 300, qual: 300, unqual: 0, result: 1 },
      { no: 'QI20260415004', type: 1, source: '采购入库', sno: 'IN20260415004', mid: 3, batch: 'B20260415A', qty: 400000, qual: 399800, unqual: 200, result: 1 },
      { no: 'QI20260410005', type: 2, source: '首件检验', sno: 'WO20260401001', mid: 11, batch: 'B20260410A', qty: 10, qual: 10, unqual: 0, result: 1 },
      { no: 'QI20260411006', type: 2, source: '首件检验', sno: 'WO20260401002', mid: 12, batch: 'B20260411A', qty: 10, qual: 10, unqual: 0, result: 1 },
      { no: 'QI20260412007', type: 3, source: '成品检验', sno: 'WO20260401001', mid: 11, batch: 'B20260410A', qty: 48800, qual: 48800, unqual: 0, result: 1 },
      { no: 'QI20260413008', type: 3, source: '成品检验', sno: 'WO20260401002', mid: 12, batch: 'B20260411A', qty: 29500, qual: 29500, unqual: 0, result: 1 },
      { no: 'QI20260414009', type: 3, source: '成品检验', sno: 'WO20260403005', mid: 15, batch: 'B20260414A', qty: 19800, qual: 19800, unqual: 0, result: 1 },
      { no: 'QI20260415010', type: 3, source: '成品检验', sno: 'WO20260403006', mid: 16, batch: 'B20260415A', qty: 97800, qual: 97800, unqual: 0, result: 1 },
    ];
    for (const qi of inspections) {
      await conn.execute(`INSERT INTO qc_inspection (inspection_no, inspection_type, source_type, source_no, material_id, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector, inspection_date, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW())`, 
        [qi.no, qi.type, qi.source, qi.sno, qi.mid, qi.batch, qi.qty, qi.qual, qi.unqual, qi.result, '质检员张三']);
    }
    stats.inspections = inspections.length;

    const unqualifiedList = [
      { no: 'UQ20260408001', iid: 1, source: '采购入库', sno: 'IN20260408001', mid: 1, name: 'PET薄膜透明125μm', qty: 500, dtype: '表面划痕', desc: 'PET薄膜来料表面有轻微划痕，不影响丝印质量', handleType: 3, handleResult: 1, handler: '质检员张三' },
      { no: 'UQ20260409002', iid: 2, source: '生产过程', sno: 'WO20260401001', mid: 11, name: '空调控制面板标签', qty: 800, dtype: '丝印偏色', desc: '丝印油墨色差超出标准范围，偏色严重', handleType: 1, handleResult: 2, handler: '生产主管李四' },
      { no: 'UQ20260410003', iid: 3, source: '生产过程', sno: 'WO20260401002', mid: 12, name: '洗衣机控制面板', qty: 500, dtype: '套位偏差', desc: '双色丝印套位偏差超过0.2mm标准', handleType: 1, handleResult: 2, handler: '生产主管李四' },
      { no: 'UQ20260415004', iid: 4, source: '成品检验', sno: 'WO20260403006', mid: 16, name: '工业设备铭牌', qty: 700, dtype: '模切毛刺', desc: '模切边缘有毛刺，不符合客户要求', handleType: 1, handleResult: 2, handler: '质检员王五' },
      { no: 'UQ20260416005', iid: 5, source: '客户退货', sno: 'RT20260416001', mid: 11, name: '空调控制面板标签', qty: 2000, dtype: '丝印偏色', desc: '客户反馈丝印偏色，色差超出标准范围', handleType: 2, handleResult: 1, handler: '品质经理赵六' },
    ];
    for (const uq of unqualifiedList) {
      await conn.execute(`INSERT INTO qc_unqualified (unqualified_no, inspection_id, source_type, source_no, material_id, material_name, quantity, defect_type, defect_desc, handle_type, handle_result, handler, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, 
        [uq.no, uq.iid, uq.source, uq.sno, uq.mid, uq.name, uq.qty, uq.dtype, uq.desc, uq.handleType, uq.handleResult, uq.handler]);
    }
    stats.unqualified = unqualifiedList.length;

    const reconciliations = [
      { no: 'RC20260430001', cid: 1, cname: '美的集团', start: '2026-04-01', end: '2026-04-30', deliveryAmt: 122000, returnAmt: 5000, adjustAmt: 0, netAmt: 117000 },
      { no: 'RC20260430002', cid: 2, cname: '格力电器', start: '2026-04-01', end: '2026-04-30', deliveryAmt: 112100, returnAmt: 0, adjustAmt: 0, netAmt: 112100 },
      { no: 'RC20260430003', cid: 5, cname: '迈瑞医疗', start: '2026-04-01', end: '2026-04-30', deliveryAmt: 154440, returnAmt: 3900, adjustAmt: 0, netAmt: 150540 },
      { no: 'RC20260430004', cid: 6, cname: '小米科技', start: '2026-04-01', end: '2026-04-30', deliveryAmt: 132030, returnAmt: 0, adjustAmt: 0, netAmt: 132030 },
    ];
    for (const rc of reconciliations) {
      await conn.execute(`INSERT INTO sal_reconciliation (reconciliation_no, customer_id, customer_name, period_start, period_end, delivery_amount, return_amount, discount_amount, net_amount, status, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2, NOW())`, 
        [rc.no, rc.cid, rc.cname, rc.start, rc.end, rc.deliveryAmt, rc.returnAmt, rc.adjustAmt, rc.netAmt]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const rcId = rows[0].id;
      const dnList = deliveryOrders.filter(d => d.cid === rc.cid);
      for (const dn of dnList) {
        for (const item of dn.items) {
          await conn.execute(`INSERT INTO sal_reconciliation_detail (reconciliation_id, source_type, source_no, amount, create_time) VALUES (?, 1, ?, ?, NOW())`, 
            [rcId, dn.no, item.qty * item.price]);
        }
      }
    }
    stats.reconciliations = reconciliations.length;

    const receivables = [
      { no: 'AR20260415001', cid: 1, amt: 122000, received: 61000, balance: 61000, due: '2026-05-15' },
      { no: 'AR20260418002', cid: 2, amt: 112100, received: 0, balance: 112100, due: '2026-05-18' },
      { no: 'AR20260416003', cid: 5, amt: 154440, received: 77220, balance: 77220, due: '2026-05-16' },
      { no: 'AR20260417004', cid: 6, amt: 132030, received: 66015, balance: 66015, due: '2026-05-17' },
      { no: 'AR20260420005', cid: 3, amt: 67500, received: 0, balance: 67500, due: '2026-05-20' },
      { no: 'AR20260422006', cid: 4, amt: 385000, received: 0, balance: 385000, due: '2026-05-22' },
    ];
    for (const ar of receivables) {
      await conn.execute(`INSERT INTO fin_receivable (receivable_no, customer_id, amount, received_amount, balance, due_date, status, create_time) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`, 
        [ar.no, ar.cid, ar.amt, ar.received, ar.balance, ar.due]);
    }
    stats.receivables = receivables.length;

    const payables = [
      { no: 'AP20260408001', sid: 1, amt: 6700000, paid: 3350000, balance: 3350000, due: '2026-05-08' },
      { no: 'AP20260409002', sid: 2, amt: 17000, paid: 0, balance: 17000, due: '2026-06-09' },
      { no: 'AP20260409003', sid: 3, amt: 25500, paid: 25500, balance: 0, due: '2026-04-09' },
      { no: 'AP20260415004', sid: 4, amt: 2600000, paid: 0, balance: 2600000, due: '2026-05-30' },
      { no: 'AP20260412005', sid: 5, amt: 9600, paid: 0, balance: 9600, due: '2026-05-12' },
    ];
    for (const ap of payables) {
      await conn.execute(`INSERT INTO fin_payable (payable_no, supplier_id, amount, paid_amount, balance, due_date, status, create_time) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`, 
        [ap.no, ap.sid, ap.amt, ap.paid, ap.balance, ap.due]);
    }
    stats.payables = payables.length;

    const receiptRecords = [
      { no: 'RR20260415001', arId: 1, cid: 1, amt: 61000, method: '银行转账', date: '2026-04-15' },
      { no: 'RR20260416002', arId: 3, cid: 5, amt: 77220, method: '银行转账', date: '2026-04-16' },
      { no: 'RR20260417003', arId: 4, cid: 6, amt: 66015, method: '电子承兑', date: '2026-04-17' },
    ];
    for (const rr of receiptRecords) {
      await conn.execute(`INSERT INTO fin_receipt_record (receipt_no, receivable_id, customer_id, amount, payment_method, receipt_date, create_time) VALUES (?, ?, ?, ?, ?, ?, NOW())`, 
        [rr.no, rr.arId, rr.cid, rr.amt, rr.method, rr.date]);
    }
    stats.receiptRecords = receiptRecords.length;

    const paymentRecords = [
      { no: 'PR20260409001', apId: 3, sid: 3, amt: 25500, method: '银行转账', date: '2026-04-09' },
      { no: 'PR20260410002', apId: 1, sid: 1, amt: 3350000, method: '银行转账', date: '2026-04-10' },
    ];
    for (const pr of paymentRecords) {
      await conn.execute(`INSERT INTO fin_payment_record (payment_no, payable_id, supplier_id, amount, payment_method, payment_date, create_time) VALUES (?, ?, ?, ?, ?, ?, NOW())`, 
        [pr.no, pr.apId, pr.sid, pr.amt, pr.method, pr.date]);
    }
    stats.paymentRecords = paymentRecords.length;

    const maintenancePlans = [
      { no: 'MP20260401001', eqId: 1, type: 2, cycleType: 3, cycleValue: 1, planDate: '2026-05-01', content: '检查丝印刮刀磨损、清洁网版夹具、校准定位系统' },
      { no: 'MP20260401002', eqId: 2, type: 2, cycleType: 3, cycleValue: 1, planDate: '2026-05-01', content: '检查丝印刮刀、清洁导轨、校准对位系统' },
      { no: 'MP20260401003', eqId: 3, type: 3, cycleType: 4, cycleValue: 3, planDate: '2026-07-01', content: '精密丝印机全面校准、检查微定位系统精度' },
      { no: 'MP20260401004', eqId: 4, type: 2, cycleType: 3, cycleValue: 1, planDate: '2026-05-01', content: '清洁UV灯管、检查曝光均匀度、校准计时器' },
      { no: 'MP20260401005', eqId: 5, type: 2, cycleType: 3, cycleValue: 1, planDate: '2026-05-01', content: '检查传送带张力、清洁IR加热管、校准温控系统' },
      { no: 'MP20260401006', eqId: 7, type: 2, cycleType: 3, cycleValue: 1, planDate: '2026-05-01', content: '检查模切刀模磨损、校准模切压力、清洁送料系统' },
      { no: 'MP20260401007', eqId: 9, type: 3, cycleType: 4, cycleValue: 3, planDate: '2026-07-01', content: '张力测试仪精度校准、检查传感器灵敏度' },
      { no: 'MP20260401008', eqId: 10, type: 3, cycleType: 4, cycleValue: 3, planDate: '2026-07-01', content: '视觉全检机光源校准、更新检测算法模型' },
    ];
    for (const mp of maintenancePlans) {
      await conn.execute(`INSERT INTO eqp_maintenance_plan (plan_no, equipment_id, maintenance_type, cycle_type, cycle_value, plan_date, content, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, 
        [mp.no, mp.eqId, mp.type, mp.cycleType, mp.cycleValue, mp.planDate, mp.content]);
    }
    stats.maintenancePlans = maintenancePlans.length;

    const maintenanceRecords = [
      { no: 'MR20260401001', eqId: 1, type: 2, start: '2026-04-01 08:00', end: '2026-04-01 17:00', content: '更换丝印刮刀、清洁网版夹具、校准定位系统', result: 1, cost: 800 },
      { no: 'MR20260401002', eqId: 2, type: 2, start: '2026-04-01 08:00', end: '2026-04-01 17:00', content: '更换丝印刮刀、清洁导轨、校准对位系统', result: 1, cost: 600 },
      { no: 'MR20260401003', eqId: 4, type: 2, start: '2026-04-01 08:00', end: '2026-04-01 17:00', content: '更换UV灯管2支、清洁曝光玻璃、校准计时器', result: 1, cost: 3500 },
      { no: 'MR20260401004', eqId: 5, type: 2, start: '2026-04-01 08:00', end: '2026-04-01 17:00', content: '更换传送带、清洁IR加热管、校准温控系统', result: 1, cost: 2200 },
      { no: 'MR20260401005', eqId: 7, type: 2, start: '2026-04-01 08:00', end: '2026-04-01 17:00', content: '更换模切刀模、校准模切压力、清洁送料系统', result: 1, cost: 1500 },
    ];
    for (const mr of maintenanceRecords) {
      await conn.execute(`INSERT INTO eqp_maintenance_record (record_no, equipment_id, maintenance_type, maintenance_content, start_time, end_time, downtime_hours, cost, result, create_time) VALUES (?, ?, ?, ?, ?, ?, 8, ?, ?, NOW())`, 
        [mr.no, mr.eqId, mr.type, mr.content, mr.start, mr.end, mr.cost, mr.result]);
    }
    stats.maintenanceRecords = maintenanceRecords.length;

    const sampleOrders = [
      { no: 'SMP20260325001', cid: 1, cname: '美的集团', pname: '空调面板标签(新版)', spec: '120×80mm', qty: 50, date: '2026-03-25', delivery: '2026-04-01', status: 'completed', remark: '新版丝印图案，需首件确认' },
      { no: 'SMP20260328002', cid: 4, cname: '比亚迪股份', pname: '动力电池标签(导电银浆)', spec: '150×80mm', qty: 30, date: '2026-03-28', delivery: '2026-04-05', status: 'completed', remark: '导电银浆线路丝印，需电阻测试' },
      { no: 'SMP20260405003', cid: 9, cname: '宁德时代', pname: '储能电池标签(耐高温)', spec: '200×100mm', qty: 20, date: '2026-04-05', delivery: '2026-04-15', status: 'producing', remark: '耐高温PET材料，需高温测试' },
      { no: 'SMP20260408004', cid: 8, cname: '大疆创新', pname: '无人机面板(多色丝印)', spec: '80×60mm', qty: 30, date: '2026-04-08', delivery: '2026-04-20', status: 'pending', remark: '四色丝印，需精确套位' },
    ];
    for (const so of sampleOrders) {
      await conn.execute(`INSERT INTO sal_sample_order (order_no, notify_date, customer_id, customer_name, product_name, specification, quantity, order_date, delivery_date, status, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, 
        [so.no, so.date, so.cid, so.cname, so.pname, so.spec, so.qty, so.date, so.delivery, so.status, so.remark]);
    }
    stats.sampleOrders = sampleOrders.length;

    // ========================================
    // 库位数据
    // ========================================
    const locations = [
      { code: 'LOC-A1-01', name: 'A区1排1列', wh: 1, zone: 'A', row: '1', col: '1', type: 1 },
      { code: 'LOC-A1-02', name: 'A区1排2列', wh: 1, zone: 'A', row: '1', col: '2', type: 1 },
      { code: 'LOC-A2-01', name: 'A区2排1列', wh: 1, zone: 'A', row: '2', col: '1', type: 4 },
      { code: 'LOC-B1-01', name: 'B区1排1列', wh: 2, zone: 'B', row: '1', col: '1', type: 3 },
      { code: 'LOC-B1-02', name: 'B区1排2列', wh: 2, zone: 'B', row: '1', col: '2', type: 3 },
      { code: 'LOC-C1-01', name: 'C区1排1列', wh: 3, zone: 'C', row: '1', col: '1', type: 2 },
      { code: 'LOC-C1-02', name: 'C区1排2列', wh: 3, zone: 'C', row: '1', col: '2', type: 2 },
      { code: 'LOC-D1-01', name: 'D区1排1列', wh: 4, zone: 'D', row: '1', col: '1', type: 1 },
      { code: 'LOC-D1-02', name: 'D区1排2列', wh: 4, zone: 'D', row: '1', col: '2', type: 5 },
      { code: 'LOC-D2-01', name: 'D区2排1列', wh: 4, zone: 'D', row: '2', col: '1', type: 5 },
    ];
    for (const loc of locations) {
      await conn.execute(`INSERT INTO inv_location (location_code, location_name, warehouse_id, zone, row_no, column_no, location_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [loc.code, loc.name, loc.wh, loc.zone, loc.row, loc.col, loc.type]);
    }
    stats.locations = locations.length;

    // ========================================
    // 客户联系人数据
    // ========================================
    const contacts = [
      { cid: 1, name: '张经理', pos: '采购经理', phone: '0757-12345678', email: 'zhang@meidi.com', primary: 1 },
      { cid: 2, name: '李工', pos: '技术工程师', phone: '0571-87654321', email: 'li@haier.com', primary: 1 },
      { cid: 3, name: '王总', pos: '供应链总监', phone: '0755-11223344', email: 'wang@huawei.com', primary: 1 },
      { cid: 4, name: '赵主管', pos: '采购主管', phone: '0755-55667788', email: 'zhao@byd.com', primary: 1 },
      { cid: 5, name: '陈经理', pos: '品质经理', phone: '010-99887766', email: 'chen@xiaomi.com', primary: 1 },
      { cid: 6, name: '刘工', pos: '研发工程师', phone: '0769-33445566', email: 'liu@oppo.com', primary: 1 },
      { cid: 7, name: '孙总', pos: '总经理', phone: '021-66778899', email: 'sun@ge.com', primary: 1 },
      { cid: 8, name: '周经理', pos: '采购经理', phone: '0755-44556677', email: 'zhou@dji.com', primary: 1 },
      { cid: 9, name: '吴工', pos: '技术主管', phone: '0593-22334455', email: 'wu@catl.com', primary: 1 },
      { cid: 10, name: '郑经理', pos: '项目经理', phone: '010-11223344', email: 'zheng@baidu.com', primary: 1 },
    ];
    for (const c of contacts) {
      await conn.execute(`INSERT INTO crm_customer_contact (customer_id, contact_name, position, phone, email, is_primary) VALUES (?, ?, ?, ?, ?, ?)`,
        [c.cid, c.name, c.pos, c.phone, c.email, c.primary]);
    }
    stats.contacts = contacts.length;

    // ========================================
    // 物料标签数据（原材料大卷/大张码）
    // ========================================
    const materialLabels = [
      { no: 'RM-MAT001-001-20260408', po: 'PO20260401001', supplier: '东莞PET薄膜有限公司', rdate: '2026-04-08', mcode: 'MAT001', mname: 'PET薄膜透明125μm', spec: '1000×1200mm', unit: '张', batch: 'B20260408A', qty: 500000, wh: 1, isMain: 1, type: 1, width: 1000, length: 1200 },
      { no: 'RM-MAT002-001-20260408', po: 'PO20260401001', supplier: '东莞PET薄膜有限公司', rdate: '2026-04-08', mcode: 'MAT002', mname: 'PET薄膜白色188μm', spec: '1000×1200mm', unit: '张', batch: 'B20260408B', qty: 200000, wh: 1, isMain: 1, type: 1, width: 1000, length: 1200 },
      { no: 'RM-MAT006-001-20260409', po: 'PO20260401002', supplier: '深圳特种油墨科技有限公司', rdate: '2026-04-09', mcode: 'MAT006', mname: '丝印油墨-黑色', spec: '溶剂型/SK-1000', unit: 'kg', batch: 'B20260409A', qty: 100, wh: 4, isMain: 0, type: 1, width: null, length: null },
      { no: 'RM-MAT008-001-20260409', po: 'PO20260401002', supplier: '深圳特种油墨科技有限公司', rdate: '2026-04-09', mcode: 'MAT008', mname: '导电银浆', spec: 'AG-500', unit: 'kg', batch: 'B20260409B', qty: 10, wh: 4, isMain: 0, type: 1, width: null, length: null },
      { no: 'RM-MAT004-001-20260410', po: 'PO20260402003', supplier: '广州不干胶材料厂', rdate: '2026-04-10', mcode: 'MAT004', mname: '不干胶PET银色', spec: '600mm×200m', unit: '卷', batch: 'B20260410A', qty: 300, wh: 1, isMain: 1, type: 1, width: 600, length: 200000 },
      { no: 'RM-MAT005-001-20260410', po: 'PO20260402003', supplier: '广州不干胶材料厂', rdate: '2026-04-10', mcode: 'MAT005', mname: '不干胶PVC白色', spec: '600mm×200m', unit: '卷', batch: 'B20260410B', qty: 500, wh: 1, isMain: 1, type: 1, width: 600, length: 200000 },
      { no: 'RM-MAT003-001-20260415', po: 'PO20260403004', supplier: '浙江PVC材料有限公司', rdate: '2026-04-15', mcode: 'MAT003', mname: 'PVC薄膜透明0.15mm', spec: '920×1100mm', unit: '张', batch: 'B20260415A', qty: 400000, wh: 1, isMain: 1, type: 1, width: 920, length: 1100 },
      { no: 'RM-MAT009-001-20260412', po: 'PO20260404005', supplier: '上海感光材料科技有限公司', rdate: '2026-04-12', mcode: 'MAT009', mname: 'UV光油', spec: 'UV-500透明', unit: 'kg', batch: 'B20260412A', qty: 50, wh: 4, isMain: 0, type: 1, width: null, length: null },
      { no: 'RM-MAT010-001-20260412', po: 'PO20260404005', supplier: '上海感光材料科技有限公司', rdate: '2026-04-12', mcode: 'MAT010', mname: '网版感光胶', spec: 'SP-200', unit: 'kg', batch: 'B20260412B', qty: 20, wh: 4, isMain: 0, type: 1, width: null, length: null },
      { no: 'RM-MAT007-001-20260409', po: 'PO20260401002', supplier: '深圳特种油墨科技有限公司', rdate: '2026-04-09', mcode: 'MAT007', mname: '丝印油墨-白色', spec: 'UV型/SK-2000', unit: 'kg', batch: 'B20260409C', qty: 80, wh: 4, isMain: 0, type: 1, width: null, length: null },
    ];
    for (const ml of materialLabels) {
      await conn.execute(`INSERT INTO inv_material_label (label_no, qr_code, purchase_order_no, supplier_name, receive_date, material_code, material_name, specification, unit, batch_no, quantity, width, length_per_roll, warehouse_id, is_main_material, label_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [ml.no, ml.no, ml.po, ml.supplier, ml.rdate, ml.mcode, ml.mname, ml.spec, ml.unit, ml.batch, ml.qty, ml.width, ml.length, ml.wh, ml.isMain, ml.type]);
    }
    stats.materialLabels = materialLabels.length;

    // ========================================
    // 分切记录数据（PET薄膜分切成小片）
    // ========================================
    const cuttingRecords = [
      { no: 'CUT20260409001', srcLabel: 'RM-MAT001-001-20260408', srcId: 1, cutStr: '120+120+120+120+120+120+120+120', origW: 1000, cutW: 960, remainW: 40, op: '张师傅' },
      { no: 'CUT20260410002', srcLabel: 'RM-MAT004-001-20260410', srcId: 5, cutStr: '80+80+80+80+80+80+80+80', origW: 600, cutW: 640, remainW: 0, op: '李师傅' },
      { no: 'CUT20260411003', srcLabel: 'RM-MAT005-001-20260410', srcId: 6, cutStr: '100+100+100+100+100', origW: 600, cutW: 500, remainW: 100, op: '张师傅' },
      { no: 'CUT20260415004', srcLabel: 'RM-MAT003-001-20260415', srcId: 7, cutStr: '150+150+150+150+150+150', origW: 920, cutW: 900, remainW: 20, op: '王师傅' },
      { no: 'CUT20260416005', srcLabel: 'RM-MAT002-001-20260408', srcId: 2, cutStr: '180+180+180+180', origW: 1000, cutW: 720, remainW: 280, op: '李师傅' },
    ];
    for (const cr of cuttingRecords) {
      await conn.execute(`INSERT INTO inv_cutting_record (record_no, source_label_id, source_label_no, cut_width_str, original_width, cut_total_width, remain_width, operator_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [cr.no, cr.srcId, cr.srcLabel, cr.cutStr, cr.origW, cr.cutW, cr.remainW, cr.op]);
      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const cutId = rows[0].id;
      const widths = cr.cutStr.split('+').map(Number);
      for (let i = 0; i < widths.length; i++) {
        const newLabelNo = `SL-${cr.srcLabel.split('-').slice(1).join('-')}-${String(i + 1).padStart(3, '0')}`;
        await conn.execute(`INSERT INTO inv_material_label (label_no, qr_code, material_code, material_name, specification, unit, batch_no, quantity, width, warehouse_id, is_main_material, is_cut, parent_label_id, label_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 2, 1)`,
          [newLabelNo, newLabelNo, 'MAT001', '分切后PET薄膜', `${widths[i]}mm`, '张', 'B20260408A', 50000, widths[i], 1, cr.srcId]);
        const [newRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const newLabelId = newRows[0].id;
        await conn.execute(`INSERT INTO inv_cutting_detail (record_id, new_label_id, new_label_no, cut_width, sequence) VALUES (?, ?, ?, ?, ?)`,
          [cutId, newLabelId, newLabelNo, widths[i], i + 1]);
      }
      if (cr.remainW > 0) {
        const remLabelNo = `RE-${cr.srcLabel.split('-').slice(1).join('-')}-001`;
        await conn.execute(`INSERT INTO inv_material_label (label_no, qr_code, material_code, material_name, specification, unit, batch_no, quantity, width, remaining_width, warehouse_id, is_main_material, is_cut, parent_label_id, label_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 3, 1)`,
          [remLabelNo, remLabelNo, 'MAT001', '余料PET薄膜', `${cr.remainW}mm`, '张', 'B20260408A', 20000, cr.remainW, cr.remainW, 1, cr.srcId]);
      }
    }
    stats.cuttingRecords = cuttingRecords.length;

    // ========================================
    // 生产流程卡数据
    // ========================================
    const processCards = [
      { no: 'PC20260402001', woId: 1, woNo: 'WO20260401001', pcode: 'MAT011', pname: '空调控制面板标签', mspec: '120×80mm', pdate: '2026-04-02', pqty: 50000, mlId: 11, mlNo: 'SL-MAT001-001-20260408-001', bStatus: 1, cUser: '生产调度' },
      { no: 'PC20260402002', woId: 2, woNo: 'WO20260401002', pcode: 'MAT012', pname: '洗衣机控制面板', mspec: '180×100mm', pdate: '2026-04-02', pqty: 30000, mlId: 12, mlNo: 'SL-MAT001-001-20260408-002', bStatus: 1, cUser: '生产调度' },
      { no: 'PC20260403003', woId: 3, woNo: 'WO20260402003', pcode: 'MAT013', pname: '手机电池标签', mspec: '50×30mm', pdate: '2026-04-03', pqty: 200000, mlId: 13, mlNo: 'SL-MAT004-001-20260410-001', bStatus: 1, cUser: '生产调度' },
      { no: 'PC20260404004', woId: 4, woNo: 'WO20260402004', pcode: 'MAT014', pname: '新能源电池标签', mspec: '150×80mm', pdate: '2026-04-04', pqty: 80000, mlId: 14, mlNo: 'SL-MAT003-001-20260415-001', bStatus: 0, cUser: '生产调度' },
      { no: 'PC20260404005', woId: 5, woNo: 'WO20260403005', pcode: 'MAT015', pname: '医疗设备面板', mspec: '200×150mm', pdate: '2026-04-04', pqty: 20000, mlId: 15, mlNo: 'SL-MAT002-001-20260408-001', bStatus: 1, cUser: '生产调度' },
    ];
    for (const pc of processCards) {
      await conn.execute(`INSERT INTO prd_process_card (card_no, qr_code, work_order_id, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty, main_label_id, main_label_no, burdening_status, create_user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pc.no, pc.no, pc.woId, pc.woNo, pc.pcode, pc.pname, pc.mspec, pc.pdate, pc.pqty, pc.mlId, pc.mlNo, pc.bStatus, pc.cUser]);
    }
    stats.processCards = processCards.length;

    // ========================================
    // 追溯记录数据
    // ========================================
    const traceRecords = [
      { no: 'TR20260413001', cardNo: 'PC20260402001', woNo: 'WO20260401001', pcode: 'MAT011', mlId: 11, type: 1, opName: '质检员王工' },
      { no: 'TR20260414002', cardNo: 'PC20260402002', woNo: 'WO20260401002', pcode: 'MAT012', mlId: 12, type: 1, opName: '质检员王工' },
      { no: 'TR20260414003', cardNo: 'PC20260403003', woNo: 'WO20260402003', pcode: 'MAT013', mlId: 13, type: 2, opName: '客户稽核员' },
      { no: 'TR20260415004', cardNo: 'PC20260404005', woNo: 'WO20260403005', pcode: 'MAT015', mlId: 15, type: 1, opName: '质检员李工' },
    ];
    for (const tr of traceRecords) {
      await conn.execute(`INSERT INTO inv_trace_record (trace_no, card_no, work_order_no, product_code, main_label_id, trace_type, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tr.no, tr.cardNo, tr.woNo, tr.pcode, tr.mlId, tr.type, tr.opName]);
    }
    stats.traceRecords = traceRecords.length;

    // ========================================
    // 油墨开罐记录数据
    // ========================================
    const inkOpenings = [
      { no: 'INK20260402001', mid: 6, mcode: 'MAT006', mname: '丝印油墨-黑色', batch: 'B20260409A', inkType: 'solvent', openTime: '2026-04-02 08:30:00', expireHours: 48, remainQty: 8, unit: 'kg', status: 2, opName: '调墨师傅陈工' },
      { no: 'INK20260402002', mid: 7, mcode: 'MAT007', mname: '丝印油墨-白色', batch: 'B20260409C', inkType: 'uv', openTime: '2026-04-02 09:00:00', expireHours: 168, remainQty: 12, unit: 'kg', status: 1, opName: '调墨师傅陈工' },
      { no: 'INK20260403003', mid: 8, mcode: 'MAT008', mname: '导电银浆', batch: 'B20260409B', inkType: 'solvent', openTime: '2026-04-03 10:00:00', expireHours: 72, remainQty: 3, unit: 'kg', status: 1, opName: '调墨师傅陈工' },
      { no: 'INK20260404004', mid: 9, mcode: 'MAT009', mname: 'UV光油', batch: 'B20260412A', inkType: 'uv', openTime: '2026-04-04 14:00:00', expireHours: 168, remainQty: 15, unit: 'kg', status: 1, opName: '调墨师傅陈工' },
      { no: 'INK20260405005', mid: 6, mcode: 'MAT006', mname: '丝印油墨-黑色', batch: 'B20260409A', inkType: 'solvent', openTime: '2026-04-05 08:00:00', expireHours: 48, remainQty: 5, unit: 'kg', status: 1, opName: '调墨师傅陈工' },
    ];
    for (const io of inkOpenings) {
      const expireTime = new Date(new Date(io.openTime).getTime() + io.expireHours * 3600000).toISOString().slice(0, 19).replace('T', ' ');
      await conn.execute(`INSERT INTO ink_opening_record (record_no, material_id, material_code, material_name, batch_no, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, status, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [io.no, io.mid, io.mcode, io.mname, io.batch, io.inkType, io.openTime, io.expireHours, expireTime, io.remainQty, io.unit, io.status, io.opName]);
    }
    stats.inkOpenings = inkOpenings.length;

    // ========================================
    // 扫码日志数据
    // ========================================
    const scanLogs = [
      { type: 'cutting', qr: 'RM-MAT001-001-20260408', label: 'RM-MAT001-001-20260408', op: '分切扫码', result: 1, msg: '分切扫码成功', opName: '张师傅' },
      { type: 'process', qr: 'PC20260402001', label: 'PC20260402001', op: '配料扫码', result: 1, msg: '配料成功', opName: '配料员' },
      { type: 'trace', qr: 'MAT011', label: 'SL-MAT001-001-20260408-001', op: '追溯查询', result: 1, msg: '追溯查询成功', opName: '质检员王工' },
      { type: 'cutting', qr: 'RM-MAT004-001-20260410', label: 'RM-MAT004-001-20260410', op: '分切扫码', result: 1, msg: '分切扫码成功', opName: '李师傅' },
      { type: 'process', qr: 'PC20260402002', label: 'PC20260402002', op: '配料扫码', result: 1, msg: '配料成功', opName: '配料员' },
    ];
    for (const sl of scanLogs) {
      await conn.execute(`INSERT INTO inv_scan_log (scan_type, qr_content, label_no, operation, result, message, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sl.type, sl.qr, sl.label, sl.op, sl.result, sl.msg, sl.opName]);
    }
    stats.scanLogs = scanLogs.length;

    return stats;
  });

  return successResponse(result, '丝网印刷行业种子数据初始化成功');
});