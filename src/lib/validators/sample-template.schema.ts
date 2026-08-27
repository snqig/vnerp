/**
 * 标准工艺模板 — 统一 Zod 校验 Schema
 *
 * 复用打样工艺卡的明细行校验（sampleProcessItemSchema / sampleProcessStepSchema），
 * 保证模板与工艺卡数据结构 100% 一致，支持「存为模板」「从模板导入」双向流转。
 *
 * 依据: docs/打样工艺卡录入页统一完善方案.md
 */
import { z } from 'zod';
import { sampleProcessItemSchema, sampleProcessStepSchema } from './sample-card.schema';

export const sampleProcessTemplateSchema = z.object({
  template_no: z.string().optional(),
  template_name: z.string().min(1, '模板名称不能为空').max(100),
  category: z.string().max(50).optional(),
  tags: z.string().max(255).optional(),
  description: z.string().optional(),
  source_card_id: z.number().int().positive().optional(),
  customer_id: z.number().int().positive().optional(),
  customer_name: z.string().optional(),
  product_name: z.string().optional(),
  substrate_material_id: z.number().int().positive().optional(),
  substrate_material_name: z.string().optional(),
  spec: z.string().max(255).optional(),
  print_color: z.string().max(100).optional(),
  ink_color_id: z.number().int().positive().optional(),
  screen_plate_id: z.number().int().positive().optional(),
  die_tool_id: z.number().int().positive().optional(),
  material_loss_rate: z.number().min(0).max(100).default(5),
  estimated_hour: z.number().min(0).optional(),
  diagram_url: z.string().max(500).optional(),
  remark: z.string().optional(),
  items: z.array(sampleProcessItemSchema).default([]),
  steps: z.array(sampleProcessStepSchema).default([]),
});

export type SampleProcessTemplateInput = z.infer<typeof sampleProcessTemplateSchema>;
