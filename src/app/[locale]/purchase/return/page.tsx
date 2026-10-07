'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Plus, RefreshCw, Undo2, CheckCircle, XCircle, Eye, Clipboard, DollarSign } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { MoneyDisplay } from '@/components/ui/money-display';
import {
  StandardTable,
  type StandardTableColumn,
} from '@/components/common';

interface ReturnItem {
  id?: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_spec?: string;
  unit: string;
  return_qty: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  remark?: string;
  order_item_id?: number;
}

interface ReturnOrder {
  id: number;
  return_no: string;
  order_id?: number;
  order_no: string;
  supplier_id: number;
  supplier_name: string;
  return_date: string;
  total_amount: number;
  currency?: string;
  base_currency?: string;
  base_total_amount?: number;
  status: number;
  remark?: string;
  create_by?: number;
  audit_by?: number;
  audit_time?: string;
  create_time: string;
  item_count?: number;
}

const statusMap: Record<number, { label: string; color: string }> = {
  1: {
    label: '待审核',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  2: {
    label: '已审核',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  3: {
    label: '已完成',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  9: {
    label: '已取消',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
};

export default function PurchaseReturnPage() {
  const ts = useTranslations('Purchase');
  const tc = useTranslations('Common');
  const t = useTranslations('Purchase');
  const { toast } = useToast();
  const [list, setList] = useState<ReturnOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({
    order_id: 0,
    order_no: '',
    supplier_id: 0,
    supplier_name: '',
    return_date: new Date().toISOString().slice(0, 10),
    remark: '',
    currency: '',
    base_currency: '',
  });
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [_detailItems, _setDetailItems] = useState<Loose[]>([]);
  const [detailOrder, setDetailOrder] = useState<ReturnOrder | null>(null);

  // 采购订单列表（用于选择）
  const [purchaseOrders, setPurchaseOrders] = useState<Loose[]>([]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
        keyword,
        status: statusFilter,
      });
      const res = await authFetch('/api/purchase/return?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || result.data || []);
        setTotal(result.data?.total || 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter]);

  const fetchPurchaseOrders = async () => {
    try {
      const res = await authFetch('/api/purchase/orders?pageSize=100&status=approved');
      const result = await res.json();
      if (result.success) {
        setPurchaseOrders(result.data?.list || result.data || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSelectOrder = (orderId: string) => {
    const order = purchaseOrders.find((o: Loose) => String(o.id) === orderId);
    if (order) {
      setForm({
        ...form,
        order_id: order.id,
        order_no: order.po_no,
        supplier_id: order.supplier_id,
        supplier_name: order.supplier_name,
        currency: order.currency || 'CNY',
        base_currency: order.base_currency || '',
      });
      // 自动填充退货明细
      const orderItems: ReturnItem[] = (order.lines || []).map((line: Loose, _idx: number) => ({
        material_id: line.material_id,
        material_code: line.material_code,
        material_name: line.material_name,
        material_spec: line.material_spec,
        unit: line.unit,
        return_qty: 0,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        amount: 0,
        order_item_id: line.id,
      }));
      setItems(orderItems);
    }
  };

  const updateItem = (index: number, field: string, value: Loose) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'return_qty' || field === 'unit_price') {
        const qty = field === 'return_qty' ? value : newItems[index].return_qty;
        const price = field === 'unit_price' ? value : newItems[index].unit_price;
        newItems[index].amount = qty * price;
      }
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validItems = items.filter((item) => item.return_qty > 0);
    if (validItems.length === 0) {
      toast({ title: ts('k_bjyva1'), variant: 'destructive' });
      return;
    }
    if (!form.supplier_id) {
      toast({ title: ts('k_qday6t'), variant: 'destructive' });
      return;
    }

    try {
      const res = await authFetch('/api/purchase/return', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          items: validItems,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: ts('k_1dt30m7') });
        setDialogOpen(false);
        setItems([]);
        fetchList();
      } else {
        toast({ title: result.message || ts('k_1jxltyq'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_1jxltyq'), variant: 'destructive' });
    }
  };

  const handleAction = async (id: number, action: string) => {
    const actionLabel = action === 'approve' ? ts('k_1ws11do') : action === 'complete' ? ts('k_17483b0') : ts('k_1589w37');
    if (!confirm(`确定${actionLabel}？`)) return;

    try {
      const res = await authFetch('/api/purchase/return', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: result.message || `${actionLabel}成功` });
        fetchList();
      } else {
        toast({ title: result.message || ts('k_ydow7a'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_ydow7a'), variant: 'destructive' });
    }
  };

  const viewDetail = async (order: ReturnOrder) => {
    setDetailOrder(order);
    try {
      const res = await authFetch(`/api/purchase/return?keyword=${order.return_no}`);
      const result = await res.json();
      if (result.success) {
        const data = result.data?.list || result.data || [];
        const found = data.find((r: Loose) => r.id === order.id);
        if (found?.items) _setDetailItems(found.items);
        else _setDetailItems([]);
      }
    } catch {
      _setDetailItems([]);
    }
    setDetailOpen(true);
  };

  const openCreateDialog = () => {
    setForm({
      order_id: 0,
      order_no: '',
      supplier_id: 0,
      supplier_name: '',
      return_date: new Date().toISOString().slice(0, 10),
      remark: '',
      currency: '',
      base_currency: '',
    });
    setItems([]);
    fetchPurchaseOrders();
    setDialogOpen(true);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = items.reduce((sum, item) => sum + item.amount * (item.tax_rate / 100), 0);

  const columns: StandardTableColumn<ReturnOrder>[] = [
    { key: 'return_no', title: ts('k_nxkls'), render: (o: ReturnOrder) => <span className="font-mono text-sm">{o.return_no}</span> },
    { key: 'order_no', title: tc('relatedOrder'), render: (o: ReturnOrder) => <span className="text-sm">{o.order_no || '-'}</span> },
    { key: 'supplier_name', title: tc('supplier'), render: (o: ReturnOrder) => <span className="text-sm">{o.supplier_name}</span> },
    { key: 'return_date', title: ts('k_k38lmg'), render: (o: ReturnOrder) => <span className="text-sm">{o.return_date}</span> },
    { key: 'total_amount', title: tc('amount'), render: (o: ReturnOrder) => (<MoneyDisplay amount={Number(o.total_amount || 0)} currency={o.currency || 'CNY'} baseAmount={o.base_total_amount} baseCurrency={o.base_currency} showSymbol={false} />) },
    { key: 'currency', title: tc('currency'), render: (o: ReturnOrder) => <span className="text-sm">{o.currency || 'CNY'}</span> },
    { key: 'status', title: tc('status'), render: (o: ReturnOrder) => (<Badge className={statusMap[o.status]?.color || ''}>{statusMap[o.status]?.label || o.status}</Badge>) },
    { key: 'actions', title: tc('actions'), align: 'right', render: (o: ReturnOrder) => (<div className="flex justify-end gap-1"><Button size="sm" variant="ghost" className="h-7" onClick={() => viewDetail(o)}><Eye className="h-3 w-3 mr-1" />{ts('k_xc5h04')}</Button>{o.status === 1 && <><Button size="sm" variant="ghost" className="h-7 text-blue-600 dark:text-blue-400" onClick={() => handleAction(o.id, 'approve')}><CheckCircle className="h-3 w-3 mr-1" />{ts('k_1ws11do')}</Button><Button size="sm" variant="ghost" className="h-7 text-red-600 dark:text-red-400" onClick={() => handleAction(o.id, 'cancel')}><XCircle className="h-3 w-3 mr-1" />{tc('cancel')}</Button></>}{o.status === 2 && <Button size="sm" variant="ghost" className="h-7 text-green-600 dark:text-green-400" onClick={() => handleAction(o.id, 'complete')}><CheckCircle className="h-3 w-3 mr-1" />{ts('k_17483b0')}</Button>}</div>) },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: tc('totalReturns'), icon: Undo2, ...StatsTheme.blue },
            { key: 'pending', label: tc('pendingReview'), icon: Clipboard, ...StatsTheme.orange },
            { key: 'completed', label: tc('completed'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'refund', label: tc('refundAmount'), icon: DollarSign, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'total', count: list.length },
            { key: 'pending', count: list.filter((o) => o.status === 1).length },
            { key: 'completed', count: list.filter((o) => o.status === 3).length },
            { key: 'refund', count: list.reduce((sum, o) => sum + (o.total_amount || 0), 0) },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Undo2 className="w-6 h-6" />
              {ts('k_jg7lgj')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{tc('returnManagementDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={ts('k_l89uv3')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-40 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && fetchList()}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue placeholder={ts('k_igzce8')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ts('k_igzce8')}</SelectItem>
                <SelectItem value="1">{tc('pending')}</SelectItem>
                <SelectItem value="2">{tc('approved')}</SelectItem>
                <SelectItem value="3">{tc('completed')}</SelectItem>
                <SelectItem value="9">{tc('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={fetchList}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openCreateDialog}>
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_zh4u1a')}</Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-0">
            <StandardTable<ReturnOrder>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={10}
              loading={loading && list.length === 0}
              emptyText={ts('k_s6w4nh')}
            />
          </CardContent>
        </Card>
      </div>

      {/* 新建退货对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tc('newPurchaseReturn')}</DialogTitle>
            <DialogDescription>{tc('newPurchaseReturnDesc')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tc('purchaseOrder')}</Label>
                <Select onValueChange={handleSelectOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_173dwny')} />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((order: Loose) => (
                      <SelectItem key={order.id} value={String(order.id)}>
                        {order.po_no} - {order.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('supplier')}</Label>
                <Input value={form.supplier_name} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>{tc('currency')}</Label>
                <Input value={form.currency || 'CNY'} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>{ts('k_k38lmg')}</Label>
                <Input
                  type="date"
                  value={form.return_date}
                  onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{tc('remark')}</Label>
              <Textarea
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                placeholder={ts('k_6qc671')}
                rows={2}
              />
            </div>

            {/* 退货明细 */}
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <span className="font-medium text-sm">{ts('k_1lrcwvw')}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{tc('materialCode')}</TableHead>
                    <TableHead className="text-xs">{tc('materialName')}</TableHead>
                    <TableHead className="text-xs">{tc('specification')}</TableHead>
                    <TableHead className="text-xs">{tc('unit')}</TableHead>
                    <TableHead className="text-xs">{ts('k_isc1c5')}</TableHead>
                    <TableHead className="text-xs">{ts('k_1ez71s5')}</TableHead>
                    <TableHead className="text-xs">{tc('amount')}</TableHead>
                    <TableHead className="text-xs">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-mono">{item.material_code}</TableCell>
                      <TableCell className="text-xs">{item.material_name}</TableCell>
                      <TableCell className="text-xs">{item.material_spec || '-'}</TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell className="text-xs font-mono">{item.unit_price}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={item.return_qty || ''}
                          onChange={(e) => updateItem(idx, 'return_qty', Number(e.target.value))}
                          className="w-20 h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{Number(item.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                          onClick={() => removeItem(idx)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-4 text-sm"
                      >
                        {ts('k_11lpeht')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 合计 */}
            <div className="flex justify-end gap-6 text-sm">
              <span>
                {t('amountTotal')}: <strong>¥{totalAmount.toFixed(2)}</strong>
              </span>
              <span>
                {t('taxTotal')}: <strong>¥{totalTax.toFixed(2)}</strong>
              </span>
              <span>
                {t('amountWithTaxTotal')}: <strong>¥{(totalAmount + totalTax).toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {tc('createReturn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {tc('returnDetailTitle')}
              {detailOrder?.return_no}
            </DialogTitle>
            <DialogDescription>
              {ts('k_1pwh7dy')}{detailOrder ? statusMap[detailOrder.status]?.label : ''}
              {tc('supplierLabelSuffix')}
              {detailOrder?.supplier_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                {t('returnNo')}: <span className="font-mono">{detailOrder?.return_no}</span>
              </div>
              <div>
                {t('relatedPurchaseOrder')}:{' '}
                <span className="font-mono">{detailOrder?.order_no || '-'}</span>
              </div>
              <div>
                {t('returnDate')}: {detailOrder?.return_date}
              </div>
              <div>
                {tc('currency')}: {detailOrder?.currency || 'CNY'}
              </div>
              <div>
                {tc('amount')}:{' '}
                <MoneyDisplay
                  amount={Number(detailOrder?.total_amount || 0)}
                  currency={detailOrder?.currency || 'CNY'}
                  baseAmount={detailOrder?.base_total_amount}
                  baseCurrency={detailOrder?.base_currency}
                  showSymbol={false}
                />
              </div>
              <div>
                {t('amountWithTaxTotal')}:{' '}
                <MoneyDisplay
                  amount={Number(detailOrder?.total_amount || 0)}
                  currency={detailOrder?.currency || 'CNY'}
                  baseAmount={detailOrder?.base_total_amount}
                  baseCurrency={detailOrder?.base_currency}
                  showSymbol={false}
                />
              </div>
            </div>
            {detailOrder?.remark && (
              <div className="text-sm">
                {tc('remark')}: {detailOrder.remark}
              </div>
            )}
          </div>
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
