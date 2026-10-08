'use client';

import { authFetch } from '@/lib/auth-fetch';
import { toDateInput } from '@/lib/date-utils';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeroHeader } from '@/components/layout/PageHeroHeader';
import { ListToolbar } from '@/components/layout/ListToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StandardTable, type StandardTableColumn } from '@/components/common';
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
import { Plus, Search, Edit, Trash2, Truck, CheckCircle, Clock, AlertTriangle, PackageOpen, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { WarehouseSelect } from '@/components/ui/warehouse-select';

interface Item {
  id: number;
  outbound_no: string;
  order_no: string;
  customer_name: string;
  warehouse_id?: number;
  warehouse_name: string;
  outbound_date: string;
  delivery_person: string;
  status: number;
  remark?: string;
}

export default function SalesOutboundPage() {
  const ts = useTranslations('Warehouse');
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  // 状态映射 - 在组件内部使用翻译
  const statusMap: Record<
    number,
    { labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { labelKey: 'pendingOutbound', variant: 'outline' },
    2: { labelKey: 'outbounded', variant: 'default' },
    3: { labelKey: 'cancelled', variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchNo, setSearchNo] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    partial: 0,
    completed: 0,
    todayCount: 0,
    monthlyAmount: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; code: string }[]>([]);
  const [customers, setCustomers] = useState<
    { id: number; customer_name: string; customer_code: string }[]
  >([]);

  const [selectedRows, setSelectedRows] = useState<Item[]>([]);
  const [deleting, setDeleting] = useState(false);

  const handleBatchDelete = async () => {
    const ids = selectedRows.map((r) => r.id);
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/warehouse/sales-outbound?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    setSelectedRows([]);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        outboundNo: searchNo,
      });
      const res = await authFetch('/api/warehouse/sales-outbound?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };
  const fetchWarehouses = async () => {
    try {
      const res = await authFetch('/api/warehouse?status=1&all=true');
      const result = await res.json();
      if (result.success) setWarehouses(result.data || []);
    } catch {}
  };
  const fetchCustomers = async () => {
    try {
      const res = await authFetch('/api/customers?pageSize=999');
      const result = await res.json();
      if (result.success) setCustomers(result.data?.list || result.data || []);
    } catch {}
  };
  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/warehouse/sales-outbound/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [page, pageSize]);
  useEffect(() => {
    fetchWarehouses();
    fetchCustomers();
  }, []);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/warehouse/sales-outbound', {
        method: 'POST',
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/warehouse/sales-outbound', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('updateSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/warehouse/sales-outbound?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  // /api/warehouse/sales-outbound 未支持 sortField / sortDirection，故不开列排序（需后端补排序参数）
  const columns: StandardTableColumn<Item>[] = [
    {
      key: 'outbound_no',
      title: ts('k_1bwocym'),
      render: (r) => <span className="text-xs font-mono">{r.outbound_no}</span>,
    },
    {
      key: 'order_no',
      title: ts('k_m6144y'),
      render: (r) => <span className="text-xs">{r.order_no || '-'}</span>,
    },
    {
      key: 'customer_name',
      title: tc('customer'),
      render: (r) => <span className="text-xs">{r.customer_name || '-'}</span>,
    },
    {
      key: 'warehouse_name',
      title: tc('warehouse'),
      render: (r) => <span className="text-xs">{r.warehouse_name || '-'}</span>,
    },
    {
      key: 'outbound_date',
      title: ts('k_1au3mgm'),
      render: (r) => <span className="text-xs">{r.outbound_date || '-'}</span>,
    },
    {
      key: 'delivery_person',
      title: ts('k_1x8vy1t'),
      render: (r) => <span className="text-xs">{r.delivery_person || '-'}</span>,
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => {
        const st = statusMap[r.status] || statusMap[1];
        return (
          <Badge variant={st.variant} className="text-xs">
            {t(st.labelKey)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      // 原有操作列：确认出库 / 编辑 / 删除，逻辑保持原样
      render: (r) => (
        <div className="flex gap-1 justify-end">
          {r.status === 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(r.id, 2)}
            >
              {tc('confirmIssue')}</Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setEditItem(r);
              setShowDialog(true);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
            onClick={() => handleDelete(r.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeroHeader
          icon={Truck}
          title={ts('k_270k8')}
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 transition hover:shadow-lg"
            >
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_1r8y9zs')}</Button>
          }
        />        <StatsCards
          configs={[
            { key: 'pending', label: '待出库', icon: Clock, ...StatsTheme.orange },
            { key: 'partial', label: '部分出库', icon: PackageOpen, ...StatsTheme.yellow },
            { key: 'completed', label: '已出库', icon: CheckCircle, ...StatsTheme.green },
            { key: 'todayCount', label: '今日出库单数', icon: Truck, ...StatsTheme.blue },
            { key: 'monthlyAmount', label: '本月出库金额', icon: Banknote, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'partial', count: stats.partial },
            { key: 'completed', count: stats.completed },
            { key: 'todayCount', count: stats.todayCount },
            { key: 'monthlyAmount', count: stats.monthlyAmount, prefix: '¥' },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />


        <ListToolbar>
          <div className="flex items-center gap-2">
            <Input
              placeholder={tc('searchOrderNo')}
              value={searchNo}
              onChange={(e) => setSearchNo(e.target.value)}
              className="w-36 h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={fetchData}>
              <Search className="h-3 w-3" />
            </Button>
          </div>
        </ListToolbar>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-0">
            <BatchDeleteBar
              count={selectedRows.length}
              onClear={() => setSelectedRows([])}
              onDelete={handleBatchDelete}
              loading={deleting}
            />
            <StandardTable<Item>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              onRetry={fetchData}
              emptyText={t('noRecords')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addSalesOutboundOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc('warehouse')}</Label>
                <WarehouseSelect
                  value={editItem.warehouse_id || ''}
                  onChange={(v) => {
                    const wh = warehouses.find((w) => w.id === Number(v));
                    setEditItem({
                      ...editItem,
                      warehouse_id: Number(v),
                      warehouse_name: wh?.name || '',
                    });
                  }}
                  placeholder={t('selectWarehouse')}
                />
              </div>
              <div>
                <Label>{ts('k_1au3mgm')}</Label>
                <Input
                  type="date"
                  value={toDateInput(editItem.outbound_date)}
                  onChange={(e) => setEditItem({ ...editItem, outbound_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('salesOrderNo')}</Label>
                <Input
                  value={editItem.order_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, order_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_1o7upb7')}</Label>
                <Select
                  value={editItem.customer_name || ''}
                  onValueChange={(v) => setEditItem({ ...editItem, customer_name: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCustomer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.customer_name}>
                        {c.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('deliveryPerson')}</Label>
                <Input
                  value={editItem.delivery_person || ''}
                  onChange={(e) => setEditItem({ ...editItem, delivery_person: e.target.value })}
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
