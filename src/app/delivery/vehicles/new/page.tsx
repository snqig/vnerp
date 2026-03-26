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
import { ArrowLeft, Save, Car } from 'lucide-react';
import { toast } from 'sonner';

interface VehicleForm {
  vehicle_no: string;
  vehicle_type: string;
  brand: string;
  model: string;
  color: string;
  engine_no: string;
  frame_no: string;
  buy_date: string;
  mileage: number;
  fuel_type: string;
  capacity: number;
  status: number;
  driver_name: string;
  driver_phone: string;
  insurance_expire: string;
  annual_inspect_expire: string;
  remark: string;
}

const initialForm: VehicleForm = {
  vehicle_no: '',
  vehicle_type: '',
  brand: '',
  model: '',
  color: '',
  engine_no: '',
  frame_no: '',
  buy_date: '',
  mileage: 0,
  fuel_type: '',
  capacity: 0,
  status: 1,
  driver_name: '',
  driver_phone: '',
  insurance_expire: '',
  annual_inspect_expire: '',
  remark: '',
};

export default function NewVehiclePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<VehicleForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_no) {
      toast.error('请输入车牌号');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/delivery/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('车辆创建成功');
        router.push('/delivery/vehicles');
      } else {
        toast.error(result.message || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof VehicleForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-4xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Car className="h-6 w-6" />
                新增车辆
              </h1>
              <p className="text-sm text-muted-foreground">录入新车辆信息</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_no">车牌号 <span className="text-red-500">*</span></Label>
                <Input
                  id="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={(e) => updateField('vehicle_no', e.target.value)}
                  placeholder="如：粤A12345"
                />
              </div>
              <div className="space-y-2">
                <Label>车辆类型</Label>
                <Select value={formData.vehicle_type} onValueChange={(v) => updateField('vehicle_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="货车">货车</SelectItem>
                    <SelectItem value="面包车">面包车</SelectItem>
                    <SelectItem value="轿车">轿车</SelectItem>
                    <SelectItem value="皮卡">皮卡</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status.toString()} onValueChange={(v) => updateField('status', parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">可用</SelectItem>
                    <SelectItem value="2">维修中</SelectItem>
                    <SelectItem value="0">停用</SelectItem>
                    <SelectItem value="3">报废</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>品牌</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => updateField('brand', e.target.value)}
                  placeholder="如：东风"
                />
              </div>
              <div className="space-y-2">
                <Label>型号</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => updateField('model', e.target.value)}
                  placeholder="如：多利卡"
                />
              </div>
              <div className="space-y-2">
                <Label>颜色</Label>
                <Input
                  value={formData.color}
                  onChange={(e) => updateField('color', e.target.value)}
                  placeholder="如：白色"
                />
              </div>
            </CardContent>
          </Card>

          {/* 技术参数 */}
          <Card>
            <CardHeader>
              <CardTitle>技术参数</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>发动机号</Label>
                <Input
                  value={formData.engine_no}
                  onChange={(e) => updateField('engine_no', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>车架号</Label>
                <Input
                  value={formData.frame_no}
                  onChange={(e) => updateField('frame_no', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>购买日期</Label>
                <Input
                  type="date"
                  value={formData.buy_date}
                  onChange={(e) => updateField('buy_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>当前里程 (km)</Label>
                <Input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => updateField('mileage', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>燃油类型</Label>
                <Select value={formData.fuel_type} onValueChange={(v) => updateField('fuel_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择燃油类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="汽油">汽油</SelectItem>
                    <SelectItem value="柴油">柴油</SelectItem>
                    <SelectItem value="电动">电动</SelectItem>
                    <SelectItem value="混合动力">混合动力</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>载重/载客量 (吨/人)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.capacity}
                  onChange={(e) => updateField('capacity', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 司机信息 */}
          <Card>
            <CardHeader>
              <CardTitle>司机信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>默认司机</Label>
                <Input
                  value={formData.driver_name}
                  onChange={(e) => updateField('driver_name', e.target.value)}
                  placeholder="司机姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>司机电话</Label>
                <Input
                  value={formData.driver_phone}
                  onChange={(e) => updateField('driver_phone', e.target.value)}
                  placeholder="联系电话"
                />
              </div>
            </CardContent>
          </Card>

          {/* 保险与年检 */}
          <Card>
            <CardHeader>
              <CardTitle>保险与年检</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>保险到期日</Label>
                <Input
                  type="date"
                  value={formData.insurance_expire}
                  onChange={(e) => updateField('insurance_expire', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>年检到期日</Label>
                <Input
                  type="date"
                  value={formData.annual_inspect_expire}
                  onChange={(e) => updateField('annual_inspect_expire', e.target.value)}
                />
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
                onChange={(e) => updateField('remark', e.target.value)}
                placeholder="其他备注信息..."
              />
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
