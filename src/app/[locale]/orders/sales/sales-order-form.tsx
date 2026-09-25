'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useRouter } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoneyDisplay } from '@/components/ui/money-display';
import { CurrencySelect } from '@/components/ui/currency-select';
import { ArrowLeft, Plus, Save, ShoppingCart, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
}

interface Material {
  id: number;
  material_code: string;
  material_name: string;
  unit: string;
  sale_price: number;
  material_type?: number;
}

export interface SalesOrderItemInput {
  material_id: number | '';
  material_code: string;
  material_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

export interface SalesOrderFormInitial {
  orderId: number;
  customerId: number | '';
  orderDate: string;
  deliveryDate: string;
  currency: string;
  remark: string;
  items: SalesOrderItemInput[];
}

const emptyItem = (): SalesOrderItemInput => ({
  material_id: '',
  material_code: '',
  material_name: '',
  quantity: '',
  unit: '',
  unit_price: '',
});

interface SalesOrderFormProps {
  mode: 'create' | 'edit';
  /** 编辑模式必传：由页面拉取订单详情后注入 */
  initial?: SalesOrderFormInitial;
}

/**
 * 销售订单录入表单（新建 / 编辑共用全页表单）。
 *
 * 与旧弹窗实现的区别：
 *   1. 所有字段走受控 state —— 旧实现用 document.getElementById('deliveryDate'/'remark')
 *      直读 DOM 取值，弹窗卸载后取不到，且交货日期与备注在界面上实际处于「未绑定」状态。
 *   2. 编辑支持修改客户 / 订单日期 / 币种 / 明细（对应 PUT /api/orders 的扩展）。
 */
export function SalesOrderForm({ mode, initial }: SalesOrderFormProps) {
  const t = useTranslations('Orders');
  const ts = useTranslations('Orders');
  const tc = useTranslations('Common');
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selectedCustomer, setSelectedCustomer] = useState(
    initial?.customerId ? String(initial.customerId) : ''
  );
  const [orderDate, setOrderDate] = useState(
    initial?.orderDate || new Date().toISOString().slice(0, 10)
  );
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate || '');
  const [currency, setCurrency] = useState(initial?.currency || 'CNY');
  const [remark, setRemark] = useState(initial?.remark || '');
  const [items, setItems] = useState<SalesOrderItemInput[]>(
    initial?.items?.length ? initial.items : [emptyItem()]
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [customerRes, materialRes] = await Promise.all([
          authFetch('/api/customers'),
          authFetch('/api/inventory/materials'),
        ]);
        const customerBody = await customerRes.json();
        if (customerBody.success || customerBody.code === 200) {
          setCustomers(customerBody.data?.list || customerBody.data || []);
        }
        const materialBody = await materialRes.json();
        setMaterials(materialBody.data?.list || materialBody.data || []);
      } catch {
        setMaterials([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, []);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, patch: Partial<SalesOrderItemInput>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const selectMaterial = (index: number, value: string) => {
    const material = materials.find((m) => String(m.id) === value);
    if (!material) return;
    updateItem(index, {
      material_id: material.id,
      material_code: material.material_code || '',
      material_name: material.material_name || '',
      unit: material.unit || '',
      unit_price: material.sale_price != null ? String(material.sale_price) : '',
    });
  };

  const validItems = items.filter(
    (item) => item.material_name && item.quantity && item.unit_price
  );

  const goBack = () => router.push('/orders/sales');

  const buildPayload = (strict: boolean) => {
    const source = strict ? validItems : items;
    return {
      customer_id: selectedCustomer ? parseInt(selectedCustomer) : null,
      order_date: orderDate || null,
      delivery_date: deliveryDate || null,
      currency,
      remark,
      items: source.map((item) => ({
        material_id: item.material_id || null,
        material_code: item.material_code || '',
        material_name: item.material_name,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || ts('k_d5a1x9'),
        unit_price: parseFloat(item.unit_price) || 0,
      })),
    };
  };

  /** 提交前的前端校验，编辑模式放宽必填（只要求至少一条有效明细） */
  const validate = (): boolean => {
    if (!selectedCustomer) {
      toast.warning(t('selectCustomerWarning'));
      return false;
    }
    if (!deliveryDate) {
      toast.warning(t('selectDeliveryDateWarning'));
      return false;
    }
    if (validItems.length === 0) {
      toast.warning(t('addValidItemWarning'));
      return false;
    }
    for (let i = 0; i < validItems.length; i++) {
      if (parseFloat(validItems[i].quantity) <= 0) {
        toast.warning(t('quantityMustBePositive', { row: i + 1 }));
        return false;
      }
      if (parseFloat(validItems[i].unit_price) < 0) {
        toast.warning(t('priceCannotBeNegative', { row: i + 1 }));
        return false;
      }
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const isEdit = mode === 'edit' && initial;
      const response = await authFetch('/api/orders', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(
          isEdit
            ? { id: initial.orderId, ...buildPayload(true) }
            : buildPayload(true)
        ),
      });
      const result = await response.json();
      if (result.success) {
        const orderNo = (result.data as { order_no?: string })?.order_no;
        if (orderNo && !isEdit) {
          toast.success(t('submitSuccess') + ` | ${t('orderNo')}: ${orderNo}`);
        } else {
          toast.success(isEdit ? t('updateSuccess') : t('submitSuccess'));
        }
        goBack();
      } else {
        toast.error(result.message || (isEdit ? t('updateFailed') : t('submitFailed')));
      }
    } catch {
      toast.error(mode === 'edit' ? t('updateFailed') : t('submitNetworkError'));
    } finally {
      setSubmitting(false);
    }
  };

  /** 仅新建模式提供「保存草稿」：后端 POST 恒定落 status=1 */
  const saveDraft = async () => {
    setSubmitting(true);
    try {
      const response = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(buildPayload(false)),
      });
      const result = await response.json();
      if (result.success) {
        const orderNo = (result.data as { order_no?: string })?.order_no;
        if (orderNo) {
          toast.success(t('draftSaveSuccess') + ` | ${t('orderNo')}: ${orderNo}`);
        } else {
          toast.success(t('draftSaveSuccess'));
        }
        goBack();
      } else {
        toast.error(result.message || t('saveFailed'));
      }
    } catch {
      toast.error(t('saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'edit' ? t('editOrder') : t('newSalesOrder');

  return (
    <MainLayout title={title}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-primary" />
                {title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t('fillOrderInfo')}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">
                {t('customer')} <span className="text-red-500 dark:text-red-400">*</span>
              </Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder={t('selectCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.customer_code ? `${c.customer_code} - ` : ''}
                      {c.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">
                {t('deliveryDate')} <span className="text-red-500 dark:text-red-400">*</span>
              </Label>
              <Input
                type="date"
                id="deliveryDate"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDate">{t('orderDate')}</Label>
              <Input
                type="date"
                id="orderDate"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{tc('currency')}</Label>
              <CurrencySelect value={currency} onChange={setCurrency} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('orderItems')}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              {t('addDetail')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] min-w-[280px]">{t('product')}</TableHead>
                  <TableHead className="w-[150px] min-w-[140px] text-right">
                    {t('quantity')}
                  </TableHead>
                  <TableHead className="w-[130px] min-w-[120px]">{t('unit')}</TableHead>
                  <TableHead className="w-[170px] min-w-[160px] text-right">
                    {t('unitPrice')}
                  </TableHead>
                  <TableHead className="w-[170px] min-w-[160px] text-right">
                    {t('amount')}
                  </TableHead>
                  <TableHead className="w-[60px] min-w-[60px] text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={item.material_id ? String(item.material_id) : ''}
                        onValueChange={(value) => selectMaterial(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectProduct')} />
                        </SelectTrigger>
                        <SelectContent>
                          {materials
                            .filter((m) => m.material_type === 3)
                            .map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.material_code} - {m.material_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.quantity}
                        className="text-right h-9 px-2"
                        onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder={t('unit')}
                        value={item.unit}
                        className="h-9 px-2"
                        onChange={(e) => updateItem(index, { unit: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.unit_price}
                        className="text-right h-9 px-2"
                        onChange={(e) => updateItem(index, { unit_price: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <MoneyDisplay
                        amount={
                          (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
                        }
                        currency={currency}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tc('remark')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              id="remark"
              placeholder={t('orderRemark')}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 sticky bottom-0 bg-background border-t py-3">
          <Button variant="outline" onClick={goBack}>
            {tc('cancel')}
          </Button>
          {mode === 'create' && (
            <Button variant="outline" onClick={saveDraft} disabled={submitting || loadingOptions}>
              {t('saveDraft')}
            </Button>
          )}
          <Button onClick={submit} disabled={submitting || loadingOptions}>
            <Save className="h-4 w-4 mr-1" />
            {submitting ? t('submitting') : mode === 'edit' ? tc('save') : t('submitOrder')}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
