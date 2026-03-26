'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [formData, setFormData] = useState<RequestForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const calculateAmount = (quantity: number, price: number) => {
    return quantity * price;
  };

  const updateItem = (index: number, field: keyof RequestItem, value: any) => {
    setFormData(prev => {
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
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...initialItem, id: prev.items.length + 1 }],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error('至少需要保留一条明细');
      return;
    }
    setFormData(prev => ({
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
      toast.error('请输入申请人');
      return;
    }

    if (formData.items.some(item => !item.material_name || item.quantity <= 0)) {
      toast.error('请完善物料信息，物料名称和数量不能为空');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/purchase/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        toast.success('采购申请创建成功');
        router.push('/purchase/request');
      } else {
        toast.error(result.message || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
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
                新增采购申请
              </h1>
              <p className="text-sm text-muted-foreground">创建新的采购申请单</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSubmit} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              保存草稿
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '提交申请'}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>申请日期 <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, request_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>申请类型</Label>
                <Select value={formData.request_type} onValueChange={(v) => setFormData(prev => ({ ...prev, request_type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="原材料">原材料</SelectItem>
                    <SelectItem value="辅料">辅料</SelectItem>
                    <SelectItem value="设备">设备</SelectItem>
                    <SelectItem value="办公用品">办公用品</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>申请部门</Label>
                <Input
                  value={formData.request_dept}
                  onChange={(e) => setFormData(prev => ({ ...prev, request_dept: e.target.value }))}
                  placeholder="如：生产部"
                />
              </div>
              <div className="space-y-2">
                <Label>申请人 <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.requester_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, requester_name: e.target.value }))}
                  placeholder="申请人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select value={formData.priority.toString()} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: parseInt(v) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">低</SelectItem>
                    <SelectItem value="1">中</SelectItem>
                    <SelectItem value="2">高</SelectItem>
                    <SelectItem value="3">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>期望到货日期</Label>
                <Input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>建议供应商</Label>
                <Input
                  value={formData.supplier_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                  placeholder="供应商名称"
                />
              </div>
            </CardContent>
          </Card>

          {/* 采购物料明细 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>采购物料明细</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                添加物料
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg bg-gray-50">
                    <div className="col-span-1">
                      <Label className="text-xs">行号</Label>
                      <div className="text-sm font-medium py-2">{index + 1}</div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">物料编码</Label>
                      <Input
                        value={item.material_code}
                        onChange={(e) => updateItem(index, 'material_code', e.target.value)}
                        placeholder="编码"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">物料名称 <span className="text-red-500">*</span></Label>
                      <Input
                        value={item.material_name}
                        onChange={(e) => updateItem(index, 'material_name', e.target.value)}
                        placeholder="名称"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">规格型号</Label>
                      <Input
                        value={item.material_spec}
                        onChange={(e) => updateItem(index, 'material_spec', e.target.value)}
                        placeholder="规格"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">单位</Label>
                      <Input
                        value={item.material_unit}
                        onChange={(e) => updateItem(index, 'material_unit', e.target.value)}
                        placeholder="单位"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">数量 <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">单价</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={item.price || ''}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">金额</Label>
                      <div className="text-sm font-medium py-2">{item.amount.toFixed(2)}</div>
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
                <div className="text-lg font-bold">
                  合计金额：<span className="text-blue-600">¥{getTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 备注 */}
          <Card>
            <CardHeader>
              <CardTitle>备注</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md"
                value={formData.remark}
                onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                placeholder="其他备注信息..."
              />
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
