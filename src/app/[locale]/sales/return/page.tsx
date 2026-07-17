'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { MoneyDisplay } from '@/components/ui/money-display';
import { Plus, Search, RefreshCw, RotateCcw, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnOrder {
  id: number;
  return_no: string;
  order_id: number;
  order_no: string;
  delivery_id: number;
  delivery_no: string;
  customer_id: number;
  customer_name: string;
  return_date: string;
  return_type: number;
  return_reason: string;
  total_qty: number;
  total_amount: number;
  currency?: string;
  base_total_amount?: number;
  base_currency?: string;
  inspection_status: number;
  inspection_result: number;
  warehouse_id: number;
  inbound_status: number;
  status: number;
  remark: string;
  create_time: string;
}

interface ReturnItem {
  id?: number;
  material_id: number;
  material_name: string;
  material_spec: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  batch_no: string;
}

interface Customer {
  id: number;
  customer_name: string;
  customer_code: string;
}

export default function ReturnPage() {
  // 翻译钩子
  const t = useTranslations('SalesReturn');
  const tc = useTranslations('Common');

  const RETURN_TYPE_MAP: Record<number, string> = {
    1: t('qualityReturn'),
    2: t('quantityDiff'),
    3: t('specMismatch'),
    4: tc('other'),
  };

  const INSPECTION_STATUS_MAP: Record<number, { label: string; color: string }> = {
    0: {
      label: t('notInspected'),
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    },
    1: {
      label: t('inspecting'),
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    2: {
      label: t('inspected'),
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
  };

  const STATUS_MAP: Record<number, { label: string; color: string }> = {
    1: { label: tc('pending'), color: 'bg-yellow-100 text-yellow-800' },
    2: { label: tc('approved'), color: 'bg-blue-100 text-blue-800' },
    3: { label: t('returned'), color: 'bg-green-100 text-green-800' },
    9: { label: tc('cancelled'), color: 'bg-red-100 text-red-800' },
  };

  const [list, setList] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState<Partial<ReturnOrder> & { items: ReturnItem[] }>({
    items: [
      {
        material_id: 0,
        material_name: '',
        material_spec: '',
        quantity: 0,
        unit: '张',
        unit_price: 0,
        amount: 0,
        batch_no: '',
      },
    ],
    return_type: 1,
  });
  const [detailData, setDetailData] = useState<ReturnOrder | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await authFetch(`/api/sales/return?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch {
      toast.error(t('fetchListFailed'));
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await authFetch('/api/customers');
      const result = await res.json();
      if (result.success) {
        setCustomers(result.data?.list || result.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, [fetchData, fetchCustomers]);

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          material_id: 0,
          material_name: '',
          material_spec: '',
          quantity: 0,
          unit: '张',
          unit_price: 0,
          amount: 0,
          batch_no: '',
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: Loose) => {
    setForm((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? value : items[index].quantity;
        const price = field === 'unit_price' ? value : items[index].unit_price;
        items[index].amount = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
      }
      return { ...prev, items };
    });
  };

  const saveReturn = async () => {
    if (!form.customer_id) {
      toast.error(t('selectCustomer'));
      return;
    }
    if (!form.items || form.items.length === 0) {
      toast.error(t('addReturnItems'));
      return;
    }
    try {
      const res = await authFetch('/api/sales/return', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(t('createSuccess'));
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.message || tc('createFailed'));
      }
    } catch {
      toast.error(t('saveFailed'));
    }
  };

  const updateStatus = async (id: number, action: 'approve' | 'complete' | 'cancel') => {
    try {
      const res = await authFetch('/api/sales/return', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(tc('updateSuccess'));
        fetchData();
      } else {
        toast.error(result.message || tc('updateFailed'));
      }
    } catch {
      toast.error(tc('updateFailed'));
    }
  };

  const deleteReturn = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/sales/return?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success(tc('deleteSuccess'));
        fetchData();
      } else {
        toast.error(result.message || tc('deleteFailed'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
    }
  };

  const calcTotal = () => (form.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const calcTotalQty = () =>
    (form.items || []).reduce((sum, item) => sum + (parseFloat(String(item.quantity)) || 0), 0);

  return (
    <MainLayout title={t('pageTitle')}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                {t('pageTitle')}
              </CardTitle>
              <CardDescription>{t('pageDescription')}</CardDescription>
            </div>
            <Button
              onClick={() => {
                setForm({
                  items: [
                    {
                      material_id: 0,
                      material_name: '',
                      material_spec: '',
                      quantity: 0,
                      unit: '张',
                      unit_price: 0,
                      amount: 0,
                      batch_no: '',
                    },
                  ],
                  return_type: 1,
                  return_date: new Date().toISOString().split('T')[0],
                });
                setDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('newReturnOrder')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('allStatus')}</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('totalReturnOrders')}</div>
                  <div className="text-2xl font-bold">{total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{tc('pending')}</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {list.filter((r) => r.status === 1).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{tc('approved')}</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {list.filter((r) => r.status === 2).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('returned')}</div>
                  <div className="text-2xl font-bold text-green-600">
                    {list.filter((r) => r.status === 3).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('returnNo')}</TableHead>
                    <TableHead>{t('relatedOrder')}</TableHead>
                    <TableHead>{tc('customerName')}</TableHead>
                    <TableHead>{t('returnDate')}</TableHead>
                    <TableHead>{t('returnType')}</TableHead>
                    <TableHead>{t('returnQty')}</TableHead>
                    <TableHead>{t('returnAmount')}</TableHead>
                    <TableHead>{tc('currency')}</TableHead>
                    <TableHead>{t('inspectionStatus')}</TableHead>
                    <TableHead>{t('orderStatus')}</TableHead>
                    <TableHead className="text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.return_no}</TableCell>
                      <TableCell>{r.order_no || '-'}</TableCell>
                      <TableCell>{r.customer_name || '-'}</TableCell>
                      <TableCell>{r.return_date || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {RETURN_TYPE_MAP[r.return_type] || tc('other')}
                        </Badge>
                      </TableCell>
                      <TableCell>{parseFloat(String(r.total_qty || 0)).toLocaleString()}</TableCell>
                      <TableCell>
                        <MoneyDisplay
                          amount={parseFloat(String(r.total_amount || 0))}
                          currency={r.currency || 'CNY'}
                          baseAmount={r.base_total_amount}
                          baseCurrency={r.base_currency}
                        />
                      </TableCell>
                      <TableCell>
                        {r.currency || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            INSPECTION_STATUS_MAP[r.inspection_status]?.color || 'bg-gray-100'
                          }
                        >
                          {INSPECTION_STATUS_MAP[r.inspection_status]?.label || tc('unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_MAP[r.status]?.color || 'bg-gray-100'}>
                          {STATUS_MAP[r.status]?.label || tc('unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDetailData(r);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {r.status === 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(r.id, 'approve')}
                              title={t('approve')}
                            >
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {tc('review')}
                              </Badge>
                            </Button>
                          )}
                          {r.status === 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(r.id, 'complete')}
                              title={t('confirmReturn')}
                            >
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                {tc('returnOrder')}
                              </Badge>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteReturn(r.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                        {tc('noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>{t('newReturnOrder')}</DialogTitle>
            <DialogDescription>{t('dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  {tc('customer')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(form.customer_id || '')}
                  onValueChange={(v) => {
                    const cust = customers.find((c: Loose) => c.id === parseInt(v));
                    setForm((prev) => ({
                      ...prev,
                      customer_id: parseInt(v),
                      customer_name: cust?.customer_name || '',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCustomer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: Loose) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('returnDate')}</Label>
                <Input
                  type="date"
                  value={form.return_date || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, return_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('returnType')}</Label>
                <Select
                  value={String(form.return_type || 1)}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, return_type: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RETURN_TYPE_MAP).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('originalOrderNo')}</Label>
                <Input
                  value={form.order_no || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, order_no: e.target.value }))}
                  placeholder={t('relatedOrderPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('originalDeliveryNo')}</Label>
                <Input
                  value={form.delivery_no || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, delivery_no: e.target.value }))}
                  placeholder={t('relatedDeliveryPlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('returnReason')}</Label>
              <Textarea
                value={form.return_reason || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, return_reason: e.target.value }))}
                placeholder={t('returnReasonPlaceholder')}
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">{t('returnDetails')}</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('addMaterial')}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc('materialName')}</TableHead>
                    <TableHead>{tc('specification')}</TableHead>
                    <TableHead>{tc('quantity')}</TableHead>
                    <TableHead>{tc('unit')}</TableHead>
                    <TableHead>{t('unitPrice')}</TableHead>
                    <TableHead>{tc('amount')}</TableHead>
                    <TableHead>{tc('batchNo')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(form.items || []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={item.material_name}
                          onChange={(e) => updateItem(idx, 'material_name', e.target.value)}
                          placeholder={tc('materialName')}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.material_spec}
                          onChange={(e) => updateItem(idx, 'material_spec', e.target.value)}
                          placeholder={tc('specification')}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <MoneyDisplay amount={item.amount || 0} currency="CNY" />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.batch_no}
                          onChange={(e) => updateItem(idx, 'batch_no', e.target.value)}
                          placeholder={tc('batch')}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        {(form.items || []).length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-6 mt-3 text-sm">
                <span>
                  {t('totalQty')}: <strong>{calcTotalQty().toLocaleString()}</strong>
                </span>
                <span>
                  {t('totalAmount')}:{' '}
                  <strong className="text-red-600">
                    <MoneyDisplay amount={calcTotal()} currency="CNY" />
                  </strong>
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={saveReturn} className="bg-blue-600 hover:bg-blue-700">
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>{t('returnDetail')}</DialogTitle>
            <DialogDescription>{detailData?.return_no}</DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{tc('customerName')}：</span>
                  {detailData.customer_name}
                </div>
                <div>
                  <span className="text-gray-500">{t('returnDate')}：</span>
                  {detailData.return_date}
                </div>
                <div>
                  <span className="text-gray-500">{t('originalOrderNo')}：</span>
                  {detailData.order_no || '-'}
                </div>
                <div>
                  <span className="text-gray-500">{t('originalDeliveryNo')}：</span>
                  {detailData.delivery_no || '-'}
                </div>
                <div>
                  <span className="text-gray-500">{t('returnType')}：</span>
                  {RETURN_TYPE_MAP[detailData.return_type] || tc('other')}
                </div>
                <div>
                  <span className="text-gray-500">{t('inspectionStatus')}：</span>
                  {INSPECTION_STATUS_MAP[detailData.inspection_status]?.label}
                </div>
              </div>
              {detailData.return_reason && (
                <div className="text-sm">
                  <span className="text-gray-500">{t('returnReason')}：</span>
                  {detailData.return_reason}
                </div>
              )}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-gray-500 text-sm">{t('returnQty')}</div>
                    <div className="text-xl font-bold">
                      {parseFloat(String(detailData.total_qty || 0)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">{t('returnAmount')}</div>
                    <div className="text-xl font-bold text-red-600">
                      <MoneyDisplay
                        amount={parseFloat(String(detailData.total_amount || 0))}
                        currency={detailData.currency || 'CNY'}
                        baseAmount={detailData.base_total_amount}
                        baseCurrency={detailData.base_currency}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
