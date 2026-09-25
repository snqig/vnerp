-- ② 主数据打通（方案 A）：为 mdm_product 建立指向 inv_material 的显式桥列 material_id
--
-- 背景（2026-09-23 实测）：
--   产品域 mdm_product（10 行）与物料域 inv_material（3267 行）之间**无任何键连接**：
--     · mdm_product 无任何指向物料的列；
--     · 名称对位仅 2/10（其余 8 条在 inv_material 中无同名记录）；
--     · 编码无转换规律（mdm#44/PRD001 与 inv#11/MAT011 的数字重叠纯属巧合）；
--     · 排序规则不同（mdm utf8mb4_0900_ai_ci / inv utf8mb4_unicode_ci），字符串桥接会抛
--       ER_CANT_AGGREGATE_2COLLATIONS。
--   后果：prod_work_order 无法把「销售订单行给出的 inv_material.id」桥接到
--         「BOM（prd_bom.product_id）所需的 mdm_product.id」，工单 product_id 恒为 0 → MRP 前置断裂。
--
-- 本迁移：新增 material_id 作为**产品↔物料的显式一对一对位**，并回填**高置信**记录。
--   期望 1:1，但**暂不强制 UNIQUE**（业务侧确认后再收紧），以免误伤「一物料多产品」的合法场景。
--
-- 回填口径（严格三重印证，宁缺毋滥）：
--   mdm#44 PRD001「空调控制面板标签」spec 120×80mm ↔ inv#11 MAT011  精确同名 + 同名互含 + 规格一致
--   mdm#46 PRD003「手机电池标签」    spec  80×50mm ↔ inv#13 MAT013  精确同名 + 同名互含 + 规格一致
--   ★ 其余 8 条**留 NULL**：辅助匹配存在歧义 —— 例如 inv#15「医疗设备面板」同时被
--     mdm#47（规格相同）与 mdm#48（名称互含）命中，规格匹配还会把 mdm#45→inv#16、mdm#48→inv#20
--     等**语义不同**的记录牵到一起。故一律不猜，交业务人工确认。
--
-- 依赖核实：全仓无其它对象使用 mdm_product.material_id（新列）。

-- 1) 备份（CTAS，便于回滚与对账）
CREATE TABLE IF NOT EXISTS mdm_product_bak_20260923_material_bridge AS
SELECT * FROM mdm_product;

-- 2) 新增桥列 + 索引 + 外键
--    外键 ON DELETE SET NULL：物料被删除时产品侧自动置空，既不阻塞物料生命周期，也不留悬空引用。
ALTER TABLE mdm_product
  ADD COLUMN material_id BIGINT UNSIGNED NULL
    COMMENT '对应 inv_material.id（产品域↔物料域显式对位，② 主数据打通；NULL=待人工确认）' AFTER id,
  ADD INDEX idx_mdm_product_material_id (material_id),
  ADD CONSTRAINT fk_mdm_product_material
    FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE SET NULL;

-- 3) 回填高置信对位（带 product_code 兜底条件，防止 id 漂移误写）
UPDATE mdm_product SET material_id = 11 WHERE id = 44 AND product_code = 'PRD001' AND deleted = 0;
UPDATE mdm_product SET material_id = 13 WHERE id = 46 AND product_code = 'PRD003' AND deleted = 0;

-- 4) 校验输出（人工核对）
SELECT id, product_code, product_name, material_id
FROM mdm_product
ORDER BY id;
