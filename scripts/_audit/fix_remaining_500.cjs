const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng',
  });

  const hasCol = async (table, col) => {
    const [r] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema='vnerpdacahng' AND table_name=? AND COLUMN_NAME=?`,
      [table, col]
    );
    return r.length > 0;
  };
  const addCol = async (table, col, def) => {
    if (await hasCol(table, col)) return `${table}.${col}=EXISTS(skip)`;
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    return `${table}.${col}=ADDED`;
  };
  const createTable = async (name, ddl) => {
    const [c] = await conn.query(`SHOW TABLES LIKE '${name}'`);
    if (c.length) return `${name}=EXISTS(skip)`;
    await conn.query(ddl);
    return `${name}=CREATED`;
  };

  const out = [];

  // A) sys_operation_log: business_id, business_type, response_result
  out.push(await addCol('sys_operation_log', 'business_id', "VARCHAR(100) DEFAULT '' COMMENT '业务ID'"));
  out.push(await addCol('sys_operation_log', 'business_type', "VARCHAR(50) DEFAULT '' COMMENT '业务类型'"));
  out.push(await addCol('sys_operation_log', 'response_result', "TEXT COMMENT '响应结果'"));

  // B) sys_employee: deleted
  out.push(await addCol('sys_employee', 'deleted', "TINYINT NOT NULL DEFAULT 0 COMMENT '软删除'"));

  // C) dcprint_tool: deleted (backfill from is_deleted)
  if (!(await hasCol('dcprint_tool', 'deleted'))) {
    await conn.query(`ALTER TABLE dcprint_tool ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除'`);
    await conn.query(`UPDATE dcprint_tool SET deleted = COALESCE(is_deleted, 0)`);
    out.push('dcprint_tool.deleted=ADDED+backfilled');
  } else {
    out.push('dcprint_tool.deleted=EXISTS(skip)');
  }

  // D) qrcode_record: print_count, last_print_time, scan_count, last_scan_time
  out.push(await addCol('qrcode_record', 'print_count', "INT NOT NULL DEFAULT 0 COMMENT '打印次数'"));
  out.push(await addCol('qrcode_record', 'last_print_time', "DATETIME NULL COMMENT '最后打印时间'"));
  out.push(await addCol('qrcode_record', 'scan_count', "INT NOT NULL DEFAULT 0 COMMENT '扫描次数'"));
  out.push(await addCol('qrcode_record', 'last_scan_time', "DATETIME NULL COMMENT '最后扫描时间'"));

  // E) qrcode_scan_log (from database/qrcode_and_print_template.sql:34)
  out.push(await createTable('qrcode_scan_log', `
    CREATE TABLE IF NOT EXISTS qrcode_scan_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      qr_code VARCHAR(100) NOT NULL COMMENT '二维码编码',
      qr_type VARCHAR(50) COMMENT '二维码类型',
      scan_type VARCHAR(50) NOT NULL COMMENT '扫描类型',
      ref_id BIGINT COMMENT '关联ID',
      ref_no VARCHAR(100) COMMENT '关联单号',
      operator_id BIGINT COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      scan_result VARCHAR(20) DEFAULT 'success' COMMENT '扫描结果',
      scan_message VARCHAR(500) COMMENT '扫描消息',
      scan_data TEXT COMMENT '扫描数据JSON',
      device_info VARCHAR(200) COMMENT '设备信息',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_qr_code (qr_code),
      KEY idx_operator (operator_id),
      KEY idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='二维码扫描日志'`
  ));

  console.log(out.join('\n'));
  await conn.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
