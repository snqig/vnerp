-- 给仓库表添加分类ID字段
-- 用于关联仓库分类

-- 添加 category_id 字段
ALTER TABLE `inv_warehouse` 
ADD COLUMN `category_id` INT UNSIGNED DEFAULT NULL COMMENT '仓库分类ID' AFTER `id`,
ADD KEY `idx_category_id` (`category_id`);

-- 更新现有仓库数据，根据类型分配分类
-- 原材料仓 (ID=1): raw 类型的仓库
UPDATE `inv_warehouse` SET `category_id` = 1 WHERE `type` = 'raw';

-- 成品仓 (ID=3): finished 类型的仓库
UPDATE `inv_warehouse` SET `category_id` = 3 WHERE `type` = 'finished';

-- 半成品仓 (ID=2): semi 类型的仓库
UPDATE `inv_warehouse` SET `category_id` = 2 WHERE `type` = 'semi';

-- 报废仓 (ID=7): scrap 类型的仓库
UPDATE `inv_warehouse` SET `category_id` = 7 WHERE `type` = 'scrap';

-- 查看更新后的数据
SELECT w.code, w.name, w.type, w.category_id, wc.name as category_name
FROM inv_warehouse w
LEFT JOIN sys_warehouse_category wc ON w.category_id = wc.id;
