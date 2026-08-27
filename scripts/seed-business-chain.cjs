/*
 * 打样→发货 10 步业务链端到端数据打样
 * 写入权威表；生产定单落 prod_work_order（UI/API 只读此表，避免双表脱节）。
 * 真实表名修正：大料分小料=inv_cutting_record/_detail；发货明细=sal_delivery_detail；
 *               销售单=sal_order(+_detail)；成品质检=qc_inspection(inspection_type=2)；
 *               打样→生产衔接=eng_sample_to_mass。
 * 重跑即备份+清空+重建。
 */
const mysql = require('mysql2/promise');
const fs = require('fs');

const cfg = { host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };
const N = 10; // 业务实例组数
const BAK = '_bak_chain_20260817';
const DAY = '2026-08-17';

// 参与打样的表（重建前备份）
const TABLES = [
  'sal_sample_order', 'prd_standard_card', 'eng_sample_to_mass',
  'prod_work_order', 'prod_work_order_item', 'prod_work_order_material_req',
  'pur_request', 'pur_request_item', 'pur_purchase_order', 'pur_purchase_order_line',
  'inv_inbound_order', 'inv_inbound_item',
  'qc_incoming_inspection', 'qc_incoming_inspection_item',
  'inv_cutting_record', 'inv_cutting_detail',
  'prd_pick_order', 'prd_pick_order_item', 'prd_work_report', 'prd_finish_order',
  'qc_inspection',
  'sal_order', 'sal_order_detail', 'sal_delivery', 'sal_delivery_detail', 'fin_receivable',
  'inv_inventory_batch', 'inv_inventory', 'inv_inventory_transaction', 'inv_inventory_log',
];

function ins(table, cols, rows) {
  // rows: array of value-arrays
  const colSql = cols.join(', ');
  const placeholders = '(' + cols.map(() => '?').join(', ') + ')';
  const sql = `INSERT INTO ${table} (${colSql}) VALUES ${rows.map(() => placeholders).join(', ')}`;
  const params = [];
  for (const r of rows) for (const v of r) params.push(v);
  return [sql, params];
}

(async () => {
  const c = await mysql.createConnection(cfg);
  await c.query('SET FOREIGN_KEY_CHECKS=0');
  const log = [];
  const note = (m) => { log.push(m); console.log(m); };

  // ---- 参考行 ----
  const [wh] = await c.query('SELECT id, warehouse_name FROM inv_warehouse WHERE deleted=0 AND id IN (1,2,3)');
  const whMap = {}; wh.forEach(w => whMap[w.id] = w.warehouse_name);
  const [sup] = await c.query('SELECT id, supplier_name, supplier_code FROM pur_supplier WHERE deleted=0 LIMIT 3');
  const [cust] = await c.query('SELECT id, customer_name FROM crm_customer WHERE deleted=0 LIMIT 3');
  const [rawMat] = await c.query('SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE id=4'); // MAT004 不干胶PET银色(卷)
  const [prodMat] = await c.query('SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE id=1'); // MAT001 PET薄膜(成品)
  note(`refs: wh=${JSON.stringify(whMap)} sup=${sup.length} cust=${cust.length} rawMat=${rawMat[0].material_code} prodMat=${prodMat[0].material_code}`);

  // ---- 备份 ----
  for (const t of TABLES) {
    try {
      await c.query(`DROP TABLE IF EXISTS ${t}${BAK}`);
      await c.query(`CREATE TABLE ${t}${BAK} LIKE ${t}`);
      await c.query(`INSERT INTO ${t}${BAK} SELECT * FROM ${t}`);
      const [n] = await c.query(`SELECT COUNT(*) n FROM ${t}`);
      note(`bak ${t} -> ${t}${BAK} (rows ${n[0].n})`);
    } catch (e) { note(`bak ${t} SKIP: ${e.code}`); }
  }

  // ---- 清空（child→parent 顺序，关 FK） ----
  for (const t of TABLES) {
    try { await c.query(`DELETE FROM ${t}`); } catch (e) { note(`clear ${t} ERR ${e.code}`); }
  }
  note('cleared all chain tables');

  let batchId = 100000; // 自造批次 id 基线，避免与主库存冲突
  let transNo = 0;
  let consistency = { sample:0, stdcard:0, transfer:0, wo:0, pr:0, po:0, ib:0, qcin:0, cut:0, pick:0, wr:0, fo:0, qcf:0, so:0, dl:0, recv:0, batch:0, inv:0, txn:0, log:0 };

  for (let g = 1; g <= N; g++) {
    const g2 = String(g).padStart(2, '0');
    const supR = sup[g % sup.length];
    const custR = cust[g % cust.length];
    const rawQty = 100 + g * 10;          // 采购/入库大料量（卷）
    const cutSmall = Math.floor(rawQty / 2); // 分切出小料量
    const prodQty = 80 + g * 5;           // 生产成品量
    const delivQty = prodQty;             // 发货量

    // 1) 打样单
    const sampleNo = `SMP-${DAY}-${g2}`;
    await c.query(...ins('sal_sample_order',
      ['order_no','customer_id','customer_name','product_name','material_no','quantity','order_date','status','delivery_status','create_time','deleted'],
      [[sampleNo, custR.id, custR.customer_name, `标签产品${g2}`, prodMat[0].material_code, prodQty, DAY, 'completed', 'completed', DAY+' 09:00:00', 0]]));
    const [sampleRow] = await c.query('SELECT id FROM sal_sample_order WHERE order_no=?', [sampleNo]);
    consistency.sample++;

    // 1b) 标准卡
    const cardNo = `SC-${DAY}-${g2}`;
    await c.query(...ins('prd_standard_card',
      ['card_no','name','type','customer_id','customer_name','product_name','status','create_by','create_time','deleted'],
      [[cardNo, `标准卡${g2}`, 'process', custR.id, custR.customer_name, `标签产品${g2}`, 4, 1, DAY+' 10:00:00', 0]]));
    const [cardRow] = await c.query('SELECT id FROM prd_standard_card WHERE card_no=?', [cardNo]);
    consistency.stdcard++;

    // 2) 生产定单（权威表 prod_work_order，界面可见）
    const woNo = `WO-${DAY}-${g2}`;
    const soNo = `SO-${DAY}-${g2}`;
    await c.query(...ins('prod_work_order',
      ['work_order_no','order_no','customer_name','product_name','order_type','quantity','unit','status','priority','plan_start_date','plan_end_date','create_by','create_time','deleted'],
      [[woNo, soNo, custR.customer_name, `标签产品${g2}`, 0, prodQty, '张', 'confirmed', 'normal', DAY, DAY, 1, DAY+' 11:00:00', 0]]));
    const [woRow] = await c.query('SELECT id FROM prod_work_order WHERE work_order_no=?', [woNo]);
    consistency.wo++;

    // 2b) 打样→生产衔接表
    await c.query(...ins('eng_sample_to_mass',
      ['sample_order_id','sample_order_no','product_name','customer_id','customer_name','standard_card_id','standard_card_no','status','workorder_id','workorder_no','transfer_no','create_time','deleted'],
      [[sampleRow[0].id, sampleNo, `标签产品${g2}`, custR.id, custR.customer_name, cardRow[0].id, cardNo, 3, woRow[0].id, woNo, `TR-${DAY}-${g2}`, DAY+' 11:30:00', 0]]));
    consistency.transfer++;

    // 3) 采购申请 + 订单
    const prNo = `PR-${DAY}-${g2}`;
    await c.query(...ins('pur_request',
      ['request_no','request_date','request_type','request_dept','requester_name','total_amount','status','create_by','create_time','deleted'],
      [[prNo, DAY, 'material', '工程技术部', '张三', (rawQty*5).toFixed(2), 2, 1, DAY+' 12:00:00', 0]]));
    const [prRow] = await c.query('SELECT id FROM pur_request WHERE request_no=?', [prNo]);
    consistency.pr++;
    await c.query(...ins('pur_request_item',
      ['request_id','line_no','material_id','material_code','material_name','material_spec','material_unit','quantity','price','amount','supplier_name','create_time','update_time','deleted'],
      [[prRow[0].id, 1, rawMat[0].id, rawMat[0].material_code, rawMat[0].material_name, rawMat[0].specification, rawMat[0].unit, rawQty, 5, (rawQty*5).toFixed(2), supR.supplier_name, DAY+' 12:00:00', DAY+' 12:00:00', 0]]));

    const poNo = `PO-${DAY}-${g2}`;
    await c.query(...ins('pur_purchase_order',
      ['po_no','supplier_id','supplier_name','supplier_code','order_date','total_amount','total_quantity','tax_rate','tax_amount','grand_total','status','received_quantity','create_by','create_time','deleted','base_total_amount','base_tax_amount','base_grand_total'],
      [[poNo, supR.id, supR.supplier_name, supR.supplier_code, DAY, (rawQty*5).toFixed(2), rawQty, 13, (rawQty*5*0.13).toFixed(2), (rawQty*5*1.13).toFixed(2), 3, rawQty, 1, DAY+' 13:00:00', 0, (rawQty*5).toFixed(2), (rawQty*5*0.13).toFixed(2), (rawQty*5*1.13).toFixed(2)]]));
    const [poRow] = await c.query('SELECT id FROM pur_purchase_order WHERE po_no=?', [poNo]);
    consistency.po++;
    await c.query(...ins('pur_purchase_order_line',
      ['po_id','line_no','material_id','material_code','material_name','material_spec','unit','order_qty','received_qty','unit_price','amount','tax_rate','tax_amount','line_total','require_date','create_time','update_time','base_unit_price','base_amount','base_tax_amount','base_line_total'],
      [[poRow[0].id, 1, rawMat[0].id, rawMat[0].material_code, rawMat[0].material_name, rawMat[0].specification, rawMat[0].unit, rawQty, rawQty, 5, (rawQty*5).toFixed(2), 13, (rawQty*5*0.13).toFixed(2), (rawQty*5*1.13).toFixed(2), DAY, DAY+' 13:00:00', DAY+' 13:00:00', 5, (rawQty*5).toFixed(2), (rawQty*5*0.13).toFixed(2), (rawQty*5*1.13).toFixed(2)]]));

    // 4) 入库 + 库存批次（原材料仓）
    const ibNo = `IB-${DAY}-${g2}`;
    const rawBatch = `B${DAY}-RAW-${g2}`;
    await c.query(...ins('inv_inbound_order',
      ['order_no','order_type','warehouse_id','warehouse_code','warehouse_name','supplier_id','supplier_name','po_id','po_no','total_amount','total_quantity','status','qc_status','inbound_date','create_by','create_time','deleted','currency','source_type','source_order_id'],
      [[ibNo, 'purchase', 1, 'WH01', whMap[1], supR.id, supR.supplier_name, poRow[0].id, poNo, (rawQty*5).toFixed(2), rawQty, 'completed', 'pass', DAY, 1, DAY+' 14:00:00', 0, 'CNY', 'purchase', poRow[0].id]]));
    const [ibRow] = await c.query('SELECT id FROM inv_inbound_order WHERE order_no=?', [ibNo]);
    consistency.ib++;
    await c.query(...ins('inv_inbound_item',
      ['order_id','material_id','material_name','material_spec','batch_no','quantity','unit','unit_price','total_price','warehouse_location','produce_date','create_time','deleted','base_unit_price','base_amount','purchase_order_item_id','purchase_order_line_no'],
      [[ibRow[0].id, rawMat[0].id, rawMat[0].material_name, rawMat[0].specification, rawBatch, rawQty, rawMat[0].unit, 5, (rawQty*5).toFixed(2), 'A-01', DAY, DAY+' 14:00:00', 0, 5, (rawQty*5).toFixed(2), poRow[0].id, 1]]));
    const rawBatchId = ++batchId;
    await c.query(...ins('inv_inventory_batch',
      ['id','batch_no','material_id','material_name','warehouse_id','warehouse_name','quantity','available_qty','unit','unit_price','inbound_date','status','version','create_time','deleted'],
      [[rawBatchId, rawBatch, rawMat[0].id, rawMat[0].material_name, 1, whMap[1], rawQty, rawQty, rawMat[0].unit, 5, DAY, 1, 1, DAY+' 14:00:00', 0]]));
    consistency.batch++;
    await c.query(`INSERT INTO inv_inventory (material_id,material_code,material_name,warehouse_id,warehouse_name,quantity,available_qty,unit,unit_cost,total_cost,version,create_time,deleted) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,0) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity), available_qty=available_qty+VALUES(available_qty), total_cost=total_cost+VALUES(total_cost), unit_cost=VALUES(unit_cost), unit=VALUES(unit), material_name=VALUES(material_name), warehouse_name=VALUES(warehouse_name)`,
      [rawMat[0].id, rawMat[0].material_code, rawMat[0].material_name, 1, whMap[1], rawQty, rawQty, rawMat[0].unit, 5, (rawQty*5).toFixed(2), DAY+' 14:00:00']);
    consistency.inv++;
    transNo++;
    await c.query(...ins('inv_inventory_transaction',
      ['trans_no','trans_type','source_type','source_id','source_line_id','material_id','material_code','batch_no','warehouse_id','quantity','unit_cost','total_cost','reference_no','remark','create_by','create_time'],
      [[`TXN${String(transNo).padStart(6,'0')}`, 'in', 'purchase_inbound', ibRow[0].id, 1, rawMat[0].id, rawMat[0].material_code, rawBatch, 1, rawQty, 5, (rawQty*5).toFixed(2), ibNo, '采购入库', 1, DAY+' 14:00:00']]));
    consistency.txn++;
    await c.query(...ins('inv_inventory_log',
      ['warehouse_id','material_id','change_type','change_qty','order_no','remark','create_time'],
      [[1, rawMat[0].id, 'in', rawQty, ibNo, '采购入库', DAY+' 14:00:00']]));
    consistency.log++;

    // 5) 品管来料检
    const qcInNo = `QCIN-${DAY}-${g2}`;
    await c.query(...ins('qc_incoming_inspection',
      ['inspection_no','inspection_date','supplier_name','material_code','material_name','specification','batch_no','quantity','unit','inspection_type','inspection_result','inspector_name','create_time','update_time','deleted'],
      [[qcInNo, DAY, supR.supplier_name, rawMat[0].material_code, rawMat[0].material_name, rawMat[0].specification, rawBatch, rawQty, rawMat[0].unit, 'appearance', 'pass', '品管员甲', DAY+' 14:30:00', DAY+' 14:30:00', 0]]));
    const [qcInRow] = await c.query('SELECT id FROM qc_incoming_inspection WHERE inspection_no=?', [qcInNo]);
    consistency.qcin++;
    await c.query(...ins('qc_incoming_inspection_item',
      ['inspection_id','inspection_no','item_name','standard','actual_value','result','create_time','update_time','deleted'],
      [[qcInRow[0].id, qcInNo, '外观', '无破损', '合格', 'pass', DAY+' 14:30:00', DAY+' 14:30:00', 0]]));

    // 6) 大料分小料（分切）：大卷拆成小卷
    const cutNo = `CUT-${DAY}-${g2}`;
    await c.query(...ins('inv_cutting_record',
      ['record_no','source_label_id','source_label_no','original_width','cut_total_width','remain_width','operator_name','cut_time','status','create_time'],
      [[cutNo, rawBatchId, rawBatch, 600, cutSmall, rawQty - cutSmall, '分切工乙', DAY+' 15:00:00', 1, DAY+' 15:00:00']]));
    const [cutRow] = await c.query('SELECT id FROM inv_cutting_record WHERE record_no=?', [cutNo]);
    consistency.cut++;
    const smallBatch = `B${DAY}-SM-${g2}`;
    const smallBatchId = ++batchId;
    await c.query(...ins('inv_cutting_detail',
      ['record_id','new_label_id','new_label_no','cut_width','sequence','create_time'],
      [[cutRow[0].id, smallBatchId, smallBatch, cutSmall, 1, DAY+' 15:00:00']]));
    // 小料批次（仍原材料仓），并消耗大料批次余量
    await c.query(...ins('inv_inventory_batch',
      ['id','batch_no','material_id','material_name','warehouse_id','warehouse_name','quantity','available_qty','unit','unit_price','inbound_date','status','version','create_time','deleted'],
      [[smallBatchId, smallBatch, rawMat[0].id, rawMat[0].material_name, 1, whMap[1], cutSmall, cutSmall, rawMat[0].unit, 5, DAY, 1, 1, DAY+' 15:00:00', 0]]));
    consistency.batch++;
    await c.query('UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-? WHERE id=?', [cutSmall, cutSmall, rawBatchId]);
    transNo++;
    await c.query(...ins('inv_inventory_transaction',
      ['trans_no','trans_type','source_type','source_id','source_line_id','material_id','material_code','batch_no','warehouse_id','quantity','unit_cost','total_cost','reference_no','remark','create_by','create_time'],
      [[`TXN${String(transNo).padStart(6,'0')}`, 'in', 'cutting', cutRow[0].id, 1, rawMat[0].id, rawMat[0].material_code, smallBatch, 1, cutSmall, 5, (cutSmall*5).toFixed(2), cutNo, '分切产出小料', 1, DAY+' 15:00:00']]));
    consistency.txn++;

    // 7) 生产：领料 + 报工 + 完工
    const pickNo = `PK-${DAY}-${g2}`;
    await c.query(...ins('prd_pick_order',
      ['pick_no','work_order_id','warehouse_id','picker_name','total_qty','status','create_by','create_time','deleted'],
      [[pickNo, woRow[0].id, 1, '领料员丙', cutSmall, 1, 1, DAY+' 15:30:00', 0]]));
    const [pickRow] = await c.query('SELECT id FROM prd_pick_order WHERE pick_no=?', [pickNo]);
    consistency.pick++;
    await c.query(...ins('prd_pick_order_item',
      ['pick_order_id','material_id','material_name','material_spec','required_qty','actual_qty','batch_no','unit','create_time'],
      [[pickRow[0].id, rawMat[0].id, rawMat[0].material_name, rawMat[0].specification, cutSmall, cutSmall, smallBatch, rawMat[0].unit, DAY+' 15:30:00']]));
    await c.query('UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-? WHERE id=?', [cutSmall, cutSmall, smallBatchId]);
    await c.query('UPDATE inv_inventory SET quantity=quantity-?, available_qty=available_qty-? WHERE material_id=? AND warehouse_id=1', [cutSmall, cutSmall, rawMat[0].id]);

    const wrNo = `WR-${DAY}-${g2}`;
    await c.query(...ins('prd_work_report',
      ['report_no','work_order_id','work_order_no','process_name','operator_name','plan_qty','completed_qty','qualified_qty','defective_qty','scrap_qty','start_time','end_time','create_time','deleted'],
      [[wrNo, woRow[0].id, woNo, '印刷', '操作工丁', prodQty, prodQty, prodQty, 0, 0, DAY+' 16:00:00', DAY+' 18:00:00', DAY+' 18:00:00', 0]]));
    consistency.wr++;

    const foNo = `FO-${DAY}-${g2}`;
    await c.query(...ins('prd_finish_order',
      ['finish_no','work_order_id','warehouse_id','qualified_qty','defective_qty','status','create_by','create_time','deleted'],
      [[foNo, woRow[0].id, 3, prodQty, 0, 1, 1, DAY+' 18:30:00', 0]]));
    const [foRow] = await c.query('SELECT id FROM prd_finish_order WHERE finish_no=?', [foNo]);
    consistency.fo++;
    // 9) 成品入库批次（成品仓）
    const finBatch = `B${DAY}-FIN-${g2}`;
    const finBatchId = ++batchId;
    await c.query(...ins('inv_inventory_batch',
      ['id','batch_no','material_id','material_name','warehouse_id','warehouse_name','quantity','available_qty','unit','unit_price','inbound_date','status','version','create_time','deleted'],
      [[finBatchId, finBatch, prodMat[0].id, prodMat[0].material_name, 3, whMap[3], prodQty, prodQty, prodMat[0].unit, 8, DAY, 1, 1, DAY+' 18:30:00', 0]]));
    consistency.batch++;
    await c.query(`INSERT INTO inv_inventory (material_id,material_code,material_name,warehouse_id,warehouse_name,quantity,available_qty,unit,unit_cost,total_cost,version,create_time,deleted) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,0) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity), available_qty=available_qty+VALUES(available_qty), total_cost=total_cost+VALUES(total_cost), unit_cost=VALUES(unit_cost), unit=VALUES(unit), material_name=VALUES(material_name), warehouse_name=VALUES(warehouse_name)`,
      [prodMat[0].id, prodMat[0].material_code, prodMat[0].material_name, 3, whMap[3], prodQty, prodQty, prodMat[0].unit, 8, (prodQty*8).toFixed(2), DAY+' 18:30:00']);
    consistency.inv++;
    transNo++;
    await c.query(...ins('inv_inventory_transaction',
      ['trans_no','trans_type','source_type','source_id','source_line_id','material_id','material_code','batch_no','warehouse_id','quantity','unit_cost','total_cost','reference_no','remark','create_by','create_time'],
      [[`TXN${String(transNo).padStart(6,'0')}`, 'in', 'production_finish', foRow[0].id, 1, prodMat[0].id, prodMat[0].material_code, finBatch, 3, prodQty, 8, (prodQty*8).toFixed(2), foNo, '成品入库', 1, DAY+' 18:30:00']]));
    consistency.txn++;

    // 8) 成品质检
    const qcFNo = `QCF-${DAY}-${g2}`;
    await c.query(...ins('qc_inspection',
      ['inspection_no','inspection_type','source_type','source_no','material_id','batch_no','inspection_qty','qualified_qty','unqualified_qty','inspection_result','inspector','inspection_date','create_time','update_time','deleted','create_by','update_by'],
      [[qcFNo, 2, 'finish_order', foNo, prodMat[0].id, finBatch, prodQty, prodQty, 0, 1, '品管员甲', DAY, DAY+' 19:00:00', DAY+' 19:00:00', 0, 1, 1]]));
    consistency.qcf++;

    // 10) 销售单 + 发货 + 应收
    await c.query(...ins('sal_order',
      ['order_no','order_date','customer_id','contact_name','total_amount','tax_amount','total_with_tax','status','create_time','deleted','base_total_amount','base_tax_amount','base_grand_total'],
      [[soNo, DAY, custR.id, '采购联系人', (prodQty*8).toFixed(2), (prodQty*8*0.13).toFixed(2), (prodQty*8*1.13).toFixed(2), 1, DAY+' 19:30:00', 0, (prodQty*8).toFixed(2), (prodQty*8*0.13).toFixed(2), (prodQty*8*1.13).toFixed(2)]]));
    const [soRow] = await c.query('SELECT id FROM sal_order WHERE order_no=?', [soNo]);
    consistency.so++;
    await c.query(...ins('sal_order_detail',
      ['order_id','material_id','material_name','quantity','unit','unit_price','tax_rate','amount','tax_amount','total_amount','create_time','deleted'],
      [[soRow[0].id, prodMat[0].id, prodMat[0].material_name, delivQty, prodMat[0].unit, 8, 13, (delivQty*8).toFixed(2), (delivQty*8*0.13).toFixed(2), (delivQty*8*1.13).toFixed(2), DAY+' 19:30:00', 0]]));

    const dlNo = `DL-${DAY}-${g2}`;
    await c.query(...ins('sal_delivery',
      ['delivery_no','delivery_date','order_id','order_no','customer_id','customer_name','warehouse_id','total_amount','total_qty','status','create_by','create_time','deleted','version'],
      [[dlNo, DAY, soRow[0].id, soNo, custR.id, custR.customer_name, 3, (delivQty*8).toFixed(2), delivQty, 1, 1, DAY+' 20:00:00', 0, 0]]));
    const [dlRow] = await c.query('SELECT id FROM sal_delivery WHERE delivery_no=?', [dlNo]);
    consistency.dl++;
    await c.query(...ins('sal_delivery_detail',
      ['delivery_id','line_no','material_id','material_code','material_name','quantity','unit','unit_price','amount','batch_no','create_time','deleted'],
      [[dlRow[0].id, 1, prodMat[0].id, prodMat[0].material_code, prodMat[0].material_name, delivQty, prodMat[0].unit, 8, (delivQty*8).toFixed(2), finBatch, DAY+' 20:00:00', 0]]));
    // 发货扣减成品库存
    await c.query('UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-? WHERE id=?', [delivQty, delivQty, finBatchId]);
    await c.query('UPDATE inv_inventory SET quantity=quantity-?, available_qty=available_qty-? WHERE material_id=? AND warehouse_id=3', [delivQty, delivQty, prodMat[0].id]);
    transNo++;
    await c.query(...ins('inv_inventory_transaction',
      ['trans_no','trans_type','source_type','source_id','source_line_id','material_id','material_code','batch_no','warehouse_id','quantity','unit_cost','total_cost','reference_no','remark','create_by','create_time'],
      [[`TXN${String(transNo).padStart(6,'0')}`, 'out', 'delivery', dlRow[0].id, 1, prodMat[0].id, prodMat[0].material_code, finBatch, 3, delivQty, 8, (delivQty*8).toFixed(2), dlNo, '销售发货', 1, DAY+' 20:00:00']]));
    consistency.txn++;

    const recvNo = `AR-${DAY}-${g2}`;
    await c.query(...ins('fin_receivable',
      ['receivable_no','source_type','source_no','customer_id','amount','received_amount','balance','due_date','status','create_time','update_time','deleted','create_by','update_by'],
      [[recvNo, 1, dlNo, custR.id, (delivQty*8).toFixed(2), 0, (delivQty*8).toFixed(2), DAY, 1, DAY+' 20:00:00', DAY+' 20:00:00', 0, 1, 1]]));
    consistency.recv++;
  }

  await c.query('SET FOREIGN_KEY_CHECKS=1');
  await c.end();

  console.log('\n===== 一致性汇总 (组数 N=' + N + ') =====');
  console.log(JSON.stringify(consistency, null, 0));
  fs.writeFileSync('D:/dcprint/erp-project/_chain_result.txt', JSON.stringify(consistency, null, 2), 'utf8');
  console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
