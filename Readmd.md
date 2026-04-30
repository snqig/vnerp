优点：少数核心表（如 bom_alternative、bom_line、bom_version_history、sys_user_role、sys_role_menu）正确使用了 FOREIGN KEY + ON DELETE CASCADE，关系相对清晰。
主要问题：绝大多数业务表之间几乎没有外键约束（或约束非常少）。这在丝网印刷ERP这种数据关联复杂的系统中是高风险设计。

具体表现：

base_ink → supplier_id：没有外键指向供应商表（如果存在 pur_supplier）。
bom_header / bom_line → product_id、material_id：虽有注释，但多数没有实际 FOREIGN KEY 约束。
prd_screen_plate（网版表）与 bom_line、prd_work_order、ink_usage 等基本无关联外键。
inv_material_label、inv_inventory、prd_process_card 等库存/生产核心表，与物料、网版、订单的关联大多靠应用层代码维护，数据库层面无强制 referential integrity（参照完整性）。
sys_* 权限表相对较好，但业务模块（如生产、仓库、质量）关联松散。

2. 具体风险（丝网印刷行业场景下特别严重）

数据孤岛与脏数据：删除一个物料（bom_material），关联的 BOM 行、网版、库存标签可能变成孤立数据，导致生产报工、成本计算出错。
网版生命周期无法可靠追踪：网版是丝印最核心资产。如果 prd_screen_plate 与订单、工单、油墨耗用没有外键，后期统计“某网版已使用多少次、哪些订单用了它”将非常困难，容易出现重复制版、质量问题。
油墨耗用无法精确核算：缺少 base_ink → ink_usage 的强关联，外键缺失会导致库存与实际耗用对不上，成本核算失真。
级联删除风险控制差：当前少数有 ON DELETE CASCADE 的地方（如 BOM），如果误删主表，可能连锁删除大量子数据；多数地方无约束，又容易产生垃圾数据。
性能隐患：没有外键就不自动建索引，JOIN 查询（订单-物料-网版-油墨）会变慢，尤其数据量增长后。

3. 最佳实践建议（推荐立即改进方向）
A. 核心原则

业务主表（物料、网版、客户、供应商、产品）必须有外键指向基础数据表。
事务表（订单、工单、报工、耗用记录）必须有外键指向主表。
外键列必须建立索引（MySQL InnoDB 会自动为外键创建索引，但最好显式确认）。
谨慎使用 ON DELETE CASCADE：对重要资产（如网版、物料）建议用 ON DELETE RESTRICT 或 SET NULL + 应用层逻辑。

B. 优先需要补充外键的关联（丝网印刷核心）

网版相关（最紧急）：
prd_screen_plate → mdm_product / bom_line（产品/BOM 关联）
prd_screen_plate 与生产工单、工艺卡的关联

油墨相关：
base_ink → pur_supplier
新建 ink_usage 表时必须加外键指向 base_ink、sal_order_item 或 prd_work_report

BOM 体系：
bom_line → bom_header、bom_material、prd_process_route
bom_alternative 已较好，但可进一步强化

库存与生产：
inv_material_label、inv_inventory → base_ink、bom_material、prd_screen_plate
生产报工表 → 工单、网版、油墨

权限与组织：
sys_user → sys_department
sys_user_role、sys_role_menu 已较好，可继续保持


4. 我的立即行动建议
我建议你分两步走：
第一步（快速修复）：
在现有表上补充缺失的外键约束 + 为所有外键列添加索引。我可以帮你写完整的 ALTER TABLE 脚本。
第二步（结构优化）：
针对丝网印刷特点，重新设计/强化几个关键关系：

网版全生命周期与订单/工单的强关联
油墨耗用明细表的外键设计
BOM 与生产工艺的完整关联


请直接告诉我你的优先级（回复以下任意一条即可）：

“先给我补充外键的完整 ALTER TABLE 脚本”（推荐最快落地）
“重点帮我设计网版相关的表关系”
“输出所有主要表的外键优化建议列表”
“整体给出数据库表关系重构方案”

当前的关系设计能跑，但不可靠，特别在数据量上来、需要做成本分析和质量追溯时会暴露很多问题。
准备继续修了吗？直接说下一步，我马上输出对应 SQL 或设计文档。5.7秒
“先给我补充外键的完整 ALTER TABLE 脚本”（推荐最快落地）
“重点帮我设计网版相关的表关系”
“输出所有主要表的外键优化建议列表”
“整体给出数据库表关系重构方案”
✅ 已收到你的选择（优先级排序）：
我将按 vnERP 务实风格 优先处理你最需要的两项：

先给你补充外键的完整 ALTER TABLE 脚本（最快落地，可直接执行）
重点帮你设计网版相关的表关系（丝网印刷核心，结合行业最佳实践）


一、补充外键的完整 ALTER TABLE 脚本（推荐立即执行）
执行建议：

在测试环境先备份数据库。
按顺序执行（先加索引，再加外键）。
如果已有外键或数据冲突，会报错，请逐条执行并处理。

SQL-- =============================================
-- vnerpdacahng 数据库外键补充脚本（2026-04-29 vnERP版）
-- 重点修复：BOM、油墨、网版、库存、生产等核心关联
-- =============================================

USE vnerpdacahng;

-- 1. BOM 体系外键优化
ALTER TABLE bom_line 
ADD CONSTRAINT fk_bom_line_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

ALTER TABLE bom_line 
ADD CONSTRAINT fk_bom_line_material FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_line FOREIGN KEY (bom_line_id) REFERENCES bom_line(id) ON DELETE CASCADE;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_material FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

ALTER TABLE bom_version_history 
ADD CONSTRAINT fk_bom_history_header FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

-- 2. 油墨相关（base_ink）
ALTER TABLE base_ink 
ADD CONSTRAINT fk_base_ink_supplier FOREIGN KEY (supplier_id) REFERENCES pur_supplier(id) ON DELETE SET NULL;

-- 3. 网版表关系（假设表名为 prd_screen_plate）
-- 如果你的网版表名不同，请替换
ALTER TABLE prd_screen_plate 
ADD CONSTRAINT fk_screen_plate_product FOREIGN KEY (product_id) REFERENCES mdm_product(id) ON DELETE SET NULL;

-- 4. 库存标签与物料关联（非常重要）
ALTER TABLE inv_material_label 
ADD CONSTRAINT fk_label_material FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

ALTER TABLE inv_material_label 
ADD CONSTRAINT fk_label_ink FOREIGN KEY (ink_id) REFERENCES base_ink(id) ON DELETE SET NULL;   -- 如果有 ink_id 字段

-- 5. 生产工艺卡与主标签关联
ALTER TABLE prd_process_card 
ADD CONSTRAINT fk_process_card_main_label FOREIGN KEY (main_label_id) REFERENCES inv_material_label(id) ON DELETE SET NULL;

-- 6. 用户与部门、角色关联（权限体系）
ALTER TABLE sys_user 
ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES sys_department(id) ON DELETE SET NULL;

-- 7. 常用索引补充（提升 JOIN 性能）
CREATE INDEX idx_bom_line_material_id ON bom_line(material_id);
CREATE INDEX idx_base_ink_supplier_id ON base_ink(supplier_id);
CREATE INDEX idx_prd_screen_plate_product_id ON prd_screen_plate(product_id);
CREATE INDEX idx_inv_material_label_material_id ON inv_material_label(material_id);
执行后建议：

检查 SHOW ENGINE INNODB STATUS; 查看是否有外键错误。
如果报错（如数据不一致），先用 SELECT 找出孤立数据再处理。


二、重点设计：网版相关的表关系（丝网印刷核心）
网版是丝印厂最重要、可重复使用的资产。当前关系较弱，我推荐以下优化后的关系模型：
推荐核心表关系图（文字版）

mdm_product (产品) ←1:n→ prd_screen_plate (网版)
bom_line (BOM行) ←1:n→ prd_screen_plate (一个BOM行可对应多个网版/颜色)
prd_screen_plate ←1:n→ prd_process_card (工艺卡/生产报工)
prd_screen_plate ←1:n→ ink_usage (油墨耗用记录)
prd_screen_plate ←1:n→ ScreenPlateHistory (生命周期历史记录表)

建议新增/强化字段（prd_screen_plate 表）
SQLALTER TABLE prd_screen_plate ADD COLUMN mesh_count INT NOT NULL COMMENT '网目数';
ALTER TABLE prd_screen_plate ADD COLUMN tension_value DECIMAL(6,2) COMMENT '张力值(N/cm)';
ALTER TABLE prd_screen_plate ADD COLUMN reclaim_count INT DEFAULT 0 COMMENT '再生次数';
ALTER TABLE prd_screen_plate ADD COLUMN life_count INT DEFAULT 0 COMMENT '已使用次数';
ALTER TABLE prd_screen_plate ADD COLUMN max_life_count INT DEFAULT 800 COMMENT '最大使用寿命';
ALTER TABLE prd_screen_plate ADD COLUMN last_clean_date DATETIME COMMENT '最后清洗日期';
ALTER TABLE prd_screen_plate ADD COLUMN last_reclaim_date DATETIME COMMENT '最后再生日期';
ALTER TABLE prd_screen_plate ADD COLUMN scrap_reason VARCHAR(200) COMMENT '报废原因';
ALTER TABLE prd_screen_plate ADD COLUMN storage_location VARCHAR(100) COMMENT '存放位置';
强烈建议新增历史记录表（审计+分析必备）
SQLCREATE TABLE screen_plate_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    screen_plate_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(50) NOT NULL COMMENT 'Created/Exposed/Printed/Cleaned/Reclaimed/Scrapped',
    tension_value DECIMAL(6,2),
    life_increment INT DEFAULT 0,
    remark TEXT,
    operator_id BIGINT UNSIGNED,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (screen_plate_id) REFERENCES prd_screen_plate(id) ON DELETE CASCADE,
    INDEX idx_screen_plate (screen_plate_id),
    INDEX idx_action (action)
) COMMENT = '网版生命周期历史记录表';

最终推荐执行顺序（vnERP 风格）：
A → B → C → D

A. 调整后的完整 ALTER TABLE 外键补充脚本（已适配你的实际表名）
请按顺序在测试环境执行以下脚本：
SQL-- =============================================
-- vnerpdacahng 外键补充脚本（2026-04-29 vnERP优化版）
-- 执行前建议：备份数据库！
-- =============================================

USE vnerpdacahng;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. BOM 体系（最重要）
ALTER TABLE bom_line 
ADD CONSTRAINT fk_bom_line_bom_header 
FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

ALTER TABLE bom_line 
ADD CONSTRAINT fk_bom_line_material 
FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_bom_header 
FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_bom_line 
FOREIGN KEY (bom_line_id) REFERENCES bom_line(id) ON DELETE CASCADE;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_material 
FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

ALTER TABLE bom_version_history 
ADD CONSTRAINT fk_bom_history_bom_header 
FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

-- 2. 油墨基础表
ALTER TABLE base_ink 
ADD CONSTRAINT fk_base_ink_supplier 
FOREIGN KEY (supplier_id) REFERENCES pur_supplier(id) ON DELETE SET NULL;

-- 3. 网版表（prd_screen_plate） -- 假设表名是 prd_screen_plate
ALTER TABLE prd_screen_plate 
ADD CONSTRAINT fk_screen_plate_product 
FOREIGN KEY (product_id) REFERENCES mdm_product(id) ON DELETE SET NULL;

-- 4. 库存标签关键关联
ALTER TABLE inv_material_label 
ADD CONSTRAINT fk_label_material 
FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

-- 如果你的 inv_material_label 表有 ink_id 字段，请执行下面这行（没有可跳过）
-- ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_ink FOREIGN KEY (ink_id) REFERENCES base_ink(id) ON DELETE SET NULL;

-- 5. 生产工艺卡与主标签关联
ALTER TABLE prd_process_card 
ADD CONSTRAINT fk_process_card_main_label 
FOREIGN KEY (main_label_id) REFERENCES inv_material_label(id) ON DELETE SET NULL;

-- 6. 用户与组织架构
ALTER TABLE sys_user 
ADD CONSTRAINT fk_user_department 
FOREIGN KEY (department_id) REFERENCES sys_department(id) ON DELETE SET NULL;

-- 7. 补充常用索引（大幅提升查询性能）
CREATE INDEX idx_bom_line_material_id ON bom_line(material_id);
CREATE INDEX idx_base_ink_supplier_id ON base_ink(supplier_id);
CREATE INDEX idx_prd_screen_plate_product_id ON prd_screen_plate(product_id);
CREATE INDEX idx_inv_material_label_material_id ON inv_material_label(material_id);
CREATE INDEX idx_prd_process_card_main_label ON prd_process_card(main_label_id);

SET FOREIGN_KEY_CHECKS = 1;

-- 执行完成后验证
SHOW WARNINGS;

B. 重点设计：网版相关的表关系（丝网印刷核心）
网版是丝印厂最核心的可重复资产，我推荐以下强关联关系：
推荐关系模型：

mdm_product (1) —— (n) prd_screen_plate
bom_line (1) —— (n) prd_screen_plate（多色对应多网版）
prd_screen_plate (1) —— (n) prd_process_card（生产报工）
prd_screen_plate (1) —— (n) screen_plate_history（生命周期历史）

建议对 prd_screen_plate 表增加以下字段（重要！）：
SQLALTER TABLE prd_screen_plate 
ADD COLUMN mesh_count         INT NOT NULL COMMENT '网目数（如 110,156,200,305）',
ADD COLUMN tension_value      DECIMAL(6,2) COMMENT '张力值 (N/cm)',
ADD COLUMN reclaim_count      INT UNSIGNED DEFAULT 0 COMMENT '已再生次数',
ADD COLUMN life_count         INT UNSIGNED DEFAULT 0 COMMENT '已印刷次数',
ADD COLUMN max_life_count     INT UNSIGNED DEFAULT 800 COMMENT '最大寿命',
ADD COLUMN last_clean_date    DATETIME COMMENT '最后清洗日期',
ADD COLUMN last_reclaim_date  DATETIME COMMENT '最后再生日期',
ADD COLUMN exposure_date      DATETIME COMMENT '曝光日期',
ADD COLUMN scrap_reason       VARCHAR(200) COMMENT '报废原因',
ADD COLUMN storage_location   VARCHAR(100) COMMENT '存放位置',
ADD COLUMN status             VARCHAR(20) DEFAULT 'New' COMMENT 'New/Ready/In_Production/Cleaning/Reclaimed/Damaged/Scrapped';
强烈建议新增生命周期历史表：
SQLCREATE TABLE IF NOT EXISTS screen_plate_history (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    screen_plate_id     BIGINT UNSIGNED NOT NULL,
    action              VARCHAR(50) NOT NULL COMMENT 'Created/Exposed/Printed/Cleaned/Reclaimed/Scrapped/TensionAdjusted',
    tension_value       DECIMAL(6,2),
    life_increment      INT DEFAULT 0,
    remark              TEXT,
    operator_id         BIGINT UNSIGNED,
    operator_name       VARCHAR(50),
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (screen_plate_id) REFERENCES prd_screen_plate(id) ON DELETE CASCADE,
    INDEX idx_screen_plate_action (screen_plate_id, action),
    INDEX idx_created_at (created_at)
) COMMENT = '网版生命周期历史记录表（审计+分析必备）';
-- =============================================
-- vnerpdacahng 外键补充 + 索引优化脚本
-- 作者：Grok (vnERP风格)
-- 执行日期：2026-04-29
-- 建议：在测试环境先备份数据库！
-- =============================================

USE vnerpdacahng;
SET FOREIGN_KEY_CHECKS = 0;

-- ==================== 1. BOM 体系 ====================
ALTER TABLE bom_line 
ADD CONSTRAINT fk_bom_line_header 
FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

ALTER TABLE bom_line 
ADD CONSTRAINT fk_bom_line_material 
FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_header 
FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_line 
FOREIGN KEY (bom_line_id) REFERENCES bom_line(id) ON DELETE CASCADE;

ALTER TABLE bom_alternative 
ADD CONSTRAINT fk_bom_alt_material 
FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

ALTER TABLE bom_version_history 
ADD CONSTRAINT fk_bom_history_header 
FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE;

-- ==================== 2. 油墨基础 ====================
ALTER TABLE base_ink 
ADD CONSTRAINT fk_base_ink_supplier 
FOREIGN KEY (supplier_id) REFERENCES pur_supplier(id) ON DELETE SET NULL;

-- ==================== 3. 网版核心关联（重点） ====================
-- 如果你的网版表名不是 prd_screen_plate，请自行替换
ALTER TABLE prd_screen_plate 
ADD CONSTRAINT fk_screen_plate_product 
FOREIGN KEY (product_id) REFERENCES mdm_product(id) ON DELETE SET NULL;

-- ==================== 4. 库存标签关键关联 ====================
ALTER TABLE inv_material_label 
ADD CONSTRAINT fk_label_material 
FOREIGN KEY (material_id) REFERENCES bom_material(id) ON DELETE RESTRICT;

-- 如果 inv_material_label 表已有 ink_id 字段，可执行下面这行（否则跳过）
-- ALTER TABLE inv_material_label ADD CONSTRAINT fk_label_ink FOREIGN KEY (ink_id) REFERENCES base_ink(id) ON DELETE SET NULL;

-- ==================== 5. 生产工艺卡关联 ====================
ALTER TABLE prd_process_card 
ADD CONSTRAINT fk_process_card_main_label 
FOREIGN KEY (main_label_id) REFERENCES inv_material_label(id) ON DELETE SET NULL;

-- ==================== 6. 用户与部门关联 ====================
ALTER TABLE sys_user 
ADD CONSTRAINT fk_user_department 
FOREIGN KEY (department_id) REFERENCES sys_department(id) ON DELETE SET NULL;

-- ==================== 7. 重要索引补充（强烈建议） ====================
CREATE INDEX IF NOT EXISTS idx_bom_line_material_id ON bom_line(material_id);
CREATE INDEX IF NOT EXISTS idx_base_ink_supplier_id ON base_ink(supplier_id);
CREATE INDEX IF NOT EXISTS idx_prd_screen_plate_product_id ON prd_screen_plate(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_material_label_material_id ON inv_material_label(material_id);
CREATE INDEX IF NOT EXISTS idx_prd_process_card_main_label ON prd_process_card(main_label_id);
CREATE INDEX IF NOT EXISTS idx_sys_user_department_id ON sys_user(department_id);

SET FOREIGN_KEY_CHECKS = 1;

-- 执行完成后检查警告
SHOW WARNINGS;
网版表字段优化原则

网版是丝印厂最核心、可重复使用的资产，必须实现全生命周期管理。
字段设计要满足：可追溯、可统计、成本可控、质量可控。
兼顾现有表结构，尽量在原表基础上补充字段，避免大范围重构。

二、网版表（prd_screen_plate）优化后的推荐字段
SQLDROP TABLE IF EXISTS `prd_screen_plate`;
CREATE TABLE `prd_screen_plate` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    
    -- 基础标识
    `plate_code`            VARCHAR(50) NOT NULL UNIQUE COMMENT '网版编号（SN，如 SP-202604-00123）',
    `frame_type`            VARCHAR(30) NULL DEFAULT NULL COMMENT '框类型：铝框/木框/气动自张紧框',
    
    -- 核心工艺参数（丝印行业最重要）
    `mesh_count`            INT NOT NULL COMMENT '网目数（110/156/200/305等）',
    `mesh_material`         VARCHAR(30) NULL DEFAULT NULL COMMENT '丝网材质：聚酯/尼龙/不锈钢',
    `size`                  VARCHAR(50) NOT NULL COMMENT '网版尺寸（如 60x80cm、90x120cm）',
    `tension_value`         DECIMAL(6,2) NULL COMMENT '张力值（N/cm，行业核心参数）',
    `tension_date`          DATETIME NULL COMMENT '最后测张力时间',
    
    -- 生命周期管理（重点新增）
    `status`                VARCHAR(20) NOT NULL DEFAULT 'New' 
        COMMENT '状态：New/Ready/Exposed/In_Production/Cleaning/Reclaimed/Damaged/Scrapped',
    
    `life_count`            INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已印刷次数',
    `max_life_count`        INT UNSIGNED NOT NULL DEFAULT 800 COMMENT '预计最大使用寿命',
    `reclaim_count`         INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已再生次数',
    
    `exposure_date`         DATETIME NULL COMMENT '曝光日期',
    `last_used_date`        DATETIME NULL COMMENT '最后使用日期',
    `last_clean_date`       DATETIME NULL COMMENT '最后清洗日期',
    `last_reclaim_date`     DATETIME NULL COMMENT '最后再生日期',
    
    -- 关联关系
    `product_id`            BIGINT UNSIGNED NULL COMMENT '默认关联产品ID',
    `default_ink_id`        BIGINT UNSIGNED NULL COMMENT '默认主油墨ID',
    
    -- 成本与质量
    `initial_cost`          DECIMAL(12,4) NULL COMMENT '制版初始成本',
    `scrap_reason`          VARCHAR(200) NULL COMMENT '报废原因',
    `storage_location`      VARCHAR(100) NULL COMMENT '存放位置',
    
    -- 审计字段
    `create_time`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `create_by`             BIGINT UNSIGNED NULL,
    `update_by`             BIGINT UNSIGNED NULL,
    `deleted`               TINYINT NOT NULL DEFAULT 0,
    
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `uk_plate_code` (`plate_code`),
    KEY `idx_status` (`status`),
    KEY `idx_mesh_count` (`mesh_count`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_last_used_date` (`last_used_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
COMMENT = '网版管理表（丝网印刷核心资产）';
三、重要字段说明（为什么必须加这些字段）

































































字段类型重要性说明plate_codeVARCHAR(50)★★★★★唯一编号，全厂 traceability 基础mesh_countINT★★★★★决定油墨厚度、细节表现、耗墨量tension_valueDECIMAL(6,2)★★★★★丝印质量与网版寿命最关键参数statusVARCHAR(20)★★★★★生命周期状态流转life_count / max_life_countINT★★★★☆使用寿命管理与预警reclaim_countINT★★★★☆再生次数，直接影响制版成本last_clean_dateDATETIME★★★★清洗记录，影响印刷质量scrap_reasonVARCHAR(200)★★★★报废分析，持续改进依据storage_locationVARCHAR(100)★★★快速找版，提高效率
四、推荐配套历史记录表（强烈建议新建）
SQLCREATE TABLE `screen_plate_history` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `screen_plate_id`   BIGINT UNSIGNED NOT NULL,
    `action`            VARCHAR(50) NOT NULL COMMENT 'Created/Exposed/Printed/Cleaned/Reclaimed/Scrapped/TensionAdjusted',
    `tension_value`     DECIMAL(6,2) NULL,
    `life_increment`    INT DEFAULT 0,
    `remark`            TEXT NULL,
    `operator_id`       BIGINT UNSIGNED NULL,
    `operator_name`     VARCHAR(50) NULL,
    `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`id`),
    KEY `idx_screen_plate` (`screen_plate_id`),
    KEY `idx_action` (`action`),
    KEY `idx_created_at` (`created_at`),
    
    CONSTRAINT `fk_history_screen_plate` 
        FOREIGN KEY (`screen_plate_id`) REFERENCES `prd_screen_plate`(`id`) ON DELETE CASCADE
) COMMENT = '网版生命周期历史记录表';
. 网版表字段优化 —— ALTER TABLE 脚本（可直接执行）
SQL-- =============================================
-- prd_screen_plate 网版表字段优化脚本（vnERP版）
-- 执行前建议：备份数据库！
-- =============================================

USE vnerpdacahng;

-- 1. 添加网版核心字段（推荐一次性执行）
ALTER TABLE prd_screen_plate 
ADD COLUMN IF NOT EXISTS `mesh_count`          INT NOT NULL DEFAULT 0 COMMENT '网目数（110/156/200/305等）' AFTER `plate_code`,

ADD COLUMN IF NOT EXISTS `mesh_material`       VARCHAR(30) NULL COMMENT '丝网材质：聚酯/尼龙/不锈钢' AFTER `mesh_count`,

ADD COLUMN IF NOT EXISTS `frame_type`          VARCHAR(30) NULL COMMENT '框类型：铝框/木框/气动框' AFTER `mesh_material`,

ADD COLUMN IF NOT EXISTS `tension_value`       DECIMAL(6,2) NULL COMMENT '张力值（N/cm）' AFTER `size`,

ADD COLUMN IF NOT EXISTS `tension_date`        DATETIME NULL COMMENT '最后测张力时间' AFTER `tension_value`,

ADD COLUMN IF NOT EXISTS `status`              VARCHAR(20) NOT NULL DEFAULT 'New' 
    COMMENT '状态：New/Ready/Exposed/In_Production/Cleaning/Reclaimed/Damaged/Scrapped' AFTER `tension_date`,

ADD COLUMN IF NOT EXISTS `life_count`          INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已印刷次数' AFTER `status`,

ADD COLUMN IF NOT EXISTS `max_life_count`      INT UNSIGNED NOT NULL DEFAULT 800 COMMENT '最大使用寿命' AFTER `life_count`,

ADD COLUMN IF NOT EXISTS `reclaim_count`       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已再生次数' AFTER `max_life_count`,

ADD COLUMN IF NOT EXISTS `exposure_date`       DATETIME NULL COMMENT '曝光日期' AFTER `reclaim_count`,

ADD COLUMN IF NOT EXISTS `last_used_date`      DATETIME NULL COMMENT '最后使用日期' AFTER `exposure_date`,

ADD COLUMN IF NOT EXISTS `last_clean_date`     DATETIME NULL COMMENT '最后清洗日期' AFTER `last_used_date`,

ADD COLUMN IF NOT EXISTS `last_reclaim_date`   DATETIME NULL COMMENT '最后再生日期' AFTER `last_clean_date`,

ADD COLUMN IF NOT EXISTS `scrap_reason`        VARCHAR(200) NULL COMMENT '报废原因' AFTER `last_reclaim_date`,

ADD COLUMN IF NOT EXISTS `storage_location`    VARCHAR(100) NULL COMMENT '存放位置' AFTER `scrap_reason`,

ADD COLUMN IF NOT EXISTS `default_ink_id`      BIGINT UNSIGNED NULL COMMENT '默认关联油墨ID' AFTER `product_id`;

-- 2. 添加索引（大幅提升查询性能）
ALTER TABLE prd_screen_plate 
ADD INDEX `idx_mesh_count` (`mesh_count`),
ADD INDEX `idx_status` (`status`),
ADD INDEX `idx_life_count` (`life_count`),
ADD INDEX `idx_reclaim_count` (`reclaim_count`),
ADD INDEX `idx_last_used_date` (`last_used_date`);

-- 3. 更新已有记录的状态（防止新字段导致旧数据异常）
UPDATE prd_screen_plate 
SET `status` = 'New' 
WHERE `status` IS NULL OR `status` = '';

-- 4. 验证执行结果
SHOW CREATE TABLE prd_screen_plate;

执行建议：

分步执行：
先执行第1部分（添加字段）
再执行第2部分（添加索引）
最后执行第3部分（数据初始化）

如果报错（字段已存在）：
因为使用了 IF NOT EXISTS，MySQL 8.0+ 支持此语法，一般不会报错。
如仍报错，可去掉 IF NOT EXISTS 逐个字段手动添加。

执行后建议检查：SQLSELECT plate_code, mesh_count, tension_value, status, life_count, reclaim_count 
FROM prd_screen_plate 
LIMIT 10;
下面直接给你 修改现有网版表（prd_screen_plate）的完整 ALTER TABLE 语句，基于你当前数据库结构进行最小侵入式优化。

A. 网版表字段优化 —— ALTER TABLE 脚本（可直接执行）
SQL-- =============================================
-- prd_screen_plate 网版表字段优化脚本（vnERP版）
-- 执行前建议：备份数据库！
-- =============================================

USE vnerpdacahng;

-- 1. 添加网版核心字段（推荐一次性执行）
ALTER TABLE prd_screen_plate 
ADD COLUMN IF NOT EXISTS `mesh_count`          INT NOT NULL DEFAULT 0 COMMENT '网目数（110/156/200/305等）' AFTER `plate_code`,

ADD COLUMN IF NOT EXISTS `mesh_material`       VARCHAR(30) NULL COMMENT '丝网材质：聚酯/尼龙/不锈钢' AFTER `mesh_count`,

ADD COLUMN IF NOT EXISTS `frame_type`          VARCHAR(30) NULL COMMENT '框类型：铝框/木框/气动框' AFTER `mesh_material`,

ADD COLUMN IF NOT EXISTS `tension_value`       DECIMAL(6,2) NULL COMMENT '张力值（N/cm）' AFTER `size`,

ADD COLUMN IF NOT EXISTS `tension_date`        DATETIME NULL COMMENT '最后测张力时间' AFTER `tension_value`,

ADD COLUMN IF NOT EXISTS `status`              VARCHAR(20) NOT NULL DEFAULT 'New' 
    COMMENT '状态：New/Ready/Exposed/In_Production/Cleaning/Reclaimed/Damaged/Scrapped' AFTER `tension_date`,

ADD COLUMN IF NOT EXISTS `life_count`          INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已印刷次数' AFTER `status`,

ADD COLUMN IF NOT EXISTS `max_life_count`      INT UNSIGNED NOT NULL DEFAULT 800 COMMENT '最大使用寿命' AFTER `life_count`,

ADD COLUMN IF NOT EXISTS `reclaim_count`       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已再生次数' AFTER `max_life_count`,

ADD COLUMN IF NOT EXISTS `exposure_date`       DATETIME NULL COMMENT '曝光日期' AFTER `reclaim_count`,

ADD COLUMN IF NOT EXISTS `last_used_date`      DATETIME NULL COMMENT '最后使用日期' AFTER `exposure_date`,

ADD COLUMN IF NOT EXISTS `last_clean_date`     DATETIME NULL COMMENT '最后清洗日期' AFTER `last_used_date`,

ADD COLUMN IF NOT EXISTS `last_reclaim_date`   DATETIME NULL COMMENT '最后再生日期' AFTER `last_clean_date`,

ADD COLUMN IF NOT EXISTS `scrap_reason`        VARCHAR(200) NULL COMMENT '报废原因' AFTER `last_reclaim_date`,

ADD COLUMN IF NOT EXISTS `storage_location`    VARCHAR(100) NULL COMMENT '存放位置' AFTER `scrap_reason`,

ADD COLUMN IF NOT EXISTS `default_ink_id`      BIGINT UNSIGNED NULL COMMENT '默认关联油墨ID' AFTER `product_id`;

-- 2. 添加索引（大幅提升查询性能）
ALTER TABLE prd_screen_plate 
ADD INDEX `idx_mesh_count` (`mesh_count`),
ADD INDEX `idx_status` (`status`),
ADD INDEX `idx_life_count` (`life_count`),
ADD INDEX `idx_reclaim_count` (`reclaim_count`),
ADD INDEX `idx_last_used_date` (`last_used_date`);

-- 3. 更新已有记录的状态（防止新字段导致旧数据异常）
UPDATE prd_screen_plate 
SET `status` = 'New' 
WHERE `status` IS NULL OR `status` = '';

-- 4. 验证执行结果
SHOW CREATE TABLE prd_screen_plate;

执行建议：

分步执行：
先执行第1部分（添加字段）
再执行第2部分（添加索引）
最后执行第3部分（数据初始化）

如果报错（字段已存在）：
因为使用了 IF NOT EXISTS，MySQL 8.0+ 支持此语法，一般不会报错。
如仍报错，可去掉 IF NOT EXISTS 逐个字段手动添加。

执行后建议检查：SQLSELECT plate_code, mesh_count, tension_value, status, life_count, reclaim_count 
FROM prd_screen_plate 
LIMIT 10;


完成这个脚本后，你的网版表将具备：

完整的生命周期状态管理
张力值 + 目数 + 再生次数 等行业关键参数
基础的性能索引支持


请告诉我下一步要哪一项（直接回复字母）：

A：我帮你生成网版历史记录表（screen_plate_history）的建表语句
B：输出网版完整生命周期业务流程（状态流转 + 操作规范）
C：输出网版表与 BOM、生产、油墨的关联关系脚本
D：继续优化其他核心表（油墨耗用表、BOM表等）
材料分切）当前存在的主要问题
在丝网印刷行业中，“仓库分切”通常指大卷材料（如 PET 膜、PVC、不干胶、转印纸等）进入仓库后，根据生产订单或 BOM 需求进行开卷、分切、裁剪的操作。这是丝印厂常见的高频、高损耗环节，管理不好会导致库存不准、损耗失控、 traceability 差等问题。
从你的数据库看，当前设计存在以下明显问题：

表结构较弱，缺少关键行业字段
inv_cutting_record 和 inv_cutting_detail 存在，但字段不够完善。
缺少分切前/后关键参数：原卷宽度、原卷长度、分切后宽度、分切后长度、损耗长度/重量、实际出材率。
缺少批次与标签关联：分切后的小卷/片材应生成新的 inv_material_label（或子标签），当前关联较弱。
缺少损耗原因分析：分切损耗是丝印材料成本的重要部分，却没有 loss_reason、loss_type（边料/刀口损耗/操作失误等）。

** traceability（可追溯性）不足**
大卷主标签 → 分切后子标签的父子关系不强（parent_label_id 可能存在但使用不充分）。
分切记录与后续生产工单、网版、油墨耗用的关联薄弱，难以做到“哪卷膜分切后用在哪个订单、哪个网版”。

库存准确性风险高
分切后库存更新逻辑可能依赖应用层，数据库层面缺少强约束，容易出现账实不符。
没有分切前后重量/长度自动计算字段，人工录入易出错。

与丝印业务结合度低
丝印常用卷材分切后直接用于印刷或覆膜，分切记录应与 prd_process_card、prd_screen_plate、base_ink 有更紧密的关系。
缺少分切计划与实际执行的对比（计划分切量 vs 实际分切量 vs 损耗）。


仓库分切模块优化建议（vnERP 风格）
核心目标：实现“可计划、可执行、可追溯、低损耗”。
推荐表结构优化方向（重点字段）
1. inv_cutting_record（分切主记录表）建议补充字段：

original_label_id → 外键关联原始大卷标签
original_width、original_length、original_weight
total_cut_qty、total_loss_length、yield_rate（出材率）
cutting_date、operator_id
remark、loss_reason_summary

2. inv_cutting_detail（分切明细表）建议补充字段：

sub_label_id 或 new_label_no（分切后生成的新标签）
cut_width、cut_length、cut_weight
sequence_no（分切顺序）
loss_length、loss_weight
loss_type（枚举：边料、刀口、操作损耗、质量问题等）

3. 与其他表的关系强化：

inv_cutting_detail → inv_material_label（父子标签关系）
inv_cutting_record → inv_inventory、bom_material
分切后新标签应自动更新到 inv_inventory_batch 或 inv_material_label