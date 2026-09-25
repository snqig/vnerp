/**
 * 清理并重新生成销售订单演示数据。
 *
 * 规则：
 *  - 客户：crm_customer id 61-70（10 家真实企业）
 *  - 物料：inv_material material_type=3（标签/面板类）
 *  - 状态分布：draft=1(5)、confirmed=2(8)、partial_ship=3(4)、completed=4(2)、cancelled=5(1)
 *  - 订单日期：2026-08-20 ~ 2026-09-10（20 天取 20 个日期）
 *  - 交货日期：order_date + 7~30 天（completed/cancelled 不设交货日期）
 *  - 每单 1~3 条明细，金额 200~3000
 *  - 币种 CNY，本位币=订单金额（exchange_rate=1）
 *  - order_no 在 INSERT 前预生成，避免空字符串违反 UNIQUE uk_order_no
 */

import mysql from 'mysql2/promise';

const DB = { host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };

interface Customer { id: number; customer_name: string; }
interface Material { id: number; material_code: string; material_name: string; unit: string; sale_price: string; }

async function main() {
  const conn = await mysql.createConnection(DB);
  try {
    await conn.beginTransaction();

    // 1. 读取客户
    const [customers] = await conn.query<Customer[]>(
      'SELECT id, customer_name FROM crm_customer WHERE deleted = 0 ORDER BY id'
    );
    const custList = customers.filter((c) => c.id >= 61 && c.id <= 70) as Customer[];
    console.log(`[Seed] 可用客户 ${custList.length} 家`);

    // 2. 读取标签类物料
    const [materials] = await conn.query<Material[]>(
      'SELECT id, material_code, material_name, unit, sale_price FROM inv_material WHERE deleted = 0 AND material_type = 3 AND sale_price IS NOT NULL AND sale_price > 0 ORDER BY id'
    );
    const matList = materials as unknown as Material[];
    console.log(`[Seed] 可用物料 ${matList.length} 个`);

    if (custList.length === 0 || matList.length === 0) {
      console.error('[Seed] 客户或物料不足，跳过');
      await conn.rollback();
      return;
    }

    // 3. 软删除旧数据
    const [oldOrders] = await conn.query<{ id: number }[]>(
      'SELECT id FROM sal_order WHERE deleted = 0'
    );
    for (const o of oldOrders) {
      await conn.execute('UPDATE sal_order_detail SET deleted = 1 WHERE order_id = ? AND deleted = 0', [o.id]);
    }
    await conn.execute('UPDATE sal_order SET deleted = 1, update_time = NOW() WHERE deleted = 0', []);
    console.log(`[Seed] 已软删除 ${oldOrders.length} 条旧订单`);

    // 4. 构建 20 条订单模板
    const statusDist = [
      ...Array(5).fill(1),
      ...Array(8).fill(2),
      ...Array(4).fill(3),
      ...Array(2).fill(4),
      ...Array(1).fill(5),
    ];

    const orderDates: string[] = [];
    const baseDate = new Date('2026-08-20');
    for (let i = 0; i < 20; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      orderDates.push(d.toISOString().slice(0, 10));
    }

    // 预先生成 order_no（按日期分组+序号）
    const orderNos: string[] = [];
    for (let i = 0; i < 20; i++) {
      const datePart = orderDates[i].replace(/-/g, '');
      orderNos.push(`SO${datePart}${String(i + 1).padStart(4, '0')}`);
    }

    type OrderItem = { matIdx: number; qty: number };
    type OrderSpec = {
      custIdx: number;
      date: string;
      status: number;
      items: OrderItem[];
      orderNo: string;
    };

    const specs: OrderSpec[] = [];
    for (let i = 0; i < 20; i++) {
      const itemCount = i < 10 ? 2 : i < 17 ? 1 : 3;
      const items: OrderItem[] = [];
      const usedMatIndices = new Set<number>();
      for (let j = 0; j < itemCount; j++) {
        let mi: number;
        do { mi = Math.floor(Math.random() * matList.length); } while (usedMatIndices.has(mi));
        usedMatIndices.add(mi);
        items.push({ matIdx: mi, qty: Math.floor(Math.random() * 400) + 50 });
      }
      specs.push({
        custIdx: i % custList.length,
        date: orderDates[i],
        status: statusDist[i],
        items,
        orderNo: orderNos[i],
      });
    }

    // 5. 写入订单（order_no 预先生成，直接写入）
    const insertedOrderIds: number[] = [];
    for (const spec of specs) {
      const cust = custList[spec.custIdx];
      const orderDate = spec.date;
      const deliveryDays = spec.status === 4 ? 0 : spec.status === 5 ? 0 : Math.floor(Math.random() * 20) + 7;
      const deliveryDate = deliveryDays > 0
        ? new Date(new Date(orderDate).getTime() + deliveryDays * 86400000).toISOString().slice(0, 10)
        : null;

      let totalAmount = 0;
      for (const it of spec.items) {
        const mat = matList[it.matIdx];
        const unitPrice = parseFloat(mat.sale_price) || 10;
        totalAmount += unitPrice * it.qty;
      }
      totalAmount = Math.round(totalAmount * 100) / 100;

      const [orderResult] = await conn.execute(
        `INSERT INTO sal_order
         (order_no, customer_id, order_date, delivery_date, total_amount,
          currency, exchange_rate, base_total_amount, base_tax_amount, base_grand_total,
          status, remark, create_time)
         VALUES (?, ?, ?, ?, ?, 'CNY', 1.0000, ?, 0.0000, ?, ?, 1, NOW())`,
        [
          spec.orderNo,
          cust.id,
          orderDate,
          deliveryDate,
          totalAmount,
          totalAmount,
          totalAmount,
          spec.status,
          spec.status === 5 ? '客户取消订单' : spec.status === 4 ? '订单已完成' : '',
        ]
      );
      const orderId = orderResult.insertId;
      insertedOrderIds.push(orderId);
      console.log(`[Seed] 订单 ${spec.orderNo} (id=${orderId}, cust=${cust.customer_name}, status=${spec.status}, amount=${totalAmount})`);
    }

    // 6. 写入明细行
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      for (const it of spec.items) {
        const mat = matList[it.matIdx];
        const unitPrice = parseFloat(mat.sale_price) || 10;
        const lineTotal = Math.round(unitPrice * it.qty * 100) / 100;
        await conn.execute(
          `INSERT INTO sal_order_detail
           (order_id, material_id, material_name, quantity, unit, unit_price, amount, total_amount, create_time, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
          [
            insertedOrderIds[i],
            mat.id,
            mat.material_name,
            it.qty,
            mat.unit,
            unitPrice,
            lineTotal,
            lineTotal,
          ]
        );
      }
    }

    await conn.commit();
    console.log(`[Seed] 共重新生成 ${specs.length} 条订单`);
  } catch (e) {
    await conn.rollback();
    console.error('[Seed] 失败:', e);
    throw e;
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
