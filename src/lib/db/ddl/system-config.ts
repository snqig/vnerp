/**
 * src/app/api/system/config/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_SYS_CONFIG = `CREATE TABLE IF NOT EXISTS sys_config (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      config_name VARCHAR(100) NOT NULL COMMENT '参数名称',
      config_key VARCHAR(100) NOT NULL COMMENT '参数键名',
      config_value VARCHAR(500) NOT NULL COMMENT '参数键值',
      config_type TINYINT DEFAULT 1 COMMENT '参数类型: 1-文本, 2-开关',
      description VARCHAR(500) COMMENT '描述',
      remark VARCHAR(500) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_config_key (config_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数配置表'`;
