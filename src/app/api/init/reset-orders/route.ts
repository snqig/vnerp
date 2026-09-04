import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    // ============================================================
    // 第一步：删除所有 orders 域数据（保留 reconciliation / return）
    // ============================================================
    const deleteTables = [
      'sal_order_item',
      'sal_order_detail',
      'sal_order',
      'prd_bom_detail',
      'prd_bom',
      'mdm_product',
      'crm_customer',
      'sal_sample_order',
    ];

    for (const table of deleteTables) {
      await conn.execute(`TRUNCATE TABLE \`${table}\``);
      stats[`deleted_${table}`] = 0;
    }

    // ============================================================
    // 第二步：重新生成 10 条客户
    // ============================================================
    const customers = [
      { code: 'CUS001', name: ts('k_gx8egb'), contact: ts('k_1qztjm0'), phone: '0757-88880001', industry: ts('k_ym4c50') },
      { code: 'CUS002', name: ts('k_1xr1xyd'), contact: ts('k_13ux5kt'), phone: '0756-88880002', industry: ts('k_ym4c50') },
      { code: 'CUS003', name: ts('k_1a4dctg'), contact: ts('k_1bdpjno'), phone: '0755-88880003', industry: ts('k_1pmedts') },
      { code: 'CUS004', name: ts('k_197dql0'), contact: ts('k_151y9ca'), phone: '0755-88880004', industry: ts('k_6vbkui') },
      { code: 'CUS005', name: ts('k_bxab2d'), contact: ts('k_vbc1e1'), phone: '0755-88880005', industry: ts('k_w8c8c7') },
      { code: 'CUS006', name: ts('k_z6l3vn'), contact: ts('k_11zgt9'), phone: '0755-88880006', industry: ts('k_8chs73') },
      { code: 'CUS007', name: ts('k_1pza3xe'), contact: ts('k_nxfiar'), phone: '0591-88880007', industry: ts('k_10z71bm') },
      { code: 'CUS008', name: ts('k_rnmtwr'), contact: ts('k_1gqe670'), phone: '0591-88880008', industry: ts('k_10z71bm') },
      { code: 'CUS009', name: ts('k_1ntfw44'), contact: ts('k_100yj6q'), phone: '0755-88880009', industry: ts('k_11dsknv') },
      { code: 'CUS010', name: ts('k_2hg0zk'), contact: ts('k_12otfds'), phone: '010-88880010', industry: ts('k_1pmedts') },
    ];

    const customerIds: number[] = [];
    for (const c of customers) {
      await conn.execute(
        `INSERT INTO crm_customer (customer_code, customer_name, customer_type, contact_name, contact_phone, industry, status) VALUES (?, ?, 1, ?, ?, ?, 1)`,
        [c.code, c.name, c.contact, c.phone, c.industry]
      );
      const [rows] = await conn.execute('SELECT LAST_INSERT_ID() as id') as [import('@/types/db').DbRow[], unknown];
      customerIds.push((rows[0] as any).id);
    }
    stats.customers = customers.length;

    // ============================================================
    // 第三步：重新生成 10 条产品
    // ============================================================
    const products = [
      { code: 'PRD001', name: ts('k_1085ar9'), spec: '120×80mm', unit: ts('k_accfpb'), category: ts('k_lk7905') },
      { code: 'PRD002', name: ts('k_45wtdq'), spec: '100×60mm', unit: ts('k_accfpb'), category: ts('k_lk7905') },
      { code: 'PRD003', name: ts('k_1u8tdc0'), spec: '80×50mm', unit: ts('k_accfpb'), category: ts('k_mxscv5') },
      { code: 'PRD004', name: ts('k_k0219y'), spec: '200×150mm', unit: ts('k_accfpb'), category: ts('k_13qzt2j') },
      { code: 'PRD005', name: ts('k_m39zii'), spec: '150×100mm', unit: ts('k_accfpb'), category: ts('k_1xkwucq') },
      { code: 'PRD006', name: ts('k_8260v5'), spec: '90×70mm', unit: ts('k_accfpb'), category: ts('k_u8cl2a') },
      { code: 'PRD007', name: ts('k_1jjjrw1'), spec: '60×40mm', unit: ts('k_accfpb'), category: ts('k_i5qutf') },
      { code: 'PRD008', name: ts('k_19oicsm'), spec: '110×70mm', unit: ts('k_accfpb'), category: ts('k_eeq4sv') },
      { code: 'PRD009', name: ts('k_1fbqbkp'), spec: '130×90mm', unit: ts('k_accfpb'), category: ts('k_mxscv5') },
      { code: 'PRD010', name: ts('k_2ov5z9'), spec: '180×120mm', unit: ts('k_accfpb'), category: ts('k_i5qutf') },
    ];

    const productIds: number[] = [];
    for (const p of products) {
      await conn.execute(
        `INSERT INTO mdm_product (product_code, product_name, specification, unit, category_name, status, sale_price) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
        [p.code, p.name, p.spec, p.unit, p.category, Math.round((5 + Math.random() * 20) * 100) / 100]
      );
      const [rows] = await conn.execute('SELECT LAST_INSERT_ID() as id') as [import('@/types/db').DbRow[], unknown];
      productIds.push((rows[0] as any).id);
    }
    stats.products = products.length;

    // ============================================================
    // 第四步：获取物料列表（用于销售订单和BOM）
    // ============================================================
    const [materials] = await conn.execute(
      `SELECT id, material_code, material_name, specification, unit, sale_price FROM inv_material WHERE deleted = 0 AND status = 1 ORDER BY id LIMIT 20`
    ) as [import('@/types/db').DbRow[], unknown];

    // ============================================================
    // 第五步：重新生成 10 条销售订单
    // ============================================================
    const saleOrderData = [
      { cid: 1, date: '2026-08-01', delivery: '2026-08-15', items: [{ mid: 1, qty: 50000, price: 2.5 }] },
      { cid: 2, date: '2026-08-02', delivery: '2026-08-18', items: [{ mid: 2, qty: 30000, price: 3.2 }] },
      { cid: 3, date: '2026-08-03', delivery: '2026-08-20', items: [{ mid: 3, qty: 80000, price: 1.8 }] },
      { cid: 4, date: '2026-08-04', delivery: '2026-08-22', items: [{ mid: 4, qty: 20000, price: 5.5 }] },
      { cid: 5, date: '2026-08-05', delivery: '2026-08-25', items: [{ mid: 5, qty: 60000, price: 4.0 }] },
      { cid: 6, date: '2026-08-06', delivery: '2026-08-28', items: [{ mid: 6, qty: 40000, price: 6.2 }] },
      { cid: 7, date: '2026-08-07', delivery: '2026-09-01', items: [{ mid: 7, qty: 100000, price: 1.5 }] },
      { cid: 8, date: '2026-08-08', delivery: '2026-09-05', items: [{ mid: 8, qty: 25000, price: 8.0 }] },
      { cid: 9, date: '2026-08-09', delivery: '2026-09-10', items: [{ mid: 9, qty: 70000, price: 3.0 }] },
      { cid: 10, date: '2026-08-10', delivery: '2026-09-15', items: [{ mid: 10, qty: 45000, price: 4.8 }] },
    ];

    const saleOrderIds: number[] = [];
    for (let i = 0; i < saleOrderData.length; i++) {
      const order = saleOrderData[i];
      const item = order.items[0];
      const totalAmount = item.qty * item.price;
      const totalWithTax = Math.round(totalAmount * 1.13 * 100) / 100;

      await conn.execute(
        `INSERT INTO sal_order (order_no, order_date, customer_id, total_amount, total_with_tax, delivery_date, currency, status) VALUES (?, ?, ?, ?, ?, ?, 'CNY', 2)`,
        [
          `SO2026${String(i + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
          order.date,
          customerIds[order.cid - 1],
          totalAmount,
          totalWithTax,
          order.delivery,
        ]
      );
      const [rows] = await conn.execute('SELECT LAST_INSERT_ID() as id') as [import('@/types/db').DbRow[], unknown];
      const orderId = (rows[0] as any).id;
      saleOrderIds.push(orderId);

      const mat = materials[i] as any;
      await conn.execute(
        `INSERT INTO sal_order_detail (order_id, material_id, material_name, quantity, unit, unit_price, amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.mid, mat?.material_name || '', item.qty, mat?.unit || ts('k_accfpb'), item.price, totalAmount, totalWithTax]
      );
      await conn.execute(
        `INSERT INTO sal_order_item (order_id, material_name, quantity, unit, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, mat?.material_name || '', item.qty, mat?.unit || ts('k_accfpb'), item.price, totalAmount]
      );
    }
    stats.salesOrders = saleOrderIds.length;

    // ============================================================
    // 第六步：重新生成 10 条 BOM
    // ============================================================
    const bomData = [
      { pid: 1, name: ts('k_2etgrd'), items: [{ mid: 1, qty: 55000, unit: ts('k_accfpb'), loss: 10 }, { mid: 6, qty: 5, unit: 'kg', loss: 0 }] },
      { pid: 2, name: ts('k_1po9fd0'), items: [{ mid: 2, qty: 33000, unit: ts('k_accfpb'), loss: 10 }, { mid: 7, qty: 4, unit: 'kg', loss: 0 }] },
      { pid: 3, name: ts('k_k1vs36'), items: [{ mid: 3, qty: 220000, unit: ts('k_accfpb'), loss: 10 }, { mid: 8, qty: 0.5, unit: 'kg', loss: 0 }] },
      { pid: 4, name: ts('k_1711i9r'), items: [{ mid: 4, qty: 15000, unit: ts('k_accfpb'), loss: 8 }, { mid: 9, qty: 3, unit: 'kg', loss: 0 }] },
      { pid: 5, name: ts('k_1n0571k'), items: [{ mid: 5, qty: 28000, unit: ts('k_accfpb'), loss: 10 }, { mid: 10, qty: 2, unit: 'kg', loss: 0 }] },
      { pid: 6, name: ts('k_1skygl9'), items: [{ mid: 6, qty: 42000, unit: ts('k_accfpb'), loss: 12 }, { mid: 1, qty: 1, unit: 'kg', loss: 0 }] },
      { pid: 7, name: ts('k_8p94tp'), items: [{ mid: 7, qty: 150000, unit: ts('k_accfpb'), loss: 5 }, { mid: 2, qty: 0.3, unit: 'kg', loss: 0 }] },
      { pid: 8, name: ts('k_1qazmzg'), items: [{ mid: 8, qty: 35000, unit: ts('k_accfpb'), loss: 10 }, { mid: 3, qty: 2, unit: 'kg', loss: 0 }] },
      { pid: 9, name: ts('k_txl2h1'), items: [{ mid: 9, qty: 60000, unit: ts('k_accfpb'), loss: 8 }, { mid: 4, qty: 1.5, unit: 'kg', loss: 0 }] },
      { pid: 10, name: ts('k_1wdd1qh'), items: [{ mid: 10, qty: 18000, unit: ts('k_accfpb'), loss: 10 }, { mid: 5, qty: 3, unit: 'kg', loss: 0 }] },
    ];

    const bomIds: number[] = [];
    for (const bom of bomData) {
      let totalCost = 0;
      for (const item of bom.items) {
        totalCost += item.qty * 0.5 + item.qty * (item.loss / 100) * 0.5;
      }
      totalCost = Math.round(totalCost * 100) / 100;

      await conn.execute(
        `INSERT INTO prd_bom (bom_name, product_id, version, total_cost, status) VALUES (?, ?, '1.0', ?, 1)`,
        [bom.name, productIds[bom.pid - 1], totalCost]
      );
      const [rows] = await conn.execute('SELECT LAST_INSERT_ID() as id') as [import('@/types/db').DbRow[], unknown];
      const bomId = (rows[0] as any).id;
      bomIds.push(bomId);

      for (let j = 0; j < bom.items.length; j++) {
        const item = bom.items[j];
        const unitCost = totalCost / bom.items.reduce((s, it) => s + it.qty, 0);
        await conn.execute(
          `INSERT INTO prd_bom_detail (bom_id, material_id, material_name, quantity, unit, loss_rate, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [bomId, item.mid, '', item.qty, item.unit, item.loss, unitCost, Math.round(item.qty * unitCost * 100) / 100]
        );
      }
    }
    stats.boms = bomIds.length;

    // ============================================================
    // 第七步：重新生成 10 条打样订单
    // ============================================================
    const sampleData = [
      { cid: 1, pname: ts('k_1vhqyl9'), spec: '120×80mm', qty: 20, date: '2026-08-01', delivery: '2026-08-10', status: 'pending' },
      { cid: 2, pname: ts('k_yjid21'), spec: '100×60mm', qty: 15, date: '2026-08-02', delivery: '2026-08-12', status: 'in_progress' },
      { cid: 3, pname: ts('k_jca45e'), spec: '80×50mm', qty: 30, date: '2026-08-03', delivery: '2026-08-14', status: 'pending' },
      { cid: 4, pname: ts('k_19cwumq'), spec: '200×150mm', qty: 10, date: '2026-08-04', delivery: '2026-08-16', status: 'done' },
      { cid: 5, pname: ts('k_1cbn9h'), spec: '150×100mm', qty: 25, date: '2026-08-05', delivery: '2026-08-18', status: 'pending' },
      { cid: 6, pname: ts('k_sxqpc3'), spec: '90×70mm', qty: 20, date: '2026-08-06', delivery: '2026-08-20', status: 'in_progress' },
      { cid: 7, pname: ts('k_kkcs83'), spec: '60×40mm', qty: 50, date: '2026-08-07', delivery: '2026-08-22', status: 'pending' },
      { cid: 8, pname: ts('k_1xzz7rp'), spec: '110×70mm', qty: 15, date: '2026-08-08', delivery: '2026-08-25', status: 'done' },
      { cid: 9, pname: ts('k_1k15uy3'), spec: '130×90mm', qty: 20, date: '2026-08-09', delivery: '2026-08-28', status: 'pending' },
      { cid: 10, pname: ts('k_71ut78'), spec: '180×120mm', qty: 10, date: '2026-08-10', delivery: '2026-09-01', status: 'pending' },
    ];

    for (let i = 0; i < sampleData.length; i++) {
      const s = sampleData[i];
      await conn.execute(
        `INSERT INTO sal_sample_order (sample_no, order_date, customer_id, customer_name, product_name, size_spec, quantity, required_date, status, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          `SMP2026${String(i + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
          s.date,
          customerIds[s.cid - 1],
          customers[s.cid - 1].name,
          s.pname,
          s.spec,
          s.qty,
          s.delivery,
          s.status === 'done' ? 3 : s.status === 'in_progress' ? 2 : 1,
          '',
        ]
      );
    }
    stats.sampleOrders = sampleData.length;

    // ============================================================
    // 跳过：sales/reconciliation 和 sales/return 不生成数据
    // ============================================================

    return { stats };
  });

  return successResponse({
    message: ts('k_mwby58'),
    stats: result.stats,
    skipped: ['sal_reconciliation', 'sal_reconciliation_detail', 'sal_return', 'sal_return_detail'],
  });
});
