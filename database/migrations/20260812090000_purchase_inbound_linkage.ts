/**
 * 采购入库单与采购订单联动改造
 *
 * 背景：让采购入库单强制关联采购订单。
 *  - inv_inbound_order 增加来源类型(source_type)与来源单据ID(source_order_id)，
 *    存量 po_id 非空记录回填为 purchase_order 来源；
 *  - inv_inbound_item 增加采购订单明细关联字段(purchase_order_item_id / purchase_order_line_no)；
 *  - pur_purchase_order 增加已收数量汇总字段(received_quantity)，由明细 received_qty 汇总回填；
 *  - sys_config 写入采购入库超收比例默认配置。
 *
 * 幂等：迁移由 scripts/migrate.ts 基于 sys_migration 记录保证只执行一次；
 *       sys_config 插入使用 ON DUPLICATE KEY UPDATE，可重复执行。
 */

import { Connection } from 'mysql2/promise';

export async function up(conn: Connection): Promise<void> {
  // 1. inv_inbound_order：来源类型 + 来源单据ID + 联合索引
  await conn.query(
    "ALTER TABLE `inv_inbound_order` " +
      "ADD COLUMN `source_type` VARCHAR(20) NULL COMMENT '来源类型: purchase_order-采购订单', " +
      "ADD COLUMN `source_order_id` BIGINT UNSIGNED NULL COMMENT '来源单据ID（如采购订单ID）', " +
      "ADD INDEX `idx_source_order` (`source_type`, `source_order_id`)"
  );

  // 2. inv_inbound_item：采购订单明细关联字段
  await conn.query(
    "ALTER TABLE `inv_inbound_item` " +
      "ADD COLUMN `purchase_order_item_id` BIGINT UNSIGNED NULL COMMENT '采购订单明细ID(pur_purchase_order_line.id)', " +
      "ADD COLUMN `purchase_order_line_no` INT UNSIGNED NULL COMMENT '采购订单行号(pur_purchase_order_line.line_no)'"
  );

  // 3. pur_purchase_order：已收数量汇总字段
  await conn.query(
    "ALTER TABLE `pur_purchase_order` " +
      "ADD COLUMN `received_quantity` DECIMAL(18,4) NOT NULL DEFAULT 0.0000 COMMENT '已收数量汇总（由明细 received_qty 汇总）'"
  );

  // 4. 历史数据回填
  // 4.1 存量 po_id 非空的入库单回填来源信息
  await conn.query(
    "UPDATE `inv_inbound_order` SET `source_type` = 'purchase_order', `source_order_id` = `po_id` WHERE `po_id` IS NOT NULL"
  );
  // 4.2 采购订单已收数量按明细汇总回填
  await conn.query(
    "UPDATE `pur_purchase_order` o SET `received_quantity` = " +
      "(SELECT IFNULL(SUM(l.`received_qty`), 0) FROM `pur_purchase_order_line` l WHERE l.`po_id` = o.`id`)"
  );

  // 5. 系统配置默认值：采购入库超收比例(%)，范围0~20
  await conn.query(
    "INSERT INTO `sys_config` (`config_key`, `config_value`, `description`, `config_name`, `config_type_enum`, `category`, `display_name`, `sort_order`, `status`) " +
      "VALUES ('purchase.over_receipt_tolerance', '5', '采购入库超收比例(%)，范围0~20', '采购入库超收比例', 'number', '采购管理', '采购入库超收比例', 0, 1) " +
      "ON DUPLICATE KEY UPDATE " +
      "`config_value` = VALUES(`config_value`), `description` = VALUES(`description`), `status` = 1, `deleted` = 0"
  );
}

export async function down(conn: Connection): Promise<void> {
  // 与 up 相反顺序回滚；sys_config 配置项保守保留，不删除
  // 1. 采购订单已收数量汇总字段
  await conn.query('ALTER TABLE `pur_purchase_order` DROP COLUMN `received_quantity`');

  // 2. 入库单明细采购订单关联字段
  await conn.query(
    'ALTER TABLE `inv_inbound_item` DROP COLUMN `purchase_order_line_no`, DROP COLUMN `purchase_order_item_id`'
  );

  // 3. 入库单来源字段与联合索引（先删索引再删列）
  await conn.query(
    'ALTER TABLE `inv_inbound_order` DROP INDEX `idx_source_order`, DROP COLUMN `source_order_id`, DROP COLUMN `source_type`'
  );
}
