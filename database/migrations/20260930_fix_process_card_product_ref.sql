-- ============================================================
-- 20260930 流程卡产品引用修复（quality/process 列表「客户」「品质经理」空白）
-- 根因：prd_process_card.product_code 全部为空字符串，
--       API LEFT JOIN prd_standard_card ON CAST(product_code AS UNSIGNED) = sc.id
--       命中 0/36 → customer_name / quality_manager 全空白。
-- 方案：按产品名业务相似度，把 36 张流程卡映射到 prd_standard_card 的 10 种
--       真实产品（取第一组 id 44-53；标准卡 54-63 为重复数据，另行报告），
--       回填 product_code=标准卡id、product_name 对齐标准卡名。
-- 映射（流程卡现名 n → sc.id 新名 客户/品质经理）：
--   空调控制面板标签 5 + 标签成品-空调面板 1 + 智能家居面板 4 → 44 空调控制面板标签 美的集团/赵六
--   洗衣机控制面板 1 → 45 洗衣机铭牌 格力电器/李四
--   手机电池标签 4 → 46 手机电池标签 华为技术/赵六
--   汽车仪表盘面板 5 + 新能源电池标签 3 → 47 新能源汽车电池包标签 比亚迪汽车/李四
--   医疗设备面板 4 → 48 医疗设备面板标签 迈瑞医疗/赵六
--   电池防伪标签 4 → 50 锂电池电芯标签 宁德时代/赵六
--   电子元器件标签 3 → 51 工业自动化PLC标签 宁德时代科技/李四
--   工业设备铭牌 2 → 52 服务器机箱标签 汇川技术/赵六
-- 幂等：按「product_code 为空或 CAST 后 JOIN miss」的产品名精确匹配更新。
-- ============================================================

-- 统一回填：product_name 精确匹配 + 仅当未建立有效引用时
UPDATE prd_process_card pc
INNER JOIN prd_standard_card sc ON sc.id = (
  CASE pc.product_name
    WHEN '空调控制面板标签' THEN 44
    WHEN '标签成品-空调面板' THEN 44
    WHEN '智能家居面板'     THEN 44
    WHEN '洗衣机控制面板'   THEN 45
    WHEN '手机电池标签'     THEN 46
    WHEN '汽车仪表盘面板'   THEN 47
    WHEN '新能源电池标签'   THEN 47
    WHEN '医疗设备面板'     THEN 48
    WHEN '电池防伪标签'     THEN 50
    WHEN '电子元器件标签'   THEN 51
    WHEN '工业设备铭牌'     THEN 52
    ELSE NULL
  END
)
SET pc.product_code = CAST(sc.id AS CHAR),
    pc.product_name = sc.product_name
WHERE pc.deleted = 0
  AND (pc.product_code IS NULL OR pc.product_code = ''
       OR NOT EXISTS (
         SELECT 1 FROM prd_standard_card x
         WHERE x.id = CAST(pc.product_code AS UNSIGNED) AND x.deleted = 0
       ));
