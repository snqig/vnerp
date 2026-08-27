/**
 * 083 创建出库批次分配明细表 inv_outbound_batch_allocation
 * 用于出库撤销(PUT)时按批次精确回滚（尤其宽度横切产生的母批+子批分配）。
 * 代码结构取自 six-critical-fixes 迁移，幂等（tableExists 探测）。
 */
import { Connection } from 'mysql2/promise';

async function tableExists(conn: Connection, name: string): Promise<boolean> {
  const [rows] = await conn.query(
    `SELECT COUNT(*) c FROM information_schema.tables WHERE table_schema = 'vnerpdacahng' AND table_name = ?`,
    [name]
  );
  return (rows as any[])[0].c > 0;
}

export async function up(conn: Connection): Promise<void> {
  if (await tableExists(conn, 'inv_outbound_batch_allocation')) {
    console.log('= exists inv_outbound_batch_allocation');
    return;
  }
  await conn.query(`
    CREATE TABLE inv_outbound_batch_allocation (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
      source_type VARCHAR(30) NOT NULL COMMENT '来源类型: outbound_order/material_issue/outsource_issue',
      source_id BIGINT UNSIGNED NOT NULL COMMENT '来源单据ID',
      source_no VARCHAR(50) NOT NULL COMMENT '来源单据号',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      batch_id BIGINT UNSIGNED NOT NULL COMMENT '批次ID',
      batch_no VARCHAR(50) NOT NULL COMMENT '批次号',
      allocated_qty DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '分配数量',
      unit_cost DECIMAL(18,4) DEFAULT 0 COMMENT '单位成本',
      total_cost DECIMAL(18,4) DEFAULT 0 COMMENT '总成本',
      fifo_mode VARCHAR(20) DEFAULT 'fifo_auto' COMMENT 'FIFO模式: fifo_auto/specified_batch/manual_override',
      operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
      operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      PRIMARY KEY (id),
      INDEX idx_source (source_type, source_id),
      INDEX idx_source_no (source_no),
      INDEX idx_warehouse (warehouse_id),
      INDEX idx_material (material_id),
      INDEX idx_batch (batch_id),
      INDEX idx_fifo_mode (fifo_mode),
      INDEX idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库批次分配明细表'
  `);
  console.log('+ created inv_outbound_batch_allocation');
}

export async function down(conn: Connection): Promise<void> {
  if (await tableExists(conn, 'inv_outbound_batch_allocation')) {
    await conn.query(`DROP TABLE inv_outbound_batch_allocation`);
    console.log('- dropped inv_outbound_batch_allocation');
  }
}
