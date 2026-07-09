import { Clock, AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// 接口定义（符合 inv_production_inbound 表结构）
export interface InboundItem {
  material_id: number;
  material_name: string;
  material_code: string;
  material_spec: string;
  specification: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  location: string;
  batch_no: string;
  remark: string;
}

export interface InboundRecord {
  id: number;
  inbound_no: string;
  inbound_type: number;
  warehouse_id: number;
  warehouse_name: string;
  material_id: number;
  material_name: string;
  material_code: string;
  specification: string;
  quantity: number;
  unit: string;
  location: string;
  supplier_id: number;
  supplier_name: string;
  operator_id: number;
  operator_name: string;
  inbound_date: string;
  status: number | string;
  remark?: string;
  items?: InboundItem[];
  order_no?: string;
  create_time?: string;
  createTime?: string;
  total_quantity?: number;
}

export interface Warehouse {
  id: number;
  warehouse_name: string;
  warehouse_code: string;
}

export interface WarehouseCategory {
  id: number;
  category_name: string;
  category_code: string;
}

export interface Supplier {
  id: number;
  supplier_name: string;
  supplier_code: string;
}

export interface PurchaseOrder {
  id: number;
  order_no: string;
  supplier_name: string;
  total_amount: number;
  status: number;
}

export interface PrintLabel {
  id: string;
  labelNo: string;
  materialName: string;
  materialSpec?: string;
  quantity?: number;
  unit?: string;
  batchNo?: string;
  material_name?: string;
  material_spec?: string;
  specification?: string;
  record?: Loose;
  item?: Loose;
  itemIdx?: number;
  order_no?: string;
  orderNo?: string;
  material_code?: string;
  supplier_name?: string;
  supplier?: string;
  batch_no?: string;
  unit_price?: number;
  unitPrice?: number;
  warehouse_name?: string;
  location?: string;
  status?: string;
  qrCode?: string;
  isRemainder?: boolean;
  sourceLabelNo?: string;
  inboundTime?: string;
  originalWidth?: number;
  cutWidths?: string;
  cutWidth?: number;
  operatorName?: string;
  createTime?: string;
  [key: string]: Loose;
}

export interface LabelItem {
  id: string;
  labelNo: string;
  materialName: string;
  materialSpec?: string;
  quantity: number;
  unit: string;
}

export interface ScanResult {
  id: string;
  materialName: string;
  materialCode: string;
  specification: string;
  supplier: string;
  inboundTime: string;
  status: 'IN' | 'OUT';
}

// 状态配置
export const statusConfig: Record<string, { labelKey: string; color: string; icon: LucideIcon }> = {
  draft: {
    labelKey: 'draft',
    color:
      'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800',
    icon: Clock,
  },
  pending: {
    labelKey: 'pending',
    color:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800',
    icon: AlertCircle,
  },
  approved: {
    labelKey: 'approved',
    color:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800',
    icon: CheckCircle2,
  },
  rejected: {
    labelKey: 'rejected',
    color:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800',
    icon: X,
  },
  completed: {
    labelKey: 'completed',
    color:
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800',
    icon: CheckCircle2,
  },
};

export const CUTTABLE_MATERIALS = ['PET', 'PC', 'PVC', 'pet', 'pc', 'pvc'];

export function isCuttableMaterial(materialName: string): boolean {
  if (!materialName) return false;
  const name = materialName.toUpperCase();
  return CUTTABLE_MATERIALS.some((m) => name.includes(m.toUpperCase()));
}

export function parseSpecWidth(spec: string): number | null {
  if (!spec) return null;
  const match = spec.match(/^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?$/i);
  if (match) return parseFloat(match[1]);
  return null;
}

export function calcCutSpec(originalSpec: string, cutWidth: number): string {
  if (!originalSpec) return `${cutWidth}mm`;
  const match = originalSpec.match(/^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?$/i);
  if (match) {
    const origLength = match[2];
    const unit = match[3] || 'mm';
    return `${cutWidth}×${origLength}${unit}`;
  }
  return `${cutWidth}mm`;
}

// 表单数据类型（共享于 AddDialog/MixedAddDialog/EditDialog）
export interface InboundFormData {
  materialCode: string;
  materialName: string;
  specification: string;
  quantity: string;
  unit: string;
  supplier: string;
  warehouse: string;
  purchaseOrderNo: string;
  batchNo: string;
  remark: string;
  isMixed: boolean;
  mixedMaterialRemark: string;
  colorCode: string;
  machineNo: string;
  width: string;
  isRawMaterial: boolean;
}

export const INITIAL_FORM_DATA: InboundFormData = {
  materialCode: '',
  materialName: '',
  specification: '',
  quantity: '',
  unit: '',
  supplier: '',
  warehouse: '',
  purchaseOrderNo: '',
  batchNo: '',
  remark: '',
  isMixed: false,
  mixedMaterialRemark: '',
  colorCode: '',
  machineNo: '',
  width: '',
  isRawMaterial: false,
};

// 分切表单数据类型
export interface CuttingFormData {
  sourceLabelId: string;
  cutWidths: string;
  operatorId: string | number;
  operatorName: string;
  remark: string;
}
