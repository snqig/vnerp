/**
 * 打样工艺卡 — 公共表单 Hook
 *
 * 双录入页（经典版 input + 高效版 input-v2）共用此 Hook，
 * 保证表单状态管理、校验、成本计算、提交逻辑 100% 一致。
 *
 * 依据: docs/打样工艺卡录入页统一完善方案.md
 */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { useToast } from '@/hooks/use-toast';
import {
  sampleProcessCardSchema,
  type SampleProcessCardInput,
  type SampleProcessItemInput,
  type SampleProcessStepInput,
} from '@/lib/validators/sample-card.schema';

export interface SampleProcessCardData extends Omit<
  SampleProcessCardInput,
  'items' | 'steps' | 'status'
> {
  id?: number;
  sample_no?: string;
  status?: number;
  sample_work_order_id?: number | null;
  sample_work_order_no?: string | null;
  create_time?: string;
  items: SampleProcessItemInput[];
  steps: SampleProcessStepInput[];
}

export interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  toolCost: number;
  totalCost: number;
}

const DEFAULT_HOURLY_RATE = 80;
const DRAFT_KEY = 'sample-card-draft';

const emptyItem = (): SampleProcessItemInput => ({
  item_type: 1,
  material_id: undefined,
  material_code: '',
  material_name: '',
  specification: '',
  unit_dosage: 0,
  unit: 'kg',
  unit_cost: 0,
  line_cost: 0,
  remark: '',
  sort: 0,
});

const emptyStep = (): SampleProcessStepInput => ({
  process_id: undefined,
  process_name: '',
  work_hour: 0,
  hourly_rate: DEFAULT_HOURLY_RATE,
  line_cost: 0,
  process_param: '',
  sort: 0,
});

const emptyForm = (): SampleProcessCardData => ({
  sample_name: '',
  customer_id: undefined,
  customer_name: '',
  product_name: '',
  version_no: 'V1.0',
  status: 1,
  substrate_material_id: undefined,
  substrate_material_name: '',
  spec: '',
  print_color: '',
  ink_color_id: undefined,
  screen_plate_id: undefined,
  die_tool_id: undefined,
  material_loss_rate: 5,
  estimated_hour: undefined,
  diagram_url: '',
  remark: '',
  items: [emptyItem()],
  steps: [emptyStep()],
});

export function useSampleProcessForm(cardId?: number) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<SampleProcessCardData>(emptyForm());
  const [cost, setCost] = useState<CostBreakdown>({
    materialCost: 0,
    laborCost: 0,
    toolCost: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const costTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载已有工艺卡数据
  const loadCard = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/dcprint/sample-card/${id}`);
        const result = await res.json();
        if (result.success) {
          setFormData({
            ...emptyForm(),
            ...result.data,
            items: result.data.items?.length ? result.data.items : [emptyItem()],
            steps: result.data.steps?.length ? result.data.steps : [emptyStep()],
          });
        }
      } catch {
        toast({ title: '加载失败', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (cardId) loadCard(cardId);
  }, [cardId, loadCard]);

  // 字段更新
  const updateField = useCallback(
    <K extends keyof SampleProcessCardData>(field: K, value: SampleProcessCardData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // 物料明细操作
  const addItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem(), sort: prev.items.length + 1 }],
    }));
  }, []);

  const updateItem = useCallback((index: number, patch: Partial<SampleProcessItemInput>) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      // 自动算行成本
      if (patch.unit_dosage !== undefined || patch.unit_cost !== undefined) {
        const dosage = items[index].unit_dosage || 0;
        const unitCost = items[index].unit_cost || 0;
        items[index].line_cost = Math.round(dosage * unitCost * 10000) / 10000;
      }
      return { ...prev, items };
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setFormData((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      items.forEach((item, i) => {
        item.sort = i + 1;
      });
      return { ...prev, items: items.length ? items : [emptyItem()] };
    });
  }, []);

  // 工序明细操作
  const addStep = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, { ...emptyStep(), sort: prev.steps.length + 1 }],
    }));
  }, []);

  const updateStep = useCallback((index: number, patch: Partial<SampleProcessStepInput>) => {
    setFormData((prev) => {
      const steps = [...prev.steps];
      steps[index] = { ...steps[index], ...patch };
      // 自动算行成本
      if (patch.work_hour !== undefined || patch.hourly_rate !== undefined) {
        const hour = steps[index].work_hour || 0;
        const rate = steps[index].hourly_rate || DEFAULT_HOURLY_RATE;
        steps[index].line_cost = Math.round(hour * rate * 10000) / 10000;
      }
      return { ...prev, steps };
    });
  }, []);

  const removeStep = useCallback((index: number) => {
    setFormData((prev) => {
      const steps = prev.steps.filter((_, i) => i !== index);
      steps.forEach((step, i) => {
        step.sort = i + 1;
      });
      return { ...prev, steps: steps.length ? steps : [emptyStep()] };
    });
  }, []);

  // 实时成本计算（防抖）
  const recalculateCost = useCallback(async () => {
    if (costTimerRef.current) clearTimeout(costTimerRef.current);
    costTimerRef.current = setTimeout(async () => {
      try {
        const res = await authFetch('/api/dcprint/sample-card/cost-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: formData.items,
            steps: formData.steps,
            material_loss_rate: formData.material_loss_rate,
            die_tool_id: formData.die_tool_id,
            screen_plate_id: formData.screen_plate_id,
          }),
        });
        const result = await res.json();
        if (result.success) {
          setCost(result.data);
        }
      } catch {
        // ignore cost preview errors
      }
    }, 500);
  }, [
    formData.items,
    formData.steps,
    formData.material_loss_rate,
    formData.die_tool_id,
    formData.screen_plate_id,
  ]);

  useEffect(() => {
    recalculateCost();
  }, [recalculateCost]);

  // 草稿自动保存
  useEffect(() => {
    if (!cardId) {
      const timer = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, cardId]);

  // 恢复草稿
  const restoreDraft = useCallback(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData({ ...emptyForm(), ...parsed });
        toast({ title: '草稿已恢复' });
      } catch {
        // ignore
      }
    }
  }, [toast]);

  // 清除草稿
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  // 上传工艺图示（图文混排）
  const uploadDiagram = useCallback(
    async (file: File): Promise<string | null> => {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await authFetch('/api/dcprint/sample-card/upload-diagram', {
          method: 'POST',
          body: fd,
        });
        const result = await res.json();
        if (result.success) {
          updateField('diagram_url', result.data.url);
          toast({ title: '图示上传成功' });
          return result.data.url;
        }
        toast({ title: '上传失败', description: result.message, variant: 'destructive' });
        return null;
      } catch {
        toast({ title: '上传失败', variant: 'destructive' });
        return null;
      }
    },
    [toast, updateField]
  );

  // 从标准模板导入（录入即沉淀 / 快速翻单）
  const importFromTemplate = useCallback(
    async (templateId: number): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/dcprint/sample-card/template/${templateId}`);
        const result = await res.json();
        if (result.success) {
          const t = result.data;
          setFormData({
            ...emptyForm(),
            sample_name: t.template_name || '',
            customer_id: t.customer_id,
            customer_name: t.customer_name || '',
            product_name: t.product_name || '',
            substrate_material_id: t.substrate_material_id,
            substrate_material_name: t.substrate_material_name || '',
            spec: t.spec || '',
            print_color: t.print_color || '',
            ink_color_id: t.ink_color_id,
            screen_plate_id: t.screen_plate_id,
            die_tool_id: t.die_tool_id,
            material_loss_rate: t.material_loss_rate || 5,
            estimated_hour: t.estimated_hour,
            diagram_url: t.diagram_url || '',
            remark: t.remark || '',
            items: t.items?.length ? t.items : [emptyItem()],
            steps: t.steps?.length ? t.steps : [emptyStep()],
          });
          toast({ title: '模板已导入' });
          return true;
        }
        toast({ title: '导入失败', variant: 'destructive' });
        return false;
      } catch {
        toast({ title: '导入失败', variant: 'destructive' });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // 校验
  const validate = useCallback((): boolean => {
    setValidationErrors([]);
    const parsed = sampleProcessCardSchema.safeParse(formData);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Record<string, string> = {};
    const allErrors: string[] = [];
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      fieldErrors[path] = issue.message;
      allErrors.push(`${path}: ${issue.message}`);
    }
    setErrors(fieldErrors);
    setValidationErrors(allErrors);
    return false;
  }, [formData]);

  // 保存（草稿）
  const saveDraft = useCallback(async (): Promise<number | null> => {
    setSaving(true);
    try {
      const isEdit = !!cardId;
      const url = isEdit ? `/api/dcprint/sample-card/${cardId}` : '/api/dcprint/sample-card';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: isEdit ? '更新成功' : '保存成功' });
        if (!isEdit) clearDraft();
        return result.data.id;
      } else {
        toast({ title: '保存失败', description: result.message, variant: 'destructive' });
        return null;
      }
    } catch {
      toast({ title: '保存失败', variant: 'destructive' });
      return null;
    } finally {
      setSaving(false);
    }
  }, [cardId, formData, toast, clearDraft]);

  // 提交（草稿→打样中，自动生成工单）
  const submit = useCallback(async (): Promise<{ success: boolean; workOrderNo?: string }> => {
    if (!validate()) {
      toast({ title: '校验失败', description: '请检查必填项', variant: 'destructive' });
      return { success: false };
    }
    setSaving(true);
    try {
      // 先保存
      const savedId = await saveDraft();
      const targetId = cardId || savedId;
      if (!targetId) return { success: false };

      const res = await authFetch(`/api/dcprint/sample-card/${targetId}/submit`, {
        method: 'POST',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '提交成功', description: `打样工单: ${result.data.workOrderNo}` });
        clearDraft();
        return { success: true, workOrderNo: result.data.workOrderNo };
      } else {
        toast({ title: '提交失败', description: result.message, variant: 'destructive' });
        return { success: false };
      }
    } catch {
      toast({ title: '提交失败', variant: 'destructive' });
      return { success: false };
    } finally {
      setSaving(false);
    }
  }, [validate, saveDraft, cardId, toast, clearDraft]);

  // 重置表单
  const reset = useCallback(() => {
    setFormData(emptyForm());
    setErrors({});
    setValidationErrors([]);
    clearDraft();
  }, [clearDraft]);

  return {
    formData,
    cost,
    loading,
    saving,
    errors,
    validationErrors,
    updateField,
    addItem,
    updateItem,
    removeItem,
    addStep,
    updateStep,
    removeStep,
    validate,
    saveDraft,
    submit,
    reset,
    restoreDraft,
    clearDraft,
    uploadDiagram,
    importFromTemplate,
  };
}
