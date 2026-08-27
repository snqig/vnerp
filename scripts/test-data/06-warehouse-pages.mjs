/**
 * 仓储管理 8 个页面各 3 条关联数据生成
 *
 * 页面清单：
 *   1. 入庫管理     → inv_inbound_order + inv_inbound_item（已有3条，保留）
 *   2. 出庫管理     → inv_outbound_order + inv_outbound_item（已有3条，保留）
 *   3. 库存查询     → inv_inventory（整理为3条有意义的记录）
 *   4. 分切管理     → inv_cutting_record + inv_cutting_detail（已有3条，保留）
 *   5. 库存调拨     → inv_transfer_order + inv_transfer_item（重置为3条）
 *   6. 库存盘点     → inv_stocktaking + inv_stocktaking_item（重置为3条）
 *   7. 庫存調整     → inv_stock_adjust + inv_stock_adjust_item（新建3条）
 *   8. 生产入库     → inv_production_inbound + inv_production_inbound_item（新建3条）
 *
 * 关联逻辑：
 *   生产入库 → 关联工单 WO-2026-101/102/103
 *   库存调拨 → 原料仓→半成品仓/成品仓（满足生产需求）
 *   库存盘点 → 盘点原料仓/成品仓/油墨仓
 *   库存调整 → 基于盘点差异调整库存
 *   库存查询 → 反映调拨/调整后的当前库存
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
  multipleStatements: true,
};

const round2 = (n) => Math.round(n * 100) / 100;

async function getRow(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  if (rows.length === 0) throw new Error(`查询无结果: ${sql}`);
  return rows[0];
}

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  // ━━━ 动态查询主数据 ━━━
  const wh1 = await getRow(conn, "SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE warehouse_code='WH001' AND deleted=0");
  const wh2 = await getRow(conn, "SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE warehouse_code='WH002' AND deleted=0");
  const wh3 = await getRow(conn, "SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE warehouse_code='WH003' AND deleted=0");
  const wh5 = await getRow(conn, "SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE warehouse_code='WH005' AND deleted=0");

  const matPVC = await getRow(conn, "SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE material_code='MAT030' AND deleted=0");
  const matPE = await getRow(conn, "SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE material_code='MAT031' AND deleted=0");
  const matInk = await getRow(conn, "SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE material_code='MAT035' AND deleted=0");
  const matLabel = await getRow(conn, "SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE material_code='MAT011' AND deleted=0");
  const matWasher = await getRow(conn, "SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE material_code='MAT012' AND deleted=0");
  const matPhone = await getRow(conn, "SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE material_code='MAT013' AND deleted=0");

  const wo1 = await getRow(conn, "SELECT id, work_order_no FROM prd_work_order WHERE work_order_no='WO-2026-101' AND deleted=0");
  const wo2 = await getRow(conn, "SELECT id, work_order_no FROM prd_work_order WHERE work_order_no='WO-2026-102' AND deleted=0");
  const wo3 = await getRow(conn, "SELECT id, work_order_no FROM prd_work_order WHERE work_order_no='WO-2026-103' AND deleted=0");

  console.log(`  仓库: WH001=${wh1.id}, WH002=${wh2.id}, WH003=${wh3.id}, WH005=${wh5.id}`);
  console.log(`  物料: PVC=${matPVC.id}, PE=${matPE.id}, 油墨=${matInk.id}, 标签=${matLabel.id}`);
  console.log(`  工单: WO-101=${wo1.id}, WO-102=${wo2.id}, WO-103=${wo3.id}`);

  // ━━━ 清空需要重建的表 ━━━
  console.log('\n━━━ 清空相关表 ━━━');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  const truncateTables = [
    'inv_stock_adjust_item', 'inv_stock_adjust',
    'inv_production_inbound_item', 'inv_production_inbound',
    'inv_stocktaking_item', 'inv_stocktaking',
    'inv_transfer_item', 'inv_transfer_order',
    'inv_inventory',
  ];
  for (const t of truncateTables) {
    await conn.execute(`TRUNCATE TABLE \`${t}\``);
    console.log(`  [ok] TRUNCATE ${t}`);
  }
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

  // ━━━ 事务包裹 ━━━
  await conn.beginTransaction();
  console.log('\n━━━ 事务已开启 ━━━');

  try {
    // ═══════════════════════════════════════════════
    // 1. 生产入库（inv_production_inbound）— 3条
    // 关联工单 WO-2026-101/102/103
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 1. 生产入库（3条，关联工单）━━━');

    // 生产入库1: WO-2026-101 → 空调标签5000张 → 成品仓
    const [pi1] = await conn.execute(
      `INSERT INTO inv_production_inbound
        (inbound_no, work_order_id, work_order_no, warehouse_id, inbound_date, operator_name, qc_status, status, remark)
       VALUES (?, ?, ?, ?, '2026-07-10', '张三', 'pass', 2, 'WO-2026-101完工入库5000张')`,
      ['PINB-2026-001', wo1.id, 'WO-2026-101', wh3.id]
    );
    await conn.execute(
      `INSERT INTO inv_production_inbound_item
        (inbound_id, material_id, material_code, material_name, quantity, unit, batch_no)
       VALUES (?, ?, ?, ?, 5000, '张', 'B20260710-FIN')`,
      [pi1.insertId, matLabel.id, matLabel.material_code, matLabel.material_name]
    );
    console.log(`  PINB-2026-001: WO-2026-101 → 空调标签 5000张 → WH003(成品仓)`);

    // 生产入库2: WO-2026-102 → 洗衣机面板1500张 → 成品仓
    const [pi2] = await conn.execute(
      `INSERT INTO inv_production_inbound
        (inbound_no, work_order_id, work_order_no, warehouse_id, inbound_date, operator_name, qc_status, status, remark)
       VALUES (?, ?, ?, ?, '2026-07-18', '李四', 'pass', 2, 'WO-2026-102部分完工1500张')`,
      ['PINB-2026-002', wo2.id, 'WO-2026-102', wh3.id]
    );
    await conn.execute(
      `INSERT INTO inv_production_inbound_item
        (inbound_id, material_id, material_code, material_name, quantity, unit, batch_no)
       VALUES (?, ?, ?, ?, 1500, '张', 'B20260718-FIN')`,
      [pi2.insertId, matWasher.id, matWasher.material_code, matWasher.material_name]
    );
    console.log(`  PINB-2026-002: WO-2026-102 → 洗衣机面板 1500张 → WH003(成品仓)`);

    // 生产入库3: WO-2026-103 → 手机标签2000张 → 成品仓（部分完工）
    const [pi3] = await conn.execute(
      `INSERT INTO inv_production_inbound
        (inbound_no, work_order_id, work_order_no, warehouse_id, inbound_date, operator_name, qc_status, status, remark)
       VALUES (?, ?, ?, ?, '2026-07-22', '王五', 'partial', 1, 'WO-2026-103部分完工2000张')`,
      ['PINB-2026-003', wo3.id, 'WO-2026-103', wh3.id]
    );
    await conn.execute(
      `INSERT INTO inv_production_inbound_item
        (inbound_id, material_id, material_code, material_name, quantity, unit, batch_no)
       VALUES (?, ?, ?, ?, 2000, '张', 'B20260722-FIN')`,
      [pi3.insertId, matPhone.id, matPhone.material_code, matPhone.material_name]
    );
    console.log(`  PINB-2026-003: WO-2026-103 → 手机标签 2000张 → WH003(成品仓)`);

    // ═══════════════════════════════════════════════
    // 2. 库存调拨（inv_transfer_order）— 3条
    // 原料仓→半成品仓（满足生产领料需求）
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 2. 库存调拨（3条，原料→车间）━━━');

    // 调拨1: PVC薄膜 300M → WH001→WH002
    const [tf1] = await conn.execute(
      `INSERT INTO inv_transfer_order
        (transfer_no, type, from_warehouse_id, to_warehouse_id, status, applicant_id, applicant_name, operator_name, out_time, in_time, total_qty, total_amount, remark)
       VALUES (?, 1, ?, ?, 2, 1, '张三', '张三', '2026-07-06 10:00:00', '2026-07-06 14:00:00', 300, 2550.00, '调拨PVC薄膜到半成品仓供生产')`,
      ['TF-2026-101', wh1.id, wh2.id]
    );
    await conn.execute(
      `INSERT INTO inv_transfer_item
        (transfer_id, material_id, material_code, material_name, batch_no, quantity, out_quantity, in_quantity, unit, unit_price, amount)
       VALUES (?, ?, ?, ?, 'B20260701-PVC', 300, 300, 300, 'M', 8.50, 2550.00)`,
      [tf1.insertId, matPVC.id, matPVC.material_code, matPVC.material_name]
    );
    console.log(`  TF-2026-101: PVC薄膜 300M → WH001→WH002`);

    // 调拨2: PE薄膜 200M → WH001→WH002
    const [tf2] = await conn.execute(
      `INSERT INTO inv_transfer_order
        (transfer_no, type, from_warehouse_id, to_warehouse_id, status, applicant_id, applicant_name, operator_name, out_time, in_time, total_qty, total_amount, remark)
       VALUES (?, 1, ?, ?, 2, 1, '张三', '张三', '2026-07-07 10:00:00', '2026-07-07 14:00:00', 200, 1240.00, '调拨PE薄膜到半成品仓供生产')`,
      ['TF-2026-102', wh1.id, wh2.id]
    );
    await conn.execute(
      `INSERT INTO inv_transfer_item
        (transfer_id, material_id, material_code, material_name, batch_no, quantity, out_quantity, in_quantity, unit, unit_price, amount)
       VALUES (?, ?, ?, ?, 'B20260703-PE', 200, 200, 200, 'M', 6.20, 1240.00)`,
      [tf2.insertId, matPE.id, matPE.material_code, matPE.material_name]
    );
    console.log(`  TF-2026-102: PE薄膜 200M → WH001→WH002`);

    // 调拨3: 空调标签 1000张 → WH003→WH004（成品→辅料仓，客户自提）
    const wh4 = await getRow(conn, "SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE warehouse_code='WH004' AND deleted=0");
    const [tf3] = await conn.execute(
      `INSERT INTO inv_transfer_order
        (transfer_no, type, from_warehouse_id, to_warehouse_id, status, applicant_id, applicant_name, operator_name, out_time, in_time, total_qty, total_amount, remark)
       VALUES (?, 2, ?, ?, 2, 1, '李四', '李四', '2026-07-15 10:00:00', '2026-07-15 14:00:00', 1000, 500.00, '调拨成品到辅料仓待发货')`,
      ['TF-2026-103', wh3.id, wh4.id]
    );
    await conn.execute(
      `INSERT INTO inv_transfer_item
        (transfer_id, material_id, material_code, material_name, batch_no, quantity, out_quantity, in_quantity, unit, unit_price, amount)
       VALUES (?, ?, ?, ?, 'B20260710-FIN', 1000, 1000, 1000, '张', 0.50, 500.00)`,
      [tf3.insertId, matLabel.id, matLabel.material_code, matLabel.material_name]
    );
    console.log(`  TF-2026-103: 空调标签 1000张 → WH003→WH004`);

    // ═══════════════════════════════════════════════
    // 3. 库存盘点（inv_stocktaking）— 3条
    // 盘点原料仓/成品仓/油墨仓
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 3. 库存盘点（3条，原料/成品/油墨仓）━━━');

    // 盘点1: 原料仓 - PVC薄膜
    const [st1] = await conn.execute(
      `INSERT INTO inv_stocktaking
        (taking_no, taking_type, warehouse_id, status, taking_date, operator_id, operator_name, remark)
       VALUES (?, 1, ?, 2, '2026-07-15', 1, '张三', '原料仓PVC薄膜盘点')`,
      ['CT-2026-101', wh1.id]
    );
    await conn.execute(
      `INSERT INTO inv_stocktaking_item
        (taking_id, material_id, material_code, material_name, system_qty, actual_qty, diff_qty, unit, batch_no, remark)
       VALUES (?, ?, ?, ?, 550, 548, -2, 'M', 'B20260701-PVC', '损耗2M')`,
      [st1.insertId, matPVC.id, matPVC.material_code, matPVC.material_name]
    );
    console.log(`  CT-2026-101: 原料仓 PVC薄膜 账面550 实盘548 差异-2`);

    // 盘点2: 成品仓 - 空调标签
    const [st2] = await conn.execute(
      `INSERT INTO inv_stocktaking
        (taking_no, taking_type, warehouse_id, status, taking_date, operator_id, operator_name, remark)
       VALUES (?, 1, ?, 2, '2026-07-16', 1, '李四', '成品仓空调标签盘点')`,
      ['CT-2026-102', wh3.id]
    );
    await conn.execute(
      `INSERT INTO inv_stocktaking_item
        (taking_id, material_id, material_code, material_name, system_qty, actual_qty, diff_qty, unit, batch_no, remark)
       VALUES (?, ?, ?, ?, 2000, 2005, 5, '张', 'B20260710-FIN', '多出5张')`,
      [st2.insertId, matLabel.id, matLabel.material_code, matLabel.material_name]
    );
    console.log(`  CT-2026-102: 成品仓 空调标签 账面2000 实盘2005 差异+5`);

    // 盘点3: 油墨仓 - 丝印油墨
    const [st3] = await conn.execute(
      `INSERT INTO inv_stocktaking
        (taking_no, taking_type, warehouse_id, status, taking_date, operator_id, operator_name, remark)
       VALUES (?, 1, ?, 2, '2026-07-17', 1, '王五', '油墨仓丝印油墨盘点')`,
      ['CT-2026-103', wh5.id]
    );
    await conn.execute(
      `INSERT INTO inv_stocktaking_item
        (taking_id, material_id, material_code, material_name, system_qty, actual_qty, diff_qty, unit, batch_no, remark)
       VALUES (?, ?, ?, ?, 50, 49, -1, 'kg', 'B20260705-INK', '挥发损耗1kg')`,
      [st3.insertId, matInk.id, matInk.material_code, matInk.material_name]
    );
    console.log(`  CT-2026-103: 油墨仓 丝印油墨 账面50 实盘49 差异-1`);

    // ═══════════════════════════════════════════════
    // 4. 庫存調整（inv_stock_adjust）— 3条
    // 基于盘点差异调整库存
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 4. 庫存調整（3条，基于盘点差异）━━━');

    // 调整1: 原料仓PVC薄膜 -2M（基于CT-2026-101盘点差异）
    const [adj1] = await conn.execute(
      `INSERT INTO inv_stock_adjust
        (adjust_no, warehouse_id, adjust_date, adjust_type, operator_id, operator_name, status, total_qty, total_amount, remark)
       VALUES (?, ?, '2026-07-16', 2, 1, '张三', 2, -2, -17.00, '基于盘点CT-2026-101调整：PVC薄膜损耗2M')`,
      ['ADJ-2026-001', wh1.id]
    );
    await conn.execute(
      `INSERT INTO inv_stock_adjust_item
        (adjust_id, material_id, material_code, material_name, batch_no, before_qty, adjust_qty, after_qty, unit, unit_price, amount, reason)
       VALUES (?, ?, ?, ?, 'B20260701-PVC', 550, -2, 548, 'M', 8.50, -17.00, '盘点损耗')`,
      [adj1.insertId, matPVC.id, matPVC.material_code, matPVC.material_name]
    );
    console.log(`  ADJ-2026-001: PVC薄膜 550→548 (-2M) 基于盘点CT-2026-101`);

    // 调整2: 成品仓空调标签 +5张（基于CT-2026-102盘点差异）
    const [adj2] = await conn.execute(
      `INSERT INTO inv_stock_adjust
        (adjust_no, warehouse_id, adjust_date, adjust_type, operator_id, operator_name, status, total_qty, total_amount, remark)
       VALUES (?, ?, '2026-07-17', 1, 1, '李四', 2, 5, 2.50, '基于盘点CT-2026-102调整：空调标签多出5张')`,
      ['ADJ-2026-002', wh3.id]
    );
    await conn.execute(
      `INSERT INTO inv_stock_adjust_item
        (adjust_id, material_id, material_code, material_name, batch_no, before_qty, adjust_qty, after_qty, unit, unit_price, amount, reason)
       VALUES (?, ?, ?, ?, 'B20260710-FIN', 2000, 5, 2005, '张', 0.50, 2.50, '盘点盈余')`,
      [adj2.insertId, matLabel.id, matLabel.material_code, matLabel.material_name]
    );
    console.log(`  ADJ-2026-002: 空调标签 2000→2005 (+5张) 基于盘点CT-2026-102`);

    // 调整3: 油墨仓丝印油墨 -1kg（基于CT-2026-103盘点差异）
    const [adj3] = await conn.execute(
      `INSERT INTO inv_stock_adjust
        (adjust_no, warehouse_id, adjust_date, adjust_type, operator_id, operator_name, status, total_qty, total_amount, remark)
       VALUES (?, ?, '2026-07-18', 2, 1, '王五', 2, -1, -35.00, '基于盘点CT-2026-103调整：油墨挥发损耗1kg')`,
      ['ADJ-2026-003', wh5.id]
    );
    await conn.execute(
      `INSERT INTO inv_stock_adjust_item
        (adjust_id, material_id, material_code, material_name, batch_no, before_qty, adjust_qty, after_qty, unit, unit_price, amount, reason)
       VALUES (?, ?, ?, ?, 'B20260705-INK', 50, -1, 49, 'kg', 35.00, -35.00, '挥发损耗')`,
      [adj3.insertId, matInk.id, matInk.material_code, matInk.material_name]
    );
    console.log(`  ADJ-2026-003: 丝印油墨 50→49 (-1kg) 基于盘点CT-2026-103`);

    // ═══════════════════════════════════════════════
    // 5. 库存查询（inv_inventory）— 3条有意义的汇总记录
    // 反映调拨/调整后的当前库存状态
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 5. 库存查询（3条，当前库存汇总）━━━');

    // 库存1: PVC薄膜 - 原料仓（扣减调拨300M + 调整-2M后）
    await conn.execute(
      `INSERT INTO inv_inventory
        (material_id, material_code, material_name, warehouse_id, warehouse_name, quantity, available_qty, batch_no, unit, unit_cost, total_cost, safety_stock, version)
       VALUES (?, ?, ?, ?, '原材料仓', 548, 548, 'B20260701-PVC', 'M', 8.50, 4658.00, 100, 1)`,
      [matPVC.id, matPVC.material_code, matPVC.material_name, wh1.id]
    );
    console.log(`  PVC薄膜 @ 原料仓: 548M (安全库存100M)`);

    // 库存2: 空调标签 - 成品仓（生产入库5000 - 发货3000 + 调拨出1000 + 调整+5后）
    // 实际: 5000 - 3000(发货) - 1000(调拨到WH004) + 5(调整) = 1005
    await conn.execute(
      `INSERT INTO inv_inventory
        (material_id, material_code, material_name, warehouse_id, warehouse_name, quantity, available_qty, batch_no, unit, unit_cost, total_cost, safety_stock, version)
       VALUES (?, ?, ?, ?, '成品仓', 1005, 1005, 'B20260710-FIN', '张', 0.50, 502.50, 500, 1)`,
      [matLabel.id, matLabel.material_code, matLabel.material_name, wh3.id]
    );
    console.log(`  空调标签 @ 成品仓: 1005张 (安全库存500张)`);

    // 库存3: 丝印油墨 - 油墨仓（调整-1kg后）
    await conn.execute(
      `INSERT INTO inv_inventory
        (material_id, material_code, material_name, warehouse_id, warehouse_name, quantity, available_qty, batch_no, unit, unit_cost, total_cost, safety_stock, version)
       VALUES (?, ?, ?, ?, '油墨仓', 49, 49, 'B20260705-INK', 'kg', 35.00, 1715.00, 20, 1)`,
      [matInk.id, matInk.material_code, matInk.material_name, wh5.id]
    );
    console.log(`  丝印油墨 @ 油墨仓: 49kg (安全库存20kg)`);

    await conn.commit();
    console.log('\n✅ 事务已提交');
  } catch (e) {
    await conn.rollback();
    console.error('\n❌ 事务已回滚:', e.message);
    throw e;
  }

  // ━━━ 统计 ━━━
  console.log('\n━━━ 数据统计 ━━━');
  const summary = [
    ['入庫管理(采购)', 'SELECT COUNT(*) c FROM inv_inbound_order'],
    ['出庫管理', 'SELECT COUNT(*) c FROM inv_outbound_order'],
    ['库存查询', 'SELECT COUNT(*) c FROM inv_inventory'],
    ['分切管理', 'SELECT COUNT(*) c FROM inv_cutting_record'],
    ['库存调拨', 'SELECT COUNT(*) c FROM inv_transfer_order'],
    ['库存盘点', 'SELECT COUNT(*) c FROM inv_stocktaking'],
    ['庫存調整', 'SELECT COUNT(*) c FROM inv_stock_adjust'],
    ['生产入库', 'SELECT COUNT(*) c FROM inv_production_inbound'],
  ];
  for (const [name, sql] of summary) {
    const [r] = await conn.execute(sql);
    console.log(`  ${name.padEnd(16)} ${r[0].c} 条`);
  }

  await conn.end();
}

main().catch(e => { console.error('❌ 失败:', e.message); process.exit(1); });
