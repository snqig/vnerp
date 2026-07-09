/**
 * VNERP 数据变更对比工具
 * 功能：比较对象/数组的前后差异，生成审计可用的变更记录
 * 原则：所有修改留底，关键字段必须记录前后值
 */

// ============================================================
// 类型定义
// ============================================================

export interface FieldDiff {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
}

export interface ObjectDiff {
  hasChanges: boolean;
  changes: FieldDiff[];
  summary: string;
}

export interface ArrayDiff {
  added: any[];
  removed: any[];
  modified: Array<{ index: number; oldItem: any; newItem: any; changes: FieldDiff[] }>;
  unchanged: any[];
}

// ============================================================
// 字段标签映射（中文名）
// ============================================================

export const COMMON_FIELD_LABELS: Record<string, string> = {
  // 通用字段
  id: 'ID',
  code: '编码',
  name: '名称',
  status: '状态',
  remark: '备注',
  create_time: '创建时间',
  update_time: '更新时间',
  create_by: '创建人',
  update_by: '更新人',
  deleted: '删除标记',

  // 采购和销售相关
  purchase_no: '采购单号',
  order_no: '订单编号',
  supplier_id: '供应商ID',
  supplier_name: '供应商名称',
  customer_id: '客户ID',
  customer_name: '客户名称',
  order_date: '订单日期',
  delivery_date: '交货日期',
  total_amount: '总金额',
  total_qty: '总数量',
  unit_price: '单价',
  quantity: '数量',
  amount: '金额',
  sales_amount: '销售金额',

  // 库存相关
  warehouse_id: '仓库ID',
  warehouse_name: '仓库名称',
  material_id: '物料ID',
  material_code: '物料编码',
  material_name: '物料名称',
  stock_qty: '库存数量',
  available_qty: '可用数量',
  reserved_qty: '预留数量',

  // 生产相关
  work_order_no: '工单编号',
  plan_qty: '计划数量',
  completed_qty: '完成数量',
  planned_start: '计划开始',
  planned_end: '计划结束',
  actual_start: '实际开始',
  actual_end: '实际结束',

  // 财务相关
  voucher_no: '凭证号',
  account_code: '科目编码',
  account_name: '科目名称',
  debit_amount: '借方金额',
  credit_amount: '贷方金额',
  balance: '余额',

  // 质量相关
  inspection_no: '检验单号',
  inspection_result: '检验结果',
  defect_qty: '不良数量',
  qualified_qty: '合格数量',

  // 印前相关
  process_card_no: '工艺卡号',
  color_count: '色数',
  print_area: '印刷面积',
  mesh_count: '网目数',
};

// ============================================================
// 核心对比函数
// ============================================================

/**
 * 比较两个对象，返回差异
 * @param oldObj 修改前对象
 * @param newObj 修改后对象
 * @param fieldLabels 字段标签映射
 * @param ignoreFields 忽略的字段列表
 */
export function diffObjects(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  fieldLabels?: Record<string, string>,
  ignoreFields: string[] = ['create_time', 'update_time', 'create_by', 'update_by']
): ObjectDiff {
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

  const changes: FieldDiff[] = [];
  const labels = { ...COMMON_FIELD_LABELS, ...fieldLabels };

  for (const key of allKeys) {
    // 跳过忽略的字段
    if (ignoreFields.includes(key)) continue;

    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];

    // 比较值（处理null/undefined）
    const oldStr = oldValue === undefined ? null : oldValue;
    const newStr = newValue === undefined ? null : newValue;

    if (oldStr === null && newStr !== null) {
      changes.push({
        field: key,
        label: labels[key] || key,
        oldValue: null,
        newValue: newStr,
        type: 'added',
      });
    } else if (oldStr !== null && newStr === null) {
      changes.push({
        field: key,
        label: labels[key] || key,
        oldValue: oldStr,
        newValue: null,
        type: 'removed',
      });
    } else if (JSON.stringify(oldStr) !== JSON.stringify(newStr)) {
      changes.push({
        field: key,
        label: labels[key] || key,
        oldValue: oldStr,
        newValue: newStr,
        type: 'modified',
      });
    }
  }

  // 生成摘要
  const modifiedCount = changes.filter((c) => c.type === 'modified').length;
  const addedCount = changes.filter((c) => c.type === 'added').length;
  const removedCount = changes.filter((c) => c.type === 'removed').length;

  let summary = '';
  if (modifiedCount > 0) summary += `${modifiedCount}个字段修改`;
  if (addedCount > 0) summary += (summary ? '，' : '') + `${addedCount}个字段新增`;
  if (removedCount > 0) summary += (summary ? '，' : '') + `${removedCount}个字段删除`;
  if (!summary) summary = '无变更';

  return {
    hasChanges: changes.length > 0,
    changes,
    summary,
  };
}

/**
 * 比较两个数组，返回差异
 * @param oldArr 修改前数组
 * @param newArr 修改后数组
 * @param keyField 用于匹配的唯一字段
 */
export function diffArrays(oldArr: any[], newArr: any[], keyField: string = 'id'): ArrayDiff {
  const oldMap = new Map(oldArr.map((item) => [item[keyField], item]));
  const newMap = new Map(newArr.map((item) => [item[keyField], item]));

  const added: any[] = [];
  const removed: any[] = [];
  const modified: ArrayDiff['modified'] = [];
  const unchanged: any[] = [];

  // 查找新增和修改的
  for (const [key, newItem] of newMap) {
    const oldItem = oldMap.get(key);
    if (!oldItem) {
      added.push(newItem);
    } else {
      const diff = diffObjects(oldItem, newItem);
      if (diff.hasChanges) {
        modified.push({
          index: oldArr.findIndex((i) => i[keyField] === key),
          oldItem,
          newItem,
          changes: diff.changes,
        });
      } else {
        unchanged.push(newItem);
      }
    }
  }

  // 查找删除的
  for (const [key, oldItem] of oldMap) {
    if (!newMap.has(key)) {
      removed.push(oldItem);
    }
  }

  return { added, removed, modified, unchanged };
}

// ============================================================
// 格式化输出
// ============================================================

/**
 * 将差异格式化为人类可读的文本
 */
export function formatDiffToText(diff: ObjectDiff): string {
  if (!diff.hasChanges) return '无变更';

  const lines: string[] = [];

  for (const change of diff.changes) {
    switch (change.type) {
      case 'added':
        lines.push(`【新增】${change.label}: ${formatValue(change.newValue)}`);
        break;
      case 'removed':
        lines.push(`【删除】${change.label}: ${formatValue(change.oldValue)}`);
        break;
      case 'modified':
        lines.push(
          `【修改】${change.label}: ${formatValue(change.oldValue)} → ${formatValue(change.newValue)}`
        );
        break;
    }
  }

  return lines.join('\n');
}

/**
 * 将差异格式化为HTML（用于前端展示）
 */
export function formatDiffToHtml(diff: ObjectDiff): string {
  if (!diff.hasChanges) return '<p class="text-gray-500">无变更</p>';

  const lines: string[] = [];

  for (const change of diff.changes) {
    switch (change.type) {
      case 'added':
        lines.push(
          `<div class="flex items-center gap-2 text-green-600">` +
            `<span class="px-2 py-0.5 bg-green-100 rounded text-xs">新增</span>` +
            `<span class="font-medium">${change.label}:</span>` +
            `<span>${formatValue(change.newValue)}</span>` +
            `</div>`
        );
        break;
      case 'removed':
        lines.push(
          `<div class="flex items-center gap-2 text-red-600">` +
            `<span class="px-2 py-0.5 bg-red-100 rounded text-xs">删除</span>` +
            `<span class="font-medium">${change.label}:</span>` +
            `<span class="line-through">${formatValue(change.oldValue)}</span>` +
            `</div>`
        );
        break;
      case 'modified':
        lines.push(
          `<div class="flex items-center gap-2 text-blue-600">` +
            `<span class="px-2 py-0.5 bg-blue-100 rounded text-xs">修改</span>` +
            `<span class="font-medium">${change.label}:</span>` +
            `<span class="text-gray-500 line-through">${formatValue(change.oldValue)}</span>` +
            `<span class="text-gray-400">→</span>` +
            `<span>${formatValue(change.newValue)}</span>` +
            `</div>`
        );
        break;
    }
  }

  return `<div class="space-y-1">${lines.join('')}</div>`;
}

/**
 * 格式化单个值
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return tc('text_o6y');
  if (typeof value === 'boolean') return value ? tc('text_k6n') : tc('text_gme');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ============================================================
// 关键字段监控
// ============================================================

/**
 * 关键业务字段列表（修改这些字段必须记录审计日志）
 */
export const CRITICAL_FIELDS: Record<string, string[]> = {
  // 采购订单
  pur_purchase_order: [
    'supplier_id',
    'supplier_name',
    'total_amount',
    'total_qty',
    'status',
    'order_date',
    'delivery_date',
    'payment_terms',
  ],
  // 销售订单
  sal_order: [
    'customer_id',
    'customer_name',
    'sales_amount',
    'total_qty',
    'status',
    'order_date',
    'delivery_date',
    'payment_terms',
  ],
  // 生产工单
  prod_work_order: [
    'plan_qty',
    'completed_qty',
    'status',
    'planned_start',
    'planned_end',
    'actual_start',
    'actual_end',
    'priority',
  ],
  // 库存
  inv_inventory: [
    'stock_qty',
    'available_qty',
    'reserved_qty',
    'unit_price',
    'warehouse_id',
    'material_id',
  ],
  // 财务凭证
  fin_voucher: ['voucher_no', 'total_debit', 'total_credit', 'status', 'voucher_date', 'period'],
  // 应收应付
  fin_receivable: ['customer_id', 'amount', 'paid_amount', 'status', 'due_date'],
  fin_payable: ['supplier_id', 'amount', 'paid_amount', 'status', 'due_date'],
};

/**
 * 检查是否修改了关键字段
 */
export function hasCriticalChanges(
  tableName: string,
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): { hasCritical: boolean; criticalChanges: FieldDiff[] } {
  const criticalFields = CRITICAL_FIELDS[tableName] || [];
  const diff = diffObjects(oldObj, newObj);

  const criticalChanges = diff.changes.filter((change) => criticalFields.includes(change.field));

  return {
    hasCritical: criticalChanges.length > 0,
    criticalChanges,
  };
}

// ============================================================
// 便捷方法：生成审计日志内容
// ============================================================

/**
 * 生成操作内容描述
 */
export function generateOperationContent(
  operation: string,
  documentType: string,
  documentNo: string,
  diff?: ObjectDiff
): string {
  let content = `${operation} ${documentType}: ${documentNo}`;

  if (diff?.hasChanges) {
    content += `，${diff.summary}`;
  }

  return content;
}

/**
 * 生成数据快照（用于作废/删除时保存）
 */
export function createSnapshot(data: Record<string, any>): Record<string, any> {
  return JSON.parse(JSON.stringify(data));
}

// ============================================================
// 导出便捷方法
// ============================================================

const dataDiffUtils = {
  diffObjects,
  diffArrays,
  formatDiffToText,
  formatDiffToHtml,
  hasCriticalChanges,
  generateOperationContent,
  createSnapshot,
  COMMON_FIELD_LABELS,
  CRITICAL_FIELDS,
};

export default dataDiffUtils;
