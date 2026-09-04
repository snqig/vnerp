'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
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
import { useTranslations } from 'next-intl';

interface SampleOrder {
  id: number;
  sample_no: string;
  order_month: number;
  order_date: string;
  sample_type: string;
  customer_name: string;
  print_method: string;
  color_sequence: string;
  product_name: string;
  material_code: string;
  size_spec: string;
  material_desc: string;
  sample_order_no: string;
  required_date: string;
  progress_status: string;
  is_confirmed: number;
  is_urgent: number;
  is_produce_together: number;
  quantity: number;
  progress_detail: string;
  sample_count: number;
  sample_reason: string;
  order_tracker: string;
  provided_material: string;
  receive_time: string;
  mylar_info: string;
  sample_stock: string;
  customer_confirm: string;
  remark: string;
  status: number;
}

export default function EditSampleOrderPage() {
  // 翻译钩子
  const tc = useTranslations('Common');
  const ts = useTranslations('SampleManagement');

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    order_month: 1,
    order_date: '',
    sample_type: '',
    customer_name: '',
    print_method: ts('k_19ksts'),
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
    provided_material: ts('k_zzipuh'),
    receive_time: '',
    mylar_info: '',
    sample_stock: '',
    customer_confirm: '',
    remark: '',
    status: 0,
  });

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sample/orders?id=${id}`);
      const result = await response.json();

      if (result.success) {
        const order: SampleOrder = result.data;
        setFormData({
          order_month: order.order_month,
          order_date: order.order_date,
          sample_type: order.sample_type || '',
          customer_name: order.customer_name,
          print_method: order.print_method || ts('k_19ksts'),
          color_sequence: order.color_sequence || '',
          product_name: order.product_name || '',
          material_code: order.material_code || '',
          size_spec: order.size_spec || '',
          material_desc: order.material_desc || '',
          sample_order_no: order.sample_order_no || '',
          required_date: order.required_date || '',
          progress_status: order.progress_status || '',
          is_confirmed: order.is_confirmed === 1,
          is_urgent: order.is_urgent === 1,
          is_produce_together: order.is_produce_together === 1,
          quantity: order.quantity?.toString() || '',
          progress_detail: order.progress_detail || '',
          sample_count: order.sample_count || 1,
          sample_reason: order.sample_reason || '',
          order_tracker: order.order_tracker || '',
          provided_material: order.provided_material || ts('k_zzipuh'),
          receive_time: order.receive_time || '',
          mylar_info: order.mylar_info || '',
          sample_stock: order.sample_stock || '',
          customer_confirm: order.customer_confirm || '',
          remark: order.remark || '',
          status: order.status,
        });
      } else {
        toast.error(result.message || ts('k_m0o67a'));
      }
    } catch {
      toast.error(ts('k_m0o67a'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: Loose) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.customer_name) {
      toast.error(ts('k_fu88no'));
      return;
    }

    try {
      setIsSaving(true);
      const response = await authFetch('/api/sample/orders', {
        method: 'PUT',
        body: JSON.stringify({
          id: parseInt(id),
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
        toast.success(ts('k_1xidkpf'));
        router.push('/sample/orders');
      } else {
        toast.error(result.message || ts('k_10lkv9z'));
      }
    } catch {
      toast.error(ts('k_10lkv9z'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">{tc('loading')}</div>
        </div>
      </MainLayout>
    );
  }

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
                {ts('k_8dj0lx')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{ts('editDesc')}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? ts('k_rr6ulf') : tc('save')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ts('k_z5lkkb')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{ts('k_1fsw60u')}</Label>
                  <Input
                    type="number"
                    value={formData.order_month}
                    onChange={(e) => handleChange('order_month', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tc('orderDateLabel')}</Label>
                  <Input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => handleChange('order_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{ts('k_qpfi09')}</Label>
                <Input
                  placeholder={tc('enterCustomerName')}
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{ts('k_1xvvlg9')}</Label>
                <Select
                  value={formData.sample_type}
                  onValueChange={(v) => handleChange('sample_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_1cvgprs')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ts('k_17t0qd7')}>{ts('k_17t0qd7')}</SelectItem>
                    <SelectItem value={ts('k_11y31ql')}>{ts('k_11y31ql')}</SelectItem>
                    <SelectItem value={ts('k_1vtwblv')}>{ts('k_1vtwblv')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{ts('sampleOrderNoLabel')}</Label>
                <Input
                  placeholder={ts('k_1vkpcod')}
                  value={formData.sample_order_no}
                  onChange={(e) => handleChange('sample_order_no', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{ts('orderTrackerLabel')}</Label>
                <Input
                  placeholder={ts('k_11sicls')}
                  value={formData.order_tracker}
                  onChange={(e) => handleChange('order_tracker', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 产品信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ts('k_fv8aex')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{ts('k_1kddh77')}</Label>
                <Input
                  placeholder={ts('k_iufw28')}
                  value={formData.product_name}
                  onChange={(e) => handleChange('product_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{ts('k_1bawbh5')}</Label>
                <Input
                  placeholder={ts('k_1v1d9om')}
                  value={formData.material_code}
                  onChange={(e) => handleChange('material_code', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{tc('size')}</Label>
                <Input
                  placeholder={ts('k_fntxui')}
                  value={formData.size_spec}
                  onChange={(e) => handleChange('size_spec', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{ts('materialDescLabel')}</Label>
                <Textarea
                  placeholder={ts('k_1rx2j5i')}
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
              <CardTitle className="text-base">{ts('k_4eu88c')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{ts('k_11ikudg')}</Label>
                <Select
                  value={formData.print_method}
                  onValueChange={(v) => handleChange('print_method', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ts('k_19ksts')}>{ts('k_19ksts')}</SelectItem>
                    <SelectItem value={ts('k_dcrxo5')}>{ts('k_dcrxo5')}</SelectItem>
                    <SelectItem value={ts('k_238fow')}>{ts('k_238fow')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{ts('colorSequenceLabel')}</Label>
                <Input
                  placeholder={ts('k_uei6q9')}
                  value={formData.color_sequence}
                  onChange={(e) => handleChange('color_sequence', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{tc('quantity')}</Label>
                <Input
                  type="number"
                  placeholder={tc('enterQuantity')}
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{ts('k_2dxkxn')}</Label>
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
              <CardTitle className="text-base">{ts('k_1uh4efz')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{ts('progressDetailLabel')}</Label>
                <Select
                  value={formData.progress_detail}
                  onValueChange={(v) => handleChange('progress_detail', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_3a0yo')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ts('k_d8rn7w')}>{ts('k_d8rn7w')}</SelectItem>
                    <SelectItem value={ts('k_qnpi8v')}>{ts('k_qnpi8v')}</SelectItem>
                    <SelectItem value={ts('k_xrdj7e')}>{ts('k_xrdj7e')}</SelectItem>
                    <SelectItem value={ts('k_5e3288')}>{ts('k_5e3288')}</SelectItem>
                    <SelectItem value={ts('k_1jzxapo')}>{ts('k_1jzxapo')}</SelectItem>
                    <SelectItem value="UV">UV</SelectItem>
                    <SelectItem value={ts('k_1s3jksb')}>{ts('k_1s3jksb')}</SelectItem>
                    <SelectItem value={ts('k_1poo3xa')}>{ts('k_1poo3xa')}</SelectItem>
                    <SelectItem value={ts('k_vvzvw8')}>{ts('k_vvzvw8')}</SelectItem>
                    <SelectItem value={ts('k_1i79wec')}>{ts('k_1i79wec')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{ts('sampleCountLabel')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.sample_count}
                  onChange={(e) => handleChange('sample_count', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>{ts('sampleReasonLabel')}</Label>
                <Input
                  placeholder={ts('k_1mqipod')}
                  value={formData.sample_reason}
                  onChange={(e) => handleChange('sample_reason', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{ts('providedMaterialLabel')}</Label>
                <Select
                  value={formData.provided_material}
                  onValueChange={(v) => handleChange('provided_material', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ts('k_zzipuh')}>{ts('k_zzipuh')}</SelectItem>
                    <SelectItem value={ts('k_2ccjou')}>{ts('k_2ccjou')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{ts('receiveTimeLabel')}</Label>
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
              <CardTitle className="text-base">{ts('k_itylyp')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>{ts('mylarInfoLabel')}</Label>
                  <Input
                    placeholder={ts('k_1e7gdeq')}
                    value={formData.mylar_info}
                    onChange={(e) => handleChange('mylar_info', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{ts('sampleStockLabel')}</Label>
                  <Input
                    value={formData.sample_stock}
                    onChange={(e) => handleChange('sample_stock', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{ts('k_1priyqs')}</Label>
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
                  <Label htmlFor="is_confirmed">{ts('isConfirmedLabel')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_urgent"
                    checked={formData.is_urgent}
                    onCheckedChange={(checked) => handleChange('is_urgent', checked)}
                  />
                  <Label htmlFor="is_urgent" className="text-red-600">
                    {ts('k_16p17ir')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_produce_together"
                    checked={formData.is_produce_together}
                    onCheckedChange={(checked) => handleChange('is_produce_together', checked)}
                  />
                  <Label htmlFor="is_produce_together">{ts('isProduceTogetherLabel')}</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  placeholder={ts('k_1xlhpvp')}
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
