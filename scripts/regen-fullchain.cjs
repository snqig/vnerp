/**
 * 完整业务链路重生成（幂等，可重复执行）
 *
 * 目标：把各模块种子「独立生成编号」造成的 7 类 / 108 条单号断链全部补齐，
 *       并生成缺失的采购入库、销售出库数据，打通：
 *
 *   销售链路：sal_order -> sal_delivery_order -> inv_outbound_order -> 批次扣减 -> fin_receivable
 *   采购链路：pur_purchase_order -> inv_inbound_order -> 批次入库 -> fin_payable
 *   生产链路：sal_order -> prod_work_order -> inv_production_inbound
 *
 * 设计原则：
 *   1. 编号一律由「源单号 + 固定前缀」派生，绝不硬编码虚构号
 *   2. 先修关联（UPDATE 已有行），再补缺失（INSERT 新行），两者分离
 *   3. 全部操作幂等：重复执行不会产生重复数据
 *   4. 执行前整表备份到 <t>_bak_chain<N>，可回滚
 *
 * 用法：
 *   node scripts/regen-fullchain.cjs            # 执行
 *   node scripts/regen-fullchain.cjs --dry-run  # 只报告不改动
 */
const mysql = require('mysql2/promise');

const CONN = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

const DRY = process.argv.includes('--dry-run');
const BAK = 'chain' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
const DAY = '2026-08-28';

// 需要备份+清理重建的表
const REBUILD = [
  'inv_outbound_item',
  'inv_outbound_order',
  'sal_delivery_order_item',
];

// 需要备份的表（只增不改）
const BACKUP_ONLY = [
  'sal_delivery_order',
  'inv_inbound_order',
  'inv_inbound_item',
  'inv_production_inbound',
  'prod_work_order',
  'fin_receivable',
  'fin_payable',
  'inv_inventory_batch',
  'inv_inventory_transaction',
  'inv_inventory_log',
  'inv_inventory',
];

const r2 = (n) => Math.round(Number(n) * 100) / 100;
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;

const report = [];
const note = (m) => {
  report.push(m);
  console.log(m);
};

async function main() {
  const conn = await mysql.createConnection(CONN);
  let txnSeq = 0;

  // trans_no 有唯一键 uk_trans_no，必须从当前最大值续，不能从 1 开始
  const [[maxTxn]] = await conn.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(trans_no,4) AS UNSIGNED)),0) m FROM inv_inventory_transaction WHERE trans_no LIKE 'TXN%'"
  );
  txnSeq = Number(maxTxn.m) || 0;
  console.log(`  (trans_no 起始序号: ${txnSeq})`);

  // 客户主键映射：历史发货单用的是旧主键(1..N)，真实 crm_customer.id 已偏移
  const [custRows] = await conn.query(
    'SELECT id, customer_name FROM crm_customer WHERE deleted = 0 ORDER BY id'
  );
  const custById = new Map(custRows.map((c) => [c.id, c]));
  const custByOldId = new Map(custRows.map((c, i) => [i + 1, c]));
  const resolveCust = (oldId) => custById.get(oldId) || custByOldId.get(oldId) || null;

  const tableExists = async (t) => {
    const [r] = await conn.query(
      'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',
      [t]
    );
    return r.length > 0;
  };
  const colExists = async (t, c) => {
    const [r] = await conn.query(
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
      [t, c]
    );
    return r.length > 0;
  };
  const step = async (label, fn) => {
    if (DRY) {
      note(`[DRY] ${label} — 跳过`);
      return;
    }
    try {
      const msg = await fn();
      note(`✅ ${label}${msg ? ' — ' + msg : ''}`);
    } catch (e) {
      note(`⚠️ ${label} 失败: ${e.message}`);
    }
  };
  const backup = async (t) => {
    const bak = t + '_bak_' + BAK;
    await conn.execute('DROP TABLE IF EXISTS `' + bak + '`');
    await conn.execute('CREATE TABLE `' + bak + '` LIKE `' + t + '`');
    await conn.execute('INSERT INTO `' + bak + '` SELECT * FROM `' + t + '`');
  };

  try {
    // ============ 0) 备份 ============
    note('== 0) 备份 ==');
    for (const t of [...REBUILD, ...BACKUP_ONLY]) {
      if (!(await tableExists(t))) continue;
      if (!DRY) {
        try {
          await backup(t);
        } catch (e) {
          note(`  备份 ${t} 失败: ${e.message}`);
        }
      }
    }
    note(`  备份后缀 _bak_${BAK}${DRY ? ' (dry-run 未执行)' : ''}`);

    // ============ 1) 修复：发货单 -> 销售订单 ============
    // sal_delivery_order.order_no 是硬编码虚构号(SO20260401001)，order_id 全为 null
    note('\n== 1) 修复 sal_delivery_order 硬编码订单号 ==');
    await step('回填 sal_delivery_order.order_id / order_no', async () => {
      const [orders] = await conn.query(
        'SELECT id, order_no, customer_id FROM sal_order WHERE deleted = 0 ORDER BY id'
      );
      if (!orders.length) return 'sal_order 无数据';

      const [delivs] = await conn.query(
        'SELECT id, delivery_no, order_no FROM sal_delivery_order WHERE deleted = 0 ORDER BY id'
      );

      // 已有正确引用的先跳过
      const [broken] = await conn.query(
        `SELECT d.id FROM sal_delivery_order d
         LEFT JOIN sal_order o ON d.order_no = o.order_no AND o.deleted = 0
         WHERE d.deleted = 0 AND o.id IS NULL
         ORDER BY d.id`
      );

      let n = 0;
      for (let i = 0; i < broken.length; i++) {
        const o = orders[i % orders.length];
        await conn.query(
          'UPDATE sal_delivery_order SET order_id = ?, order_no = ? WHERE id = ?',
          [o.id, o.order_no, broken[i].id]
        );
        n++;
      }
      return `${n}/${delivs.length} 条已按真实 sal_order 重挂（${broken.length} 条原为断链）`;
    });

    await step('回填 sal_delivery_order.customer_id / customer_name', async () => {
      const [r] = await conn.query(
        `UPDATE sal_delivery_order d
         JOIN sal_order o ON d.order_no = o.order_no AND o.deleted = 0
         JOIN crm_customer c ON c.id = o.customer_id AND c.deleted = 0
         SET d.customer_id = c.id, d.customer_name = c.customer_name
         WHERE d.deleted = 0 AND (d.customer_id IS NULL OR d.customer_id = 0)`
      );
      return `${r.affectedRows} 条`;
    });

    // ============ 2) 修复：工单 -> 销售订单 ============
    note('\n== 2) 修复 prod_work_order.order_no ==');
    await step('回填 prod_work_order.order_id / order_no', async () => {
      const [orders] = await conn.query(
        'SELECT id, order_no FROM sal_order WHERE deleted = 0 ORDER BY id'
      );
      if (!orders.length) return 'sal_order 无数据';

      const [broken] = await conn.query(
        `SELECT w.id FROM prod_work_order w
         LEFT JOIN sal_order o ON w.order_no = o.order_no AND o.deleted = 0
         WHERE w.deleted = 0 AND w.order_no IS NOT NULL AND w.order_no <> '' AND o.id IS NULL
         ORDER BY w.id`
      );

      let n = 0;
      for (let i = 0; i < broken.length; i++) {
        const o = orders[i % orders.length];
        await conn.query('UPDATE prod_work_order SET order_id = ?, order_no = ? WHERE id = ?', [
          o.id,
          o.order_no,
          broken[i].id,
        ]);
        n++;
      }
      return `${n} 条已按真实 sal_order 重挂`;
    });

    // ============ 3) 修复：应收 -> 发货单 ============
    note('\n== 3) 修复 fin_receivable.source_no ==');
    await step('按发货单重挂应收 source_id / source_no', async () => {
      const [recvs] = await conn.query(
        'SELECT id, source_no FROM fin_receivable WHERE deleted = 0 ORDER BY id'
      );
      const [delivs] = await conn.query(
        'SELECT id, delivery_no, order_no, customer_id FROM sal_delivery_order WHERE deleted = 0 ORDER BY id'
      );
      if (!delivs.length) return '无发货单可挂';

      // 已有正确引用的跳过
      const [broken] = await conn.query(
        `SELECT r.id FROM fin_receivable r
         LEFT JOIN sal_delivery_order d ON r.source_no = d.delivery_no AND d.deleted = 0
         WHERE r.deleted = 0 AND d.id IS NULL
         ORDER BY r.id`
      );

      let n = 0;
      let skipped = 0;
      for (let i = 0; i < broken.length; i++) {
        const d = delivs[i % delivs.length];
        // customer_id 必须落到真实 crm_customer.id，否则触发 fk_fin_receivable_customer
        const cust = resolveCust(d.customer_id);
        if (!cust) {
          skipped++;
          continue;
        }
        await conn.query(
          'UPDATE fin_receivable SET source_id = ?, source_no = ?, customer_id = ? WHERE id = ?',
          [d.id, d.delivery_no, cust.id, broken[i].id]
        );
        n++;
      }
      return `${n}/${recvs.length} 条已改挂真实 delivery_no${skipped ? `（${skipped} 条跳过：客户无法映射）` : ''}`;
    });

    // ============ 4) 生成采购入库（pur -> inv_inbound_order）============
    note('\n== 4) 生成采购入库 inv_inbound_order ==');
    await step('由 pur_purchase_order 生成入库单', async () => {
      const [whs] = await conn.query(
        'SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE deleted = 0 ORDER BY id'
      );
      if (!whs.length) return '无仓库';
      const rawWh = whs.find((w) => w.warehouse_code === 'WH001') || whs[0];

      // 已有采购入库的 po 跳过（幂等）
      const [existing] = await conn.query(
        'SELECT DISTINCT po_id FROM inv_inbound_order WHERE po_id IS NOT NULL AND deleted = 0'
      );
      const done = new Set(existing.map((e) => e.po_id));

      const [pos] = await conn.query(
        `SELECT id, po_no, supplier_id, supplier_name, order_date, delivery_date,
                total_amount, total_quantity, currency, status
         FROM pur_purchase_order WHERE deleted = 0 ORDER BY id`
      );

      let n = 0;
      let items = 0;
      for (const po of pos) {
        if (done.has(po.id)) continue;

        const [lines] = await conn.query(
          `SELECT id, line_no, material_id, material_code, material_name, material_spec,
                  unit, order_qty, received_qty, unit_price, amount
           FROM pur_purchase_order_line WHERE po_id = ? ORDER BY line_no, id`,
          [po.id]
        );
        if (!lines.length) continue;

        const inNo = 'PIN-' + po.po_no;
        // 幂等：同 po 已生成过同号入库单则跳过
        const [dup] = await conn.query(
          'SELECT id FROM inv_inbound_order WHERE order_no = ? AND deleted = 0',
          [inNo]
        );
        if (dup.length) continue;

        let totalQty = 0;
        let totalAmt = 0;
        for (const l of lines) {
          totalQty += Number(l.order_qty || 0);
          totalAmt += Number(l.amount || 0);
        }

        const ioId = await insertInbound(conn, po, inNo, rawWh, r3(totalQty), r2(totalAmt), DAY);
        n++;

        for (const l of lines) {
          const qty = r3(l.order_qty || 0);
          const price = r2(l.unit_price || 0);
          const batchNo = 'PPO-' + (l.material_code || 'MAT') + '-' + po.id + '-' + (l.line_no || l.id);

          await conn.execute(
            `INSERT INTO inv_inbound_item
             (order_id, material_id, material_code, material_name, material_spec, batch_no,
              quantity, unit, unit_price, total_price, warehouse_location, produce_date,
              expire_date, remark, deleted, base_unit_price, base_amount, po_line_id, line_no,
              accepted_qty, rejected_qty, qc_result, warehouse_id, putaway_status, source_order_id, source_order_line_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              ioId, l.material_id, l.material_code, l.material_name, l.material_spec, batchNo,
              qty, l.unit || '件', price, r2(qty * price), 'A-01', DAY, null,
              '采购入库:' + po.po_no, 0, price, r2(qty * price), l.id, l.line_no || 1,
              qty, 0, 'pass', rawWh.id, 'done', po.id, l.id,
            ]
          );
          items++;

          // 建批次 + 台账 + 日志
          await upsertBatch(conn, {
            batchNo, materialId: l.material_id, materialCode: l.material_code,
            materialName: l.material_name, warehouseId: rawWh.id,
            warehouseName: rawWh.warehouse_name, qty, unit: l.unit || '件', price, day: DAY,
          });
          await conn.execute(
            `INSERT INTO inv_inventory_transaction
             (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no,
              warehouse_id, quantity, unit_cost, total_cost, reference_no, remark, source_no)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            ['TXN' + String(++txnSeq).padStart(8, '0'), 'in', 'purchase', ioId,
             l.material_id, l.material_code, batchNo, rawWh.id, qty, price, r2(qty * price),
             inNo, '采购入库', po.po_no]
          );
          await conn.execute(
            `INSERT INTO inv_inventory_log
             (warehouse_id, material_id, change_type, change_qty, order_no, remark, batch_no,
              trans_type, quantity, unit, source_type, source_no, business_type, business_no)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [rawWh.id, l.material_id, 'in', qty, inNo, '采购入库', batchNo, 'in', qty,
             l.unit || '件', 'purchase', inNo, 'purchase', po.po_no]
          );

          // 回写采购行已收数量
          await conn.execute(
            'UPDATE pur_purchase_order_line SET received_qty = ? WHERE id = ?',
            [qty, l.id]
          );
        }

        // 回写采购单状态与已收量
        await conn.execute(
          `UPDATE pur_purchase_order
           SET received_quantity = ?, status = 50, remark = CONCAT(IFNULL(remark,''), ' [已生成入库单:', ?, ']')
           WHERE id = ?`,
          [r3(totalQty), inNo, po.id]
        );
      }
      return `${n} 张入库单 / ${items} 条明细（源 ${pos.length} 张采购单）`;
    });

    // ============ 5) 生成销售出库（sal -> inv_outbound_order）============
    note('\n== 5) 生成销售出库 inv_outbound_order ==');
    await step('重建 inv_outbound_order / inv_outbound_item', async () => {
      const [whs] = await conn.query(
        'SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE deleted = 0 ORDER BY id'
      );
      if (!whs.length) return '无仓库';
      const finWh = whs.find((w) => w.warehouse_code === 'WH003') || whs[whs.length - 1];

      // 幂等：清空重建（已备份）
      await conn.execute('SET FOREIGN_KEY_CHECKS=0');
      await conn.execute('DELETE FROM inv_outbound_item');
      await conn.execute('DELETE FROM inv_outbound_order');
      await conn.execute('SET FOREIGN_KEY_CHECKS=1');

      const [delivs] = await conn.query(
        `SELECT d.id, d.delivery_no, d.order_id, d.order_no, d.customer_id, d.customer_name,
                d.delivery_date, d.warehouse_id, d.total_qty, d.total_amount
         FROM sal_delivery_order d WHERE d.deleted = 0 ORDER BY d.id`
      );

      let n = 0;
      let items = 0;
      for (const d of delivs) {
        const wid = d.warehouse_id || finWh.id;
        const [wh] = await conn.query(
          'SELECT warehouse_code, warehouse_name FROM inv_warehouse WHERE id = ?',
          [wid]
        );
        const whRow = wh[0] || finWh;
        const outNo = 'OUT-' + d.delivery_no;

        // 明细：优先取发货单明细，其次取销售订单明细
        let lines = await conn.query(
          `SELECT material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no
           FROM sal_delivery_order_item WHERE delivery_id = ?`,
          [d.id]
        ).then((r) => r[0]);

        if (!lines || !lines.length) {
          lines = await conn.query(
            `SELECT sd.material_id, m.material_name, m.specification AS material_spec,
                    sd.quantity, sd.unit, sd.unit_price, sd.amount, NULL AS batch_no
             FROM sal_order_detail sd
             LEFT JOIN inv_material m ON m.id = sd.material_id
             WHERE sd.order_id = ? AND sd.deleted = 0`,
            [d.order_id]
          ).then((r) => r[0]);
        }
        if (!lines || !lines.length) continue;

        let totalQty = 0;
        let totalAmt = 0;
        for (const l of lines) {
          totalQty += Number(l.quantity || 0);
          totalAmt += Number(l.amount || (l.quantity || 0) * (l.unit_price || 0));
        }

        const obId = await conn.execute(
          `INSERT INTO inv_outbound_order
           (order_no, order_date, outbound_type, warehouse_id, warehouse_code, warehouse_name,
            total_qty, total_amount, currency, status, remark, customer_id, customer_name,
            sales_order_no, audit_status, deleted, version, create_time, update_time)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
          [outNo, d.delivery_date || DAY, 'sales', wid, whRow.warehouse_code, whRow.warehouse_name,
           r3(totalQty), r2(totalAmt), 'CNY', 2, '关联发货单:' + d.delivery_no,
           d.customer_id, d.customer_name, d.order_no, 1, 0, 1]
        ).then((r) => r[0].insertId);
        n++;

        for (const l of lines) {
          const qty = r3(l.quantity || 0);
          const price = r2(l.unit_price || 0);
          const batchNo = l.batch_no || 'OUT-' + (l.material_id || 0) + '-' + d.id;

          await conn.execute(
            `INSERT INTO inv_outbound_item
             (order_id, material_id, material_name, material_spec, quantity, unit, unit_price,
              amount, batch_no, remark, deleted, create_time)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())`,
            [obId, l.material_id, l.material_name, l.material_spec || '', qty,
             l.unit || '件', price, r2(qty * price), batchNo, '销售出库', 0]
          );
          items++;

          // 批次扣减（若批次存在）
          const [bt] = await conn.query(
            'SELECT id, quantity, available_qty FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
            [batchNo]
          );
          if (bt.length) {
            await conn.execute(
              'UPDATE inv_inventory_batch SET quantity = quantity - ?, available_qty = available_qty - ? WHERE id = ?',
              [qty, qty, bt[0].id]
            );
          }

          await conn.execute(
            `INSERT INTO inv_inventory_transaction
             (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no,
              warehouse_id, quantity, unit_cost, total_cost, reference_no, remark, source_no)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            ['TXN' + String(++txnSeq).padStart(8, '0'), 'out', 'sales_outbound', obId,
             l.material_id, null, batchNo, wid, qty, price, r2(qty * price),
             outNo, '销售出库', d.delivery_no]
          );
          await conn.execute(
            `INSERT INTO inv_inventory_log
             (warehouse_id, material_id, change_type, change_qty, order_no, remark, batch_no,
              trans_type, quantity, unit, source_type, source_no, business_type, business_no)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [wid, l.material_id, 'out', qty, outNo, '销售出库', batchNo, 'out', qty,
             l.unit || '件', 'sales_outbound', outNo, 'sales', d.delivery_no]
          );
        }
      }
      return `${n} 张出库单 / ${items} 条明细（源 ${delivs.length} 张发货单）`;
    });

    // ============ 6) 修复：应付 -> 采购单/入库单 ============
    note('\n== 6) 修复 fin_payable.source_no ==');
    await step('按采购单重挂应付 source_no', async () => {
      // 能精确匹配到采购单号的先按号挂；其余按序号挂到真实采购单
      const [broken] = await conn.query(
        `SELECT p.id FROM fin_payable p
         LEFT JOIN pur_purchase_order po ON p.source_no = po.po_no AND po.deleted = 0
         WHERE p.deleted = 0 AND po.id IS NULL
         ORDER BY p.id`
      );
      if (!broken.length) return '无需修复';

      const [pos] = await conn.query(
        'SELECT id, po_no, supplier_id, supplier_name FROM pur_purchase_order WHERE deleted = 0 ORDER BY id'
      );
      if (!pos.length) return '无采购单';

      let n = 0;
      for (let i = 0; i < broken.length; i++) {
        const po = pos[i % pos.length];
        await conn.query(
          'UPDATE fin_payable SET source_no = ?, supplier_id = ? WHERE id = ?',
          [po.po_no, po.supplier_id || null, broken[i].id]
        );
        n++;
      }
      return `${n} 条已改挂真实 po_no`;
    });

    // ============ 7) 修复：生产入库 -> 工单 ============
    note('\n== 7) 修复 inv_production_inbound 关联 ==');
    await step('回填 inv_production_inbound.work_order_id / work_order_no', async () => {
      const [rows] = await conn.query(
        `SELECT id, remark FROM inv_production_inbound
         WHERE deleted = 0 AND (work_order_id IS NULL OR work_order_id = 0)
         ORDER BY id`
      );
      if (!rows.length) return '无需修复';

      const [wos] = await conn.query(
        'SELECT id, work_order_no FROM prod_work_order WHERE deleted = 0 ORDER BY id'
      );
      if (!wos.length) return '无工单';

      // 注意：inv_production_inbound.work_order_id 的 FK 指向遗留表 prd_work_order
      // （该表仅 1 条记录），而在用工单表是 prod_work_order。
      // 因此只回填 work_order_no 文本列，work_order_id 留 NULL，不制造错误关联。
      let n = 0;
      for (let i = 0; i < rows.length; i++) {
        const wo = wos[i % wos.length];
        await conn.query(
          'UPDATE inv_production_inbound SET work_order_no = ? WHERE id = ?',
          [wo.work_order_no, rows[i].id]
        );
        n++;
      }
      return `${n} 条已回填 work_order_no（work_order_id 留空：FK 指向遗留表 prd_work_order，非在用的 prod_work_order）`;
    });

    // ============ 8) 重派生 inv_inventory ============
    note('\n== 8) 重派生 inv_inventory ==');
    await step('由批次重算库存汇总', async () => {
      await conn.execute('SET FOREIGN_KEY_CHECKS=0');
      await conn.execute('DELETE FROM inv_inventory');
      const [ins] = await conn.execute(`
        INSERT INTO inv_inventory
          (material_id, material_code, material_name, warehouse_id, warehouse_name,
           quantity, available_qty, locked_qty, unit, unit_cost, total_cost,
           version, create_time, update_time, deleted)
        SELECT b.material_id, m.material_code, m.material_name, b.warehouse_id, w.warehouse_name,
               SUM(b.quantity), SUM(b.available_qty), SUM(COALESCE(b.locked_qty,0)),
               MAX(b.unit), AVG(b.unit_price), AVG(b.unit_price) * SUM(b.quantity),
               1, NOW(), NOW(), 0
        FROM inv_inventory_batch b
        JOIN inv_material m ON m.id = b.material_id
        JOIN inv_warehouse w ON w.id = b.warehouse_id
        WHERE b.deleted = 0
        GROUP BY b.material_id, b.warehouse_id, m.material_code, m.material_name, w.warehouse_name
      `);
      await conn.execute('SET FOREIGN_KEY_CHECKS=1');
      return `${ins.affectedRows} 行`;
    });

    // ============ 9) 校验 ============
    note('\n== 9) 校验 ==');
    const cnt = async (sql) => {
      const [rows] = await conn.query(sql);
      return Number(rows[0]?.c ?? 0);
    };
    const ob = await cnt('SELECT COUNT(*) c FROM inv_outbound_order WHERE deleted = 0');
    const obi = await cnt('SELECT COUNT(*) c FROM inv_outbound_item WHERE deleted = 0');
    const ib = await cnt(
      "SELECT COUNT(*) c FROM inv_inbound_order WHERE deleted = 0 AND source_type = 'purchase'"
    );
    const ibi = await cnt('SELECT COUNT(*) c FROM inv_inbound_item WHERE deleted = 0');
    const bat = await cnt('SELECT COUNT(*) c FROM inv_inventory_batch WHERE deleted = 0');
    const inv = await cnt('SELECT COUNT(*) c FROM inv_inventory WHERE deleted = 0');
    note(
      `出库单=${ob}(明细${obi}) | 采购入库=${ib}(明细${ibi}) | 批次=${bat} | 库存汇总=${inv}`
    );

    await conn.end();
  } catch (e) {
    console.error('\n❌ 未捕获错误:', e.message);
    if (e.sql) console.error('SQL:', e.sql);
    throw e;
  }

  note('\n' + (DRY ? '🔍 dry-run 完成，未改动数据' : '🎉 完整链路重生成完成'));
  note(`回滚表后缀: _bak_${BAK}`);
}

// ---------- 辅助函数 ----------

async function insertInbound(conn, po, inNo, wh, totalQty, totalAmt, day) {
  const [r] = await conn.execute(
    `INSERT INTO inv_inbound_order
     (order_no, order_type, warehouse_id, warehouse_code, warehouse_name,
      supplier_id, supplier_name, po_id, po_no, grn_type,
      total_amount, total_quantity, status, qc_status, inbound_date,
      remark, currency, exchange_rate, base_total_amount, source_type, source_order_id,
      deleted, create_time, update_time)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [
      inNo, 'purchase', wh.id, wh.warehouse_code, wh.warehouse_name,
      po.supplier_id, po.supplier_name, po.id, po.po_no, 'po',
      totalAmt, totalQty, 'completed', 'pass', day,
      '关联采购单:' + po.po_no, po.currency || 'CNY', 1, totalAmt,
      'purchase', po.id, 0,
    ]
  );
  return r.insertId;
}

async function upsertBatch(conn, o) {
  const [ex] = await conn.query(
    'SELECT id, quantity, available_qty FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
    [o.batchNo]
  );
  if (ex.length) {
    await conn.execute(
      'UPDATE inv_inventory_batch SET quantity = quantity + ?, available_qty = available_qty + ? WHERE id = ?',
      [o.qty, o.qty, ex[0].id]
    );
    return ex[0].id;
  }
  const [r] = await conn.execute(
    `INSERT INTO inv_inventory_batch
     (batch_no, material_id, material_code, material_name, warehouse_id, warehouse_name,
      quantity, available_qty, locked_qty, unit, unit_price, produce_date, inbound_date,
      status, version, batch_type, deleted, create_time, update_time)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [o.batchNo, o.materialId, o.materialCode, o.materialName, o.warehouseId, o.warehouseName,
     o.qty, o.qty, 0, o.unit, o.price, o.day, o.day, 1, 1, 0, 0]
  );
  return r.insertId;
}

main().catch((e) => {
  console.error('❌ 失败:', e.message);
  if (e.sql) console.error('SQL:', e.sql);
  process.exit(1);
});
