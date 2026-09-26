import type { Connection } from 'mysql2/promise';

/**
 * Migration: 设备状态管理表（手工录入，无硬件接入）
 *
 * P2: 新增设备状态变更日志表（eqp_status_log）
 * P2: 确保设备文档表（eqp_document）存在
 */

export async function up(conn: Connection): Promise<void> {
  // ===================== P2: 创建设备状态变更日志表 =====================
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS eqp_status_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        equipment_id BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
        equipment_code VARCHAR(50) COMMENT '设备编码',
        equipment_name VARCHAR(100) COMMENT '设备名称',
        from_status TINYINT COMMENT '变更前状态: 1-运行, 2-待机, 3-维修, 4-停机',
        to_status TINYINT NOT NULL COMMENT '变更后状态: 1-运行, 2-待机, 3-维修, 4-停机',
        operator_id BIGINT UNSIGNED COMMENT '操作人ID',
        operator_name VARCHAR(50) COMMENT '操作人姓名',
        remark VARCHAR(500) COMMENT '变更原因/备注',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_equipment (equipment_id),
        KEY idx_create_time (create_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备状态变更日志表'
    `, []);
    console.log('[migration] eqp_status_log table created');
  } catch (e) {
    console.error('[migration] failed to create eqp_status_log:', (e as Error).message);
  }

  // ===================== P2: 确保设备文档表存在 =====================
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS eqp_document (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        equipment_id BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
        doc_type VARCHAR(50) NOT NULL COMMENT '文档类型',
        doc_name VARCHAR(200) NOT NULL COMMENT '文档名称',
        doc_no VARCHAR(50) COMMENT '文档编号',
        file_path VARCHAR(500) COMMENT '文件路径',
        file_name VARCHAR(200) COMMENT '原始文件名',
        file_size BIGINT COMMENT '文件大小(字节)',
        remark TEXT COMMENT '备注',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        create_by BIGINT UNSIGNED,
        deleted TINYINT DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_equipment (equipment_id),
        KEY idx_doc_type (doc_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备文档管理表'
    `, []);
    console.log('[migration] eqp_document table ensured');
  } catch (e) {
    console.error('[migration] failed to ensure eqp_document:', (e as Error).message);
  }
}

export async function down(conn: Connection): Promise<void> {
  try {
    await conn.query('DROP TABLE IF EXISTS eqp_status_log', []);
    console.log('[migration] eqp_status_log table dropped');
  } catch (e) {
    console.error('[migration] failed to drop eqp_status_log:', (e as Error).message);
  }
  // 注意：eqp_document 不在 down 中回滚，保留数据
}
