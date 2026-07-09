/**
 * 打样工艺卡 — 统一 Zod 校验 Schema
 *
 * 双录入页（经典版 input + 高效版 input-v2）共用此 Schema，
 * 保证两套页面的校验规则、必填项、格式校验完全一致。
 *
 * 依据: docs/打样工艺卡录入页统一完善方案.md
 */
import { z } from 'zod';

// 物料明细行
export const sampleProcessItemSchema = z.object({
  id: z.number().optional(),
  item_type: z.number().int().min(1).max(3).default(1),
  material_id: z.number().int().positive().optional(),
  material_code: z.string().min(1, '物料编码不能为空'),
  material_name: z.string().min(1, '物料名称不能为空'),
  specification: z.string().optional(),
  unit_dosage: z.number().positive('单耗必须大于0'),
  unit: z.string().optional(),
  unit_cost: z.number().min(0).default(0),
  line_cost: z.number().min(0).default(0),
  remark: z.string().optional(),
  sort: z.number().int().default(0),
});

// 工序明细行
export const sampleProcessStepSchema = z.object({
  id: z.number().optional(),
  process_id: z.number().int().positive().optional(),
  process_name: z.string().min(1, '工序名称不能为空'),
  work_hour: z.number().positive('工时必须大于0'),
  hourly_rate: z.number().min(0).default(0),
  line_cost: z.number().min(0).default(0),
  process_param: z.string().optional(),
  sort: z.number().int().default(0),
});

// 工艺卡主表（创建/更新）
export const sampleProcessCardSchema = z.object({
  sample_no: z.string().optional(),
  sample_name: z.string().min(1, '打样名称不能为空').max(100),
  customer_id: z.number().int().positive().optional(),
  customer_name: z.string().optional(),
  product_id: z.number().int().positive().optional(),
  product_name: z.string().optional(),
  version_no: z.string().default('V1.0'),
  status: z.number().int().min(1).max(4).default(1),
  substrate_material_id: z.number().int().positive().optional(),
  substrate_material_name: z.string().optional(),
  spec: z.string().max(255).optional(),
  print_color: z.string().max(100).optional(),
  ink_color_id: z.number().int().positive().optional(),
  screen_plate_id: z.number().int().positive().optional(),
  die_tool_id: z.number().int().positive().optional(),
  material_loss_rate: z.number().min(0).max(100).default(5),
  estimated_hour: z.number().min(0).optional(),
  remark: z.string().optional(),
  items: z.array(sampleProcessItemSchema).min(1, '至少需要一条物料明细'),
  steps: z.array(sampleProcessStepSchema).min(1, '至少需要一条工序明细'),
});

// 提交时校验（状态流转到"打样中"）
export const sampleProcessCardSubmitSchema = sampleProcessCardSchema.extend({
  sample_name: z.string().min(1, '打样名称不能为空'),
  customer_id: z.number().int().positive('请选择客户'),
  substrate_material_id: z.number().int().positive('请选择基材物料'),
  items: z.array(sampleProcessItemSchema).min(1, '至少需要一条物料明细'),
  steps: z.array(sampleProcessStepSchema).min(1, '至少需要一条工序明细'),
});

export type SampleProcessCardInput = z.infer<typeof sampleProcessCardSchema>;
export type SampleProcessItemInput = z.infer<typeof sampleProcessItemSchema>;
export type SampleProcessStepInput = z.infer<typeof sampleProcessStepSchema>;
