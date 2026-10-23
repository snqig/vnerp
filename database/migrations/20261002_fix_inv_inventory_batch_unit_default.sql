-- 20261002_fix_inv_inventory_batch_unit_default.sql
-- 修复 inv_inventory_batch.unit 列的乱码默认值与注释。
-- 原 DDL 为 `unit varchar(20) DEFAULT '浠? COMMENT '鍗曚綰''`（GBK/UTF-8 错配乱码）。
-- 任何省略 unit 的 INSERT 都会落脏默认值 '浠?'，且列注释不可读。
-- 修正为合法空默认 + 中文注释。该 MODIFY 幂等（重复执行为 no-op）。
ALTER TABLE `inv_inventory_batch`
  MODIFY COLUMN `unit` VARCHAR(20) DEFAULT '' COMMENT '单位';
