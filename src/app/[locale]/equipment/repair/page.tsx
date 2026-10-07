'use client';

import { authFetch } from '@/lib/auth-fetch';
import { toDateInput } from '@/lib/date-utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Wrench, CheckCircle, Clock, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { StandardTable, StandardTableColumn, SortState } from '@/components/common';

interface Item {
  id: number;
  repair_no: string;
  equipment_code: string;
  equipment_name: string;
  fault_date: string;
  fault_desc: string;
  repair_type: string;
  repair_person: string;
  status: number;
}
const typeMap: Record<string, string> = {
  corrective: '故障维修',
  preventive: '预防性维修',
  emergency: '紧急维修',
};

export default function EquipmentRepairPage() {
  const ts = useTranslations('Equipment');
  // 翻译钩子
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: ts('k_kv3w6u'), variant: 'outline' },
    2: { label: ts('k_1jvastq'), variant: 'default' },
    3: { label: ts('k_19j4h'), variant: 'secondary' },
    4: { label: tc('closed'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchNo, setSearchNo] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    repairing: 0,
    completed: 0,
    monthlyCount: 0,
    monthlyCost: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [sort, setSort] = useState<SortState>(null);
  const [selectedRows, setSelectedRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        repairNo: searchNo,
      });
      if (sort) {
        params.set('sortField', sort.field);
        params.set('sortDirection', sort.direction);
      }
      const res = await authFetch('/api/equipment/repair?' + params);
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
      const res = await authFetch('/api/equipment/repair/stats');
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
    // P1-1 前端守卫：与后端同口径（设备身份/故障日期/故障描述/维修人必填）
    if (
      String(editItem.equipment_code ?? '').trim() === '' &&
      String(editItem.equipment_name ?? '').trim() === ''
    ) {
      toast({ title: tc('equipmentIdentityRequired'), variant: 'destructive' });
      return;
    }
    if (String(editItem.fault_date ?? '').trim() === '') {
      toast({ title: tc('repairFaultDateRequired'), variant: 'destructive' });
      return;
    }
    if (String(editItem.fault_desc ?? '').trim() === '') {
      toast({ title: tc('repairFaultDescRequired'), variant: 'destructive' });
      return;
    }
    if (String(editItem.repair_person ?? '').trim() === '') {
      toast({ title: tc('repairPersonRequired'), variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/equipment/repair', {
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
      const res = await authFetch('/api/equipment/repair', {
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
      const res = await authFetch('/api/equipment/repair?id=' + id, { method: 'DELETE' });
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
        const res = await authFetch(`/api/equipment/repair?id=${id}`, { method: 'DELETE' });
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
      key: 'repair_no',
      title: ts('k_1j82wwz'),
      render: (r) => <span className="text-xs font-mono">{r.repair_no}</span>,
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
      key: 'fault_date',
      title: ts('k_3s4z78'),
      render: (r) => <span className="text-xs">{r.fault_date || '-'}</span>,
    },
    {
      key: 'fault_desc',
      title: ts('k_784d9f'),
      render: (r) => <span className="text-xs max-w-32 truncate">{r.fault_desc || '-'}</span>,
    },
    {
      key: 'repair_type',
      title: ts('k_1migccd'),
      render: (r) => <span className="text-xs">{typeMap[r.repair_type] || '-'}</span>,
    },
    {
      key: 'repair_person',
      title: ts('k_gquu0n'),
      render: (r) => <span className="text-xs">{r.repair_person || '-'}</span>,
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
              {ts('k_r6qw02')}
            </Button>
          )}
          {r.status === 2 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(r.id, 3)}
            >
              {ts('k_8cfjmp')}
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
          <h1 className="text-2xl font-bold">{ts('k_15hkir8')}</h1>
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
              {ts('k_1f62jlo')}
            </Button>
          </div>
        </div>
        <StatsCards
          configs={[
            { key: 'pending', label: '待维修', icon: Clock, ...StatsTheme.orange },
            { key: 'repairing', label: '维修中', icon: Wrench, ...StatsTheme.blue },
            { key: 'completed', label: '已完成', icon: CheckCircle, ...StatsTheme.green },
            { key: 'monthlyCount', label: '本月维修数', icon: Calendar, ...StatsTheme.cyan },
            { key: 'monthlyCost', label: '本月维修费用', icon: DollarSign, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'repairing', count: stats.repairing },
            { key: 'completed', count: stats.completed },
            { key: 'monthlyCount', count: stats.monthlyCount },
            { key: 'monthlyCost', count: stats.monthlyCost, prefix: '¥' },
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
              <DialogTitle>{ts('k_1f62jlo')}</DialogTitle>
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
                <Label>{ts('k_3s4z78')}</Label>
                <Input
                  type="date"
                  value={toDateInput(editItem.fault_date)}
                  onChange={(e) => setEditItem({ ...editItem, fault_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_1migccd')}</Label>
                <Select
                  value={editItem.repair_type || 'corrective'}
                  onValueChange={(v) => setEditItem({ ...editItem, repair_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">{ts('k_1s9r742')}</SelectItem>
                    <SelectItem value="corrective">{ts('k_4ebikq')}</SelectItem>
                    <SelectItem value="emergency">{ts('k_xa2tkr')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_gquu0n')}</Label>
                <UserSelect
                  value={editItem.repair_person || ''}
                  onChange={(v) => setEditItem({ ...editItem, repair_person: v })}
                />
              </div>
              <div className="col-span-2">
                <Label>{ts('k_784d9f')}</Label>
                <Input
                  value={editItem.fault_desc || ''}
                  onChange={(e) => setEditItem({ ...editItem, fault_desc: e.target.value })}
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
