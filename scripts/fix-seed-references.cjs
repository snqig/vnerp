/**
 * 修复种子数据的跨模块引用断裂（幂等，可重复执行）
 *
 * 根因：种子脚本按 1..N 顺序假设主键，而真实表因历史数据主键已偏移
 *   - mdm_product.id   实际 44..53  （种子按 1..10 写入 prod_work_order.product_id）
 *   - crm_customer.id  实际 61..70  （种子按 11..20 写入 fin_receivable.customer_id）
 *   - 应收/应付的 source_no 指向的单号与源表单号命名不一致
 *
 * 修法：按「编号/名称」反查真实主键并回填，而不是硬编码 ID。
 * 只 UPDATE 当前为孤儿（JOIN 不到父表）的行，已有正确引用的行不动。
 */
const mysql = require('mysql2/promise');

const CONN = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

const results = [];

async function tableExists(conn, t) {
  const [r] = await conn.query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',
    [t]
  );
  return r.length > 0;
}
async function colExists(conn, t, c) {
  const [r] = await conn.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    [t, c]
  );
  return r.length > 0;
}

async function step(label, fn) {
  try {
    const msg = await fn();
    results.push(`✅ ${label}${msg ? ' — ' + msg : ''}`);
  } catch (e) {
    results.push(`⚠️ ${label} 跳过: ${e.message}`);
  }
}

async function main() {
  const conn = await mysql.createConnection(CONN);

  // ----------------------------------------------
  // 1. prod_work_order.product_id / product_code
  //    按 product_name 反查 mdm_product（种子名称形如「标签产品01」，
  //    真实产品名不同，故退化为按序号映射：第 N 条工单 -> 第 N 个产品）
  // ----------------------------------------------
  await step('回填 prod_work_order.product_id', async () => {
    if (!(await tableExists(conn, 'prod_work_order'))) return '表不存在';
    if (!(await colExists(conn, 'prod_work_order', 'product_id'))) return '列不存在';

    // 取孤儿工单（product_id 为 0 / NULL / 指向不存在的产品），按 id 排序
    const [orphans] = await conn.query(
      `SELECT wo.id
       FROM prod_work_order wo
       LEFT JOIN mdm_product p ON wo.product_id = p.id AND p.deleted = 0
       WHERE wo.deleted = 0
         AND (wo.product_id IS NULL OR wo.product_id = 0 OR p.id IS NULL)
       ORDER BY wo.id`
    );
    if (!orphans.length) return '无孤儿工单';

    const [products] = await conn.query(
      'SELECT id, product_code, product_name FROM mdm_product WHERE deleted = 0 ORDER BY id'
    );
    if (!products.length) return 'mdm_product 无数据，无法映射';

    let n = 0;
    for (let i = 0; i < orphans.length; i++) {
      const p = products[i % products.length];
      await conn.query(
        'UPDATE prod_work_order SET product_id = ?, product_code = ?, product_name = ? WHERE id = ?',
        [p.id, p.product_code, p.product_name, orphans[i].id]
      );
      n++;
    }
    return `${n} 条工单已回填 product_id`;
  });

  // ----------------------------------------------
  // 2. fin_receivable.customer_id
  //    按 customer_id 在 crm_customer 中的相对序号映射，
  //    若 customer_name 能精确匹配则优先用名称匹配
  // ----------------------------------------------
  await step('回填 fin_receivable.customer_id', async () => {
    if (!(await tableExists(conn, 'fin_receivable'))) return '表不存在';
    if (!(await colExists(conn, 'fin_receivable', 'customer_id'))) return '列不存在';

    // 2a. 先按 customer_name 精确匹配
    let r = await conn.query(
      `UPDATE fin_receivable fr
       JOIN crm_customer c ON fr.customer_name = c.customer_name AND c.deleted = 0
       LEFT JOIN crm_customer c2 ON fr.customer_id = c2.id AND c2.deleted = 0
       SET fr.customer_id = c.id
       WHERE fr.deleted = 0 AND c2.id IS NULL`
    );
    const byName = r.affectedRows;

    // 2b. 剩余孤儿按序号映射到 crm_customer
    const [orphans] = await conn.query(
      `SELECT fr.id
       FROM fin_receivable fr
       LEFT JOIN crm_customer c ON fr.customer_id = c.id AND c.deleted = 0
       WHERE fr.deleted = 0 AND (fr.customer_id IS NULL OR fr.customer_id = 0 OR c.id IS NULL)
       ORDER BY fr.id`
    );
    let byIndex = 0;
    if (orphans.length) {
      const [custs] = await conn.query(
        'SELECT id FROM crm_customer WHERE deleted = 0 ORDER BY id'
      );
      if (custs.length) {
        for (let i = 0; i < orphans.length; i++) {
          const c = custs[i % custs.length];
          await conn.query('UPDATE fin_receivable SET customer_id = ? WHERE id = ?', [
            c.id,
            orphans[i].id,
          ]);
          byIndex++;
        }
      }
    }
    return `按名称 ${byName} 条, 按序号 ${byIndex} 条`;
  });

  // ----------------------------------------------
  // 3. fin_receivable / fin_payable 的 source_no
  //    这些单号在源表中确实不存在（种子数据各模块独立生成），
  //    不做强行改写（会造成业务语义错误），仅统计并报告。
  // ----------------------------------------------
  await step('统计 fin_receivable.source_no 孤儿', async () => {
    const [r] = await conn.query(
      `SELECT COUNT(*) AS n
       FROM fin_receivable fr
       LEFT JOIN sal_order so ON fr.source_no = so.order_no AND so.deleted = 0
       WHERE fr.deleted = 0 AND fr.source_no IS NOT NULL AND so.id IS NULL`
    );
    return `${r[0].n} 条 source_no 在 sal_order 中无对应（需业务确认，不自动改写）`;
  });

  await step('统计 fin_payable.source_no 孤儿', async () => {
    const [r] = await conn.query(
      `SELECT COUNT(*) AS n
       FROM fin_payable fp
       LEFT JOIN pur_purchase_order po ON fp.source_no = po.po_no AND po.deleted = 0
       WHERE fp.deleted = 0 AND fp.source_no IS NOT NULL AND po.id IS NULL`
    );
    return `${r[0].n} 条 source_no 在 pur_purchase_order 中无对应（需业务确认，不自动改写）`;
  });

  // ----------------------------------------------
  // 4. prd_screen_plate 指向 mdm_customer 的孤儿外键
  //    客户主表实为 crm_customer，mdm_customer 不存在 -> 该 FK 无法成立，直接删除
  // ----------------------------------------------
  await step('清理 prd_screen_plate 孤儿外键', async () => {
    const [r] = await conn.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_screen_plate'
         AND CONSTRAINT_NAME='fk_screen_plate_customer' AND REFERENCED_TABLE_NAME IS NOT NULL`
    );
    if (!r.length) return '不存在';
    await conn.query('ALTER TABLE prd_screen_plate DROP FOREIGN KEY fk_screen_plate_customer');
    return '已删除（客户主表实为 crm_customer，非 mdm_customer）';
  });

  await conn.end();

  console.log('\n===== 种子数据引用修复 =====');
  results.forEach((r) => console.log('  ' + r));
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  results.forEach((r) => console.log('  ' + r));
  process.exit(1);
});
