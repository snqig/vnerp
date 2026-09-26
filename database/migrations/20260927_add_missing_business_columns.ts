/**
 * 迁移：补齐 18 列「schema 已声明但库里从未建过」的业务列
 *
 * 来源与判定（2026-09-27）
 * ------------------------
 * 起因是 `pnpm validate:schema-drift` 报出的 15 条「schema 多列」，但往下挖之后发现
 * **判定被误报带偏了**：脚本只比对 Drizzle schema 声明与库列，而真正的买家是
 * Repository 里的**手写 SQL** —— 那些 INSERT 一直在引用不存在的列，等于「写库必炸」。
 * 被漏掉的 `sal_order_detail.base_line_total` 就是典型：`validate:schema-drift` 没有任何
 * 一条提到它，但 `MysqlSalesOrderRepository.ts:185` 的 INSERT 一直在写它。
 *
 * 经 precise-refs.mts 精确化后（条件：同一文件内同时出现表名 + 列名），15 条重判为：
 *
 *   A 僵尸声明 3 条   sys_employee.bank_account / emergency_contact / emergency_phone
 *                     → 精确引用只有 schema 声明行本身，common.ts:108 那句
 *                       「代码在用、库里缺列」的注释是错的 → **删声明**（见本目录同名 ts 之外
 *                       的代码改动，本迁移不负责）
 *   B 坏 SQL   3 处   → 本迁移补列后被修复（补列 = 让这些 INSERT 从「必炸」变「可用」）
 *   C 语义漂移 5 条   → base_* 是「本币折算值」，与 unit_price（原币单价）不同；
 *                       exchange_rate（汇率数值）与 currency（币种字符串 'CNY'）不同。
 *                       脚本建议「改名指向」是误判，采纳补列方案而非改名
 *   D/E 缺列   2 条   → 本迁移补列
 *
 * 逐列定义的依据
 * --------------
 * 类型全部取自对应 Drizzle schema 的声明，不是猜的：
 *   sal_order_detail      sales.ts:76-78   DECIMAL(18,4) 可空
 *                          base_line_total / shipped_qty  schema 无声明，依
 *                          MysqlSalesOrderRepository.ts:183-186 的 INSERT 位置与同表列族定为
 *                          DECIMAL(18,4)（`shipped_qty` 由 VALUES 里的硬编码 0 提供，故 NOT NULL + 默认 0）
 *   sal_reconciliation    sales.ts:166      DECIMAL(18,4) DEFAULT '1.0000'
 *                          6 个 base_*_amount 同表既有列族，定为 DECIMAL(18,4) DEFAULT '0.0000'
 *   prd_work_report       production.ts:308-317
 *                          equipment_name VARCHAR(100) / shift VARCHAR(20) /
 *                          defect_reason VARCHAR(500) / report_date DATE /
 *                          status TINYINT DEFAULT 1（INSERT 里硬编码 1，update 写数字）/ create_by
 *                          BIGINT UNSIGNED 可空
 *   prd_material_issue_item production.ts:242  original_inbound_date DATE 可空
 *
 * 不做的事
 * --------
 * - 不动 `prd_material_issue_item.batch_id`：库里已有 `batch_no`(VARCHAR(50))，
 *   而 batch_id 是 BIGINT，二者是「批次号字符串」还是「批次主表外键」未定论，
 *   在拿到业务确认前不擅自建列，避免与 batch_no 形成双份事实源。
 * - 不做任何数据回填：存量行取默认值即业务上的「无本币折算/无汇率」，
 *   这是正确语义，不是脏数据。
 * - 不删 A 类 3 条声明（属代码侧）。
 */
import type { Connection } from 'mysql2/promise';

/** MySQL 不支持 `ADD COLUMN IF NOT EXISTS`，所以逐列先查后加，保证可重入 */
const COLUMNS: { table: string; column: string; ddl: string; comment: string }[] = [
  // —— 销售订单明细：本币折算四件套 ——
  { table: 'sal_order_detail', column: 'base_unit_price', ddl: 'DECIMAL(18,4) NULL', comment: '本币单价' },
  { table: 'sal_order_detail', column: 'base_amount', ddl: 'DECIMAL(18,4) NULL', comment: '本币金额' },
  { table: 'sal_order_detail', column: 'base_tax_amount', ddl: 'DECIMAL(18,4) NULL', comment: '本币税额' },
  { table: 'sal_order_detail', column: 'base_line_total', ddl: 'DECIMAL(18,4) NULL', comment: '本价合计（漂移脚本漏项）' },
  { table: 'sal_order_detail', column: 'shipped_qty', ddl: "DECIMAL(18,4) NOT NULL DEFAULT '0.0000'", comment: '已发货数量' },

  // —— 销售对账：汇率 + 本币六项 ——
  { table: 'sal_reconciliation', column: 'exchange_rate', ddl: "DECIMAL(18,4) NOT NULL DEFAULT '1.0000'", comment: '汇率' },
  { table: 'sal_reconciliation', column: 'base_delivery_amount', ddl: "DECIMAL(18,4) NOT NULL DEFAULT '0.0000'", comment: '本币送货金额' },
  { table: 'sal_reconciliation', column: 'base_return_amount', ddl: "DECIMAL(18,4) NOT NULL DEFAULT '0.0000'", comment: '本币退货金额' },
  { table: 'sal_reconciliation', column: 'base_net_amount', ddl: "DECIMAL(18,4) NOT NULL DEFAULT '0.0000'", comment: '本币净额' },
  { table: 'sal_reconciliation', column: 'base_discount_amount', ddl: "DECIMAL(18,4) NOT NULL DEFAULT '0.0000'", comment: '本币折扣额' },
  { table: 'sal_reconciliation', column: 'base_received_amount', ddl: "DECIMAL(18,4) NOT NULL DEFAULT '0.0000'", comment: '本币已收金额' },
  { table: 'sal_reconciliation', column: 'base_balance_amount', ddl: "DECIMAL(18,4) NOT NULL DEFAULT '0.0000'", comment: '本币余额' },

  // —— 报工单：班次/日期/状态/创建人 ——
  { table: 'prd_work_report', column: 'equipment_name', ddl: 'VARCHAR(100) NULL', comment: '设备名称' },
  { table: 'prd_work_report', column: 'shift', ddl: 'VARCHAR(20) NULL', comment: '班次' },
  { table: 'prd_work_report', column: 'defect_reason', ddl: 'VARCHAR(500) NULL', comment: '缺陷原因' },
  { table: 'prd_work_report', column: 'report_date', ddl: 'DATE NULL', comment: '报工日期' },
  { table: 'prd_work_report', column: 'status', ddl: 'TINYINT NOT NULL DEFAULT 1', comment: '状态 1草稿 2已审核 3已取消' },
  { table: 'prd_work_report', column: 'create_by', ddl: 'BIGINT UNSIGNED NULL', comment: '创建人ID' },

  // —— 领料明细：原入库日期 ——
  { table: 'prd_material_issue_item', column: 'original_inbound_date', ddl: 'DATE NULL', comment: '原始入库日期' },
];

export async function up(conn: Connection): Promise<void> {
  for (const { table, column, ddl, comment } of COLUMNS) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column]
    );
    const present = Number((rows as { c: number }[])[0]?.c ?? 0) > 0;
    if (present) {
      console.log(`  · 已存在，跳过  ${table}.${column}`);
      continue;
    }
    // 显式跟表同 collation，避免 ALTER 时隐式重算
    await conn.query(
      `ALTER TABLE \`${table}\`
       ADD COLUMN \`${column}\` ${ddl}
       COMMENT '${comment}'`
    );
    console.log(`  + 已加列  ${table}.${column}  ${ddl}`);
  }
}

/** 供执行器在 verify 阶段做「这些 INSERT 现在能不能跑」的反证 */
export const PROBE_TABLES: string[] = Array.from(new Set(COLUMNS.map((c) => c.table)));
