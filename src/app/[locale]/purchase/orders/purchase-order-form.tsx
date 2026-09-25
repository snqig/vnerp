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

interface Supplier {
  id: number;
  supplier_code: string;
  supplier_name: string;
  status?: number | string;
}

export interface PurchaseOrderItemInput {
  material_id: number | '';
  material_code: string;
  material_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

export interface PurchaseOrderFormInitial {
  orderId: number;
  poNo: string;
  supplierId: number | '';
  orderDate: string;
  deliveryDate: string;
  currency: string;
  remark: string;
  status: number;
  items: PurchaseOrderItemInput[];
}

const emptyItem = (): PurchaseOrderItemInput => ({
  material_id: '',
  material_code: '',
  material_name: '',
  quantity: '',
  unit: '',
  unit_price: '',
});

interface PurchaseOrderFormProps {
  mode: 'create' | 'edit';
  /** 编辑模式必传：由页面拉取订单详情后注入 */
  initial?: PurchaseOrderFormInitial;
}

export function PurchaseOrderForm({ mode, initial }: PurchaseOrderFormProps) {
  const t = useTranslations('Purchase');
  const tc = useTranslations('Common');
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selectedSupplier, setSelectedSupplier] = useState(
    initial?.supplierId ? String(initial.supplierId) : ''
  );
  const [orderDate, setOrderDate] = useState(
    initial?.orderDate || new Date().toISOString().slice(0, 10)
  );
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate || '');
  const [currency, setCurrency] = useState(initial?.currency || 'CNY');
  const [remark, setRemark] = useState(initial?.remark || '');
  const [items, setItems] = useState<PurchaseOrderItemInput[]>(
    initial?.items?.length ? initial.items : [emptyItem()]
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch('/api/purchase/suppliers');
        const body = await res.json();
        if (body.success || body.code === 200) {
          setSuppliers(body.data?.list || body.data || []);
        }
      } catch {
        setSuppliers([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, []);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, patch: Partial<PurchaseOrderItemInput>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const validItems = items.filter(
    (item) => item.material_name && item.quantity && item.unit_price
  );

  const goBack = () => router.push('/purchase/orders');

  const buildPayload = (strict: boolean) => {
    const source = strict ? validItems : items;
    return {
      supplier_id: selectedSupplier ? parseInt(selectedSupplier) : null,
      supplier_name: (() => {
        const s = suppliers.find((sup) => sup.id === parseInt(selectedSupplier));
        return s?.supplier_name || '';
      })(),
      supplier_code: (() => {
        const s = suppliers.find((sup) => sup.id === parseInt(selectedSupplier));
        return s?.supplier_code || '';
      })(),
      order_date: orderDate || null,
      delivery_date: deliveryDate || null,
      currency,
      remark,
      lines: source.map((item) => ({
        material_id: item.material_id || null,
        material_code: item.material_code || '',
        material_name: item.material_name,
        order_qty: parseFloat(item.quantity) || 0,
        unit: item.unit || t('k_w0gthl'),
        unit_price: parseFloat(item.unit_price) || 0,
      })),
    };
  };

  /** 提交前的前端校验，编辑模式放宽必填（只要求至少一条有效明细） */
  const validate = (): boolean => {
    if (!selectedSupplier) {
      toast.warning(t('k_v9pftt'));
      return false;
    }
    if (!deliveryDate) {
      toast.warning(t('k_1ato6eo'));
      return false;
    }
    if (validItems.length === 0) {
      toast.warning(t('k_1ato6eo'));
      return false;
    }
    for (let i = 0; i < validItems.length; i++) {
      if (parseFloat(validItems[i].quantity) <= 0) {
        toast.warning(t('k_v9pftt'));
        return false;
      }
      if (parseFloat(validItems[i].unit_price) < 0) {
        toast.warning(t('k_v9pftt'));
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
      const response = await authFetch('/api/purchase/orders', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(
          isEdit
            ? { id: initial.orderId, action: 'update', ...buildPayload(true) }
            : buildPayload(true)
        ),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(isEdit ? tc('updateSuccess') : t('k_qqp9rs'));
        goBack();
      } else {
        toast.error(result.message || (isEdit ? tc('updateFailed') : t('k_1jxltyq')));
      }
    } catch {
      toast.error(mode === 'edit' ? tc('updateFailed') : t('k_1io10lx'));
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'edit' ? t('editPurchaseOrder') : t('newPurchaseOrder');

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
              <Label htmlFor="supplier">
                {t('supplier')} <span className="text-red-500 dark:text-red-400">*</span>
              </Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder={tc('select') + t('supplier')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter((s) => Number(s.status) === 1)
                    .map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.supplier_code ? `${s.supplier_code} - ` : ''}
                        {s.supplier_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">
                {t('expectedDate')} <span className="text-red-500 dark:text-red-400">*</span>
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
            <CardTitle className="text-base">{t('purchaseDetails')}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              {t('addMaterial')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] min-w-[160px]">{t('materialCode')}</TableHead>
                  <TableHead className="w-[180px] min-w-[160px]">{t('materialName')}</TableHead>
                  <TableHead className="w-[120px] min-w-[100px] text-right">
                    {tc('quantity')}
                  </TableHead>
                  <TableHead className="w-[100px] min-w-[80px]">{tc('unit')}</TableHead>
                  <TableHead className="w-[150px] min-w-[130px] text-right">
                    {t('unitPrice')}
                  </TableHead>
                  <TableHead className="w-[150px] min-w-[130px] text-right">
                    {tc('amount')}
                  </TableHead>
                  <TableHead className="w-[60px] min-w-[60px] text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.material_code}
                        onChange={(e) => updateItem(index, { material_code: e.target.value })}
                        placeholder={t('materialCode')}
                        className="h-9 px-2"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.material_name}
                        onChange={(e) => updateItem(index, { material_name: e.target.value })}
                        placeholder={t('materialName')}
                        className="h-9 px-2"
                      />
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
                        placeholder={t('k_w0gthl')}
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
              placeholder={tc('pleaseInput') + tc('remark')}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 sticky bottom-0 bg-background border-t py-3">
          <Button variant="outline" onClick={goBack}>
            {tc('cancel')}
          </Button>
          <Button onClick={submit} disabled={submitting || loadingOptions}>
            <Save className="h-4 w-4 mr-1" />
            {submitting ? tc('saving') : mode === 'edit' ? tc('save') : t('createPurchaseOrder')}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
