/**
 * 报价单 — Zod 校验 Schema
 *
 * 依据: docs/打样工艺卡录入页统一完善方案.md (阶段 3)
 */
import { z } from 'zod';

export const quoteGenerateSchema = z.object({
  markupRate: z
    .number()
    .min(0, '加价率不能为负')
    .max(500, '加价率不能超过 500%')
    .optional()
    .default(30),
  quantity: z.number().int().min(1, '数量不能小于 1').optional().default(1),
  validUntil: z.string().optional(),
  remark: z.string().max(1000).optional(),
});

export type QuoteGenerateInput = z.infer<typeof quoteGenerateSchema>;

export const quoteStatusSchema = z.object({
  status: z.enum(['1', '2', '3', '4', '5']),
});

export type QuoteStatusInput = z.infer<typeof quoteStatusSchema>;
