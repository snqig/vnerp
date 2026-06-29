'use client';

import { useState } from 'react';
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
import { ArrowLeft, Save, Car } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

  // 翻译钩子
  const t = useTranslations('Delivery');
  const tc = useTranslations('Common');

  const router = useRouter();
  const [formData, setFormData] = useState<VehicleForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicle_no) {
      toast.error(t('inputPlateNo'));
      return;
    }

    try {
      setSaving(true);
      const response = await authFetch('/api/delivery/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(t('createSuccess'));
        router.push('/delivery/vehicles');
      } else {
        toast.error(result.message || t('createFailed'));
      }
    } catch (error) {
      toast.error(t('createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof VehicleForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Car className="h-6 w-6" />
                {t('addVehicle')}
              </h1>
              <p className="text-sm text-muted-foreground">{t('newVehicleDesc')}</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('saving') : tc('save')}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_no">
                  {t('plateNo')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={(e) => updateField('vehicle_no', e.target.value)}
                  placeholder={t('plateNoPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('vehicleType')}</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(v) => updateField('vehicle_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="truck">{t('truck')}</SelectItem>
                    <SelectItem value="van">{t('van')}</SelectItem>
                    <SelectItem value="sedan">{t('sedan')}</SelectItem>
                    <SelectItem value="pickup">{t('pickup')}</SelectItem>
                    <SelectItem value="other">{t('otherType')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('status')}</Label>
                <Select
                  value={formData.status.toString()}
                  onValueChange={(v) => updateField('status', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('enabled')}</SelectItem>
                    <SelectItem value="2">{t('underRepair')}</SelectItem>
                    <SelectItem value="0">{tc('disabled')}</SelectItem>
                    <SelectItem value="3">{t('scrapped')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('brand')}</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => updateField('brand', e.target.value)}
                  placeholder={t('brandPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('vehicleModel')}</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => updateField('model', e.target.value)}
                  placeholder={t('modelPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('color')}</Label>
                <Input
                  value={formData.color}
                  onChange={(e) => updateField('color', e.target.value)}
                  placeholder={t('colorPlaceholder')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('techParams')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('engineNo')}</Label>
                <Input
                  value={formData.engine_no}
                  onChange={(e) => updateField('engine_no', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('frameNo')}</Label>
                <Input
                  value={formData.frame_no}
                  onChange={(e) => updateField('frame_no', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('buyDate')}</Label>
                <Input
                  type="date"
                  value={formData.buy_date}
                  onChange={(e) => updateField('buy_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('currentMileage')}</Label>
                <Input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => updateField('mileage', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fuelType')}</Label>
                <Select
                  value={formData.fuel_type}
                  onValueChange={(v) => updateField('fuel_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectFuelType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasoline">{t('gasoline')}</SelectItem>
                    <SelectItem value="diesel">{t('diesel')}</SelectItem>
                    <SelectItem value="electric">{t('electric')}</SelectItem>
                    <SelectItem value="hybrid">{t('hybrid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('capacityLabel')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.capacity}
                  onChange={(e) => updateField('capacity', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('driverInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('defaultDriver')}</Label>
                <Input
                  value={formData.driver_name}
                  onChange={(e) => updateField('driver_name', e.target.value)}
                  placeholder={t('driverName')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('driverPhone')}</Label>
                <Input
                  value={formData.driver_phone}
                  onChange={(e) => updateField('driver_phone', e.target.value)}
                  placeholder={t('contactPhone')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('insuranceAndInspect')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('insuranceExpireDate')}</Label>
                <Input
                  type="date"
                  value={formData.insurance_expire}
                  onChange={(e) => updateField('insurance_expire', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('annualInspectExpireDate')}</Label>
                <Input
                  type="date"
                  value={formData.annual_inspect_expire}
                  onChange={(e) => updateField('annual_inspect_expire', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tc('remark')}</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md"
                value={formData.remark}
                onChange={(e) => updateField('remark', e.target.value)}
                placeholder={t('remarkPlaceholder')}
              />
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
