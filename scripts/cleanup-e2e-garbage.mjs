#!/usr/bin/env node
/**
 * cleanup-e2e-garbage.mjs — E2E/并发测试垃圾数据清道夫（幂等，可重复执行）
 *
 * 背景：tests/concurrency/* 与部分 e2e spec 直写主库（@/lib/db → DB_NAME），
 *       teardown 只软删仓库/物料，单据本体常残留为活跃状态，污染业务列表。
 *       本脚本固化 batch=154（采购/工单/qrcode）、batch=155（出入库/孤儿明细/GRN-PROD）
 *       与 batch=156（全库普查残留）的清理口径，供每轮测试跑完后一键清理。
 *
 * 用法：pnpm db:clean-e2e   （或 node scripts/cleanup-e2e-garbage.mjs）
 *
 * 覆盖指纹（无论 deleted 与否；先子后父，避开全部真 FK）：
 *   采购单  PO_<13位ts>_<idx>            （明细→单）
 *   工单    WO[_LOW]_<13位ts>_<idx> / product_name 'E2E测试产品%'
 *           （报工→排程→领料明细→领料单→工单，RESTRICT 子表先清）
 *   出库单  OUT[_LOW]_<13位ts>[_idx] / 测试操作员 / 测试仓库% （明细→单）
 *   入库单  IN[_RB]_<13位ts>[_idx] / IN_TEST_ / IN_E2E_ / 测试供应商 （明细→单）
 *   幽灵应付 fin_payable.source_no IN_TEST_/IN_E2E_（父入库单已物理删）
 *   库存交易 reference_no IN_TEST_/IN_E2E_ / batch_no E2E_% / BATCH_SYNC%
 *   E2E 幽灵明细 material_id=0 AND material_name LIKE 'E2E物料_%'
 *     → 挂在「全部明细均为幽灵」的正式单号 draft 单一并删（IN20260930… 类）
 *   孤儿明细：父单物理不存在或已软删、明细 deleted=0（入库/出库/领料）
 *   E2E 工装 dcprint_tool.tool_code 'E2E-TOOL%'（usage→tool）
 *   墨配方被塞明细 dcprint_ink_formula_item.material_name 'E2E%'
 *   TEST_MAT 盘点链 inv_stocktaking_item(JOIN TEST_MAT 物料)→变空单头
 *   std 双轨采购 pur_order_std(+line_std) / std_purchase_order(+line)
 *     单号 '_1[5-9][0-9]{11}(_|$)' 或供应商 '%测试%'
 *   完工入库 inv_production_inbound.operator_name 'E2E%'（item→头）
 *   样品工艺卡 dcprint_sample_process_card.sample_name 'E2E%'（step/item→card）
 *   IQC qc_incoming_inspection.supplier_name '%验证供应商%'
 *   销售明细 sal_order_detail.material_name 'E2E测试产品%'（单头不删，一次性迁移已清）
 *
 * 明确不动（需人工裁定，勿加入本脚本）：
 *   TEST_MAT_* 测试物料 832 个本体（被库存 430 行/FIFO 链路引用，仅清其盘点明细）、
 *   TEST_WH_* 测试仓库软删行、PO_FP_<ts> 软删采购单、软删主单+软删明细对、
 *   qrcode 幽灵引用重指（一次性修复，见 batch=154）。
 *
 * 注意：主数据删除不在本脚本范围；若未来测试改走独立 schema（建议），
 *       本脚本自动退化为无操作（指纹匹配 0 行）。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- 读取 .env / .env.local 的 DB_* 配置（脚本不经过 Next，需自行解析）----
function loadDbEnv() {
  const candidates = [
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', '.env.local'),
  ];
  const env = {};
  for (const envPath of candidates) {
    try {
      const raw = readFileSync(envPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
        // 先读到的优先（.env 优先于 .env.local）
        if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    } catch {
      // 文件不存在则跳过
    }
  }
  return {
    host: process.env.DB_HOST || env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || env.DB_PORT) || 3306,
    user: process.env.DB_USER || env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || env.DB_PASSWORD || '',
    database: process.env.DB_NAME || env.DB_NAME || 'vnerpdacahng',
  };
}

async function main() {
  const cfg = loadDbEnv();
  const conn = await mysql.createConnection({ ...cfg, decimalNumbers: true });
  let total = 0;

  const step = async (label, sql) => {
    const [res] = await conn.query(sql);
    const n = res.affectedRows ?? 0;
    total += n;
    console.log(`  ${n > 0 ? '✔' : '·'} ${label}: ${n}`);
    return n;
  };

  console.log(`E2E 清道夫 → ${cfg.database}@${cfg.host}:${cfg.port}`);

  // 1) 幽灵应付（IN_TEST_/IN_E2E_ 来源，父入库单已被物理删）
  await step('幽灵应付', `
    DELETE FROM fin_payable
    WHERE source_no REGEXP '^IN_(TEST|E2E)_'`);

  // 2) 测试库存交易（IN_TEST_/IN_E2E_/E2E_ 批次/BATCH_SYNC）
  await step('测试库存交易', `
    DELETE FROM inv_inventory_transaction
    WHERE reference_no REGEXP '^IN_(TEST|E2E)_'
       OR batch_no LIKE 'E2E\\_%'
       OR batch_no LIKE 'BATCH_SYNC%'`);

  // 3) 采购测试单（明细→单）
  await step('采购测试单明细', `
    DELETE l FROM pur_purchase_order_line l
    JOIN pur_purchase_order p ON p.id = l.po_id
    WHERE p.po_no REGEXP '^PO_[0-9]{13}_'`);
  await step('采购测试单本体', `
    DELETE FROM pur_purchase_order
    WHERE po_no REGEXP '^PO_[0-9]{13}_'`);

  // 4) 测试工单链（报工→排程→领料明细→领料单→工单本体；RESTRICT 子表先清）
  await step('测试工单报工', `
    DELETE r FROM prd_work_report r
    JOIN prod_work_order w ON w.id = r.work_order_id
    WHERE w.work_order_no REGEXP '^WO(_LOW)?_[0-9]{13}_'
       OR w.product_name LIKE 'E2E测试产品%'`);
  await step('测试工单排程明细', `
    DELETE sd FROM prd_schedule_detail sd
    JOIN prod_work_order w ON w.id = sd.work_order_id
    WHERE w.work_order_no REGEXP '^WO(_LOW)?_[0-9]{13}_'
       OR w.product_name LIKE 'E2E测试产品%'`);
  await step('测试工单排程', `
    DELETE s FROM prd_schedule s
    JOIN prod_work_order w ON w.id = s.work_order_id
    WHERE w.work_order_no REGEXP '^WO(_LOW)?_[0-9]{13}_'
       OR w.product_name LIKE 'E2E测试产品%'`);
  await step('测试工单领料明细', `
    DELETE i FROM prd_material_issue_item i
    JOIN prd_material_issue mi ON mi.id = i.issue_id
    JOIN prod_work_order w ON w.id = mi.work_order_id
    WHERE w.work_order_no REGEXP '^WO(_LOW)?_[0-9]{13}_'
       OR w.product_name LIKE 'E2E测试产品%'`);
  await step('测试工单领料单', `
    DELETE mi FROM prd_material_issue mi
    JOIN prod_work_order w ON w.id = mi.work_order_id
    WHERE w.work_order_no REGEXP '^WO(_LOW)?_[0-9]{13}_'
       OR w.product_name LIKE 'E2E测试产品%'`);
  await step('测试工单本体', `
    DELETE FROM prod_work_order
    WHERE work_order_no REGEXP '^WO(_LOW)?_[0-9]{13}_'
       OR product_name LIKE 'E2E测试产品%'`);

  // 5) 测试出库单（明细→单）
  await step('测试出库单明细', `
    DELETE i FROM inv_outbound_item i
    JOIN inv_outbound_order o ON o.id = i.order_id
    WHERE o.order_no REGEXP '^OUT(_LOW)?_[0-9]{13}'
       OR o.operator_name = '测试操作员'
       OR o.warehouse_name LIKE '%测试仓库%'`);
  await step('测试出库单本体', `
    DELETE FROM inv_outbound_order
    WHERE order_no REGEXP '^OUT(_LOW)?_[0-9]{13}'
       OR operator_name = '测试操作员'
       OR warehouse_name LIKE '%测试仓库%'`);

  // 6) 测试入库单（明细→单；含 batch=155 漏网前缀 IN_TEST_/IN_E2E_）
  await step('测试入库单明细', `
    DELETE i FROM inv_inbound_item i
    JOIN inv_inbound_order o ON o.id = i.order_id
    WHERE o.order_no REGEXP '^(IN(_RB)?_[0-9]{13}|IN_(TEST|E2E)_)'
       OR o.supplier_name LIKE '%测试%'`);
  await step('测试入库单本体', `
    DELETE FROM inv_inbound_order
    WHERE order_no REGEXP '^(IN(_RB)?_[0-9]{13}|IN_(TEST|E2E)_)'
       OR supplier_name LIKE '%测试%'`);

  // 7) E2E 幽灵明细 + 其宿主单（全部明细均为幽灵才删主单）
  await step('E2E 幽灵明细', `
    DELETE FROM inv_inbound_item
    WHERE material_id = 0 AND material_name LIKE 'E2E物料\\_%'`);
  await step('幽灵宿主 draft 单', `
    DELETE o FROM inv_inbound_order o
    WHERE o.status = 'draft'
      AND o.order_type = 'purchase'
      AND EXISTS (SELECT 1 FROM inv_inbound_item i WHERE i.order_id = o.id)
      AND NOT EXISTS (
        SELECT 1 FROM inv_inbound_item i2
        WHERE i2.order_id = o.id
          AND (i2.material_id <> 0 OR i2.material_name NOT LIKE 'E2E物料\\_%')
      )`);

  // 8) 孤儿明细（父单物理不存在或已软删、明细活跃）
  await step('入库孤儿明细', `
    DELETE i FROM inv_inbound_item i
    LEFT JOIN inv_inbound_order o ON o.id = i.order_id AND o.deleted = 0
    WHERE o.id IS NULL AND i.deleted = 0`);
  await step('出库孤儿明细', `
    DELETE i FROM inv_outbound_item i
    LEFT JOIN inv_outbound_order o ON o.id = i.order_id AND o.deleted = 0
    WHERE o.id IS NULL AND i.deleted = 0`);
  await step('领料孤儿明细', `
    DELETE i FROM prd_material_issue_item i
    LEFT JOIN prd_material_issue o ON o.id = i.issue_id AND o.deleted = 0
    WHERE o.id IS NULL
      AND (i.material_name LIKE '%测试%' OR i.material_name LIKE 'E2E%'
           OR i.material_code LIKE 'TEST%')`);

  // 9) E2E 测试工装（usage→tool）
  await step('E2E 工装使用记录', `
    DELETE u FROM dcprint_tool_usage u
    JOIN dcprint_tool t ON t.id = u.tool_id
    WHERE t.tool_code LIKE 'E2E-TOOL%'`);
  await step('E2E 工装使用记录(流程名)', `
    DELETE FROM dcprint_tool_usage WHERE process_name LIKE 'E2E%'`);
  await step('E2E 测试工装本体', `
    DELETE FROM dcprint_tool WHERE tool_code LIKE 'E2E-TOOL%'`);

  // 10) 墨配方被塞的 E2E 明细（version 本体保留）
  await step('墨配方 E2E 明细', `
    DELETE FROM dcprint_ink_formula_item WHERE material_name LIKE 'E2E%'`);

  // 11) TEST_MAT 盘点链（明细→变空单头）
  await step('TEST_MAT 盘点明细', `
    DELETE si FROM inv_stocktaking_item si
    JOIN inv_material m ON m.id = si.material_id
    WHERE m.material_code LIKE 'TEST_MAT%'`);
  await step('变空盘点单头', `
    DELETE s FROM inv_stocktaking s
    WHERE NOT EXISTS (SELECT 1 FROM inv_stocktaking_item si WHERE si.taking_id = s.id)`);

  // 12) std 双轨采购垃圾（line→头 × 2 组）
  await step('std 采购明细(pur_order_std)', `
    DELETE l FROM pur_order_line_std l
    JOIN pur_order_std p ON p.id = l.po_id
    WHERE p.po_code REGEXP '_1[5-9][0-9]{11}(_|$)' OR p.supplier_name LIKE '%测试%'`);
  await step('std 采购单(pur_order_std)', `
    DELETE FROM pur_order_std
    WHERE po_code REGEXP '_1[5-9][0-9]{11}(_|$)' OR supplier_name LIKE '%测试%'`);
  await step('std 采购明细(std_purchase_order)', `
    DELETE l FROM std_purchase_order_line l
    JOIN std_purchase_order p ON p.id = l.order_id
    WHERE p.order_no REGEXP '_1[5-9][0-9]{11}(_|$)' OR p.supplier_name LIKE '%测试%'`);
  await step('std 采购单(std_purchase_order)', `
    DELETE FROM std_purchase_order
    WHERE order_no REGEXP '_1[5-9][0-9]{11}(_|$)' OR supplier_name LIKE '%测试%'`);

  // 13) E2E 完工入库（item→头）
  await step('E2E 完工入库明细', `
    DELETE i FROM inv_production_inbound_item i
    JOIN inv_production_inbound p ON p.id = i.inbound_id
    WHERE p.operator_name LIKE 'E2E%'`);
  await step('E2E 完工入库单', `
    DELETE FROM inv_production_inbound WHERE operator_name LIKE 'E2E%'`);

  // 14) E2E 样品工艺卡（step/item→card）
  await step('E2E 工艺卡步骤', `
    DELETE s FROM dcprint_sample_process_step s
    JOIN dcprint_sample_process_card c ON c.id = s.card_id
    WHERE c.sample_name LIKE 'E2E%'`);
  await step('E2E 工艺卡明细', `
    DELETE i FROM dcprint_sample_process_item i
    JOIN dcprint_sample_process_card c ON c.id = i.card_id
    WHERE c.sample_name LIKE 'E2E%'`);
  await step('E2E 工艺卡本体', `
    DELETE FROM dcprint_sample_process_card WHERE sample_name LIKE 'E2E%'`);

  // 15) IQC 自动化验证单
  await step('IQC 验证供应商单', `
    DELETE FROM qc_incoming_inspection WHERE supplier_name LIKE '%验证供应商%'`);

  // 16) 销售单 E2E 明细（单头不在本脚本范围，见迁移一次性清理）
  await step('销售 E2E 明细', `
    DELETE FROM sal_order_detail WHERE material_name LIKE 'E2E测试产品%'`);

  console.log(total === 0 ? '库已干净（0 行清理）' : `共清理 ${total} 行`);
  await conn.end();
}

main().catch((e) => {
  console.error('CLEANUP FAILED:', e.message);
  process.exit(1);
});
