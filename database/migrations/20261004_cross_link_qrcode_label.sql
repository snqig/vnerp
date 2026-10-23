-- batch 161: 双轨打通 —— qrcode_record / inv_material_label 互挂引用列
--
-- 背景：通用溯源轨(qrcode_record) 与 印厂标签轨(inv_material_label) 表达同一物理批次却各自为政：
--   - 载荷格式分裂（通用轨裸 qr_code；印厂轨 JSON{ID:label_no}）
--   - 扫码入口分裂（dcprint/scan 只认 label_no；trace/qr/scan 只认 qr_code）
--   - 同一实体双写不互链（拆批子批同时写两表，代表同一卷却无关联）
--
-- 策略（双向引用补齐，零回归）：
--   两表各加一个**可空、无 FK 约束**的逻辑关联列，生成时互挂、追溯时跨查。
--   可空 + 无约束是为了不耦合两轨的插入顺序，且绝不破坏 inv_material_label 既有写入/读取（产线核心）。
--   真正串联靠 batch_no（两表共有物理标识）。

ALTER TABLE qrcode_record
  ADD COLUMN label_id BIGINT UNSIGNED COMMENT '关联物料标签ID(inv_material_label.id)，打通双轨溯源' AFTER deleted,
  ADD KEY idx_label_id (label_id);

ALTER TABLE inv_material_label
  ADD COLUMN qr_record_id BIGINT UNSIGNED COMMENT '关联二维码记录ID(qrcode_record.id)，打通双轨溯源' AFTER deleted,
  ADD KEY idx_qr_record (qr_record_id);
