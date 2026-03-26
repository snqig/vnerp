'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, ArrowLeft, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

export default function NewSampleOrderPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    order_month: new Date().getMonth() + 1,
    order_date: new Date().toISOString().split('T')[0],
    sample_type: '',
    customer_name: '',
    print_method: '卷料丝印',
    color_sequence: '',
    product_name: '',
    material_code: '',
    size_spec: '',
    material_desc: '',
    sample_order_no: '',
    required_date: '',
    progress_status: '',
    is_confirmed: false,
    is_urgent: false,
    is_produce_together: false,
    quantity: '',
    progress_detail: '',
    sample_count: 1,
    sample_reason: '',
    order_tracker: '',
    provided_material: '电子档',
    receive_time: '',
    mylar_info: '',
    sample_stock: '',
    customer_confirm: '',
    remark: '',
    status: 0,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.customer_name) {
      toast.error('请输入客户名称');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/sample/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: formData.quantity ? parseInt(formData.quantity) : 0,
          sample_count: formData.sample_count || 1,
          is_confirmed: formData.is_confirmed ? 1 : 0,
          is_urgent: formData.is_urgent ? 1 : 0,
          is_produce_together: formData.is_produce_together ? 1 : 0,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('打样单创建成功');
        router.push('/sample/orders');
      } else {
        toast.error(result.message || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/sample/orders')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-blue-500" />
                新增打样单
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                创建新的产品打样单
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>月份</Label>
                  <Input
                    type="number"
                    value={formData.order_month}
                    onChange={(e) => handleChange('order_month', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>下单日期</Label>
                  <Input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => handleChange('order_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>客户名称 *</Label>
                <Input
                  placeholder="请输入客户名称"
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>种类</Label>
                <Select value={formData.sample_type} onValueChange={(v) => handleChange('sample_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择种类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="设变">设变</SelectItem>
                    <SelectItem value="测试">测试</SelectItem>
                    <SelectItem value="新款">新款</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>打样单编号</Label>
                <Input
                  placeholder="如: DY-A047-05914"
                  value={formData.sample_order_no}
                  onChange={(e) => handleChange('sample_order_no', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>跟单人员</Label>
                <Input
                  placeholder="请输入跟单人员"
                  value={formData.order_tracker}
                  onChange={(e) => handleChange('order_tracker', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 产品信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">产品信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>品名</Label>
                <Input
                  placeholder="请输入品名"
                  value={formData.product_name}
                  onChange={(e) => handleChange('product_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>料号</Label>
                <Input
                  placeholder="请输入料号"
                  value={formData.material_code}
                  onChange={(e) => handleChange('material_code', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>尺寸</Label>
                <Input
                  placeholder="如: 296.3*96.8"
                  value={formData.size_spec}
                  onChange={(e) => handleChange('size_spec', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>材料描述</Label>
                <Textarea
                  placeholder="请输入材料描述"
                  value={formData.material_desc}
                  onChange={(e) => handleChange('material_desc', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 印刷信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">印刷信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>印刷方式</Label>
                <Select value={formData.print_method} onValueChange={(v) => handleChange('print_method', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="卷料丝印">卷料丝印</SelectItem>
                    <SelectItem value="轮转印">轮转印</SelectItem>
                    <SelectItem value="空白">空白</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>色序</Label>
                <Input
                  placeholder="如: 4色"
                  value={formData.color_sequence}
                  onChange={(e) => handleChange('color_sequence', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>数量</Label>
                <Input
                  type="number"
                  placeholder="请输入数量"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>需求日期</Label>
                <Input
                  type="date"
                  value={formData.required_date}
                  onChange={(e) => handleChange('required_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 打样信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">打样信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>进展详情</Label>
                <Select value={formData.progress_detail} onValueChange={(v) => handleChange('progress_detail', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择进展" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="产线拿">产线拿</SelectItem>
                    <SelectItem value="等材料">等材料</SelectItem>
                    <SelectItem value="冲压">冲压</SelectItem>
                    <SelectItem value="印刷">印刷</SelectItem>
                    <SelectItem value="切割">切割</SelectItem>
                    <SelectItem value="UV">UV</SelectItem>
                    <SelectItem value="嗮版">嗮版</SelectItem>
                    <SelectItem value="出片">出片</SelectItem>
                    <SelectItem value="检样">检样</SelectItem>
                    <SelectItem value="做卡">做卡</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>打样次数</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.sample_count}
                  onChange={(e) => handleChange('sample_count', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>打样原因</Label>
                <Input
                  placeholder="如: 变更内容及版本"
                  value={formData.sample_reason}
                  onChange={(e) => handleChange('sample_reason', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>提供资料</Label>
                <Select value={formData.provided_material} onValueChange={(v) => handleChange('provided_material', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="电子档">电子档</SelectItem>
                    <SelectItem value="打样单">打样单</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>接单时间</Label>
                <Input
                  type="time"
                  value={formData.receive_time}
                  onChange={(e) => handleChange('receive_time', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 其他信息 */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-base">其他信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>麦拉信息</Label>
                  <Input
                    placeholder="如: 内贴*2"
                    value={formData.mylar_info}
                    onChange={(e) => handleChange('mylar_info', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>样品库存</Label>
                  <Input
                    value={formData.sample_stock}
                    onChange={(e) => handleChange('sample_stock', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>客户确认</Label>
                  <Input
                    value={formData.customer_confirm}
                    onChange={(e) => handleChange('customer_confirm', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-6 mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_confirmed"
                    checked={formData.is_confirmed}
                    onCheckedChange={(checked) => handleChange('is_confirmed', checked)}
                  />
                  <Label htmlFor="is_confirmed">是否确认</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_urgent"
                    checked={formData.is_urgent}
                    onCheckedChange={(checked) => handleChange('is_urgent', checked)}
                  />
                  <Label htmlFor="is_urgent" className="text-red-600">是否急件</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_produce_together"
                    checked={formData.is_produce_together}
                    onCheckedChange={(checked) => handleChange('is_produce_together', checked)}
                  />
                  <Label htmlFor="is_produce_together">同时生产</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  placeholder="请输入备注信息"
                  value={formData.remark}
                  onChange={(e) => handleChange('remark', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
