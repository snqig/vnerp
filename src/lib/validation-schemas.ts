import { z } from 'zod';

const InboundItemSchema = z.object({
  material_id: z.number(),
  material_name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number(),
  batch_no: z.string().optional(),
});

export const InboundCreateSchema = z.object({
  warehouse_id: z.number(),
  supplier_name: z.string().optional(),
  inbound_date: z.string(),
  remark: z.string().optional(),
  items: z.array(InboundItemSchema),
});

const OutboundItemSchema = z.object({
  material_id: z.number(),
  material_name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number().optional(),
  batch_no: z.string().optional(),
});

export const OutboundCreateSchema = z.object({
  warehouseId: z.number(),
  warehouseCode: z.string(),
  warehouseName: z.string(),
  items: z.array(OutboundItemSchema),
  operatorId: z.number(),
  operatorName: z.string(),
  orderDate: z.string(),
  outboundType: z.string().optional(),
  remark: z.string().optional(),
});

export const TransferSchema = z.object({
  batchNo: z.string(),
  warehouseId: z.number(),
  quantity: z.number(),
  sourceType: z.string().optional(),
  sourceNo: z.string().optional(),
});

export const InventoryInboundSchema = z.object({
  action: z.literal('inbound'),
  warehouseId: z.number(),
  materialId: z.number(),
  quantity: z.number().positive(),
  sourceType: z.string().optional(),
  sourceNo: z.string().optional(),
});

export const InventoryOutboundSchema = z.object({
  action: z.literal('outbound'),
  batchNo: z.string(),
  quantity: z.number().positive(),
  sourceType: z.string().optional(),
  sourceNo: z.string().optional(),
});

export const InventoryTransferSchema = z.object({
  action: z.literal('transfer'),
  batchNo: z.string(),
  warehouseId: z.number(),
  quantity: z.number().positive(),
  sourceType: z.string().optional(),
  sourceNo: z.string().optional(),
});

const WorkOrderItemSchema = z.object({
  material_id: z.number(),
  material_name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number().optional(),
});

export const WorkOrderCreateSchema = z.object({
  order_no: z.string(),
  customer_name: z.string().optional(),
  items: z.array(WorkOrderItemSchema),
  bom_id: z.number().optional(),
  plan_start_date: z.string().optional(),
  plan_end_date: z.string().optional(),
});

export const WorkOrderUpdateSchema = z.object({
  id: z.number(),
  status: z.enum(['pending', 'confirmed', 'producing', 'completed', 'cancelled']).optional(),
  priority: z.number().optional(),
  plan_start_date: z.string().optional(),
  plan_end_date: z.string().optional(),
});

export const QualityInspectionSchema = z.object({
  cardId: z.number(),
  inspectResult: z.enum(['pending', 'inspecting', 'pass', 'fail', 'rework', 'scrap']),
  qualifiedQty: z.number().optional(),
  defectQty: z.number().optional(),
  inspector: z.string().optional(),
  remark: z.string().optional(),
});

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(4)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6),
  real_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/)
    .optional(),
  department_id: z.number().optional(),
  role_id: z.number().optional(),
});

export const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

export function validateWithZod<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
