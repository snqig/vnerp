-- =====================================================
-- Migration 035: Create sys_notification table
-- 异地登录告警等系统通知需要此表，login 路由的 INSERT INTO sys_notification
-- 因表不存在而静默失败。补建该表以恢复通知功能。
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_notification (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '通知ID',
  type VARCHAR(30) NOT NULL COMMENT '通知类型：inventory_alert/system/task/security等',
  title VARCHAR(200) NOT NULL COMMENT '通知标题',
  content TEXT COMMENT '通知内容',
  user_id BIGINT UNSIGNED COMMENT '接收用户ID（空表示广播）',
  is_read TINYINT DEFAULT 0 COMMENT '是否已读：0未读 1已读',
  read_time DATETIME COMMENT '阅读时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_read (is_read),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统通知';
