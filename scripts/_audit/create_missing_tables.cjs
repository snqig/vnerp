const mysql = require('mysql2/promise');

const DDL = [
  `CREATE TABLE IF NOT EXISTS sys_scheduled_task (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '任务ID',
    task_name VARCHAR(200) NOT NULL COMMENT '任务名称',
    task_type VARCHAR(50) NOT NULL COMMENT '任务类型',
    task_group VARCHAR(50) DEFAULT 'default' COMMENT '任务分组',
    cron_expression VARCHAR(100) COMMENT 'Cron表达式',
    description TEXT COMMENT '任务描述',
    config TEXT COMMENT '任务配置（JSON）',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态：active/paused',
    last_execute_time DATETIME COMMENT '最后执行时间',
    last_result TEXT COMMENT '最后执行结果',
    create_by BIGINT UNSIGNED COMMENT '创建人',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_task_type (task_type),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='定时任务表'`,

  `CREATE TABLE IF NOT EXISTS sys_task_execution_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    task_id BIGINT UNSIGNED NOT NULL COMMENT '任务ID',
    task_name VARCHAR(200) COMMENT '任务名称',
    start_time DATETIME COMMENT '开始时间',
    end_time DATETIME COMMENT '结束时间',
    status VARCHAR(20) DEFAULT 'running' COMMENT '状态',
    result TEXT COMMENT '执行结果',
    INDEX idx_task_id (task_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务执行日志'`,

  `CREATE TABLE IF NOT EXISTS sys_announcement (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '公告ID',
    title VARCHAR(200) NOT NULL COMMENT '公告标题',
    content TEXT NOT NULL COMMENT '公告内容',
    type VARCHAR(20) DEFAULT 'info' COMMENT '类型',
    priority INT DEFAULT 0 COMMENT '优先级',
    is_top TINYINT DEFAULT 0 COMMENT '是否置顶',
    publish_time DATETIME COMMENT '发布时间',
    expire_time DATETIME COMMENT '过期时间',
    status VARCHAR(20) DEFAULT 'draft' COMMENT '状态',
    create_by BIGINT UNSIGNED COMMENT '创建人',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_status (status),
    INDEX idx_publish_time (publish_time)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统公告'`,

  `CREATE TABLE IF NOT EXISTS sys_announcement_read (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ID',
    announcement_id BIGINT UNSIGNED NOT NULL COMMENT '公告ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    read_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
    UNIQUE KEY uk_announcement_user (announcement_id, user_id),
    INDEX idx_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告阅读记录'`,

  `CREATE TABLE IF NOT EXISTS label_template (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    scenario VARCHAR(30) NOT NULL COMMENT '使用场景',
    html_template TEXT NOT NULL COMMENT 'HTML模板内容',
    width_mm INT DEFAULT 60 COMMENT '标签宽度(mm)',
    height_mm INT DEFAULT 40 COMMENT '标签高度(mm)',
    qr_size_mm INT DEFAULT 20 COMMENT '二维码尺寸(mm)',
    status TINYINT DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_scenario (scenario)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签模板表'`,

  `CREATE TABLE IF NOT EXISTS ink_usage (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usage_no VARCHAR(50) NOT NULL COMMENT '使用记录号',
    usage_type VARCHAR(20) NOT NULL COMMENT '类型',
    batch_no VARCHAR(50) COMMENT '油墨批次号',
    qr_code VARCHAR(100) COMMENT '二维码',
    workorder_id BIGINT UNSIGNED COMMENT '工单ID',
    workorder_no VARCHAR(50) COMMENT '工单号',
    formula_id BIGINT UNSIGNED COMMENT '配方ID',
    formula_no VARCHAR(50) COMMENT '配方编号',
    color_name VARCHAR(100) COMMENT '颜色名称',
    weight DECIMAL(10,3) NOT NULL COMMENT '重量',
    unit VARCHAR(10) DEFAULT 'kg' COMMENT '单位',
    operator_id BIGINT UNSIGNED COMMENT '操作员ID',
    operator_name VARCHAR(50) COMMENT '操作员',
    machine_id BIGINT UNSIGNED COMMENT '机台ID',
    machine_name VARCHAR(100) COMMENT '机台名称',
    location_id BIGINT UNSIGNED COMMENT '库位ID',
    location_name VARCHAR(100) COMMENT '库位名称',
    status TINYINT DEFAULT 1 COMMENT '1-有效',
    remark TEXT COMMENT '备注',
    usage_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '使用时间',
    deleted TINYINT DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_usage_no (usage_no),
    KEY idx_batch_no (batch_no),
    KEY idx_workorder (workorder_no),
    KEY idx_usage_type (usage_type),
    KEY idx_usage_time (usage_time)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨使用记录表'`,
];

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
    multipleStatements: false,
  });
  const created = [];
  for (const ddl of DDL) {
    const m = ddl.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    const t = m ? m[1] : '?';
    await conn.query(ddl);
    created.push(t);
  }
  console.log('CREATED:', created.join(', '));
  await conn.end();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
