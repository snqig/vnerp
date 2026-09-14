/**
 * 全模块关联种子器（一次性重建，幂等）。
 *
 * 策略：
 *  - 复用主数据锚点（客户/供应商/物料/产品/仓库/员工），全部从 DB 实时查询，绝不硬编码 ID。
 *  - 清空受管事务表（每张先建 <t>_BAK_20260914 备份，再 DELETE，关 FK），重跑即干净。
 *  - 每组生成一条完整、互相引用的业务链，所有 FK / 单号引用都指向本组真实记录。
 *  - 修复历史断裂点：prod_work_order.order_id 指向真实 sal_order.id；
 *    prod_work_order.product_id 指向真实 mdm_product.id；fin_payable.source_no = 真实 po_no；
 *    fin_receivable.source_no = 真实 delivery_no。
 *  - 扩展模块（HR 考勤/薪资、PLM ECO）也按真实主数据关联。
 *  - 每组整体 try/catch 隔离，单组失败不影响其他组。
 */
const mysql = require('mysql2/promise');
const CONN = { host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };

const N = 20;                       // 业务实例组数
const DAY = '2026-09-14';           // 本批日期前缀
const BAK = '_BAK_20260914';

// 受管事务表（清空 + 重建；主数据表永不在此列）
const MANAGED = [
  'sal_order', 'sal_order_detail', 'sal_delivery', 'sal_delivery_detail',
  'sal_sample_order', 'prd_standard_card', 'eng_sample_to_mass',
  'prod_work_order', 'prod_work_order_item', 'prod_work_order_material_req',
  'pur_request', 'pur_request_item',
  'pur_purchase_order', 'pur_purchase_order_line',
  'inv_inbound_order', 'inv_inbound_item',
  'inv_inventory_batch', 'inv_inventory', 'inv_inventory_transaction', 'inv_inventory_log',
  'qc_incoming_inspection', 'qc_incoming_inspection_item',
  'inv_cutting_record', 'inv_cutting_detail',
  'prd_pick_order', 'prd_pick_order_item', 'prd_work_report', 'prd_finish_order',
  'qc_inspection', 'fin_receivable', 'fin_payable', 'fin_payment_record',
  'hr_attendance', 'hr_salary_calculation', 'plm_eco',
];

function ins(table, cols, rows) {
  const colSql = cols.join(', ');
  const placeholders = '(' + cols.map(() => '?').join(', ') + ')';
  const sql = `INSERT INTO ${table} (${colSql}) VALUES ${rows.map(() => placeholders).join(', ')}`;
  const params = [];
  for (const r of rows) for (const v of r) params.push(v);
  return [sql, params];
}

async function tblExists(c, t) {
  const [r] = await c.query('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [t]);
  return r.length > 0;
}

(async () => {
  const c = await mysql.createConnection(CONN);
  await c.query('SET FOREIGN_KEY_CHECKS=0');
  const log = [];
  const note = (m) => { log.push(m); };

  // ---- 主数据锚点 ----
  const [cust] = await c.query('SELECT id, customer_name FROM crm_customer WHERE deleted=0');
  const [sup] = await c.query('SELECT id, supplier_name, supplier_code FROM pur_supplier WHERE deleted=0');
  const [prod] = await c.query('SELECT id, product_code, product_name FROM mdm_product WHERE deleted=0');
  const [rawMat] = await c.query('SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE deleted=0 LIMIT 8');
  const [wh] = await c.query('SELECT id, warehouse_name FROM inv_warehouse WHERE deleted=0 LIMIT 6');
  const [emp] = await c.query('SELECT id, name, dept_name FROM sys_employee WHERE deleted=0 LIMIT 11');
  if (!cust.length || !sup.length || !prod.length || !rawMat.length || !wh.length) {
    throw new Error('主数据不足：需 crm_customer/pur_supplier/mdm_product/inv_material/inv_warehouse 均有数据');
  }
  note(`锚点: 客户${cust.length} 供应商${sup.length} 产品${prod.length} 原料${rawMat.length} 仓库${wh.length} 员工${emp.length}`);

  // ---- 清空受管表（先备份） ----
  for (const t of MANAGED) {
    if (!(await tblExists(c, t))) { note(`跳过清空(不存在) ${t}`); continue; }
    try {
      await c.query(`DROP TABLE IF EXISTS \`${t}${BAK}\``);
      await c.query(`CREATE TABLE \`${t}${BAK}\` LIKE \`${t}\``);
      await c.query(`INSERT INTO \`${t}${BAK}\` SELECT * FROM \`${t}\``);
      await c.query(`DELETE FROM \`${t}\``);
    } catch (e) { note(`清空警告 ${t}: ${e.message}`); }
  }
  note('已清空受管事务表（备份 *_BAK_20260914）');

  let okGroups = 0;
  for (let g = 1; g <= N; g++) {
    const g2 = String(g).padStart(2, '0');
    const cc = cust[(g - 1) % cust.length];
    const ss = sup[(g - 1) % sup.length];
    const pp = prod[(g - 1) % prod.length];
    const rm = rawMat[(g - 1) % rawMat.length];
    const rw = wh[0];                    // 原料仓
    const fw = wh[wh.length - 1];        // 成品仓
    const ee = emp[(g - 1) % emp.length];
    const rawQty = 100 + g * 10;
    const prodQty = 80 + g * 5;
    const cutSmall = Math.floor(rawQty / 2);

    try {
      // 1) 销售单（先于工单，供 order_id 关联）
      const soNo = `SO-${DAY}-${g2}`;
      await c.query(...ins('sal_order',
        ['order_no','order_date','customer_id','contact_name','total_amount','tax_amount','total_with_tax','status','create_time','deleted','base_total_amount','base_tax_amount','base_grand_total'],
        [[soNo, DAY, cc.id, '采购联系人', (prodQty*8).toFixed(2), (prodQty*8*0.13).toFixed(2), (prodQty*8*1.13).toFixed(2), 1, `${DAY} 09:00:00`, 0, (prodQty*8).toFixed(2), (prodQty*8*0.13).toFixed(2), (prodQty*8*1.13).toFixed(2)]]));
      const [soRow] = await c.query('SELECT id FROM sal_order WHERE order_no=?', [soNo]);
      const soId = soRow[0].id;
      await c.query(...ins('sal_order_detail',
        ['order_id','material_id','material_name','quantity','unit','unit_price','tax_rate','amount','tax_amount','total_amount','create_time','deleted'],
        [[soId, pp.id, pp.product_name, prodQty, '张', 8, 13, (prodQty*8).toFixed(2), (prodQty*8*0.13).toFixed(2), (prodQty*8*1.13).toFixed(2), `${DAY} 09:00:00`, 0]]));

      // 2) 打样单 + 标准卡
      const sampleNo = `SMP-${DAY}-${g2}`;
      await c.query(...ins('sal_sample_order',
        ['order_no','customer_id','customer_name','product_name','material_no','quantity','order_date','delivery_status','status','create_time','deleted'],
        [[sampleNo, cc.id, cc.customer_name, pp.product_name, pp.product_code, prodQty, DAY, 'completed', 'completed', `${DAY} 09:30:00`, 0]]));
      const [sampleRow] = await c.query('SELECT id FROM sal_sample_order WHERE order_no=?', [sampleNo]);
      const cardNo = `SC-${DAY}-${g2}`;
      await c.query(...ins('prd_standard_card',
        ['card_no','name','type','customer_id','customer_name','product_name','status','create_by','create_time','deleted'],
        [[cardNo, `标准卡${g2}`, 'process', cc.id, cc.customer_name, pp.product_name, 4, 1, `${DAY} 10:00:00`, 0]]));
      const [cardRow] = await c.query('SELECT id FROM prd_standard_card WHERE card_no=?', [cardNo]);

      // 3) 生产工单（正确关联 sal_order + product）
      const woNo = `WO-${DAY}-${g2}`;
      await c.query(...ins('prod_work_order',
        ['work_order_no','order_id','order_no','customer_name','product_id','product_code','product_name','order_type','quantity','unit','status','priority','plan_start_date','plan_end_date','create_by','create_time','deleted'],
        [[woNo, soId, soNo, cc.customer_name, pp.id, pp.product_code, pp.product_name, 0, prodQty, '张', 'confirmed', 'normal', DAY, DAY, 1, `${DAY} 11:00:00`, 0]]));
      const [woRow] = await c.query('SELECT id FROM prod_work_order WHERE work_order_no=?', [woNo]);
      const woId = woRow[0].id;
      await c.query(...ins('prod_work_order_item',
        ['work_order_id','line_no','material_id','material_name','quantity','unit','create_time'],
        [[woId, 1, rm.id, rm.material_name, rawQty, rm.unit, `${DAY} 11:00:00`]]));
      await c.query(...ins('prod_work_order_material_req',
        ['work_order_id','material_id','material_name','required_qty','unit','create_time'],
        [[woId, rm.id, rm.material_name, rawQty, rm.unit, `${DAY} 11:00:00`]]));
      // 打样转生产
      await c.query(...ins('eng_sample_to_mass',
        ['sample_order_id','sample_order_no','product_id','product_name','customer_id','customer_name','standard_card_id','standard_card_no','status','workorder_id','workorder_no','transfer_no','create_time','deleted'],
        [[sampleRow[0].id, sampleNo, pp.id, pp.product_name, cc.id, cc.customer_name, cardRow[0].id, cardNo, 3, woId, woNo, `TR-${DAY}-${g2}`, `${DAY} 11:30:00`, 0]]));

      // 4) 采购申请 + 订单
      const prNo = `PR-${DAY}-${g2}`;
      await c.query(...ins('pur_request',
        ['request_no','request_date','request_type','request_dept','requester_name','total_amount','status','create_by','create_time','deleted'],
        [[prNo, DAY, 'material', '工程技术部', '张三', (rawQty*5).toFixed(2), 2, 1, `${DAY} 12:00:00`, 0]]));
      const [prRow] = await c.query('SELECT id FROM pur_request WHERE request_no=?', [prNo]);
      await c.query(...ins('pur_request_item',
        ['request_id','line_no','material_id','material_code','material_name','material_spec','material_unit','quantity','price','amount','supplier_name','create_time','update_time','deleted'],
        [[prRow[0].id, 1, rm.id, rm.material_code, rm.material_name, rm.specification, rm.unit, rawQty, 5, (rawQty*5).toFixed(2), ss.supplier_name, `${DAY} 12:00:00`, `${DAY} 12:00:00`, 0]]));
      const poNo = `PO-${DAY}-${g2}`;
      await c.query(...ins('pur_purchase_order',
        ['po_no','supplier_id','supplier_name','supplier_code','order_date','total_amount','total_quantity','tax_rate','tax_amount','grand_total','status','received_quantity','create_by','create_time','deleted','base_total_amount','base_tax_amount','base_grand_total'],
        [[poNo, ss.id, ss.supplier_name, ss.supplier_code, DAY, (rawQty*5).toFixed(2), rawQty, 13, (rawQty*5*0.13).toFixed(2), (rawQty*5*1.13).toFixed(2), 3, rawQty, 1, `${DAY} 13:00:00`, 0, (rawQty*5).toFixed(2), (rawQty*5*0.13).toFixed(2), (rawQty*5*1.13).toFixed(2)]]));
      const [poRow] = await c.query('SELECT id FROM pur_purchase_order WHERE po_no=?', [poNo]);
      const poId = poRow[0].id;
      await c.query(...ins('pur_purchase_order_line',
        ['po_id','line_no','material_id','material_code','material_name','material_spec','unit','order_qty','received_qty','unit_price','amount','tax_rate','tax_amount','line_total','require_date','create_time','update_time','base_unit_price','base_amount','base_tax_amount','base_line_total'],
        [[poId, 1, rm.id, rm.material_code, rm.material_name, rm.specification, rm.unit, rawQty, rawQty, 5, (rawQty*5).toFixed(2), 13, (rawQty*5*0.13).toFixed(2), (rawQty*5*1.13).toFixed(2), DAY, `${DAY} 13:00:00`, `${DAY} 13:00:00`, 5, (rawQty*5).toFixed(2), (rawQty*5*0.13).toFixed(2), (rawQty*5*1.13).toFixed(2)]]));

      // 5) 入库 + 库存批次
      const ibNo = `IB-${DAY}-${g2}`;
      const rawBatch = `B${DAY}-RAW-${g2}`;
      await c.query(...ins('inv_inbound_order',
        ['order_no','order_type','warehouse_id','warehouse_code','warehouse_name','supplier_id','supplier_name','po_id','po_no','total_amount','total_quantity','status','qc_status','inbound_date','create_by','create_time','deleted','currency','source_type','source_order_id'],
        [[ibNo, 'purchase', rw.id, 'WH01', rw.warehouse_name, ss.id, ss.supplier_name, poId, poNo, (rawQty*5).toFixed(2), rawQty, 'completed', 'pass', DAY, 1, `${DAY} 14:00:00`, 0, 'CNY', 'purchase', poId]]));
      const [ibRow] = await c.query('SELECT id FROM inv_inbound_order WHERE order_no=?', [ibNo]);
      await c.query(...ins('inv_inbound_item',
        ['order_id','material_id','material_name','material_spec','batch_no','quantity','unit','unit_price','total_price','warehouse_location','produce_date','create_time','deleted','base_unit_price','base_amount','purchase_order_item_id','purchase_order_line_no'],
        [[ibRow[0].id, rm.id, rm.material_name, rm.specification, rawBatch, rawQty, rm.unit, 5, (rawQty*5).toFixed(2), 'A-01', DAY, `${DAY} 14:00:00`, 0, 5, (rawQty*5).toFixed(2), poId, 1]]));
      const rawBatchId = 100000 + g;
      await c.query(...ins('inv_inventory_batch',
        ['id','batch_no','material_id','material_name','warehouse_id','warehouse_name','quantity','available_qty','unit','unit_price','inbound_date','status','version','create_time','deleted'],
        [[rawBatchId, rawBatch, rm.id, rm.material_name, rw.id, rw.warehouse_name, rawQty, rawQty, rm.unit, 5, DAY, 1, 1, `${DAY} 14:00:00`, 0]]));
      await c.query(`INSERT INTO inv_inventory (material_id,material_code,material_name,warehouse_id,warehouse_name,quantity,available_qty,unit,unit_cost,total_cost,version,create_time,deleted) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,0)
        ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity), available_qty=available_qty+VALUES(available_qty), total_cost=total_cost+VALUES(total_cost), unit_cost=VALUES(unit_cost), unit=VALUES(unit), material_name=VALUES(material_name), warehouse_name=VALUES(warehouse_name)`,
        [rm.id, rm.material_code, rm.material_name, rw.id, rw.warehouse_name, rawQty, rawQty, rm.unit, 5, (rawQty*5).toFixed(2), `${DAY} 14:00:00`]);
      await c.query(...ins('inv_inventory_transaction',
        ['trans_no','trans_type','source_type','source_id','source_line_id','material_id','material_code','batch_no','warehouse_id','quantity','unit_cost','total_cost','reference_no','remark','create_by','create_time'],
        [[`TXN${String(g).padStart(6,'0')}A`, 'in', 'purchase_inbound', ibRow[0].id, 1, rm.id, rm.material_code, rawBatch, rw.id, rawQty, 5, (rawQty*5).toFixed(2), ibNo, '采购入库', 1, `${DAY} 14:00:00`]]));
      await c.query(...ins('inv_inventory_log',
        ['warehouse_id','material_id','change_type','change_qty','order_no','remark','create_time'],
        [[rw.id, rm.id, 'in', rawQty, ibNo, '采购入库', `${DAY} 14:00:00`]]));

      // 6) 来料检
      const qcInNo = `QCIN-${DAY}-${g2}`;
      await c.query(...ins('qc_incoming_inspection',
        ['inspection_no','inspection_date','supplier_name','material_code','material_name','specification','batch_no','quantity','unit','inspection_type','inspection_result','inspector_name','create_time','update_time','deleted'],
        [[qcInNo, DAY, ss.supplier_name, rm.material_code, rm.material_name, rm.specification, rawBatch, rawQty, rm.unit, 'appearance', 'pass', '品管员甲', `${DAY} 14:30:00`, `${DAY} 14:30:00`, 0]]));
      const [qcInRow] = await c.query('SELECT id FROM qc_incoming_inspection WHERE inspection_no=?', [qcInNo]);
      await c.query(...ins('qc_incoming_inspection_item',
        ['inspection_id','inspection_no','item_name','standard','actual_value','result','create_time','update_time','deleted'],
        [[qcInRow[0].id, qcInNo, '外观', '无破损', '合格', 'pass', `${DAY} 14:30:00`, `${DAY} 14:30:00`, 0]]));

      // 7) 分切（大料→小料）
      const cutNo = `CUT-${DAY}-${g2}`;
      await c.query(...ins('inv_cutting_record',
        ['record_no','source_label_id','source_label_no','original_width','cut_total_width','remain_width','operator_name','cut_time','status','create_time'],
        [[cutNo, rawBatchId, rawBatch, 600, cutSmall, rawQty - cutSmall, '分切工乙', `${DAY} 15:00:00`, 1, `${DAY} 15:00:00`]]));
      const [cutRow] = await c.query('SELECT id FROM inv_cutting_record WHERE record_no=?', [cutNo]);
      const smallBatch = `B${DAY}-SM-${g2}`;
      const smallBatchId = 200000 + g;
      await c.query(...ins('inv_cutting_detail',
        ['record_id','new_label_id','new_label_no','cut_width','sequence','create_time'],
        [[cutRow[0].id, smallBatchId, smallBatch, cutSmall, 1, `${DAY} 15:00:00`]]));
      await c.query(...ins('inv_inventory_batch',
        ['id','batch_no','material_id','material_name','warehouse_id','warehouse_name','quantity','available_qty','unit','unit_price','inbound_date','status','version','create_time','deleted'],
        [[smallBatchId, smallBatch, rm.id, rm.material_name, rw.id, rw.warehouse_name, cutSmall, cutSmall, rm.unit, 5, DAY, 1, 1, `${DAY} 15:00:00`, 0]]));
      await c.query('UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-? WHERE id=?', [cutSmall, cutSmall, rawBatchId]);
      await c.query(...ins('inv_inventory_transaction',
        ['trans_no','trans_type','source_type','source_id','source_line_id','material_id','material_code','batch_no','warehouse_id','quantity','unit_cost','total_cost','reference_no','remark','create_by','create_time'],
        [[`TXN${String(g).padStart(6,'0')}B`, 'in', 'cutting', cutRow[0].id, 1, rm.id, rm.material_code, smallBatch, rw.id, cutSmall, 5, (cutSmall*5).toFixed(2), cutNo, '分切产出小料', 1, `${DAY} 15:00:00`]]));

      // 8) 领料 + 报工 + 完工
      const pickNo = `PK-${DAY}-${g2}`;
      await c.query(...ins('prd_pick_order',
        ['pick_no','work_order_id','warehouse_id','picker_name','total_qty','status','create_by','create_time','deleted'],
        [[pickNo, woId, rw.id, '领料员丙', cutSmall, 1, 1, `${DAY} 15:30:00`, 0]]));
      const [pickRow] = await c.query('SELECT id FROM prd_pick_order WHERE pick_no=?', [pickNo]);
      await c.query(...ins('prd_pick_order_item',
        ['pick_order_id','material_id','material_name','material_spec','required_qty','actual_qty','batch_no','unit','create_time'],
        [[pickRow[0].id, rm.id, rm.material_name, rm.specification, cutSmall, cutSmall, smallBatch, rm.unit, `${DAY} 15:30:00`]]));
      await c.query('UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-? WHERE id=?', [cutSmall, cutSmall, smallBatchId]);
      await c.query('UPDATE inv_inventory SET quantity=quantity-?, available_qty=available_qty-? WHERE material_id=? AND warehouse_id=?', [cutSmall, cutSmall, rm.id, rw.id]);

      await c.query(...ins('prd_work_report',
        ['report_no','work_order_id','work_order_no','process_name','operator_name','plan_qty','completed_qty','qualified_qty','defective_qty','scrap_qty','start_time','end_time','create_time','deleted'],
        [[`WR-${DAY}-${g2}`, woId, woNo, '印刷', '操作工丁', prodQty, prodQty, prodQty, 0, 0, `${DAY} 16:00:00`, `${DAY} 18:00:00`, `${DAY} 18:00:00`, 0]]));

      const foNo = `FO-${DAY}-${g2}`;
      await c.query(...ins('prd_finish_order',
        ['finish_no','work_order_id','warehouse_id','qualified_qty','defective_qty','status','create_by','create_time','deleted'],
        [[foNo, woId, fw.id, prodQty, 0, 1, 1, `${DAY} 18:30:00`, 0]]));
      const [foRow] = await c.query('SELECT id FROM prd_finish_order WHERE finish_no=?', [foNo]);
      const finBatch = `B${DAY}-FIN-${g2}`;
      const finBatchId = 300000 + g;
      await c.query(...ins('inv_inventory_batch',
        ['id','batch_no','material_id','material_name','warehouse_id','warehouse_name','quantity','available_qty','unit','unit_price','inbound_date','status','version','create_time','deleted'],
        [[finBatchId, finBatch, pp.id, pp.product_name, fw.id, fw.warehouse_name, prodQty, prodQty, '张', 8, DAY, 1, 1, `${DAY} 18:30:00`, 0]]));
      await c.query(`INSERT INTO inv_inventory (material_id,material_code,material_name,warehouse_id,warehouse_name,quantity,available_qty,unit,unit_cost,total_cost,version,create_time,deleted) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,0)
        ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity), available_qty=available_qty+VALUES(available_qty), total_cost=total_cost+VALUES(total_cost), unit_cost=VALUES(unit_cost), unit=VALUES(unit), material_name=VALUES(material_name), warehouse_name=VALUES(warehouse_name)`,
        [pp.id, pp.product_code, pp.product_name, fw.id, fw.warehouse_name, prodQty, prodQty, '张', 8, (prodQty*8).toFixed(2), `${DAY} 18:30:00`]);
      await c.query(...ins('inv_inventory_transaction',
        ['trans_no','trans_type','source_type','source_id','source_line_id','material_id','material_code','batch_no','warehouse_id','quantity','unit_cost','total_cost','reference_no','remark','create_by','create_time'],
        [[`TXN${String(g).padStart(6,'0')}C`, 'in', 'production_finish', foRow[0].id, 1, pp.id, pp.product_code, finBatch, fw.id, prodQty, 8, (prodQty*8).toFixed(2), foNo, '成品入库', 1, `${DAY} 18:30:00`]]));

      // 9) 成品检
      await c.query(...ins('qc_inspection',
        ['inspection_no','inspection_type','source_type','source_no','material_id','batch_no','inspection_qty','qualified_qty','unqualified_qty','inspection_result','inspector','inspection_date','create_time','update_time','deleted','create_by','update_by'],
        [[`QCF-${DAY}-${g2}`, 2, 'finish_order', foNo, pp.id, finBatch, prodQty, prodQty, 0, 1, '品管员甲', DAY, `${DAY} 19:00:00`, `${DAY} 19:00:00`, 0, 1, 1]]));

      // 10) 发货 + 应收
      const dlNo = `DL-${DAY}-${g2}`;
      await c.query(...ins('sal_delivery',
        ['delivery_no','delivery_date','order_id','order_no','customer_id','customer_name','warehouse_id','total_amount','total_qty','status','create_by','create_time','deleted','version'],
        [[dlNo, DAY, soId, soNo, cc.id, cc.customer_name, fw.id, (prodQty*8).toFixed(2), prodQty, 1, 1, `${DAY} 20:00:00`, 0, 0]]));
      const [dlRow] = await c.query('SELECT id FROM sal_delivery WHERE delivery_no=?', [dlNo]);
      await c.query(...ins('sal_delivery_detail',
        ['delivery_id','line_no','material_id','material_code','material_name','quantity','unit','unit_price','amount','batch_no','create_time','deleted'],
        [[dlRow[0].id, 1, pp.id, pp.product_code, pp.product_name, prodQty, '张', 8, (prodQty*8).toFixed(2), finBatch, `${DAY} 20:00:00`, 0]]));
      await c.query('UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-? WHERE id=?', [prodQty, prodQty, finBatchId]);
      await c.query('UPDATE inv_inventory SET quantity=quantity-?, available_qty=available_qty-? WHERE material_id=? AND warehouse_id=?', [prodQty, prodQty, pp.id, fw.id]);
      await c.query(...ins('inv_inventory_transaction',
        ['trans_no','trans_type','source_type','source_id','source_line_id','material_id','material_code','batch_no','warehouse_id','quantity','unit_cost','total_cost','reference_no','remark','create_by','create_time'],
        [[`TXN${String(g).padStart(6,'0')}D`, 'out', 'delivery', dlRow[0].id, 1, pp.id, pp.product_code, finBatch, fw.id, prodQty, 8, (prodQty*8).toFixed(2), dlNo, '销售发货', 1, `${DAY} 20:00:00`]]));
      await c.query(...ins('fin_receivable',
        ['receivable_no','source_type','source_no','customer_id','amount','received_amount','balance','due_date','status','create_time','update_time','deleted','create_by','update_by'],
        [[`AR-${DAY}-${g2}`, 1, dlNo, cc.id, (prodQty*8).toFixed(2), 0, (prodQty*8).toFixed(2), DAY, 1, `${DAY} 20:00:00`, `${DAY} 20:00:00`, 0, 1, 1]]));

      // 11) 应付 + 付款记录（source_no = 真实 po_no）
      const apNo = `AP-${DAY}-${g2}`;
      await c.query(...ins('fin_payable',
        ['payable_no','source_type','source_no','supplier_id','amount','paid_amount','balance','due_date','status','remark','create_time','update_time','deleted','create_by','update_by','source_currency'],
        [[apNo, 1, poNo, ss.id, (rawQty*5).toFixed(2), 0, (rawQty*5).toFixed(2), DAY, 1, '采购应付', `${DAY} 13:30:00`, `${DAY} 13:30:00`, 0, 1, 1, 'CNY']]));
      const [apRow] = await c.query('SELECT id FROM fin_payable WHERE payable_no=?', [apNo]);
      await c.query(...ins('fin_payment_record',
        ['payment_no','payable_id','supplier_id','amount','payment_method','payment_date','remark','create_time','deleted','update_time','create_by','update_by'],
        [[`PAY-${DAY}-${g2}`, apRow[0].id, ss.id, (rawQty*5).toFixed(2), 'bank', DAY, '采购付款', `${DAY} 13:40:00`, 0, `${DAY} 13:40:00`, 1, 1]]));

      // 12) HR（考勤 + 薪资，关联真实员工）
      // hr_attendance 列名在运行中 app 迁移下会抖动，逐组探测真实列，仅写存在的列
      {
        const [hc] = await c.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', ['hr_attendance']);
        const HH = new Set(hc.map(r => r.COLUMN_NAME));
        const hrAllCols = ['attendance_date','employee_id','employee_id_int','employee_name','department_name','check_in_time','check_out_time','status','working_hours','overtime_hours','remark','deleted','create_time','update_time','emp_id'];
        const hrAllVals = [DAY, String(ee.id), ee.id, ee.name, ee.dept_name || '生产部', '08:30', '17:30', 'normal', 8, 0, '自动生成', 0, `${DAY} 17:30:00`, `${DAY} 17:30:00`, ee.id];
        const hrColsF = hrAllCols.filter(col => HH.has(col));
        const hrValsF = hrAllCols.map((col, i) => hrAllVals[i]).filter((_, i) => HH.has(hrAllCols[i]));
        if (hrColsF.length) await c.query(...ins('hr_attendance', hrColsF, [hrValsF]));
      }
      // 薪资按月+员工唯一（uk_sc_employee_month）：员工数(11) < 组数(20)，
      // 按员工循环分月，保证 (employee_id, calc_month) 每组唯一
      const calcMonth = '2026-' + String(1 + Math.floor((g - 1) / emp.length)).padStart(2, '0');
      await c.query(...ins('hr_salary_calculation',
        ['employee_id','calc_month','base_salary','piece_salary','overtime_salary','performance_salary','allowances','social_insurance_personal','housing_fund_personal','individual_tax','attendance_deduction','other_deduction','gross_pay','total_deduction','net_pay','status','create_time','update_time'],
        [[ee.id, calcMonth, 8000, 1200, 300, 500, 200, 800, 400, 150, 0, 0, 10150, 1350, 8800, 'calculated', `${DAY} 21:00:00`, `${DAY} 21:00:00`]]));

      // 13) PLM ECO（关联真实产品）
      await c.query(...ins('plm_eco',
        ['eco_no','eco_title','product_id','product_code','change_type','description','status','create_time','deleted'],
        [[`ECO-${DAY}-${g2}`, `产品${pp.product_name}设计变更`, pp.id, pp.product_code, 'design', '关联种子自动生成', 1, `${DAY} 08:00:00`, 0]]));

      okGroups++;
    } catch (e) {
      note(`⚠️ 第 ${g} 组失败: ${e.message}`);
    }
  }

  await c.query('SET FOREIGN_KEY_CHECKS=1');
  await c.end();

  console.log(log.join('\n'));
  console.log(`\n===== 完成：成功 ${okGroups}/${N} 组 =====`);
})().catch(e => { console.error('FATAL', e.message, '\nSTACK:', e.stack); process.exit(1); });
