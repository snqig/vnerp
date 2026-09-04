import { z } from 'zod/v4';

export const inboundItemSchema = z.object({
  // 允许为 0：手动入库（自由录入物料名称、未关联物料主数据）时前端不传物料ID
  material_id: z.number().int().min(0, '物料ID必须为非负整数'),
  material_code: z.string().max(50, '物料编码最长50字符').optional(),
  material_name: z.string().min(1, '物料名称不能为空').max(100, '物料名称最长100字符'),
  material_spec: z.string().max(200, '规格最长200字符').optional(),
  batch_no: z.string().max(50, '批号最长50字符').optional().default(''),
  batch_id: z.number().int().positive('批次ID必须为正整数').optional().nullable().default(null),
  original_inbound_date: z.string().optional().nullable().default(null),
  location_id: z.number().int().positive('库位ID必须为正整数').optional().nullable().default(null),
  qr_code: z.string().max(100, '二维码最长100字符').optional().nullable().default(null),
  quantity: z.number().positive('数量必须为正数').finite(),
  unit: z.string().max(20, '单位最长20字符').optional().default('件'),
  unit_price: z.number().nonnegative('单价不能为负数').finite().optional().default(0),
  warehouse_location: z.string().max(100, '库位最长100字符').optional(),
  produce_date: z.string().optional(),
});

export const createInboundOrderSchema = z
  .object({
    warehouse_id: z.number().int().positive('仓库ID必须为正整数'),
    supplier_name: z.string().max(100, '供应商名称最长100字符').optional().default(''),
    inbound_date: z.string().optional(),
    currency: z.string().max(10, '币种最长10字符').optional(),
    remark: z.string().max(500, '备注最长500字符').optional(),
    source_type: z.enum(['purchase_order']).optional(),
    source_order_id: z.number().int().positive('来源单据ID必须为正整数').optional(),
    items: z.array(inboundItemSchema).min(1, '入库项不能为空').max(100, '单次入库项不超过100'),
  })
  .refine(
    (data) => !(data.source_type === 'purchase_order' && data.source_order_id === undefined),
    {
      message: '当 source_type 为 purchase_order 时，source_order_id 必填',
      path: ['source_order_id'],
    }
  );

export const updateInboundOrderSchema = z.object({
  id: z.number().int().positive('入库单ID必须为正整数'),
  action: z.enum(['submit', 'approve', 'cancel', 'unapprove', 'update', 'reject']).optional(),
  // 扩展 status 枚举加入 'draft'：编辑草稿单时前端可能原样回传当前状态，避免校验 422
  status: z.enum(['draft', 'pending', 'approved', 'cancelled', 'rejected']).optional(),
  remark: z.string().max(500, '备注最长500字符').optional(),
  // 内容级修改（action='update' 时生效）：仅草稿/待审核单允许
  supplier_name: z.string().max(100, '供应商名称最长100字符').optional(),
  warehouse_id: z.number().int().positive('仓库ID必须为正整数').optional(),
  inbound_date: z.string().optional(),
  currency: z.string().max(10, '币种最长10字符').optional(),
  items: z.array(inboundItemSchema).min(1, '至少一条入库明细').max(100, '单次入库项不超过100').optional(),
});

export type CreateInboundOrderInput = z.infer<typeof createInboundOrderSchema>;
export type UpdateInboundOrderInput = z.infer<typeof updateInboundOrderSchema>;
