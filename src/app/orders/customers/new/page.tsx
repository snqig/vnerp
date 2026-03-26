'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Building2 } from 'lucide-react';

export default function NewCustomerPage() {
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_code || !formData.customer_name) {
      alert('请填写客户编码和客户名称');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          customer_type: parseInt(formData.customer_type),
          follow_up_status: parseInt(formData.follow_up_status),
          status: parseInt(formData.status),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('客户创建成功');
        router.push('/orders/customers');
      } else {
        alert('创建失败: ' + result.message);
      }
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="新建客户">
      <div className="space-y-4">
        {/* 工具栏 */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => router.push('/orders/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_code">
                  客户编码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_code"
                  value={formData.customer_code}
                  onChange={(e) => handleChange('customer_code', e.target.value)}
                  placeholder="请输入客户编码"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_name">
                  客户名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  placeholder="请输入客户名称"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_name">客户简称</Label>
                <Input
                  id="short_name"
                  value={formData.short_name}
                  onChange={(e) => handleChange('short_name', e.target.value)}
                  placeholder="请输入客户简称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_type">客户类型</Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value) => handleChange('customer_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择客户类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">企业</SelectItem>
                    <SelectItem value="2">个人</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">所属行业</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="请输入所属行业"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scale">企业规模</Label>
                <Input
                  id="scale"
                  value={formData.scale}
                  onChange={(e) => handleChange('scale', e.target.value)}
                  placeholder="请输入企业规模"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_level">信用等级</Label>
                <Input
                  id="credit_level"
                  value={formData.credit_level}
                  onChange={(e) => handleChange('credit_level', e.target.value)}
                  placeholder="请输入信用等级"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="follow_up_status">跟进状态</Label>
                <Select
                  value={formData.follow_up_status}
                  onValueChange={(value) => handleChange('follow_up_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择跟进状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">潜在客户</SelectItem>
                    <SelectItem value="2">意向客户</SelectItem>
                    <SelectItem value="3">成交客户</SelectItem>
                    <SelectItem value="4">流失客户</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 联系信息 */}
          <Card>
            <CardHeader>
              <CardTitle>联系信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">联系人姓名</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder="请输入联系人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">联系人电话</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="请输入联系人电话"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">联系人邮箱</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="请输入联系人邮箱"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">传真</Label>
                <Input
                  id="fax"
                  value={formData.fax}
                  onChange={(e) => handleChange('fax', e.target.value)}
                  placeholder="请输入传真"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">网站</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="请输入网站"
                />
              </div>
            </CardContent>
          </Card>

          {/* 地址信息 */}
          <Card>
            <CardHeader>
              <CardTitle>地址信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">省份</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleChange('province', e.target.value)}
                  placeholder="请输入省份"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">城市</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="请输入城市"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">区县</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  placeholder="请输入区县"
                />
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor="address">详细地址</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="请输入详细地址"
                />
              </div>
            </CardContent>
          </Card>

          {/* 财务信息 */}
          <Card>
            <CardHeader>
              <CardTitle>财务信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_license">营业执照号</Label>
                <Input
                  id="business_license"
                  value={formData.business_license}
                  onChange={(e) => handleChange('business_license', e.target.value)}
                  placeholder="请输入营业执照号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_number">税号</Label>
                <Input
                  id="tax_number"
                  value={formData.tax_number}
                  onChange={(e) => handleChange('tax_number', e.target.value)}
                  placeholder="请输入税号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">开户银行</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder="请输入开户银行"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account">银行账号</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => handleChange('bank_account', e.target.value)}
                  placeholder="请输入银行账号"
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
                className="w-full min-h-[100px] p-3 border rounded-md resize-y"
                value={formData.remark}
                onChange={(e) => handleChange('remark', e.target.value)}
                placeholder="请输入备注信息"
              />
            </CardContent>
          </Card>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/orders/customers')}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
