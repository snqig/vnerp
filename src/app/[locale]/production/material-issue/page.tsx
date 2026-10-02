'use client';

import { authFetch } from '@/lib/auth-fetch';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
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
import { Plus, Search, Edit, Trash2, Package, CheckCircle, Clock, AlertTriangle, Calendar, PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { formatDate } from '@/lib/date-utils';

interface Item {
  id: number;
  issue_no: string;
  work_order_no: string;
  warehouse_id?: number;
  warehouse_name: string;
  issue_date: string;
  issue_type: number;
  status: number;
  operator_name: string;
  remark?: string;
}
const STATUS_CONFIG: Record<
  number,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { variant: 'outline' },
  2: { variant: 'default' },
  3: { variant: 'destructive' },
};
const TYPE_MAP: Record<number, string> = {
  1: 'normalIssue',
  2: 'supplementaryIssue',
  3: 'overIssue',
};

export default function MaterialIssuePage() {
  const t = useTranslations('Production');
  const tc = useTranslations('Common');
  const _locale = useLocale();

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
    monthlyQty: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [selectedRows, setSelectedRows] = useState<Item[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        issueNo: searchNo,
      });
      const res = await authFetch('/api/production/material-issue?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };
  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/production/material-issue/stats');
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

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/production/material-issue', {
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
      const res = await authFetch('/api/production/material-issue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await authFetch('/api/production/material-issue?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };
  const handleBatchDelete = async () => {
    const ids = selectedRows.map((r) => r.id);
    if (ids.length === 0) return;
    if (!confirm(tc('confirmBatchDelete', { count: ids.length }))) return;
    let okCount = 0;
    let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/production/material-issue?id=${id}`, { method: 'DELETE' });
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
    setSelectedRows([]);
    fetchData();
  };

  // /api/production/material-issue 未支持 sortField / sortDirection，故不开列排序（需后端补排序参数）
  const columns: StandardTableColumn<Item>[] = [
    {
      key: 'issue_no',
      title: t('issueNo'),
      render: (r) => <span className="text-xs font-mono">{r.issue_no}</span>,
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
      key: 'issue_date',
      title: t('issueDate'),
      render: (r) => <span className="text-xs">{formatDate(r.issue_date) || '-'}</span>,
    },
    {
      key: 'issue_type',
      title: t('issueType'),
      render: (r) => <span className="text-xs">{t(TYPE_MAP[r.issue_type] || '') || '-'}</span>,
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
        const st = STATUS_CONFIG[r.status] || STATUS_CONFIG[1];
        const statusLabels: Record<number, string> = {
          1: t('pendingIssueStatus'),
          2: t('issuedStatus'),
          3: t('cancelledStatus'),
        };
        return (
          <Badge variant={st.variant} className="text-xs">
            {statusLabels[r.status] || tc('unknown')}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      // 原有操作列：确认发料 / 编辑 / 删除，逻辑保持原样
      render: (r) => (
        <div className="flex gap-1 justify-end">
          {r.status === 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(r.id, 2)}
            >
              {t('confirmIssue')}
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
        <StatsCards
          configs={[
            { key: 'pending', label: '待发料', icon: Clock, ...StatsTheme.orange },
            { key: 'partial', label: '部分发料', icon: Package, ...StatsTheme.blue },
            { key: 'completed', label: '已发料', icon: CheckCircle, ...StatsTheme.green },
            { key: 'todayCount', label: '今日发料单数', icon: Calendar, ...StatsTheme.cyan },
            { key: 'monthlyQty', label: '本月发料数量', icon: PackagePlus, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'partial', count: stats.partial },
            { key: 'completed', count: stats.completed },
            { key: 'todayCount', count: stats.todayCount },
            { key: 'monthlyQty', count: stats.monthlyQty },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
          showTrend={false}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('materialIssueTitle')}</h1>
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
              {t('newIssue')}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <BatchDeleteBar
              count={selectedRows.length}
              onClear={() => setSelectedRows([])}
              onDelete={handleBatchDelete}
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
              emptyText={tc('noData')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>
      </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('newIssueOrder')}</DialogTitle>
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
                <Label>{t('issueDate')}</Label>
                <Input
                  type="date"
                  value={editItem.issue_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, issue_date: e.target.value })}
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
                <Label>{t('issueType')}</Label>
                <Select
                  value={String(editItem.issue_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, issue_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('normalIssue')}</SelectItem>
                    <SelectItem value="2">{t('supplementaryIssue')}</SelectItem>
                    <SelectItem value="3">{t('overIssue')}</SelectItem>
                  </SelectContent>
                </Select>
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
    </MainLayout>
  );
}
