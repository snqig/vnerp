'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, ArrowLeft, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

export default function NewSampleOrderPage() {
  const ts = useTranslations('Common');
  const t = useTranslations('SampleOrders');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    notify_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    product_name: '',
    material_no: '',
    version: 'A',
    size_spec: '',
    material_spec: '',
    specification: '',
    quantity: '',
    order_date: new Date().toISOString().split('T')[0],
    customer_require_date: '',
    delivery_date: '',
    remark: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.customer_name) {
      toast({ title: tc('customer') + tc('required') || ts('k_fu88no'), variant: 'destructive' });
      return;
    }
    if (!formData.notify_date) {
      toast({ title: t('notifyDate') + ts('k_166c1v5') || ts('k_1n6ctm5'), variant: 'destructive' });
      return;
    }

    try {
      setIsSaving(true);
      const response = await authFetch('/api/sample/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          quantity: formData.quantity ? parseInt(formData.quantity) : 0,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: t('orderCreated', { orderNo: result.data.order_no }) });
        router.push('/sample/orders');
      } else {
        toast({ title: result.message || tc('createFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('createFailed'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/sample/orders')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-blue-500" />
                {t('createSampleOrder')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t('fillSampleOrderInfo')}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? tc('saving') || ts('k_rr6ulf') : tc('save')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('basicInfo') || ts('k_z5lkkb')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  {t('notifyDate')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.notify_date}
                  onChange={(e) => handleChange('notify_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {tc('customer')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder={tc('customer')}
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('productName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder={t('productName')}
                  value={formData.product_name}
                  onChange={(e) => handleChange('product_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('materialNo')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder={t('materialNo')}
                  value={formData.material_no}
                  onChange={(e) => handleChange('material_no', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tc('version')}</Label>
                  <Input
                    placeholder={tc('version')}
                    value={formData.version}
                    onChange={(e) => handleChange('version', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tc('quantity')}</Label>
                  <Input
                    type="number"
                    placeholder={tc('quantity')}
                    value={formData.quantity}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('specInfo') || ts('k_8wqf4x')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('sizeSpec')}</Label>
                <Input
                  placeholder={t('sizeSpec')}
                  value={formData.size_spec}
                  onChange={(e) => handleChange('size_spec', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('materialSpec')}</Label>
                <Input
                  placeholder={t('materialSpec')}
                  value={formData.material_spec}
                  onChange={(e) => handleChange('material_spec', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('specification') || ts('k_17faar3')}</Label>
                <Input
                  placeholder={t('specification') || ts('k_17faar3')}
                  value={formData.specification}
                  onChange={(e) => handleChange('specification', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('dateInfo') || ts('k_1tb31ld')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('orderDate') || ts('k_u2zaog')}</Label>
                <Input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => handleChange('order_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('requireDate')}</Label>
                <Input
                  type="date"
                  value={formData.customer_require_date}
                  onChange={(e) => handleChange('customer_require_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('deliveryDate') || ts('k_lf2t09')}</Label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => handleChange('delivery_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tc('remark') || ts('k_b5m1l6')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={tc('remark')}
                value={formData.remark}
                onChange={(e) => handleChange('remark', e.target.value)}
                rows={6}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
