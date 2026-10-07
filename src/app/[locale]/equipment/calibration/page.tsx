'use client';

import { authFetch } from '@/lib/auth-fetch';
import { toDateInput } from '@/lib/date-utils';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { useEffect, useState, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Ruler, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { StandardTable, StandardTableColumn, SortState } from '@/components/common';

interface Item {
  id: number;
  calibration_no: string;
  equipment_code: string;
  equipment_name: string;
  calibration_date: string;
  next_calibration_date: string;
  calibration_org: string;
  calibration_result: string;
  certificate_no: string;
  status: number;
}
const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: '待检定', variant: 'outline' },
  2: { label: '检定中', variant: 'default' },
  3: { label: '已合格', variant: 'secondary' },
  4: { label: '不合格', variant: 'destructive' },
};

export default function EquipmentCalibrationPage() {
  const ts = useTranslations('Equipment');
  // 翻译钩子
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>(null);
  const [selectedRows, setSelectedRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchNo, setSearchNo] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    calibrating: 0,
    completed: 0,
    overdue: 0,
    monthlyCount: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        calibrationNo: searchNo,
      });
      if (sort) {
        params.set('sortField', sort.field);
        params.set('sortDirection', sort.direction);
      }
      const res = await authFetch('/api/equipment/calibration?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, searchNo]);

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/equipment/calibration/stats');
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
  }, [fetchData]);

  const handleSortChange = (s: SortState) => {
    setSort(s);
    setPage(1);
  };

  const handleSave = async () => {
    // P1-2 前端守卫：与后端同口径（设备身份/校准日期必填，结果限值域）
    if (
      String(editItem.equipment_code ?? '').trim() === '' &&
      String(editItem.equipment_name ?? '').trim() === ''
    ) {
      toast({ title: tc('equipmentIdentityRequired'), variant: 'destructive' });
      return;
    }
    if (String(editItem.calibration_date ?? '').trim() === '') {
      toast({ title: tc('calibrationDateRequired'), variant: 'destructive' });
      return;
    }
    const resultVal = String(editItem.calibration_result ?? 'qualified');
    if (resultVal !== 'qualified' && resultVal !== 'unqualified') {
      toast({ title: tc('calibrationResultInvalid'), variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/equipment/calibration', {
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
      const res = await authFetch('/api/equipment/calibration', {
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
      const res = await authFetch('/api/equipment/calibration?id=' + id, { method: 'DELETE' });
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
    const ids = selectedRows.map((r) => String(r.id));
    if (ids.length === 0) return;
    if (!confirm(tc('confirmBatchDelete', { count: ids.length }))) return;
    let okCount = 0;
    let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/equipment/calibration?id=${id}`, { method: 'DELETE' });
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
      key: 'calibration_no',
      title: ts('k_jko3l7'),
      render: (r) => <span className="font-mono text-xs">{r.calibration_no}</span>,
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
      key: 'calibration_date',
      title: ts('k_14yjphf'),
      render: (r) => <span className="text-xs">{r.calibration_date || '-'}</span>,
    },
    {
      key: 'next_calibration_date',
      title: tc('nextCalibrationDate'),
      render: (r) => <span className="text-xs">{r.next_calibration_date || '-'}</span>,
    },
    {
      key: 'calibration_org',
      title: ts('k_tb1ckh'),
      render: (r) => <span className="text-xs">{r.calibration_org || '-'}</span>,
    },
    {
      key: 'certificate_no',
      title: tc('certNo'),
      render: (r) => <span className="text-xs">{r.certificate_no || '-'}</span>,
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
              {ts('k_5pu12i')}
            </Button>
          )}
          {r.status === 2 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(r.id, 3)}
            >
              {ts('k_109sg5t')}
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
          <h1 className="text-2xl font-bold">{ts('k_1knvan8')}</h1>
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
              {tc('calibrationTitle')}</Button>
          </div>
        </div>        <StatsCards
          configs={[
            { key: 'pending', label: '待校准', icon: Clock, ...StatsTheme.orange },
            { key: 'calibrating', label: '校准中', icon: Ruler, ...StatsTheme.blue },
            { key: 'completed', label: '已完成', icon: CheckCircle, ...StatsTheme.green },
            { key: 'overdue', label: '逾期未校准', icon: AlertTriangle, ...StatsTheme.red },
            { key: 'monthlyCount', label: '本月校准次数', icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'calibrating', count: stats.calibrating },
            { key: 'completed', count: stats.completed },
            { key: 'overdue', count: stats.overdue },
            { key: 'monthlyCount', count: stats.monthlyCount },
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
              <DialogTitle>{tc('calibrationTitle')}</DialogTitle>
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
                <Label>{ts('k_14yjphf')}</Label>
                <Input
                  type="date"
                  value={toDateInput(editItem.calibration_date)}
                  onChange={(e) => setEditItem({ ...editItem, calibration_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('nextCalibrationDate')}</Label>
                <Input
                  type="date"
                  value={toDateInput(editItem.next_calibration_date)}
                  onChange={(e) =>
                    setEditItem({ ...editItem, next_calibration_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_tb1ckh')}</Label>
                <Input
                  value={editItem.calibration_org || ''}
                  onChange={(e) => setEditItem({ ...editItem, calibration_org: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('certNo')}</Label>
                <Input
                  value={editItem.certificate_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, certificate_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('calibrationResult')}</Label>
                <Select
                  value={editItem.calibration_result || 'qualified'}
                  onValueChange={(v) => setEditItem({ ...editItem, calibration_result: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualified">{tc('qualified')}</SelectItem>
                    <SelectItem value="unqualified">{tc('unqualified')}</SelectItem>
                  </SelectContent>
                </Select>
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
