import { z } from 'zod';

/**
 * quality 模块表单校验基建（schema 工厂 + 文案注入）。
 * 文案全部来自 i18n（Common 命名空间），禁硬编码中文。
 */

export interface QualityFormMessages {
  required: string;
  qtyMustBePositive: string;
  qtySumExceedsPlan: string;
  scoreRange: string;
}

type TranslateFn = (key: string) => string;

export function buildQualityFormMessages(tc: TranslateFn): QualityFormMessages {
  return {
    required: tc('required'),
    qtyMustBePositive: tc('qtyMustBePositive'),
    qtySumExceedsPlan: tc('qtySumExceedsPlan'),
    scoreRange: tc('scoreRange'),
  };
}

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? '';
}

// ---------------------------------------------------------------------------
// 通用 helpers
// ---------------------------------------------------------------------------

function reqString(message: string) {
  return z
    .string()
    .trim()
    .min(1, message);
}

function nonNegativeNumber(message: string) {
  return z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v >= 0, message);
}

function positiveNumber(message: string) {
  return z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v > 0, message);
}

function scoreField(message: string, m: QualityFormMessages) {
  return z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v >= 0 && v <= 100, m.scoreRange || message);
}

// ---------------------------------------------------------------------------
// 不合格品（unqualified）创建 / 开始处理 / 完成处理
// ---------------------------------------------------------------------------

export const HANDLE_METHODS = ['rework', 'scrap', 'concession', 'return'] as const;
export type HandleMethodCode = (typeof HANDLE_METHODS)[number];

export function buildUnqualifiedCreateSchema(m: QualityFormMessages) {
  return z.object({
    inspection_id: z.coerce
      .number()
      .refine((v) => Number.isFinite(v) && v > 0, m.required),
    source_type: reqString(m.required),
    source_no: reqString(m.required),
    material_id: z.coerce
      .number()
      .refine((v) => Number.isFinite(v) && v > 0, m.required),
    material_code: reqString(m.required),
    material_name: reqString(m.required),
    quantity: positiveNumber(m.qtyMustBePositive),
    defect_type: reqString(m.required),
    defect_desc: z.string().optional(),
    handle_type: z.enum(HANDLE_METHODS, { message: m.required }),
    responsible_dept: z.string().optional(),
    responsible_person: z.string().optional(),
    remark: z.string().optional(),
  });
}

export function buildUnqualifiedStartSchema(m: QualityFormMessages) {
  return z.object({
    action: z.literal('start'),
    id: z.coerce
      .number()
      .refine((v) => Number.isFinite(v) && v > 0, m.required),
    handle_type: z.enum(HANDLE_METHODS, { message: m.required }),
    responsible_dept: z.string().optional(),
    responsible_person: reqString(m.required),
  });
}

export function buildUnqualifiedCompleteSchema(m: QualityFormMessages) {
  return z.object({
    action: z.literal('complete'),
    id: z.coerce
      .number()
      .refine((v) => Number.isFinite(v) && v > 0, m.required),
    handler: reqString(m.required),
    handle_result: z.coerce
      .number()
      .refine((v) => v === 1 || v === 2, m.required),
    cost_amount: nonNegativeNumber(m.required).optional(),
  });
}

// ---------------------------------------------------------------------------
// 来料检验（incoming）
// ---------------------------------------------------------------------------

export function buildIncomingSchema(m: QualityFormMessages) {
  return z.object({
    inspectionDate: reqString(m.required),
    supplierName: reqString(m.required),
    materialCode: reqString(m.required),
    materialName: reqString(m.required),
    specification: z.string().optional(),
    batchNo: z.string().optional(),
    quantity: positiveNumber(m.qtyMustBePositive),
    unit: reqString(m.required),
    inspectionType: z.string().optional(),
    inspectionResult: reqString(m.required),
    inspectorName: reqString(m.required),
    remark: z.string().optional(),
    items: z.array(z.record(z.string(), z.unknown())).optional(),
  });
}

// ---------------------------------------------------------------------------
// 客户投诉（complaint）
// ---------------------------------------------------------------------------

export function buildComplaintSchema(m: QualityFormMessages) {
  return z.object({
    complaint_source: z.string().optional(),
    customer_id: z.union([z.coerce.number(), z.null()]).optional(),
    customer_name: reqString(m.required),
    product_id: z.union([z.coerce.number(), z.null()]).optional(),
    product_code: z.string().optional(),
    product_name: reqString(m.required),
    order_no: z.string().optional(),
    defect_date: z.string().optional(),
    defect_qty: nonNegativeNumber(m.required).optional(),
    defect_desc: z.string().optional(),
    defect_type: z.string().optional(),
    severity: z.coerce
      .number()
      .refine((v) => v >= 1 && v <= 5, m.required)
      .optional(),
    reporter: z.string().optional(),
    report_date: z.string().optional(),
    remark: z.string().optional(),
  });
}

// ---------------------------------------------------------------------------
// 委外检测（lab-test）
// ---------------------------------------------------------------------------

export function buildLabTestSchema(m: QualityFormMessages) {
  return z.object({
    product_id: z.union([z.coerce.number(), z.null()]).optional(),
    product_code: z.string().optional(),
    product_name: reqString(m.required),
    batch_no: z.string().optional(),
    test_type: z.string().optional(),
    test_items: z.string().optional(),
    test_standard: z.string().optional(),
    test_equipment: z.string().optional(),
    tester: z.string().optional(),
    test_date: z.string().optional(),
    result_summary: z.string().optional(),
    detail_data: z.string().optional(),
    conclusion: z.string().optional(),
    remark: z.string().optional(),
  });
}

// ---------------------------------------------------------------------------
// 供应商审核（supplier-audit）
// ---------------------------------------------------------------------------

export function buildSupplierAuditSchema(m: QualityFormMessages) {
  return z.object({
    supplier_id: z.union([z.coerce.number(), z.null()]).optional(),
    supplier_name: reqString(m.required),
    audit_type: z.string().optional(),
    audit_date: z.string().optional(),
    auditor: reqString(m.required),
    audit_scope: z.string().optional(),
    quality_system_score: scoreField('', m).optional(),
    delivery_score: scoreField('', m).optional(),
    price_score: scoreField('', m).optional(),
    service_score: scoreField('', m).optional(),
    total_score: scoreField('', m).optional(),
    audit_result: z.string().optional(),
    improvement_items: z.string().optional(),
    follow_up_date: z.string().optional(),
    remark: z.string().optional(),
  });
}

// ---------------------------------------------------------------------------
// SGS 证书
// ---------------------------------------------------------------------------

export function buildSgsSchema(m: QualityFormMessages) {
  return z.object({
    cert_no: reqString(m.required),
    material_id: z.union([z.coerce.number(), z.null()]).optional(),
    material_code: z.string().optional(),
    material_name: z.string().optional(),
    supplier_id: z.union([z.coerce.number(), z.null()]).optional(),
    supplier_name: z.string().optional(),
    cert_type: z.string().optional(),
    test_items: z.string().optional(),
    test_result: z.string().optional(),
    test_report_no: z.string().optional(),
    test_org: z.string().optional(),
    issue_date: z.string().optional(),
    expire_date: z.string().optional(),
    status: z.union([z.coerce.number(), z.string()]).optional(),
    file_url: z.string().optional(),
    remark: z.string().optional(),
    items: z.array(z.record(z.string(), z.unknown())).optional(),
  });
}

// ---------------------------------------------------------------------------
// 工序/终检表单（inspector 必填；合格数+不良数 <= 计划数）
// ---------------------------------------------------------------------------

export function buildInspectSchema(m: QualityFormMessages, planQty: number) {
  return z
    .object({
      result: reqString(m.required),
      qualifiedQty: nonNegativeNumber(m.required),
      defectQty: nonNegativeNumber(m.required),
      inspector: reqString(m.required),
    })
    .refine((d) => d.qualifiedQty + d.defectQty <= Number(planQty || 0), {
      message: m.qtySumExceedsPlan,
      path: ['qualifiedQty'],
    });
}

// ---------------------------------------------------------------------------
// 终检路由服务端 schema
// 注意：zod 对象默认剥掉未声明键，需要透传给 INSERT 的可选字段必须显式声明。
// ---------------------------------------------------------------------------

function finalQtyFields(m: QualityFormMessages) {
  return {
    finalResult: z.enum(['pass', 'fail', 'concession'], { message: m.required }),
    qualifiedQty: nonNegativeNumber(m.required),
    defectQty: nonNegativeNumber(m.required),
    inspector: reqString(m.required),
    defectReason: z.string().nullish(),
    packMethod: z.string().nullish(),
    remark: z.string().nullish(),
  };
}

export function buildFinalInspectionSchema(m: QualityFormMessages) {
  return z.object({
    cardId: z.coerce
      .number()
      .refine((v) => Number.isFinite(v) && v > 0, m.required),
    cardNo: reqString(m.required),
    ...finalQtyFields(m),
  });
}

export function buildFinalInspectionUpdateSchema(m: QualityFormMessages) {
  return z.object({
    id: z.coerce
      .number()
      .refine((v) => Number.isFinite(v) && v > 0, m.required),
    ...finalQtyFields(m),
  });
}
