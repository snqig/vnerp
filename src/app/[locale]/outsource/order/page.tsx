'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface OutsourceOrder {
  id: number;
  order_no: string;
  work_order_id: number;
  work_order_no: string;
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_code: string;
  product_name: string;
  plan_qty: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  delivery_date: string;
  outsource_type: number;
  process_name: string;
  status: number;
  issued_qty: number;
  received_qty: number;
  qualified_qty: number;
  settled_amount: number;
  remark: string;
}

export default function OutsourceOrderPage() {

  const t = useTranslations('Outsource');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: t('pendingIssue'), variant: 'outline' },
    2: { label: t('issued'), variant: 'default' },
    3: { label: t('partiallyReceived'), variant: 'secondary' },
    4: { label: t('completed'), variant: 'default' },
    5: { label: t('settled'), variant: 'secondary' },
    9: { label: t('cancelled'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<OutsourceOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<OutsourceOrder>>({});
  const [suppliers, setSuppliers] = useState<{ id: number; supplier_name: string }[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        orderNo: searchNo,
        status: searchStatus,
      });
      const res = await authFetch('/api/outsource/order?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await authFetch('/api/purchase/suppliers?pageSize=100');
      const result = await res.json();
      if (result.success) setSuppliers(result.data?.list || result.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, searchStatus]);
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/outsource/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        setEditItem({});
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm(t('confirmCancelOrder'))) return;
    try {
      const res = await authFetch('/api/outsource/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cancel' }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('cancelled') });
        fetchData();
      }
    } catch (e) {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/outsource/order?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch (e) {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const formatAmount = (amount: number) => {
    return ((amount || 0) / 100).toFixed(2);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('searchOrderNo')}
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Select
                value={searchStatus}
                onValueChange={(v) => {
                  setSearchStatus(v === 'all' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue placeholder={t('statusFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('all')}</SelectItem>
                  <SelectItem value="1">{t('pendingIssue')}</SelectItem>
                  <SelectItem value="2">{t('issued')}</SelectItem>
                  <SelectItem value="3">{t('partiallyReceived')}</SelectItem>
                  <SelectItem value="4">{t('completed')}</SelectItem>
                  <SelectItem value="5">{t('settled')}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addOrder')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('orderNo')}</TableHead>
                  <TableHead className="text-xs">{t('supplierName')}</TableHead>
                  <TableHead className="text-xs">{t('product')}</TableHead>
                  <TableHead className="text-xs">{t('outsourceType')}</TableHead>
                  <TableHead className="text-xs">{t('process')}</TableHead>
                  <TableHead className="text-xs text-right">{t('planQty')}</TableHead>
                  <TableHead className="text-xs text-right">{t('issuedQty')}</TableHead>
                  <TableHead className="text-xs text-right">{t('receivedQty')}</TableHead>
                  <TableHead className="text-xs text-right">{t('qualifiedQty')}</TableHead>
                  <TableHead className="text-xs">{t('deliveryDate')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono">{item.order_no}</TableCell>
                      <TableCell className="text-xs">{item.supplier_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.product_name || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {item.outsource_type === 1 ? t('processOutsource') : t('finishedOutsource')}
                      </TableCell>
                      <TableCell className="text-xs">{item.process_name || '-'}</TableCell>
                      <TableCell className="text-xs text-right">{item.plan_qty || 0}</TableCell>
                      <TableCell className="text-xs text-right text-blue-600">
                        {item.issued_qty || 0}
                      </TableCell>
                      <TableCell className="text-xs text-right text-orange-600">
                        {item.received_qty || 0}
                      </TableCell>
                      <TableCell className="text-xs text-right text-green-600">
                        {item.qualified_qty || 0}
                      </TableCell>
                      <TableCell className="text-xs">{item.delivery_date || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2 text-red-600"
                              onClick={() => handleCancel(item.id)}
                            >
                              {tc('cancel')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-400 py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{tc('total', { count: total })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tc('prevPage')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc('nextPage')}
            </Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  {t('supplierName')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(editItem.supplier_id || '')}
                  onValueChange={(v) => {
                    const s = suppliers.find((x) => x.id === Number(v));
                    setEditItem({
                      ...editItem,
                      supplier_id: Number(v),
                      supplier_name: s?.supplier_name,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectSupplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('outsourceType')}</Label>
                <Select
                  value={String(editItem.outsource_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, outsource_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('processOutsource')}</SelectItem>
                    <SelectItem value="2">{t('finishedOutsource')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('productName')}</Label>
                <Input
                  value={editItem.product_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('productCode')}</Label>
                <Input
                  value={editItem.product_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, product_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('outsourceProcess')}</Label>
                <Input
                  value={editItem.process_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, process_name: e.target.value })}
                  placeholder={t('processPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('workOrderNo')}</Label>
                <Input
                  value={editItem.work_order_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, work_order_no: e.target.value })}
                />
              </div>
              <div>
                <Label>
                  {t('planQty')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={editItem.plan_qty || ''}
                  onChange={(e) => setEditItem({ ...editItem, plan_qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('unit')}</Label>
                <Input
                  value={editItem.unit || ''}
                  onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                  placeholder={t('unitPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('unitPrice')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editItem.unit_price ? editItem.unit_price / 100 : ''}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      unit_price: Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </div>
              <div>
                <Label>{t('deliveryDate')}</Label>
                <Input
                  type="date"
                  value={editItem.delivery_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, delivery_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
