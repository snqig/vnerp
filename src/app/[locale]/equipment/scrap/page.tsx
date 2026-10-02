'use client';

import { authFetch } from '@/lib/auth-fetch';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, CheckCircle, Clock, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { StandardTable, StandardTableColumn, SortState } from '@/components/common';

interface Item {
  id: number;
  scrap_no: string;
  equipment_code: string;
  equipment_name: string;
  scrap_date: string;
  scrap_reason: string;
  original_value: number;
  net_value: number;
  approval_person: string;
  status: number;
}
export default function EquipmentScrapPage() {
  const ts = useTranslations('Equipment');
  // 翻译钩子
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: tc('pending'), variant: 'outline' },
    2: { label: tc('approved'), variant: 'default' },
    3: { label: ts('k_oy744d'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchNo, setSearchNo] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    scrapped: 0,
    monthlyCount: 0,
    monthlyOriginalValue: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [sort, setSort] = useState<SortState>(null);
  const [selectedRows, setSelectedRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), scrapNo: searchNo });
      if (sort) {
        params.set('sortField', sort.field);
        params.set('sortDirection', sort.direction);
      }
      const res = await authFetch('/api/equipment/scrap?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  };
  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/equipment/scrap/stats');
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
  }, [page, pageSize, searchNo, sort]);

  const handleSortChange = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/equipment/scrap', {
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
        toast({
          title: tc('operationFailed'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/equipment/scrap', {
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
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDeleteMsg'))) return;
    try {
      const res = await authFetch('/api/equipment/scrap?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
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
        const res = await authFetch(`/api/equipment/scrap?id=${id}`, { method: 'DELETE' });
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

  const columns: StandardTableColumn<Item>[] = [
    {
      key: 'scrap_no',
      title: ts('k_1ggqij1'),
      render: (r) => <span className="text-xs font-mono">{r.scrap_no}</span>,
    },
    {
      key: 'equipment_code',
      title: ts('k_17s4qyf'),
      render: (r) => <span className="text-xs">{r.equipment_code || '-'}</span>,
    },
    {
      key: 'equipment_name',
      title: ts('k_eb1q6f'),
      render: (r) => <span className="text-xs">{r.equipment_name || '-'}</span>,
    },
    {
      key: 'scrap_date',
      title: ts('k_1oc5iv9'),
      render: (r) => <span className="text-xs">{r.scrap_date || '-'}</span>,
    },
    {
      key: 'scrap_reason',
      title: ts('k_1h3xyle'),
      render: (r) => <span className="text-xs max-w-28 truncate">{r.scrap_reason || '-'}</span>,
    },
    {
      key: 'original_value',
      title: ts('k_12o2s46'),
      render: (r) => <span className="text-xs">¥{Number(r.original_value || 0).toFixed(2)}</span>,
    },
    {
      key: 'net_value',
      title: ts('k_2dlv89'),
      render: (r) => <span className="text-xs">¥{Number(r.net_value || 0).toFixed(2)}</span>,
    },
    {
      key: 'approval_person',
      title: tc('approver'),
      render: (r) => <span className="text-xs">{r.approval_person || '-'}</span>,
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => {
        const st = statusMap[r.status] || statusMap[1];
        return <Badge variant={st.variant} className="text-xs">{st.label}</Badge>;
      },
    },
    {
      key: 'actions',
      title: tc('actions'),
      render: (r) => (
        <div className="flex gap-1">
          {r.status === 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(r.id, 2)}
            >
              {ts('k_1fb3cb3')}
            </Button>
          )}
          {r.status === 2 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(r.id, 3)}
            >
              {ts('k_1hma1hv')}
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
          <h1 className="text-2xl font-bold">{ts('k_1dfoqke')}</h1>
          <div className="flex gap-2">
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
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {tc('scrapTitle')}
            </Button>
          </div>
        </div>
        <StatsCards
          configs={[
            { key: 'pending', label: '待审批', icon: Clock, ...StatsTheme.orange },
            { key: 'approved', label: '已审批', icon: CheckCircle, ...StatsTheme.blue },
            { key: 'scrapped', label: '已报废', icon: Trash2, ...StatsTheme.gray },
            { key: 'monthlyCount', label: '本月报废数', icon: Calendar, ...StatsTheme.cyan },
            { key: 'monthlyOriginalValue', label: '本月报废原值', icon: DollarSign, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'approved', count: stats.approved },
            { key: 'scrapped', count: stats.scrapped },
            { key: 'monthlyCount', count: stats.monthlyCount },
            { key: 'monthlyOriginalValue', count: stats.monthlyOriginalValue, prefix: '¥' },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />

        <Card>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} />
            <StandardTable<Item>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable={true}
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              sortState={sort}
              onSortChange={handleSortChange}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              loading={loading}
              emptyText={tc('noRecords')}
            />
          </CardContent>
        </Card>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{tc('scrapTitle')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{ts('k_17s4qyf')}</Label>
                <Input
                  value={editItem.equipment_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, equipment_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_eb1q6f')}</Label>
                <Input
                  value={editItem.equipment_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, equipment_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_1oc5iv9')}</Label>
                <Input
                  type="date"
                  value={editItem.scrap_date || ''}
                  onChange={(e) => setEditItem({ ...editItem, scrap_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('approver')}</Label>
                <Input
                  value={editItem.approval_person || ''}
                  onChange={(e) => setEditItem({ ...editItem, approval_person: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_12o2s46')}</Label>
                <Input
                  type="number"
                  value={editItem.original_value || ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, original_value: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_2dlv89')}</Label>
                <Input
                  type="number"
                  value={editItem.net_value || ''}
                  onChange={(e) => setEditItem({ ...editItem, net_value: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>{ts('k_1h3xyle')}</Label>
                <Input
                  value={editItem.scrap_reason || ''}
                  onChange={(e) => setEditItem({ ...editItem, scrap_reason: e.target.value })}
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
