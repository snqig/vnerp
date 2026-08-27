/**
 * @module status-labels
 * @description 状态/类型展示标签的**单一数据源**（纯展示文本，无服务端依赖）。
 *
 * 业务模块中存在大量硬编码的 `STATUS_MAP` / `TYPE_MAP`（仅用于把状态值渲染成中文文本，
 * 不参与业务逻辑），且彼此逐字复制。本模块将它们集中为唯一来源，消除复制粘贴式重复，
 * 并与 `sys_dict` 的 dict_code 语义对齐（见各常量注释）。
 *
 * 设计约定：
 * - 仅承载“展示文本”。任何驱动业务逻辑/状态机/校验的枚举值（如 domain 层 *Status.ts 的
 *   工厂方法、WarehouseStateMachine）仍保留在代码内，本模块只负责它们的中文标签。
 * - 标签文案以“用户实际看到的页面”为准；若历史多处不一致，统一到本模块一处，避免漂移。
 */

/** 仓库调拨类型：1-库位调拨 2-仓库调拨 */
export const TRANSFER_TYPE_LABEL: Record<number, string> = {
  1: '库位调拨',
  2: '仓库调拨',
};

/** 仓库调拨状态（与 transfer 流转一致）：0-草稿 1-待审批 2-已出库 3-已入库 4-已取消 */
export const TRANSFER_STATUS_LABEL: Record<number, string> = {
  0: '草稿',
  1: '待审批',
  2: '已出库',
  3: '已入库',
  4: '已取消',
};

/** 盘点类型：1-定期盘点 2-不定期盘点 3-循环盘点 4-抽盘 */
export const STOCKTAKING_TYPE_LABEL: Record<number, string> = {
  1: '定期盘点',
  2: '不定期盘点',
  3: '循环盘点',
  4: '抽盘',
};

/** 盘点单状态：0-草稿 1-进行中 2-待审批 3-已审批 4-已取消 */
export const STOCKTAKING_STATUS_LABEL: Record<number, string> = {
  0: '草稿',
  1: '进行中',
  2: '待审批',
  3: '已审批',
  4: '已取消',
};

/** 盘点行拆分标记：0-整料 1-小料 2-余料 */
export const SPLIT_FLAG_LABEL: Record<number, string> = {
  0: '整料',
  1: '小料',
  2: '余料',
};

/** 盘点明细行状态：0-未盘点 1-已盘点 2-已调整 */
export const STOCKTAKING_ITEM_STATUS_LABEL: Record<number, string> = {
  0: '未盘点',
  1: '已盘点',
  2: '已调整',
};

/** 刀模/网版资产类型：die-刀模 flexo_plate-柔印版 screen_mesh-丝网版 */
export const ASSET_TYPE_LABEL: Record<string, string> = {
  die: '刀模',
  flexo_plate: '柔印版',
  screen_mesh: '丝网版',
};

/** 刀模状态：available-可用 in_use-使用中 maintenance_needed-需保养 re_rule_needed-需重做 scrap-已报废 */
export const DIE_STATUS_LABEL: Record<string, string> = {
  available: '可用',
  in_use: '使用中',
  maintenance_needed: '需保养',
  re_rule_needed: '需重做',
  scrap: '已报废',
};

/** 保养类型：routine-常规保养 grinding-磨刃/修版 re_rule-重做/翻新 replace-更换 */
export const MAINTENANCE_TYPE_LABEL: Record<string, string> = {
  routine: '常规保养',
  grinding: '磨刃/修版',
  re_rule: '重做/翻新',
  replace: '更换',
};

/** 批次追溯操作类型：1-入库 2-出库 3-调整 4-调拨 5-领料 6-退料 7-退货 */
export const OPERATION_TYPE_LABEL: Record<number, string> = {
  1: '入库',
  2: '出库',
  3: '调整',
  4: '调拨',
  5: '领料',
  6: '退料',
  7: '退货',
};

/** 物料领用类型：1-正常领料 2-超领 3-补料 */
export const ISSUE_TYPE_LABEL: Record<number, string> = {
  1: '正常领料',
  2: '超领',
  3: '补料',
};

/** 物料领用状态：1-待出库 2-已出库 3-已取消 */
export const MATERIAL_REQUISITION_STATUS_LABEL: Record<number, string> = {
  1: '待出库',
  2: '已出库',
  3: '已取消',
};

/** 物料退料状态：1-待确认 2-已入库 3-已取消 */
export const MATERIAL_RETURN_STATUS_LABEL: Record<number, string> = {
  1: '待确认',
  2: '已入库',
  3: '已取消',
};

/** 刀模/网版工具类型：1-刀模 2-网版 */
export const TOOL_TYPE_LABEL: Record<number, string> = {
  1: '刀模',
  2: '网版',
};

/** 刀模/网版工具状态：1-待用 2-在用 3-维修 4-预警 5-已报废 */
export const TOOL_STATUS_LABEL: Record<number, string> = {
  1: '待用',
  2: '在用',
  3: '维修',
  4: '预警',
  5: '已报废',
};

/** 刀模模板状态：1-正常 2-预警 3-锁定 4-报废 */
export const DIE_TEMPLATE_STATUS_LABEL: Record<number, string> = {
  1: '正常',
  2: '预警',
  3: '锁定',
  4: '报废',
};

/** 保养状态：1-待保养 2-保养中 3-已完成 */
export const MAINTENANCE_STATUS_LABEL: Record<number, string> = {
  1: '待保养',
  2: '保养中',
  3: '已完成',
};

/** 工艺卡状态：1-草稿 2-打样中 3-已确认 4-已作废 */
export const PROCESS_CARD_STATUS_LABEL: Record<number, string> = {
  1: '草稿',
  2: '打样中',
  3: '已确认',
  4: '已作废',
};

/** 油墨类型：solvent-溶剂型 uv-UV型 water-水性 */
export const INK_TYPE_LABEL: Record<string, string> = {
  solvent: '溶剂型',
  uv: 'UV型',
  water: '水性',
};

/** 油墨状态：1-使用中 2-已过期 3-已报废 */
export const INK_STATUS_LABEL: Record<number, string> = {
  1: '使用中',
  2: '已过期',
  3: '已报废',
};

/** 设备类型：1-印刷机 2-覆膜机 3-模切机 4-全检机 5-其他 */
export const EQUIPMENT_TYPE_LABEL: Record<number, string> = {
  1: '印刷机',
  2: '覆膜机',
  3: '模切机',
  4: '全检机',
  5: '其他',
};

/** 设备当前状态：1-运行 2-待机 3-维修 4-停机 */
export const EQUIPMENT_STATUS_LABEL: Record<number, string> = {
  1: '运行',
  2: '待机',
  3: '维修',
  4: '停机',
};

/** 设备保养类型：1-日常保养 2-一级保养 3-二级保养 4-三级保养 */
export const EQUIPMENT_MAINT_TYPE_LABEL: Record<number, string> = {
  1: '日常保养',
  2: '一级保养',
  3: '二级保养',
  4: '三级保养',
};

/** 设备保养周期：1-天 2-周 3-月 4-季 5-年 */
export const EQUIPMENT_CYCLE_TYPE_LABEL: Record<number, string> = {
  1: '天',
  2: '周',
  3: '月',
  4: '季',
  5: '年',
};

/** 设备保养计划状态：1-待执行 2-执行中 3-已完成 4-已逾期 */
export const EQUIPMENT_PLAN_STATUS_LABEL: Record<number, string> = {
  1: '待执行',
  2: '执行中',
  3: '已完成',
  4: '已逾期',
};

/** 设备保养结果：1-正常 2-异常 */
export const EQUIPMENT_RECORD_RESULT_LABEL: Record<number, string> = {
  1: '正常',
  2: '异常',
};

/** 应收账款状态：1-未收款 2-部分收款 3-已收款 */
export const RECEIVABLE_STATUS_LABEL: Record<number, string> = {
  1: '未收款',
  2: '部分收款',
  3: '已收款',
};

/** 应付账款状态：1-未付款 2-部分付款 3-已付款 */
export const PAYABLE_STATUS_LABEL: Record<number, string> = {
  1: '未付款',
  2: '部分付款',
  3: '已付款',
};

/** 收款/付款方式：bank_transfer-银行转账 cash-现金 check-支票 alipay-支付宝 wechat-微信 */
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: '银行转账',
  cash: '现金',
  check: '支票',
  alipay: '支付宝',
  wechat: '微信',
};

/** 样卡状态：1-草稿 2-打样中 3-已确认 4-已作废 */
export const SAMPLE_CARD_STATUS_LABEL: Record<number, string> = {
  1: '草稿',
  2: '打样中',
  3: '已确认',
  4: '已作废',
};

/** 销售退货状态：1-待审核 2-已审核 3-已退货 9-已取消 */
export const SALES_RETURN_STATUS_LABEL: Record<number, string> = {
  1: '待审核',
  2: '已审核',
  3: '已退货',
  9: '已取消',
};

/** 发货签收状态：0-未签 1-部分签收 2-全部签收 3-拒收 */
export const SIGN_STATUS_LABEL: Record<number, string> = {
  0: '未签',
  1: '部分签收',
  2: '全部签收',
  3: '拒收',
};
