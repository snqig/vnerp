'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import dynamic from 'next/dynamic';

const MainLayout = dynamic(
  () => import('@/components/layout').then((m) => ({ default: m.MainLayout })),
  { ssr: false }
);
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
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function NewCustomerPage() {
  const t = useTranslations('Orders');
  const tc = useTranslations('Common');

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_code: '',
    customer_name: '',
    short_name: '',
    customer_type: '1',
    industry: '',
    scale: '',
    credit_level: '',
    province: '',
    city: '',
    district: '',
    address: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    fax: '',
    website: '',
    business_license: '',
    tax_number: '',
    bank_name: '',
    bank_account: '',
    follow_up_status: '1',
    status: '1',
    remark: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_code || !formData.customer_name) {
      alert(t('fillCustomerCodeName'));
      return;
    }

    try {
      setLoading(true);
      const response = await authFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          customer_type: parseInt(formData.customer_type),
          follow_up_status: parseInt(formData.follow_up_status),
          status: parseInt(formData.status),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(tc('createSuccess'));
        router.push('/orders/customers');
      } else {
        alert(t('createCustomerFailed') + ': ' + result.message);
      }
    } catch {
      alert(t('createCustomerNetworkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title={t('newCustomer')}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => router.push('/orders/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tc('back')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? tc('loading') : tc('save')}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('basicInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_code">
                  {t('customerCode')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_code"
                  value={formData.customer_code}
                  onChange={(e) => handleChange('customer_code', e.target.value)}
                  placeholder={t('customerCodePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_name">
                  {t('customerName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  placeholder={t('customerNamePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_name">{t('shortName')}</Label>
                <Input
                  id="short_name"
                  value={formData.short_name}
                  onChange={(e) => handleChange('short_name', e.target.value)}
                  placeholder={t('shortNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_type">{t('customerType')}</Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value) => handleChange('customer_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCustomerType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('typeEnterprise')}</SelectItem>
                    <SelectItem value="2">{t('typeIndividual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">{t('industry')}</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder={t('industryPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scale">{t('scale')}</Label>
                <Input
                  id="scale"
                  value={formData.scale}
                  onChange={(e) => handleChange('scale', e.target.value)}
                  placeholder={t('scalePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_level">{t('creditLevel')}</Label>
                <Input
                  id="credit_level"
                  value={formData.credit_level}
                  onChange={(e) => handleChange('credit_level', e.target.value)}
                  placeholder={t('creditLevelPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="follow_up_status">{t('followUpStatus')}</Label>
                <Select
                  value={formData.follow_up_status}
                  onValueChange={(value) => handleChange('follow_up_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectFollowUpStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('statusPotential')}</SelectItem>
                    <SelectItem value="2">{t('statusIntention')}</SelectItem>
                    <SelectItem value="3">{t('statusCompleted')}</SelectItem>
                    <SelectItem value="4">{t('statusLost')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{tc('status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('enabled')}</SelectItem>
                    <SelectItem value="0">{tc('disabled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">{t('contactPerson')}</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder={t('contactPersonPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">{t('contactPhone')}</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder={t('contactPhonePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">{t('email')}</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder={t('emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">{t('fax')}</Label>
                <Input
                  id="fax"
                  value={formData.fax}
                  onChange={(e) => handleChange('fax', e.target.value)}
                  placeholder={t('faxPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">{t('website')}</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder={t('websitePlaceholder')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('addressInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">{t('province')}</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleChange('province', e.target.value)}
                  placeholder={t('provincePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t('city')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder={t('cityPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">{t('district')}</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  placeholder={t('districtPlaceholder')}
                />
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor="address">{t('detailAddress')}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder={t('detailAddressPlaceholder')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('financeInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_license">{t('businessLicense')}</Label>
                <Input
                  id="business_license"
                  value={formData.business_license}
                  onChange={(e) => handleChange('business_license', e.target.value)}
                  placeholder={t('businessLicensePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_number">{t('taxNumber')}</Label>
                <Input
                  id="tax_number"
                  value={formData.tax_number}
                  onChange={(e) => handleChange('tax_number', e.target.value)}
                  placeholder={t('taxNumberPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">{t('bankName')}</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder={t('bankNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account">{t('bankAccount')}</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => handleChange('bank_account', e.target.value)}
                  placeholder={t('bankAccountPlaceholder')}
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
                className="w-full min-h-[100px] p-3 border rounded-md resize-y"
                value={formData.remark}
                onChange={(e) => handleChange('remark', e.target.value)}
                placeholder={t('remarkPlaceholder')}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/orders/customers')}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? tc('loading') : tc('save')}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
