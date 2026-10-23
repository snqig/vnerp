'use client';

import { authFetch } from '@/lib/auth-fetch';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/layout';
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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { formatDate } from '@/lib/date-utils';

interface Item {
  id: number;
  return_no: string;
  work_order_no: string;
  warehouse_id?: number;
  warehouse_name: string;
  return_date: string;
  status: number;
  operator_name: string;
  remark?: string;
}
const RETURN_STATUS_CONFIG: Record<
  number,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { variant: 'outline' },
  2: { variant: 'default' },
  3: { variant: 'destructive' },
};

export default function MaterialReturnPage() {
  const t = useTranslations('Production');
  const tc = useTranslations('Common');
  const _locale = useLocale();

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Item[]>([]);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const clear = () => setSelectedRows([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        returnNo: searchNo,
      });
      const res = await authFetch('/api/production/material-return?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };
  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  const handleBatchDelete = async () => {
    const ids = selectedRows.map((r) => String(r.id));
    if (ids.length === 0) return;
    if (!confirm(tc('confirmBatchDelete', { count: ids.length }))) return;
    let okCount = 0;
    let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/production/material-return?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++;
        else failMsg = data.message || failMsg;
      } catch {
        failMsg = tc('error');
      }
    }
    if (okCount > 0)
      toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear();
    fetchData();
  };

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/production/material-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/production/material-return', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('updateSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/production/material-return?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  // 注：/api/production/material-return 暂不支持 sortField/sortDirection，故先不开启 sortable。
  const returnStatusLabels: Record<number, string> = {
    1: t('pendingReturnStatus'),
    2: t('returnedStatus'),
    3: t('cancelledStatus'),
  };

  const columns: StandardTableColumn<Item>[] = [
    {
      key: 'return_no',
      title: t('returnNo'),
      render: (r) => <span className="text-xs font-mono">{r.return_no}</span>,
    },
    {
      key: 'work_order_no',
      title: t('workOrderNo'),
      render: (r) => <span className="text-xs">{r.work_order_no || '-'}</span>,
    },
    {
      key: 'warehouse_name',
      title: t('warehouse'),
      render: (r) => <span className="text-xs">{r.warehouse_name || '-'}</span>,
    },
    {
      key: 'return_date',
      title: t('returnDate'),
      render: (r) => <span className="text-xs">{formatDate(r.return_date) || '-'}</span>,
    },
    {
      key: 'operator_name',
      title: t('operator'),
      render: (r) => <span className="text-xs">{r.operator_name || '-'}</span>,
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => {
        const st = RETURN_STATUS_CONFIG[r.status] || RETURN_STATUS_CONFIG[1];
        return (
          <Badge variant={st.variant} className="text-xs">
            {returnStatusLabels[r.status] || tc('unknown')}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: tc('actions'),
      // 原有操作列：确认退料 / 编辑 / 删除，逻辑保持原样
      render: (r) => (
        <div className="flex gap-1">
          {r.status === 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(r.id, 2)}
            >
              {t('confirmReturn')}
            </Button>
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('materialReturnTitle')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('searchByNo')}
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
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
              {t('newReturn')}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedRows.length} onClear={clear} onDelete={handleBatchDelete} />
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
              emptyText={tc('noData')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('newReturnOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('warehouse')}</Label>
                <WarehouseSelect
                  value={editItem.warehouse_id || ''}
                  onChange={(v) => setEditItem({ ...editItem, warehouse_id: Number(v) })}
                  placeholder={t('selectWarehouse')}
                />
              </div>
              <div>
                <Label>{t('returnDate')}</Label>
                <Input
                  type="date"
                  value={editItem.return_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, return_date: e.target.value })}
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
                <Label>{t('operator')}</Label>
                <UserSelect
                  value={editItem.operator_name || ''}
                  onChange={(v) => setEditItem({ ...editItem, operator_name: v })}
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
