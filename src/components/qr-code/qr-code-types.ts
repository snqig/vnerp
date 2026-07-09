'use client';

export type QRCodeType =
  | 'material' // 原材料
  | 'product' // 成品
  | 'workorder' // 工单
  | 'ink' // 油墨
  | 'screen_plate' // 网版
  | 'die' // 刀具
  | 'shipment' // 发货
  | 'ink_open' // 开罐
  | 'ink_mixed'; // 调色

export type SplitFlag = 0 | 1 | 2; // 0=整料, 1=小料, 2=余料

export type QRCodeStatus =
  | 1 // 有效
  | 2 // 已使用
  | 3 // 已失效
  | 9; // 已作废

export interface QRCodeRecord {
  id: number;
  qr_code: string;
  qr_type: QRCodeType;
  ref_id: number | null;
  ref_no: string | null;
  batch_no: string | null;
  material_id: number | null;
  material_code: string | null;
  material_name: string | null;
  specification: string | null;
  quantity: number | null;
  unit: string | null;
  warehouse_name: string | null;
  supplier_name: string | null;
  customer_name: string | null;
  work_order_no: string | null;
  production_date: string | null;
  expiry_date: string | null;
  print_count: number;
  scan_count: number;
  status: QRCodeStatus;
  create_time: string;
  remark: string | null;
}

export interface QRCodeGenerateParams {
  qr_type: QRCodeType;
  ref_id?: number;
  ref_no?: string;
  batch_no?: string;
  material_code?: string;
  material_name?: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  warehouse_name?: string;
  supplier_name?: string;
  customer_name?: string;
  work_order_no?: string;
  production_date?: string;
  expiry_date?: string;
  remark?: string;
}

export interface QRCodePrintParams {
  qr_code: string;
  label_type: 'material' | 'small' | 'finished' | 'shipping' | 'workorder' | 'ink';
  label_spec?: string;
  printer_id?: number;
  copies?: number;
  data?: Record<string, Loose>;
}

export interface TraceEvent {
  event: string;
  time: string;
  operator: string;
  result: 'success' | 'fail';
  message?: string;
}

export interface TraceData {
  record: QRCodeRecord | null;
  order: Record<string, Loose> | null;
  timeline: TraceEvent[];
  related_records: QRCodeRecord[];
  inventory: Record<string, Loose>[];
}

export const QRCodeTypeLabels: Record<string, string> = {
  material: '原料',
  product: '成品',
  workorder: '工单',
  ink: '油墨',
  screen_plate: '网版',
  die: '刀具',
  shipment: '出货',
  ink_open: '开罐',
  ink_mixed: '调色',
};

export const QRCodeStatusLabels: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '有效', variant: 'default' },
  2: { label: '已使用', variant: 'secondary' },
  3: { label: '已失效', variant: 'outline' },
  9: { label: '已作废', variant: 'destructive' },
};
