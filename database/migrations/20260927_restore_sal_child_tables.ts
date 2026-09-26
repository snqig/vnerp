/**
 * 迁移：恢复 2026-09-23 清理脚本误删的另外 3 张「父子结构断裂」的表
 *
 * 背景
 * ----
 * `20260923_cleanup_empty_tables.sql` 一次性 DROP 了 17 张表（已于 2026-09-23 13:43:30 执行）。
 * 该脚本的 5 张业务表里，前 3 张（sal_quote / sal_sample_feedback / prd_work_order_color_seq）
 * 已于 2026-09-27 由 20260927_restore_dropped_tables.ts 恢复。本迁移处理余下 3 张中
 * **仍然结构不完整**的部分，理由不是「代码有引用」，而是「父/子断裂」：
 *
 *   ┌ 表                     ┬ 断口 ─────────────────────────────────────────────┐
 *   │ sal_delivery_order     │ 子表 sal_delivery_order_item **仍在库、有 10 行**  │
 *   │                        │ 且在 src/lib/db/schemas/_gen_sal.ts 有 Drizzle 模型│
 *   │                        │ → 父表没了，这 10 行明细永远查不到父单，成孤儿     │
 *   │ sal_quote_item         │ 父表 sal_quote 已有活代码写入                     │
 *   │                        │ (SampleProcessCardService.insert_sal_quote)       │
 *   │                        │ → 只落主表不落明细，报价单结构不完整              │
 *   │ sal_return_order_item  │ 父表 sal_return_order **仍在库、有 3 行**，且     │
 *   │                        │ src/lib/db/schemas/sales.ts 有完整 salReturnOrder │
 *   │                        │ 模型 → 同上，明细缺失                             │
 *   └────────────────────────┴───────────────────────────────────────────────────┘
 *
 * 建表结构取自 .workbuddy/tmp/backup_pre_align_20260923.sql（DROP 前的完整备份），
 * 8 张被删业务表在该备份里**全部有原始 DDL**，可逐列还原，无猜测成分。
 *
 * 与「被删前最终态」的差异（仅 1 处）
 * ------------------------------------
 * 1. collation 统一为 utf8mb4_0900_ai_ci
 *    备份是 align 前快照，sal_quote_item / sal_sample_quotation / prd_work_order_bom
 *    三张表是 utf8mb4_unicode_ci；022_unify_collation.sql 未覆盖到它们。
 *    此处跟随同域生态统一到 utf8mb4_0900_ai_ci（同 20260927_restore_dropped_tables.ts
 *    对 sal_quote 的处理）——本表无跨表字符串关联，统一只为避免日后 JOIN 踩 collation。
 *
 * DECIMAL 精度**不**擅自统一：024_unify_decimal_precision.sql 未覆盖这三张表，
 * 故保留备份里的 (10,4)/(12,4)/(18,4)，与各自父表、与现存子表 sal_delivery_order_item
 * 已经一致，改了反而破坏一致性。
 *
 * 数据不回填
 * ----------
 * 三张表被删时均无业务数据（清理脚本第 4 段「确实为空且无业务意义」），
 * 本迁移只重建结构。sal_delivery_order  AUTO_INCREMENT=11，
 * 已被删掉的 delivery_id 1~10 无法找回——**这 10 行孤儿明细保持孤儿态**，不做臆造回填。
 *
 * 其余 11 张的处置（一并结论，勿再重复排查）
 * ------------------------------------------
 * 清理脚本 DROP 的 17 张里，17-3(上一迁移恢复)-3(本迁移恢复) = 11 张按下列结论保持现状：
 *
 * 【A 类：真废弃，保持删除】迁移明示 + src/ 零引用 + 无数据
 *   pur_order_deprecated / pur_order_detail_deprecated / pur_receipt_deprecated /
 *   pur_receipt_detail_deprecated   迁移第 1 段「删除明确废弃的表」，20260925 已重命名
 *                                   现存 *_deprecated 为废弃判定，此处同源
 *   test_ba / test_bvh              迁移第 2 段「删除测试表」
 *   prd_work_order_bom              已被 prod_work_order + prd_bom/prd_bom_detail 取代
 *                                   （prd_work_order 业务层切换后，BOM 走 prd_bom_detail.material_id）
 *   sal_sample_quotation            与活体 sal_quote 语义重叠，src/ 零引用，无数据
 *
 * 【B 类：有自愈 DDL，无需恢复】src/lib/db/ddl/* + src/app/api/init/* 负责建表，
 *   调用对应 GET 路由即自动 CREATE TABLE，缺的不是结构而是「没人点过路由」
 *   pur_request_line           src/lib/db/ddl/init-three-layer-tables.ts
 *   pur_return_order           src/lib/db/ddl/init-po-grn-tables.ts（seed-data 路由还会 INSERT 演示数据）
 *   sal_sample_order_history   src/lib/db/ddl/init-sample-tables.ts
 *
 * ⚠ 遗留（有意保留，非本迁移范围）
 *   sal_delivery_order_item 的 10 行明细仍是孤儿：其父 sal_delivery_order 被删时
 *   业务数据随父表一起丢失，AUTO_INCREMENT 从 11 起，delivery_id 1~10 无法找回。
 *   不做臆造回填；如需救回，只能从 binlog 里按 delivery_id 反查父单后人工补录。
 *
 * 幂等性
 * ----
 * 全部为 CREATE TABLE IF NOT EXISTS + 索引/外键存在性判断，可重复执行。
 */
import type { Connection } from 'mysql2/promise';

const TABLES = ['sal_delivery_order', 'sal_quote_item', 'sal_return_order_item'];

async function tableExists(conn: Connection, name: string): Promise<boolean> {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return Number((rows as { c: number }[])[0].c) > 0;
}

/** 索引/外键的存在性判断 + 条件执行，保证可重复运行 */
async function addIfMissing(
  conn: Connection,
  body: string,
  checkSql: string,
  params: unknown[] = []
): Promise<void> {
  const [rows] = await conn.query(checkSql, params);
  const row = (rows as Record<string, number>[])[0] ?? {};
  const present = Object.values(row).some((v) => Number(v) > 0);
  if (!present) await conn.query(body);
}

export async function up(conn: Connection): Promise<void> {
  // ============ 1. sal_delivery_order（送货单主表）============
  // 结构取自备份第 12966 行起；无外键（子表 sal_delivery_order_item 的
  // delivery_id 也只有 KEY 无 FK，恢复时保持同样形态，不擅自加约束）
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`sal_delivery_order\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`delivery_no\` VARCHAR(50) NOT NULL COMMENT '送货单号',
      \`order_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '销售订单ID',
      \`order_no\` VARCHAR(50) DEFAULT NULL COMMENT '销售订单编号',
      \`customer_id\` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      \`customer_name\` VARCHAR(100) DEFAULT NULL COMMENT '客户名称',
      \`delivery_date\` DATE DEFAULT NULL COMMENT '送货日期',
      \`contact_name\` VARCHAR(50) DEFAULT NULL COMMENT '收货联系人',
      \`contact_phone\` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
      \`delivery_address\` VARCHAR(255) DEFAULT NULL COMMENT '送货地址',
      \`warehouse_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '发货仓库ID',
      \`logistics_company\` VARCHAR(100) DEFAULT NULL COMMENT '物流公司',
      \`tracking_no\` VARCHAR(50) DEFAULT NULL COMMENT '物流单号',
      \`driver_name\` VARCHAR(50) DEFAULT NULL COMMENT '司机姓名',
      \`vehicle_no\` VARCHAR(20) DEFAULT NULL COMMENT '车牌号',
      \`total_qty\` DECIMAL(18,4) DEFAULT '0.0000' COMMENT '总数量',
      \`total_amount\` DECIMAL(18,4) DEFAULT '0.0000' COMMENT '总金额',
      \`sign_status\` TINYINT DEFAULT '0' COMMENT '签收状态: 0-未签收, 1-已签收, 2-部分签收, 3-拒收',
      \`sign_person\` VARCHAR(50) DEFAULT NULL COMMENT '签收人',
      \`sign_time\` DATETIME DEFAULT NULL COMMENT '签收时间',
      \`sign_remark\` VARCHAR(255) DEFAULT NULL COMMENT '签收备注',
      \`status\` TINYINT DEFAULT '1' COMMENT '状态: 1-待发货, 2-已发货, 3-已签收, 4-已取消',
      \`remark\` TEXT DEFAULT NULL COMMENT '备注',
      \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`update_time\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`create_by\` BIGINT UNSIGNED DEFAULT NULL,
      \`deleted\` TINYINT DEFAULT '0',
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_delivery_no\` (\`delivery_no\`),
      KEY \`idx_order\` (\`order_id\`),
      KEY \`idx_customer\` (\`customer_id\`),
      KEY \`idx_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='送货单表'
  `);

  // ============ 2. sal_quote_item（报价单明细表）============
  // 结构取自 052_create_sample_quote_tables.sql 与备份第 13438 行；
  // FK 目标 sal_quote 已由 20260927_restore_dropped_tables.ts 恢复，可正常建约束
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`sal_quote_item\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`quote_id\` BIGINT UNSIGNED NOT NULL,
      \`line_no\` INT NOT NULL DEFAULT '1',
      \`item_name\` VARCHAR(200) NOT NULL,
      \`quantity\` DECIMAL(10,4) NOT NULL DEFAULT '1.0000',
      \`unit\` VARCHAR(20) DEFAULT 'pcs',
      \`unit_cost\` DECIMAL(12,4) DEFAULT '0.0000',
      \`unit_price\` DECIMAL(12,4) DEFAULT '0.0000',
      \`total_price\` DECIMAL(12,4) DEFAULT '0.0000',
      \`remark\` VARCHAR(255) DEFAULT NULL,
      \`create_time\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_quote_id\` (\`quote_id\`),
      CONSTRAINT \`fk_quote_item_quote\`
        FOREIGN KEY (\`quote_id\`) REFERENCES \`sal_quote\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='报价单明细表'
  `);

  // ============ 3. sal_return_order_item（退货单明细表）============
  // 结构取自备份第 13790 行；FK 目标 sal_return_order 仍在库（3 行）
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`sal_return_order_item\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`return_id\` BIGINT UNSIGNED NOT NULL COMMENT '退货单ID',
      \`delivery_item_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '送货单明细ID',
      \`material_id\` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      \`material_name\` VARCHAR(100) DEFAULT NULL COMMENT '物料名称',
      \`material_spec\` VARCHAR(255) DEFAULT NULL COMMENT '规格型号',
      \`quantity\` DECIMAL(18,4) NOT NULL COMMENT '退货数量',
      \`unit\` VARCHAR(20) DEFAULT NULL COMMENT '单位',
      \`unit_price\` DECIMAL(18,4) DEFAULT NULL COMMENT '单价',
      \`amount\` DECIMAL(18,4) DEFAULT NULL COMMENT '金额',
      \`batch_no\` VARCHAR(50) DEFAULT NULL COMMENT '批次号',
      \`inspection_qty\` DECIMAL(18,4) DEFAULT '0.0000' COMMENT '质检数量',
      \`qualified_qty\` DECIMAL(18,4) DEFAULT '0.0000' COMMENT '合格数量',
      \`remark\` VARCHAR(255) DEFAULT NULL COMMENT '备注',
      \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_return\` (\`return_id\`),
      KEY \`idx_material\` (\`material_id\`),
      CONSTRAINT \`fk_sal_return_order_item_return\`
        FOREIGN KEY (\`return_id\`) REFERENCES \`sal_return_order\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单明细表'
  `);
}

export async function down(conn: Connection): Promise<void> {
  // 注意：sal_delivery_order_item 仍在库且有 10 行，DROP sal_delivery_order
  // 不会级联（二者无 FK），孤儿关系保持原样。执行前请确认已备份。
  for (const t of TABLES) {
    if (await tableExists(conn, t)) await conn.query(`DROP TABLE \`${t}\``);
  }
}
