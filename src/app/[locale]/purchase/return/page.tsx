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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, RefreshCw, Undo2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

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
  return_type: string;
  total_amount: number;
  tax_amount: number;
  grand_total: number;
  status: string;
  remark?: string;
  create_by?: number;
  audit_by?: number;
  audit_time?: string;
  create_time: string;
  item_count?: number;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: {
    label: tc('text_eftvg'),
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  approved: {
    label: tc('text_e7j1l'),
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  completed: {
    label: tc('text_e7hbq'),
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  cancelled: {
    label: tc('text_e68dg'),
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
};

const returnTypeMap: Record<string, string> = {
  quality: tc('text_if0wnl'),
  quantity: tc('text_deejqr'),
  other: tc('text_alu6v5'),
};

export default function PurchaseReturnPage() {
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
    return_type: 'quality',
    remark: '',
  });
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailOrder, setDetailOrder] = useState<ReturnOrder | null>(null);

  // 采购订单列表（用于选择）
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

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
    const order = purchaseOrders.find((o: any) => String(o.id) === orderId);
    if (order) {
      setForm({
        ...form,
        order_id: order.id,
        order_no: order.po_no,
        supplier_id: order.supplier_id,
        supplier_name: order.supplier_name,
      });
      // 自动填充退货明细
      const orderItems: ReturnItem[] = (order.lines || []).map((line: any, idx: number) => ({
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

  const updateItem = (index: number, field: string, value: any) => {
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
      toast({ title: '请至少填写一项退货数量', variant: 'destructive' });
      return;
    }
    if (!form.supplier_id) {
      toast({ title: '请选择采购订单', variant: 'destructive' });
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
        toast({ title: '采购退货单创建成功' });
        setDialogOpen(false);
        setItems([]);
        fetchList();
      } else {
        toast({ title: result.message || '创建失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleAction = async (id: number, action: string) => {
    const actionLabel = action === 'approve' ? '审核' : action === 'complete' ? '完成退货' : '取消';
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
        toast({ title: result.message || '操作失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const viewDetail = async (order: ReturnOrder) => {
    setDetailOrder(order);
    try {
      const res = await authFetch(`/api/purchase/return?keyword=${order.return_no}`);
      const result = await res.json();
      if (result.success) {
        const data = result.data?.list || result.data || [];
        const found = data.find((r: any) => r.id === order.id);
        if (found?.items) setDetailItems(found.items);
        else setDetailItems([]);
      }
    } catch {
      setDetailItems([]);
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
      return_type: 'quality',
      remark: '',
    });
    setItems([]);
    fetchPurchaseOrders();
    setDialogOpen(true);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = items.reduce((sum, item) => sum + item.amount * (item.tax_rate / 100), 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Undo2 className="w-6 h-6" />
              {tc('text_emjff2')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{tc('text_vcqoue')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="搜索单号/备注"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-40 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && fetchList()}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('text_avez63')}</SelectItem>
                <SelectItem value="pending">{tc('pending')}</SelectItem>
                <SelectItem value="approved">{tc('approved')}</SelectItem>
                <SelectItem value="completed">{tc('completed')}</SelectItem>
                <SelectItem value="cancelled">{tc('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={fetchList}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openCreateDialog}>
              <Plus className="h-3 w-3 mr-1" />
              {tc('text_d8c5bl')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc('text_iqxhux')}</TableHead>
                  <TableHead>{tc('text_jw474i')}</TableHead>
                  <TableHead>{tc('supplier')}</TableHead>
                  <TableHead>{tc('text_ir0rb5')}</TableHead>
                  <TableHead>{tc('text_ir4ijb')}</TableHead>
                  <TableHead>{tc('amount')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {tc('text_elyafq')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.return_no}</TableCell>
                      <TableCell className="text-sm">{order.order_no || '-'}</TableCell>
                      <TableCell className="text-sm">{order.supplier_name}</TableCell>
                      <TableCell className="text-sm">{order.return_date}</TableCell>
                      <TableCell className="text-sm">
                        {returnTypeMap[order.return_type] || order.return_type}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        ¥{(order.grand_total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusMap[order.status]?.color || ''}>
                          {statusMap[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => viewDetail(order)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {tc('text_obrz')}
                          </Button>
                          {order.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-blue-600"
                                onClick={() => handleAction(order.id, 'approve')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {tc('text_g5o7')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-red-600"
                                onClick={() => handleAction(order.id, 'cancel')}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                {tc('text_ev02')}
                              </Button>
                            </>
                          )}
                          {order.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-green-600"
                              onClick={() => handleAction(order.id, 'complete')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {tc('text_byqt63')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {tc('text_g35')}
            {total}
            {tc('text_kf5')}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('text_btlof')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 10 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('text_btmf4')}
            </Button>
          </div>
        </div>
      </div>

      {/* 新建退货对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tc('text_19w5rr')}</DialogTitle>
            <DialogDescription>{tc('text_e7vdkm')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tc('text_mmoe4a')}</Label>
                <Select onValueChange={handleSelectOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择采购订单" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((order: any) => (
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
                <Label>{tc('text_ir0rb5')}</Label>
                <Input
                  type="date"
                  value={form.return_date}
                  onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('text_ir4ijb')}</Label>
                <Select
                  value={form.return_type}
                  onValueChange={(v) => setForm({ ...form, return_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quality">{tc('text_if0wnl')}</SelectItem>
                    <SelectItem value="quantity">{tc('text_deejqr')}</SelectItem>
                    <SelectItem value="other">{tc('text_alu6v5')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{tc('remark')}</Label>
              <Textarea
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                placeholder="退货原因说明"
                rows={2}
              />
            </div>

            {/* 退货明细 */}
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <span className="font-medium text-sm">{tc('text_ir0wyn')}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{tc('text_euzqpn')}</TableHead>
                    <TableHead className="text-xs">{tc('text_eusfkj')}</TableHead>
                    <TableHead className="text-xs">{tc('specification')}</TableHead>
                    <TableHead className="text-xs">{tc('unit')}</TableHead>
                    <TableHead className="text-xs">{tc('text_elvm')}</TableHead>
                    <TableHead className="text-xs">{tc('text_ir0wxy')}</TableHead>
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
                      <TableCell className="text-xs font-mono">{item.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600"
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
                        {tc('text_kdl87q')}
                      </TableCell>
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
              {tc('text_cxfim3')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {tc('text_f4fj0a')}
              {detailOrder?.return_no}
            </DialogTitle>
            <DialogDescription>
              {tc('text_halin')}
              {statusMap[detailOrder?.status || '']?.label}
              {tc('text_1e6ecv')}
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
                {t('returnType')}: {returnTypeMap[detailOrder?.return_type || '']}
              </div>
              <div>
                {tc('amount')}: ¥{(detailOrder?.total_amount || 0).toLocaleString()}
              </div>
              <div>
                {t('amountWithTaxTotal')}: ¥{(detailOrder?.grand_total || 0).toLocaleString()}
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
