/**
 * 迁移：恢复 2026-09-23 被误删、但业务代码仍在使用的 3 张表
 *
 * 背景
 * ----
 * 2026-09-23 13:02 执行了 `20260923_cleanup_empty_tables.sql`（已登记于 sys_migration），
 * 一次性 DROP 了 17 张「据判为空」的表。其中 3 张并非废弃表，而是业务代码仍在读写：
 *
 *   sal_quote                  052_create_sample_quote_tables.sql 创建（2026-07-09 已执行）
 *   sal_sample_feedback        069_enhance_sample_order.sql       创建（2026-07-13 已执行）
 *   prd_work_order_color_seq   无迁移创建；009/017/022/024 各自对其加过索引、外键与精度
 *
 * 依据 binlog 全量扫描（2026-08-26 ~ 2026-09-26，覆盖 DROP 时刻）：
 * 这 3 张表的 INSERT/UPDATE/DELETE 行数**全为 0**——被删时确实是空表，
 * 所以本迁移只重建结构，不回填任何数据，也没有数据可回填。
 *
 * 与「被删前的最终态」的差异（均已核对过后续迁移）
 * ------------------------------------------------
 * 1. collation 统一为 utf8mb4_0900_ai_ci
 *    022_unify_collation.sql 未覆盖 sal_quote（grep 无命中），故其被删前是
 *    utf8mb4_unicode_ci；但同域表（sal_order / sal_sample_order / prd_work_report）
 *    全部已收敛到 utf8mb4_0900_ai_ci。表为空、无跨表字符串关联，
 *    此处选择跟随既有生态，避免日后 JOIN 触发 collation 不一致。
 * 2. prd_work_order_color_seq.estimated_duration_hours 用 DECIMAL(18,4) DEFAULT 4
 *    024_unify_decimal_precision.sql 已把它统一到 (18,4)，即被删前的最终形态；
 *    代码侧 migrations-add-workshop-column.ts 里的 (8,2) 是早期版本，不采用。
 * 3. 外键 fk_prd_wo_color_seq_workorder 指向 prod_work_order（而非 prd_work_order）
 *    017_add_core_foreign_keys.sql 原本指向 prd_work_order，但 prd_work_order
 *    已在「业务层切换 prod_work_order」后被 DROP，现存 7 张子表均改指 prod_work_order。
 *    若不改指，外键建不出来；若删除外键则偏离 017 的参照完整性意图。
 *    如日后该外键造成写入受阻，单独 `ALTER TABLE ... DROP FOREIGN KEY ...` 即可。
 *
 * 幂等性
 * ----
 * 全部为 CREATE TABLE IF NOT EXISTS + 索引/外键 existence 判断，可重复执行。
 * down() 会 DROP 这三张表——**仅在确认无数据时执行**，否则请先自行备份。
 */
import type { Connection } from 'mysql2/promise';

const TABLES = ['sal_quote', 'sal_sample_feedback', 'prd_work_order_color_seq'];

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
  // ============ 1. sal_quote（报价单主表）============
  // 结构取自 052_create_sample_quote_tables.sql，collation 对齐同域表
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`sal_quote\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`quote_no\` VARCHAR(50) NOT NULL COMMENT '报价单号',
      \`quote_date\` DATE NOT NULL,
      \`customer_id\` BIGINT UNSIGNED DEFAULT NULL,
      \`customer_name\` VARCHAR(100) DEFAULT NULL,
      \`sample_card_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '来源工艺卡ID',
      \`sample_no\` VARCHAR(50) DEFAULT NULL,
      \`product_name\` VARCHAR(200) DEFAULT NULL,
      \`quantity\` INT NOT NULL DEFAULT 1,
      \`unit\` VARCHAR(20) DEFAULT 'pcs',
      \`material_cost\` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '物料成本快照',
      \`labor_cost\` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '人工成本快照',
      \`tool_cost\` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '工装成本快照',
      \`total_cost\` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '成本合计快照',
      \`markup_rate\` DECIMAL(5,2) DEFAULT 30.00 COMMENT '加价率(%)',
      \`quoted_price\` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '报价金额',
      \`currency\` VARCHAR(10) DEFAULT 'CNY',
      \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '1-草稿 2-已发送 3-已接受 4-已拒绝 5-已作废',
      \`valid_until\` DATE DEFAULT NULL,
      \`remark\` TEXT DEFAULT NULL,
      \`create_by\` BIGINT UNSIGNED DEFAULT NULL,
      \`create_time\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`update_by\` BIGINT UNSIGNED DEFAULT NULL,
      \`update_time\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`deleted\` TINYINT NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_quote_no\` (\`quote_no\`),
      KEY \`idx_customer\` (\`customer_id\`),
      KEY \`idx_sample_card\` (\`sample_card_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='报价单主表'
  `);

  // 059_add_missing_indexes.sql 补的两个索引（该迁移文件未登记，其 ALTER 随之失效）
  await addIfMissing(
    conn,
    'ALTER TABLE `sal_quote` ADD INDEX `idx_status` (`status`)',
    `SELECT COUNT(*) c FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_quote' AND INDEX_NAME = 'idx_status'`
  );
  await addIfMissing(
    conn,
    'ALTER TABLE `sal_quote` ADD INDEX `idx_quote_date` (`quote_date`)',
    `SELECT COUNT(*) c FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_quote' AND INDEX_NAME = 'idx_quote_date'`
  );

  // ============ 2. sal_sample_feedback（打样反馈表）============
  // 结构取自 069_enhance_sample_order.sql，此后无针对它的 ALTER
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`sal_sample_feedback\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`sample_order_id\` BIGINT UNSIGNED NOT NULL COMMENT '关联打样单ID',
      \`round\` INT NOT NULL DEFAULT 1 COMMENT '反馈轮次',
      \`feedback_content\` TEXT COMMENT '客户反馈意见',
      \`modification_requirements\` TEXT COMMENT '修改要求',
      \`confirmation_status\` VARCHAR(20) DEFAULT 'pending' COMMENT '确认状态: pending/approved/rejected',
      \`feedback_by\` VARCHAR(100) COMMENT '反馈人',
      \`feedback_time\` DATETIME COMMENT '反馈时间',
      \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`deleted\` TINYINT DEFAULT 0,
      PRIMARY KEY (\`id\`),
      KEY \`idx_sample_order\` (\`sample_order_id\`),
      KEY \`idx_round\` (\`sample_order_id\`, \`round\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='打样反馈表'
  `);

  // ============ 3. prd_work_order_color_seq（工单色序表）============
  // 列取自代码侧 migrations-add-workshop-column.ts，精度与索引/外键按 009/017/024 演进修正
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`prd_work_order_color_seq\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`work_order_id\` BIGINT UNSIGNED NOT NULL COMMENT '工单ID',
      \`seq_no\` INT NOT NULL COMMENT '色序号',
      \`color_name\` VARCHAR(50) DEFAULT NULL COMMENT '颜色名称',
      \`screen_plate_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '网版ID',
      \`ink_formula_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '油墨配方ID',
      \`estimated_duration_hours\` DECIMAL(18,4) DEFAULT 4 COMMENT '预计耗时（小时）',
      \`equipment_type_required\` VARCHAR(50) DEFAULT NULL COMMENT '所需设备类型',
      \`depends_on_seq\` INT DEFAULT NULL COMMENT '依赖工序',
      \`create_time\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`deleted\` TINYINT NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      KEY \`idx_work_order\` (\`work_order_id\`),
      KEY \`idx_screen_plate\` (\`screen_plate_id\`),
      KEY \`idx_ink_formula\` (\`ink_formula_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单色序表'
  `);

  // 009_add_indexes_and_fks.sql 补的两个单列索引
  await addIfMissing(
    conn,
    'ALTER TABLE `prd_work_order_color_seq` ADD INDEX `idx_screen_plate` (`screen_plate_id`)',
    `SELECT COUNT(*) c FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order_color_seq' AND INDEX_NAME = 'idx_screen_plate'`
  );
  await addIfMissing(
    conn,
    'ALTER TABLE `prd_work_order_color_seq` ADD INDEX `idx_ink_formula` (`ink_formula_id`)',
    `SELECT COUNT(*) c FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order_color_seq' AND INDEX_NAME = 'idx_ink_formula'`
  );

  // 017_add_core_foreign_keys.sql 的外键，目标表已改为 prod_work_order
  await addIfMissing(
    conn,
    `ALTER TABLE \`prd_work_order_color_seq\`
       ADD CONSTRAINT \`fk_prd_wo_color_seq_workorder\`
       FOREIGN KEY (\`work_order_id\`) REFERENCES \`prod_work_order\`(\`id\`)
       ON DELETE CASCADE ON UPDATE CASCADE`,
    `SELECT COUNT(*) c FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order_color_seq'
        AND CONSTRAINT_NAME = 'fk_prd_wo_color_seq_workorder'`
  );
}

export async function down(conn: Connection): Promise<void> {
  // 仅这三张表有业务代码在用；sal_quote_item 本轮不恢复，也就不在回滚范围
  for (const t of TABLES) {
    if (await tableExists(conn, t)) await conn.query(`DROP TABLE \`${t}\``);
  }
}
