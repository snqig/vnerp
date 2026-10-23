-- 20260930_fix_finish_order_inspection_refs.sql
-- 修复 qc_inspection 中 20 条成品检验记录（source_type='finish_order'）的幽灵引用与假名：
-- 1. source_no: FO-2026-09-14-01..20（prd_finish_order 中 0/20 命中，单号格式本就不存在于库内）
--    → FI-20260926-0001..0020（真实完工单，按原单号序号对位，全部关联真实工单）
-- 2. inspector: 品管员甲 → 李四/赵六 奇偶轮换（与 process_card 类检验员口径一致）
-- 3. inspection_date: 2026-09-14 → 2026-09-27（完工单 FI-20260926 次日，消除「检验早于完工」时间倒挂）
-- 4. inspection_no: QCF-2026-09-14-01..20 → QCF-2026-09-27-01..20（与新检验日期一致；目标前缀已确认无冲突）
-- 注：qc_unqualified 仅以 inspection_id 数字 FK 关联检验记录，不引用单号文本，本变更不破坏既有关联。
--     这 20 条不被任何 quality 列表页展示（final 页读 prd_process_card + qc_final_inspection），
--     但污染 dashboard/quality、kpi、ceo、production 与 quality/spc 统计及 inspections 下拉。

UPDATE qc_inspection q
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM qc_inspection
  WHERE source_type = 'finish_order' AND deleted = 0
) ranked ON ranked.id = q.id
JOIN prd_finish_order f
  ON f.finish_no = CONCAT('FI-20260926-', LPAD(ranked.rn, 4, '0'))
 AND f.deleted = 0
SET q.source_no       = f.finish_no,
    q.inspector       = IF(ranked.rn % 2 = 1, '李四', '赵六'),
    q.inspection_date = '2026-09-27',
    q.inspection_no   = CONCAT('QCF-2026-09-27-', LPAD(ranked.rn, 2, '0')),
    q.update_time     = NOW();
