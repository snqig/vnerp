/**
 * 批次保质期派生工具
 *
 * 业务规则：批次过期日期 = 生产日期 + 物料主数据保质期（`inv_material.shelf_life` 天）。
 * 仅当生产日期非空且物料配置了有效保质期(>0)时才返回派生日期；否则为 NULL（不强制过期）。
 *
 * 这是 FIFO「临期优先」排序与 `BatchExpiryScheduler` 自动过期/预警能真正生效的前提——
 * 此前所有收货/完工/退货写入路径都不采集 produce_date / expire_date，导致 803 条批次
 * 的 expire_date 全为 NULL，过期调度与临期排序完全休眠。
 *
 * 用法（拼入 `INSERT INTO inv_inventory_batch` 的列与值）：
 *   columns: `, produce_date, expire_date`
 *   values:  `, ?, <expireDateFragment()>`
 *   params:  `[..., produceDate, produceDate, materialId]`
 *   其中 expireDateFragment() 内部含两个占位符：① 生产日期（供 DATE_ADD）；② 物料 ID（查 shelf_life）。
 */
export function expireDateFragment(): string {
  return `(SELECT DATE_ADD(?, INTERVAL shelf_life DAY) FROM inv_material WHERE id = ? AND shelf_life > 0)`;
}

/**
 * 与 expireDateFragment 等价，但生产日期取数据库当天（CURDATE()），仅含一个占位符（物料 ID）。
 * 适用于那些入库日期直接写 CURDATE() 的写入路径，避免传入 JS 日期造成的时区/偏移一天问题。
 */
export function expireDateFragmentFromToday(): string {
  return `(SELECT DATE_ADD(CURDATE(), INTERVAL shelf_life DAY) FROM inv_material WHERE id = ? AND shelf_life > 0)`;
}
