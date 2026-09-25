-- 对齐 plm_eco.eco_type：UI/API 使用字符串 ('bom'/'process'/'material'/'design')
-- 但 DB 列为 tinyint，导致 INSERT 时隐式转换为 0，列表显示异常。
-- 改为 varchar(20) 以匹配应用层约定。

ALTER TABLE plm_eco MODIFY COLUMN eco_type VARCHAR(20) NULL
