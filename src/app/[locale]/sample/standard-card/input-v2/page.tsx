'use client';

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
  DollarSign,
  Clock,
  Wrench,
  Package,
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

export default function SampleCardInputV2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardId = searchParams.get('id') ? Number(searchParams.get('id')) : undefined;
  const form = useSampleProcessForm(cardId);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inkColors, setInkColors] = useState<InkColor[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [materialSearch, setMaterialSearch] = useState<Record<number, string>>({});

  // 加载参考数据
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

  // 物料搜索
  const handleMaterialSearch = useCallback((index: number, keyword: string) => {
    setMaterialSearch((prev) => ({ ...prev, [index]: keyword }));
  }, []);

  const handleMaterialSelect = useCallback(
    (index: number, material: Material) => {
      form.updateItem(index, {
        material_id: material.id,
        material_code: material.material_code,
        material_name: material.material_name,
        specification: material.specification || '',
        unit: material.unit || '',
        unit_cost: material.cost_price || 0,
      });
      setMaterialSearch((prev) => ({ ...prev, [index]: '' }));
    },
    [form]
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

  // 保存
  const handleSave = async () => {
    const id = await form.saveDraft();
    if (id && !cardId) {
      router.push(`/sample/standard-card/input-v2?id=${id}`);
    }
  };

  // 提交
  const handleSubmit = async () => {
    const result = await form.submit();
    if (result.success) {
      router.push('/sample/standard-card');
    }
  };

  const dieTools = tools.filter((t) => t.tool_type === 1);
  const screenTools = tools.filter((t) => t.tool_type === 2);
  const filteredMaterials = (keyword: string) =>
    !keyword
      ? materials.slice(0, 10)
      : materials
          .filter(
            (m) =>
              m.material_code.toLowerCase().includes(keyword.toLowerCase()) ||
              m.material_name.toLowerCase().includes(keyword.toLowerCase())
          )
          .slice(0, 10);

  const isReadonly = !!(form.formData.status && form.formData.status > 1);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sample/standard-card')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            {cardId ? '编辑工艺卡' : '新建工艺卡'}
            {tc('text_moww1l')}
          </h1>
          {form.formData.sample_no && <Badge variant="outline">{form.formData.sample_no}</Badge>}
          {form.formData.status && STATUS_MAP[form.formData.status] && (
            <Badge variant={STATUS_MAP[form.formData.status].variant}>
              {STATUS_MAP[form.formData.status].label}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!isReadonly && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={form.saving}>
                <Save className="h-4 w-4 mr-1" />
                {tc('text_agnaep')}
              </Button>
              <Button onClick={handleSubmit} disabled={form.saving}>
                <Send className="h-4 w-4 mr-1" />
                {tc('text_heqc')}
              </Button>
            </>
          )}
        </div>
      </div>

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

      <div className="flex gap-4">
        {/* 左侧表单区 */}
        <div className="flex-1 space-y-4">
          {/* 基础信息 */}
          <Card>
            <CardHeader>
              <CardTitle>{tc('text_blh1h0')}</CardTitle>
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
            </CardContent>
          </Card>

          {/* 物料明细 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tc('text_euvirs')}</CardTitle>
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
                  {form.formData.items.map((item, index) => (
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
                        <div className="relative">
                          <Input
                            className="h-8"
                            placeholder="搜索物料..."
                            value={materialSearch[index] ?? item.material_code}
                            onChange={(e) => {
                              handleMaterialSearch(index, e.target.value);
                              form.updateItem(index, { material_code: e.target.value });
                            }}
                            disabled={isReadonly}
                          />
                          {materialSearch[index] &&
                            filteredMaterials(materialSearch[index]).length > 0 && (
                              <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-48 overflow-auto">
                                {filteredMaterials(materialSearch[index]).map((m) => (
                                  <button
                                    key={m.id}
                                    className="w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
                                    onClick={() => handleMaterialSelect(index, m)}
                                  >
                                    {m.material_code} - {m.material_name} (¥{m.cost_price}/{m.unit})
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 工序路线 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tc('text_c8vnne')}</CardTitle>
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
                  {form.formData.steps.map((step, index) => (
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 备注 */}
          <Card>
            <CardHeader>
              <CardTitle>{tc('text_fqo1')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.formData.remark || ''}
                onChange={(e) => form.updateField('remark', e.target.value)}
                rows={3}
                disabled={isReadonly}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右侧实时成本栏 */}
        <div className="w-72 shrink-0">
          <div className="sticky top-4 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tc('text_bzeu5w')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {tc('text_euupnw')}
                  </span>
                  <span className="font-mono">¥{form.cost.materialCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {tc('text_abp687')}
                  </span>
                  <span className="font-mono">¥{form.cost.laborCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Wrench className="h-4 w-4" />
                    {tc('text_ceun4s')}
                  </span>
                  <span className="font-mono">¥{form.cost.toolCost.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1">
                      <DollarSign className="h-5 w-5" />
                      {tc('text_eko0n')}
                    </span>
                    <span className="font-mono text-xl font-bold text-blue-600">
                      ¥{form.cost.totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
