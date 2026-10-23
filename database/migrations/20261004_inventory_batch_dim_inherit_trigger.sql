-- batch 160: 落库层触发器 —— 入库批次自动继承物料尺寸（消除拆批横切「未来入库仍休眠」风险）
--
-- 背景：
--   拆批（splitting）横切引擎以 inv_inventory_batch.width/length/area 判定「维度物料」并横切。
--   batch 159 已为 116 个目标物料 + 14 个现存批次回填占位尺寸，但**未来新入库**的批次由约 15 条
--   独立内联 INSERT 路径生成（采购收货 / 调拨入库 / 外发收回 / 入库单确认 / 手动建批 等），
--   这些路径都不写 width/length/area → 新批次尺寸恒为 NULL → 横切引擎对后续入库持续休眠。
--
-- 方案：
--   在 inv_inventory_batch 上挂 BEFORE INSERT 触发器：仅当插入行的 width 为空/0 且所属物料有尺寸时，
--   从 inv_material 继承 width/length 并按 available_qty 折算 area。
--   - 不覆盖显式传入的尺寸（拆批子批 fifo-width-slit / split-order 自带 width，触发器跳过）；
--   - 对全部写入路径一次性生效，零应用层改动，避免逐文件漏改。
--
-- 注意：本文件仅供人工 / mysql CLI 阅读（含 DELIMITER）。实际执行走 apply 脚本（见 .workbuddy/tmp/apply_dim_trigger.cjs），
--       脚本以单条 CREATE TRIGGER 直发服务端，无需 DELIMITER。

DROP TRIGGER IF EXISTS trg_inv_inventory_batch_dim_inherit;

DELIMITER $$

CREATE TRIGGER trg_inv_inventory_batch_dim_inherit
BEFORE INSERT ON inv_inventory_batch
FOR EACH ROW
BEGIN
  DECLARE v_w DECIMAL(18,4);
  DECLARE v_l DECIMAL(18,4);

  -- 仅当本行未带尺寸、且物料存在尺寸时才继承，避免覆盖显式传入（拆批子批等）
  IF (NEW.width IS NULL OR NEW.width = 0) AND NEW.material_id IS NOT NULL THEN
    SELECT width, length INTO v_w, v_l
      FROM inv_material WHERE id = NEW.material_id;

    IF v_w IS NOT NULL AND v_w > 0 THEN
      SET NEW.width = v_w;
      SET NEW.length = v_l;
      SET NEW.area = v_w * COALESCE(v_l, 0) * COALESCE(NEW.available_qty, 0);
    END IF;
  END IF;
END$$

DELIMITER ;
