// 系统常量定义

// 仓库类型
export const WAREHOUSE_TYPES = [
  { value: 'raw', label: '原料仓库' },
  { value: 'finished', label: '成品仓库' },
  { value: 'plate', label: '板房仓库' },
  { value: 'ink', label: '油墨仓库' },
] as const;

// 订单状态
export const ORDER_STATUS = [
  { value: 'draft', label: '草稿', color: 'secondary' },
  { value: 'confirmed', label: '已确认', color: 'default' },
  { value: 'producing', label: '生产中', color: 'primary' },
  { value: 'completed', label: '已完成', color: 'success' },
  { value: 'cancelled', label: '已取消', color: 'destructive' },
] as const;

// 工单状态
export const WORK_ORDER_STATUS = [
  { value: 'created', label: '已创建', color: 'secondary' },
  { value: 'scheduled', label: '已排产', color: 'default' },
  { value: 'producing', label: '生产中', color: 'primary' },
  { value: 'completed', label: '已完成', color: 'success' },
  { value: 'closed', label: '已关闭', color: 'destructive' },
] as const;

// 检验类型
export const INSPECTION_TYPES = [
  { value: 'incoming', label: '来料检验' },
  { value: 'first_article', label: '首件确认' },
  { value: 'patrol', label: '巡检' },
  { value: 'finished', label: '成品检验' },
] as const;

// 检验结果
export const INSPECTION_RESULTS = [
  { value: 'pass', label: '合格', color: 'success' },
  { value: 'fail', label: '不合格', color: 'destructive' },
  { value: 'pending', label: '待判定', color: 'warning' },
] as const;

// 库存状态
export const INVENTORY_STATUS = [
  { value: 'available', label: '可用', color: 'success' },
  { value: 'frozen', label: '冻结', color: 'warning' },
  { value: 'inspecting', label: '待检', color: 'secondary' },
] as const;

// 派车状态
export const DELIVERY_STATUS = [
  { value: 'planned', label: '计划中', color: 'secondary' },
  { value: 'loading', label: '装车中', color: 'default' },
  { value: 'transit', label: '运输中', color: 'primary' },
  { value: 'delivered', label: '已送达', color: 'success' },
] as const;

// 采购状态
export const PURCHASE_STATUS = [
  { value: 'draft', label: '草稿', color: 'secondary' },
  { value: 'sent', label: '已发送', color: 'default' },
  { value: 'partial', label: '部分到货', color: 'warning' },
  { value: 'completed', label: '已完成', color: 'success' },
] as const;

// 委外状态
export const OUTSOURCE_STATUS = [
  { value: 'sent', label: '已发送', color: 'default' },
  { value: 'partial', label: '部分回货', color: 'warning' },
  { value: 'completed', label: '已完成', color: 'success' },
] as const;

// 打样状态
export const SAMPLE_STATUS = [
  { value: 'draft', label: '草稿', color: 'secondary' },
  { value: 'producing', label: '制作中', color: 'primary' },
  { value: 'completed', label: '已完成', color: 'success' },
  { value: 'mass_production', label: '已转量产', color: 'default' },
] as const;

// 工序列表
export const PROCESS_LIST = [
  { code: 'P01', name: '切料', sequence: 1 },
  { code: 'P02', name: '磨切', sequence: 2 },
  { code: 'P03', name: '分切', sequence: 3 },
  { code: 'P04', name: '印刷', sequence: 4 },
  { code: 'P05', name: '烘干', sequence: 5 },
  { code: 'P06', name: '模切', sequence: 6 },
  { code: 'P07', name: '检验', sequence: 7 },
  { code: 'P08', name: '包装', sequence: 8 },
] as const;

// 设备保养周期
export const MAINTENANCE_TYPES = [
  { value: 'daily', label: '日常保养' },
  { value: 'weekly', label: '周保养' },
  { value: 'monthly', label: '月保养' },
  { value: 'yearly', label: '年保养' },
] as const;

// 不良处置方式
export const DISPOSITION_TYPES = [
  { value: 'rework', label: '返工' },
  { value: 'scrap', label: '报废' },
  { value: 'concession', label: '特采' },
] as const;

// 三端终端类型
export const TERMINAL_TYPES = [
  { value: 'pda', label: '工业PDA' },
  { value: 'mobile', label: '手机端' },
  { value: 'pdf', label: 'PDF二维码' },
] as const;
