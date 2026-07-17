import { z } from 'zod/v4';

export const inboundItemSchema = z.object({
  material_id: z.number().int().positive('物料ID必须为正整数'),
  material_code: z.string().max(50, '物料编码最长50字符').optional(),
  material_name: z.string().min(1, '物料名称不能为空').max(100, '物料名称最长100字符'),
  material_spec: z.string().max(200, '规格最长200字符').optional(),
  batch_no: z.string().max(50, '批号最长50字符').optional().default(''),
  quantity: z.number().positive('数量必须为正数').finite(),
  unit: z.string().max(20, '单位最长20字符').optional().default('件'),
  unit_price: z.number().nonnegative('单价不能为负数').finite().optional().default(0),
  warehouse_location: z.string().max(100, '库位最长100字符').optional(),
  produce_date: z.string().optional(),
});

export const createInboundOrderSchema = z.object({
  warehouse_id: z.number().int().positive('仓库ID必须为正整数'),
  supplier_name: z.string().max(100, '供应商名称最长100字符').optional().default(''),
  inbound_date: z.string().optional(),
  currency: z.string().max(10, '币种最长10字符').optional(),
  remark: z.string().max(500, '备注最长500字符').optional(),
  items: z.array(inboundItemSchema).min(1, '入库项不能为空').max(100, '单次入库项不超过100'),
});

export const updateInboundOrderSchema = z.object({
  id: z.number().int().positive('入库单ID必须为正整数'),
  action: z.enum(['submit', 'approve', 'cancel', 'unapprove']).optional(),
  status: z.enum(['pending', 'approved', 'cancelled']).optional(),
  remark: z.string().max(500, '备注最长500字符').optional(),
});

export type CreateInboundOrderInput = z.infer<typeof createInboundOrderSchema>;
export type UpdateInboundOrderInput = z.infer<typeof updateInboundOrderSchema>;
