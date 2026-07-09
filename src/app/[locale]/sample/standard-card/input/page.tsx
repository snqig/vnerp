'use client';

/**
 * 打样工艺卡 — 经典向导式录入页（4 步）
 *
 * 与 input-v2（高效版）共用 useSampleProcessForm Hook 与 Zod 校验 Schema，
 * 保证数据模型、字段、参考数据加载、保存/提交逻辑 100% 一致。
 *
 * 步骤：
 *   1. 基础信息
 *   2. 物料明细
 *   3. 工序路线
 *   4. 成本确认与提交
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Clock,
  Wrench,
  Package,
  Check,
} from 'lucide-react';
import { useSampleProcessForm } from '@/hooks/useSampleProcessForm';

interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
}
interface Material {
  id: number;
  material_code: string;
  material_name: string;
  specification: string;
  unit: string;
  cost_price: number;
}
interface InkColor {
  id: number;
  color_code: string;
  color_name: string;
}
interface Tool {
  id: number;
  tool_code: string;
  tool_name: string;
  tool_type: number;
}
interface ProcessStep {
  id: number;
  step_name: string;
  standard_time: number;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: tc('text_n02e'), variant: 'secondary' },
  2: { label: tc('text_ewm7d'), variant: 'default' },
  3: { label: tc('text_ecmeg'), variant: 'default' },
  4: { label: tc('text_e5e0l'), variant: 'outline' },
};

const STEPS = [
  { id: 1, label: tc('text_blh1h0') },
  { id: 2, label: tc('text_euvirs') },
  { id: 3, label: tc('text_c8vnne') },
  { id: 4, label: tc('text_qxg4r4') },
];

export default function SampleCardInputPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardId = searchParams.get('id') ? Number(searchParams.get('id')) : undefined;
  const form = useSampleProcessForm(cardId);

  const [currentStep, setCurrentStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inkColors, setInkColors] = useState<InkColor[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // 只读模式：状态 > 1（打样中/已确认/已作废）时所有字段禁用
  const isReadonly = !!(form.formData.status && form.formData.status > 1);

  // 加载参考数据（与 v2 一致）
  useEffect(() => {
    (async () => {
      try {
        const [custRes, matRes, inkRes, toolRes, procRes] = await Promise.all([
          authFetch('/api/customers?page=1&pageSize=999'),
          authFetch('/api/inventory/materials?page=1&pageSize=999'),
          authFetch('/api/dcprint/formula/color?page=1&pageSize=999'),
          authFetch('/api/dcprint/tool?page=1&pageSize=999'),
          authFetch('/api/production/process-route?page=1&pageSize=999'),
        ]);
        const [cust, mat, ink, tool, proc] = await Promise.all([
          custRes.json(),
          matRes.json(),
          inkRes.json(),
          toolRes.json(),
          procRes.json(),
        ]);
        if (cust.success) setCustomers(cust.data.list || []);
        if (mat.success) setMaterials(mat.data.list || []);
        if (ink.success) setInkColors(ink.data.list || []);
        if (tool.success) setTools(tool.data.list || []);
        if (proc.success) setProcessSteps(proc.data.list || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  // 客户选择
  const handleCustomerChange = useCallback(
    (value: string) => {
      const customer = customers.find((c) => c.id === Number(value));
      if (customer) {
        form.updateField('customer_id', customer.id);
        form.updateField('customer_name', customer.customer_name);
      }
    },
    [customers, form]
  );

  // 基材选择
  const handleSubstrateChange = useCallback(
    (value: string) => {
      const mat = materials.find((m) => m.id === Number(value));
      if (mat) {
        form.updateField('substrate_material_id', mat.id);
        form.updateField('substrate_material_name', mat.material_name);
        form.updateField('spec', mat.specification || '');
      }
    },
    [materials, form]
  );

  // 物料选择（经典版：使用 Select 而非搜索下拉）
  const handleMaterialSelect = useCallback(
    (index: number, value: string) => {
      const mat = materials.find((m) => m.id === Number(value));
      if (mat) {
        form.updateItem(index, {
          material_id: mat.id,
          material_code: mat.material_code,
          material_name: mat.material_name,
          specification: mat.specification || '',
          unit: mat.unit || '',
          unit_cost: mat.cost_price || 0,
        });
      } else {
        form.updateItem(index, {
          material_id: undefined,
          material_code: '',
          material_name: '',
          specification: '',
          unit: '',
          unit_cost: 0,
        });
      }
    },
    [materials, form]
  );

  // 工序选择
  const handleProcessSelect = useCallback(
    (index: number, value: string) => {
      const step = processSteps.find((s) => s.id === Number(value));
      if (step) {
        form.updateStep(index, {
          process_id: step.id,
          process_name: step.step_name,
          work_hour: step.standard_time || 0,
        });
      }
    },
    [processSteps, form]
  );

  // 当前步骤的轻量逐字段校验
  const validateStep = useCallback(
    (step: number): boolean => {
      const errors: Record<string, string> = {};
      if (step === 1) {
        if (!form.formData.sample_name?.trim()) errors.sample_name = '打样名称不能为空';
      } else if (step === 2) {
        form.formData.items.forEach((item, i) => {
          if (!item.material_name?.trim()) errors[`items.${i}.material_name`] = '物料名称不能为空';
          if (!item.material_code?.trim()) errors[`items.${i}.material_code`] = '物料编码不能为空';
          if (!item.unit_dosage || item.unit_dosage <= 0)
            errors[`items.${i}.unit_dosage`] = '单耗必须大于0';
        });
      } else if (step === 3) {
        form.formData.steps.forEach((s, i) => {
          if (!s.process_name?.trim()) errors[`steps.${i}.process_name`] = '工序名称不能为空';
          if (!s.work_hour || s.work_hour <= 0) errors[`steps.${i}.work_hour`] = '工时必须大于0';
        });
      }
      setStepErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [form.formData]
  );

  // 下一步：执行全量校验（刷新 validationErrors 用于展示）+ 当前步骤轻量校验作为闸门
  const handleNext = useCallback(() => {
    if (isReadonly) {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length));
      return;
    }
    form.validate();
    if (validateStep(currentStep)) {
      setStepErrors({});
      setCurrentStep((s) => Math.min(s + 1, STEPS.length));
    }
  }, [currentStep, form, validateStep, isReadonly]);

  // 上一步：始终可用
  const handleBack = useCallback(() => {
    setStepErrors({});
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  // 保存草稿
  const handleSave = async () => {
    const id = await form.saveDraft();
    if (id && !cardId) {
      router.push(`/sample/standard-card/input?id=${id}`);
    }
  };

  // 提交
  const handleSubmit = async () => {
    if (!form.validate()) return;
    const result = await form.submit();
    if (result.success) {
      router.push('/sample/standard-card');
    }
  };

  const dieTools = tools.filter((t) => t.tool_type === 1);
  const screenTools = tools.filter((t) => t.tool_type === 2);
  const isLastStep = currentStep === STEPS.length;

  // 只读摘要辅助显示
  const customerName =
    form.formData.customer_name ||
    customers.find((c) => c.id === form.formData.customer_id)?.customer_name ||
    '-';
  const substrateName =
    form.formData.substrate_material_name ||
    materials.find((m) => m.id === form.formData.substrate_material_id)?.material_name ||
    '-';
  const inkColor = inkColors.find((c) => c.id === form.formData.ink_color_id);
  const dieTool = dieTools.find((t) => t.id === form.formData.die_tool_id);
  const screenTool = screenTools.find((t) => t.id === form.formData.screen_plate_id);

  return (
    <MainLayout>
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sample/standard-card')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            {cardId ? '编辑工艺卡' : '新建工艺卡'}
            {tc('text_my3hv1')}
          </h1>
          {form.formData.sample_no && <Badge variant="outline">{form.formData.sample_no}</Badge>}
          {form.formData.status && STATUS_MAP[form.formData.status] && (
            <Badge variant={STATUS_MAP[form.formData.status].variant}>
              {STATUS_MAP[form.formData.status].label}
            </Badge>
          )}
        </div>
        {!isReadonly && (
          <Button variant="outline" onClick={handleSave} disabled={form.saving}>
            <Save className="h-4 w-4 mr-1" />
            {tc('text_agnaep')}
          </Button>
        )}
      </div>

      {/* 步骤进度条 */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        isCompleted
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : isCurrent
                            ? 'border-blue-600 text-blue-600 bg-white'
                            : 'border-gray-300 text-gray-400 bg-white'
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        isCurrent
                          ? 'text-blue-600'
                          : isCompleted
                            ? 'text-gray-700'
                            : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 mb-5 ${
                        currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 全量校验错误展示 */}
      {form.validationErrors.length > 0 && (
        <Card className="mb-4 border-red-300 bg-red-50">
          <CardContent className="py-3">
            <p className="font-semibold text-red-700 mb-1">{tc('text_12p8jd')}</p>
            <ul className="text-sm text-red-600 list-disc list-inside">
              {form.validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ============ 步骤 1：基础信息 ============ */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{tc('text_ho0d5q')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>
                {tc('text_cu4sef')}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.formData.sample_name || ''}
                onChange={(e) => form.updateField('sample_name', e.target.value)}
                disabled={isReadonly}
              />
              {stepErrors.sample_name && (
                <p className="text-xs text-red-500">{stepErrors.sample_name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>{tc('text_g4id')}</Label>
              <Select
                value={form.formData.customer_id ? String(form.formData.customer_id) : ''}
                onValueChange={handleCustomerChange}
                disabled={isReadonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{tc('text_a9yk8t')}</Label>
              <Input
                value={form.formData.product_name || ''}
                onChange={(e) => form.updateField('product_name', e.target.value)}
                disabled={isReadonly}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('text_bj5mqu')}</Label>
              <Select
                value={
                  form.formData.substrate_material_id
                    ? String(form.formData.substrate_material_id)
                    : ''
                }
                onValueChange={handleSubstrateChange}
                disabled={isReadonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择基材" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.material_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{tc('text_o06w')}</Label>
              <Input
                value={form.formData.spec || ''}
                onChange={(e) => form.updateField('spec', e.target.value)}
                disabled={isReadonly}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('text_avn2ot')}</Label>
              <Input
                value={form.formData.print_color || ''}
                onChange={(e) => form.updateField('print_color', e.target.value)}
                disabled={isReadonly}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('text_e3a6ms')}</Label>
              <Select
                value={form.formData.ink_color_id ? String(form.formData.ink_color_id) : ''}
                onValueChange={(v) => form.updateField('ink_color_id', Number(v))}
                disabled={isReadonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择色号" />
                </SelectTrigger>
                <SelectContent>
                  {inkColors.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.color_code} - {c.color_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{tc('text_asc8rl')}</Label>
              <Select
                value={form.formData.die_tool_id ? String(form.formData.die_tool_id) : ''}
                onValueChange={(v) => form.updateField('die_tool_id', Number(v))}
                disabled={isReadonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择刀模" />
                </SelectTrigger>
                <SelectContent>
                  {dieTools.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.tool_code} - {t.tool_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{tc('text_gjar4n')}</Label>
              <Select
                value={form.formData.screen_plate_id ? String(form.formData.screen_plate_id) : ''}
                onValueChange={(v) => form.updateField('screen_plate_id', Number(v))}
                disabled={isReadonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择网版" />
                </SelectTrigger>
                <SelectContent>
                  {screenTools.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.tool_code} - {t.tool_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{tc('text_cdb8n7')}</Label>
              <Input
                type="number"
                value={form.formData.material_loss_rate ?? 5}
                onChange={(e) => form.updateField('material_loss_rate', Number(e.target.value))}
                disabled={isReadonly}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('text_jkkmvx')}</Label>
              <Input
                type="number"
                value={form.formData.estimated_hour ?? ''}
                onChange={(e) =>
                  form.updateField(
                    'estimated_hour',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                disabled={isReadonly}
              />
            </div>
            <div className="space-y-1">
              <Label>{tc('text_h8m1f')}</Label>
              <Input value={form.formData.version_no || 'V1.0'} disabled />
            </div>
            <div className="col-span-3 space-y-1">
              <Label>{tc('text_fqo1')}</Label>
              <Textarea
                value={form.formData.remark || ''}
                onChange={(e) => form.updateField('remark', e.target.value)}
                rows={2}
                disabled={isReadonly}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ 步骤 2：物料明细 ============ */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tc('text_leggup')}</CardTitle>
              {!isReadonly && (
                <Button size="sm" variant="outline" onClick={form.addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  {tc('text_giq5j')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{tc('text_lnjk')}</TableHead>
                  <TableHead className="w-56">{tc('text_il1vtc')}</TableHead>
                  <TableHead>{tc('text_euzqpn')}</TableHead>
                  <TableHead>{tc('text_eusfkj')}</TableHead>
                  <TableHead className="w-20">{tc('text_evky')}</TableHead>
                  <TableHead className="w-20">{tc('text_ely0')}</TableHead>
                  <TableHead className="w-24">{tc('text_elvm')}</TableHead>
                  <TableHead className="w-24">{tc('text_kfxpk')}</TableHead>
                  {!isReadonly && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.formData.items.map((item, index) => {
                  const itemTypeErr =
                    stepErrors[`items.${index}.material_name`] ||
                    stepErrors[`items.${index}.material_code`];
                  const dosageErr = stepErrors[`items.${index}.unit_dosage`];
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={String(item.item_type || 1)}
                          onValueChange={(v) => form.updateItem(index, { item_type: Number(v) })}
                          disabled={isReadonly}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">{tc('text_dv3y')}</SelectItem>
                            <SelectItem value="2">{tc('text_iz9r')}</SelectItem>
                            <SelectItem value="3">{tc('text_oywk')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.material_id ? String(item.material_id) : ''}
                          onValueChange={(v) => handleMaterialSelect(index, v)}
                          disabled={isReadonly}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="选择物料" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.material_code} - {m.material_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={item.material_code || ''}
                          onChange={(e) =>
                            form.updateItem(index, { material_code: e.target.value })
                          }
                          disabled={isReadonly}
                        />
                        {itemTypeErr && <p className="text-xs text-red-500 mt-1">{itemTypeErr}</p>}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={item.material_name || ''}
                          onChange={(e) =>
                            form.updateItem(index, { material_name: e.target.value })
                          }
                          disabled={isReadonly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          value={item.unit_dosage || 0}
                          onChange={(e) =>
                            form.updateItem(index, { unit_dosage: Number(e.target.value) })
                          }
                          disabled={isReadonly}
                        />
                        {dosageErr && <p className="text-xs text-red-500 mt-1">{dosageErr}</p>}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={item.unit || ''}
                          onChange={(e) => form.updateItem(index, { unit: e.target.value })}
                          disabled={isReadonly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          value={item.unit_cost || 0}
                          onChange={(e) =>
                            form.updateItem(index, { unit_cost: Number(e.target.value) })
                          }
                          disabled={isReadonly}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        ¥{(item.line_cost || 0).toFixed(2)}
                      </TableCell>
                      {!isReadonly && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => form.removeItem(index)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ============ 步骤 3：工序路线 ============ */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tc('text_j9i84i')}</CardTitle>
              {!isReadonly && (
                <Button size="sm" variant="outline" onClick={form.addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  {tc('text_e7xtsf')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{tc('text_gjm0')}</TableHead>
                  <TableHead>{tc('text_c8ls99')}</TableHead>
                  <TableHead className="w-24">{tc('text_gj3l')}</TableHead>
                  <TableHead className="w-24">{tc('text_i2r8')}</TableHead>
                  <TableHead className="w-24">{tc('text_kfxpk')}</TableHead>
                  <TableHead>{tc('text_cdv0mb')}</TableHead>
                  {!isReadonly && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.formData.steps.map((step, index) => {
                  const nameErr = stepErrors[`steps.${index}.process_name`];
                  const hourErr = stepErrors[`steps.${index}.work_hour`];
                  return (
                    <TableRow key={index}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Select
                            value={step.process_id ? String(step.process_id) : ''}
                            onValueChange={(v) => handleProcessSelect(index, v)}
                            disabled={isReadonly}
                          >
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue placeholder="选择标准工序" />
                            </SelectTrigger>
                            <SelectContent>
                              {processSteps.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.step_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            className="h-8 flex-1"
                            value={step.process_name || ''}
                            onChange={(e) =>
                              form.updateStep(index, { process_name: e.target.value })
                            }
                            disabled={isReadonly}
                          />
                        </div>
                        {nameErr && <p className="text-xs text-red-500 mt-1">{nameErr}</p>}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          value={step.work_hour || 0}
                          onChange={(e) =>
                            form.updateStep(index, { work_hour: Number(e.target.value) })
                          }
                          disabled={isReadonly}
                        />
                        {hourErr && <p className="text-xs text-red-500 mt-1">{hourErr}</p>}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          value={step.hourly_rate || 0}
                          onChange={(e) =>
                            form.updateStep(index, { hourly_rate: Number(e.target.value) })
                          }
                          disabled={isReadonly}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        ¥{(step.line_cost || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={step.process_param || ''}
                          onChange={(e) =>
                            form.updateStep(index, { process_param: e.target.value })
                          }
                          disabled={isReadonly}
                        />
                      </TableCell>
                      {!isReadonly && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => form.removeStep(index)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ============ 步骤 4：成本确认与提交 ============ */}
      {currentStep === 4 && (
        <div className="space-y-4">
          {/* 成本汇总 */}
          <Card>
            <CardHeader>
              <CardTitle>{tc('text_cswhkg')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {tc('text_euupnw')}
                </span>
                <span className="font-mono">¥{form.cost.materialCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {tc('text_abp687')}
                </span>
                <span className="font-mono">¥{form.cost.laborCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  {tc('text_ceun4s')}
                </span>
                <span className="font-mono">¥{form.cost.toolCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                <span className="font-semibold flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {tc('text_eko0n')}
                </span>
                <span className="font-mono text-lg font-bold text-blue-600">
                  ¥{form.cost.totalCost.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 只读数据汇总 */}
          <Card>
            <CardHeader>
              <CardTitle>{tc('text_d7qqus')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 基础信息汇总 */}
              <div>
                <h4 className="font-medium mb-2 text-gray-700">{tc('text_blh1h0')}</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">{tc('text_s8ih1p')}</span>
                    {form.formData.sample_name || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_dxa79')}</span>
                    {customerName}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_ygcm2l')}</span>
                    {form.formData.product_name || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_2cbpmc')}</span>
                    {substrateName}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_kpkbm')}</span>
                    {form.formData.spec || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_hwnk4j')}</span>
                    {form.formData.print_color || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_an4s5i')}</span>
                    {inkColor ? `${inkColor.color_code} - ${inkColor.color_name}` : '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_kqzbqf')}</span>
                    {dieTool ? `${dieTool.tool_code} - ${dieTool.tool_name}` : '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_feidk3')}</span>
                    {screenTool ? `${screenTool.tool_code} - ${screenTool.tool_name}` : '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_d2jw23')}</span>
                    {form.formData.material_loss_rate ?? 0}%
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_wk7dwj')}</span>
                    {form.formData.estimated_hour ?? '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">{tc('text_eugdlz')}</span>
                    {form.formData.version_no || '-'}
                  </div>
                </div>
                {form.formData.remark && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">{tc('text_dld2x')}</span>
                    {form.formData.remark}
                  </div>
                )}
              </div>

              {/* 物料明细汇总 */}
              <div>
                <h4 className="font-medium mb-2 text-gray-700">
                  {tc('text_yei8g0')}
                  {form.formData.items.length}
                  {tc('text_izew')}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">{tc('text_gjm0')}</TableHead>
                      <TableHead className="w-16">{tc('text_lnjk')}</TableHead>
                      <TableHead>{tc('text_euzqpn')}</TableHead>
                      <TableHead>{tc('text_eusfkj')}</TableHead>
                      <TableHead className="w-20">{tc('text_evky')}</TableHead>
                      <TableHead className="w-16">{tc('text_ely0')}</TableHead>
                      <TableHead className="w-24">{tc('text_elvm')}</TableHead>
                      <TableHead className="w-24">{tc('text_kfxpk')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.formData.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          {item.item_type === 1 ? '主料' : item.item_type === 2 ? '油墨' : '辅料'}
                        </TableCell>
                        <TableCell>{item.material_code || '-'}</TableCell>
                        <TableCell>{item.material_name || '-'}</TableCell>
                        <TableCell className="font-mono">{item.unit_dosage ?? 0}</TableCell>
                        <TableCell>{item.unit || '-'}</TableCell>
                        <TableCell className="font-mono">
                          ¥{(item.unit_cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono">
                          ¥{(item.line_cost || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 工序路线汇总 */}
              <div>
                <h4 className="font-medium mb-2 text-gray-700">
                  {tc('text_ohqhn2')}
                  {form.formData.steps.length}
                  {tc('text_izew')}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">{tc('text_gjm0')}</TableHead>
                      <TableHead>{tc('text_c8ls99')}</TableHead>
                      <TableHead className="w-24">{tc('text_gj3l')}</TableHead>
                      <TableHead className="w-24">{tc('text_i2r8')}</TableHead>
                      <TableHead className="w-24">{tc('text_kfxpk')}</TableHead>
                      <TableHead>{tc('text_cdv0mb')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.formData.steps.map((step, i) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{step.process_name || '-'}</TableCell>
                        <TableCell className="font-mono">{step.work_hour ?? 0}</TableCell>
                        <TableCell className="font-mono">
                          ¥{(step.hourly_rate || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono">
                          ¥{(step.line_cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>{step.process_param || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 底部步骤导航 */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tc('text_btcrz')}
        </Button>
        <div className="flex gap-2">
          {!isReadonly && (
            <Button variant="outline" onClick={handleSave} disabled={form.saving}>
              <Save className="h-4 w-4 mr-1" />
              {tc('text_agnaep')}
            </Button>
          )}
          {!isLastStep ? (
            <Button onClick={handleNext}>
              {tc('text_btdio')}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            !isReadonly && (
              <Button onClick={handleSubmit} disabled={form.saving}>
                <Send className="h-4 w-4 mr-1" />
                {tc('text_heqc')}
              </Button>
            )
          )}
        </div>
      </div>
    </MainLayout>
  );
}
