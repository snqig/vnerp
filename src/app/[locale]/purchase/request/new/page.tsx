'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
}

interface RequestItem {
  id: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  material_unit: string;
  quantity: number;
  price: number;
  amount: number;
  remark: string;
}

interface RequestForm {
  request_date: string;
  request_type: string;
  request_dept: string;
  requester_name: string;
  priority: number;
  expected_date: string;
  supplier_name: string;
  remark: string;
  items: RequestItem[];
}

const initialItem: RequestItem = {
  id: 1,
  material_code: '',
  material_name: '',
  material_spec: '',
  material_unit: '',
  quantity: 0,
  price: 0,
  amount: 0,
  remark: '',
};

const initialForm: RequestForm = {
  request_date: new Date().toISOString().split('T')[0],
  request_type: '',
  request_dept: '',
  requester_name: '',
  priority: 1,
  expected_date: '',
  supplier_name: '',
  remark: '',
  items: [{ ...initialItem }],
};

export default function NewPurchaseRequestPage() {
  const ts = useTranslations('Purchase');
  // 翻译钩子
  const tc = useTranslations('Common');

  const router = useRouter();
  const [formData, setFormData] = useState<RequestForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    authFetch('/api/organization/department')
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setDepartments(result.data);
        }
      })
      .catch(() => {});
  }, []);

  const calculateAmount = (quantity: number, price: number) => {
    return quantity * price;
  };

  const updateItem = (index: number, field: keyof RequestItem, value: Loose) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // 自动计算金额
      if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? value : newItems[index].quantity;
        const prc = field === 'price' ? value : newItems[index].price;
        newItems[index].amount = calculateAmount(qty, prc);
      }

      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialItem, id: prev.items.length + 1 }],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error(ts('k_fhvukz'));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.requester_name) {
      toast.error(ts('k_dhtvr2'));
      return;
    }

    if (formData.items.some((item) => !item.material_name || item.quantity <= 0)) {
      toast.error(ts('k_152m4pa'));
      return;
    }

    try {
      setSaving(true);
      const response = await authFetch('/api/purchase/request', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          items: formData.items.map((item, index) => ({
            ...item,
            line_no: index + 1,
          })),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(ts('k_r3xg5z'));
        router.push('/purchase/request');
      } else {
        toast.error(result.message || ts('k_1jxltyq'));
      }
    } catch {
      toast.error(ts('k_1jxltyq'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-6xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                {ts('k_u7zqlx')}</h1>
              <p className="text-sm text-muted-foreground">{tc('newRequestDesc')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSubmit} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {ts('k_gtqgss')}</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? ts('k_rr6ulf') : ts('k_1i76dc3')}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>{ts('k_z5lkkb')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>
                  {ts('k_1i2qe7n')}<span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, request_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{ts('k_1subwph')}</Label>
                <Select
                  value={formData.request_type}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, request_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_wjmlj1')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={tc('rawMaterial')}>{tc('rawMaterial')}</SelectItem>
                    <SelectItem value={ts('k_14rp9uj')}>{ts('k_14rp9uj')}</SelectItem>
                    <SelectItem value={ts('k_1kb4ymq')}>{tc('equipment')}</SelectItem>
                    <SelectItem value={ts('k_w9s2pw')}>{ts('k_w9s2pw')}</SelectItem>
                    <SelectItem value={ts('k_dcd4ul')}>{ts('k_dcd4ul')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ts('k_1x9z28n')}</Label>
                <Select
                  value={formData.request_dept}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, request_dept: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_18m3h1b')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.dept_name}>
                        {dept.dept_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {ts('k_3fdyof')}<span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.requester_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, requester_name: e.target.value }))
                  }
                  placeholder={ts('k_m06xy3')}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('priority')}</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, priority: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_1k8e3tk')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{ts('k_1kffmxd')}</SelectItem>
                    <SelectItem value="1">{ts('k_b7cu2g')}</SelectItem>
                    <SelectItem value="2">{ts('k_pk6gtj')}</SelectItem>
                    <SelectItem value="3">{ts('k_9tbknt')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('expectedArrivalDate')}</Label>
                <Input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, expected_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{ts('k_yrjgkw')}</Label>
                <Input
                  value={formData.supplier_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, supplier_name: e.target.value }))
                  }
                  placeholder={ts('k_15o1hhd')}
                />
              </div>
            </CardContent>
          </Card>

          {/* 采购物料明细 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{ts('k_1fk0uv7')}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                {ts('k_1l3uqwk')}</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg bg-gray-50 dark:bg-slate-800 dark:border-slate-700"
                  >
                    <div className="col-span-1">
                      <Label className="text-xs">{ts('k_11vy4t0')}</Label>
                      <div className="text-sm font-medium py-2 text-gray-900 dark:text-white">
                        {index + 1}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">{tc('materialCode')}</Label>
                      <Input
                        value={item.material_code}
                        onChange={(e) => updateItem(index, 'material_code', e.target.value)}
                        placeholder={tc('code')}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">
                        {tc('materialName')}<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={item.material_name}
                        onChange={(e) => updateItem(index, 'material_name', e.target.value)}
                        placeholder={tc('name')}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">{ts('k_17faar3')}</Label>
                      <Input
                        value={item.material_spec}
                        onChange={(e) => updateItem(index, 'material_spec', e.target.value)}
                        placeholder={tc('specification')}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">{tc('unit')}</Label>
                      <Input
                        value={item.material_unit}
                        onChange={(e) => updateItem(index, 'material_unit', e.target.value)}
                        placeholder={tc('unit')}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">
                        {ts('k_1i54xuo')}<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">{ts('k_isc1c5')}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={item.price || ''}
                        onChange={(e) =>
                          updateItem(index, 'price', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">{tc('amount')}</Label>
                      <div className="text-sm font-medium py-2 text-gray-900 dark:text-white">
                        {item.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 合计 */}
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {ts('k_71hi4y')}<span className="text-blue-600 dark:text-blue-400">
                    ¥{getTotalAmount().toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 备注 */}
          <Card>
            <CardHeader>
              <CardTitle>{tc('remark')}</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md bg-card text-foreground"
                value={formData.remark}
                onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder={ts('k_14vkwz4')}
              />
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
