'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeroHeader } from '@/components/layout/PageHeroHeader';
import { ListToolbar } from '@/components/layout/ListToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, ArrowRightLeft, CheckCircle, Clock, AlertTriangle, PackageOpen, Boxes } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import {
  StandardTable,
  type StandardTableColumn,
  StatusBadge,
  usePaginatedList,
} from '@/components/common';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface Item {
  id: number;
  inbound_no: string;
  work_order_no: string;
  warehouse_id?: number;
  warehouse_name: string;
  inbound_date: string;
  qc_status: number;
  status: number;
  operator_name: string;
  remark?: string;
}

export default function ProductionInboundPage() {
  const ts = useTranslations('Warehouse');
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const statusMap = {
    1: { label: tc('pendingInbound'), variant: 'outline' as const },
    2: { label: tc('received'), variant: 'default' as const },
    3: { label: tc('cancelled'), variant: 'destructive' as const },
  };
  const qcMap = {
    0: { label: tc('qcUnchecked'), variant: 'secondary' as const },
    1: { label: tc('qcQualified'), variant: 'default' as const },
    2: { label: tc('qcUnqualified'), variant: 'destructive' as const },
  };

  const { toast } = useToast();
  const { list, total, page, pageSize, setPage, setPageSize, search, setSearch, refresh } = usePaginatedList<Item>({
    fetchUrl: '/api/warehouse/production-inbound',
    searchKey: 'inboundNo',
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; code: string }[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    partial: 0,
    completed: 0,
    todayCount: 0,
    monthlyQty: 0,
  });

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
        const res = await authFetch(`/api/warehouse/production-inbound?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    setSelectedRows([]);
    refresh();
  };

  const fetchWarehouses = async () => {
    try {
      const res = await authFetch('/api/warehouse?status=1&all=true');
      const result = await res.json();
      if (result.success) setWarehouses(result.data || []);
    } catch {}
  };
  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/warehouse/production-inbound/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchStats();
  }, []);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/warehouse/production-inbound', {
        method: 'POST',
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        refresh();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/warehouse/production-inbound', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('updateSuccess') });
        refresh();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/warehouse/production-inbound?id=' + id, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        refresh();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const columns: StandardTableColumn<Item>[] = [
    {
      key: 'inbound_no',
      title: ts('k_8p71nd'),
      dataIndex: 'inbound_no',
      width: 140,
      className: 'text-xs font-mono',
    },
    {
      key: 'work_order_no',
      title: ts('k_jzt8aw'),
      width: 140,
      className: 'text-xs',
      render: (row) => row.work_order_no || '-',
    },
    {
      key: 'warehouse_name',
      title: tc('warehouse'),
      width: 140,
      className: 'text-xs',
      render: (row) => row.warehouse_name || '-',
    },
    {
      key: 'inbound_date',
      title: ts('k_wv7sht'),
      width: 110,
      className: 'text-xs',
      render: (row) => row.inbound_date || '-',
    },
    {
      key: 'qc_status',
      title: ts('k_p7p4rs'),
      width: 100,
      render: (row) => <StatusBadge status={row.qc_status} statusMap={qcMap} />,
    },
    {
      key: 'operator_name',
      title: ts('k_15sp2wy'),
      width: 100,
      className: 'text-xs',
      render: (row) => row.operator_name || '-',
    },
    {
      key: 'status',
      title: tc('status'),
      width: 100,
      render: (row) => <StatusBadge status={row.status} statusMap={statusMap} />,
    },
    {
      key: 'actions',
      title: tc('actions'),
      width: 180,
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(row.id, 2)}
            >
              {ts('k_1jot12v')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setEditItem(row);
              setShowDialog(true);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
            onClick={() => handleDelete(row.id)}
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
          icon={ArrowRightLeft}
          title={t('productionInbound')}
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
              {ts('k_5sawab')}</Button>
          }
        />        <StatsCards
          configs={[
            { key: 'pending', label: '待入库', icon: Clock, ...StatsTheme.orange },
            { key: 'partial', label: '部分入库', icon: PackageOpen, ...StatsTheme.yellow },
            { key: 'completed', label: '已入库', icon: CheckCircle, ...StatsTheme.green },
            { key: 'todayCount', label: '今日入库单数', icon: ArrowRightLeft, ...StatsTheme.blue },
            { key: 'monthlyQty', label: '本月入库数量', icon: Boxes, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'partial', count: stats.partial },
            { key: 'completed', count: stats.completed },
            { key: 'todayCount', count: stats.todayCount },
            { key: 'monthlyQty', count: stats.monthlyQty },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />


        <ListToolbar>
          <div className="flex items-center gap-2">
            <Input
              placeholder={tc('searchOrderNo')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-36 h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={refresh}>
              <Search className="h-3 w-3" />
            </Button>
          </div>
        </ListToolbar>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-0">
            {selectedRows.length > 0 && (
              <BatchDeleteBar
                count={selectedRows.length}
                onClear={() => setSelectedRows([])}
                onDelete={handleBatchDelete}
                loading={deleting}
              />
            )}
            <StandardTable<Item>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              rowKey="id"
              emptyText={tc('noRecords')}
            />
          </CardContent>
        </Card>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addInboundOrder')}</DialogTitle>
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
                <Label>{ts('k_wv7sht')}</Label>
                <Input
                  type="date"
                  value={editItem.inbound_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, inbound_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_jzt8aw')}</Label>
                <Input
                  value={editItem.work_order_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, work_order_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_15sp2wy')}</Label>
                <UserSelect
                  value={editItem.operator_name || ''}
                  onChange={(v) => setEditItem({ ...editItem, operator_name: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
