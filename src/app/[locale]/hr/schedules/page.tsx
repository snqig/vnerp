'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { Calendar, Plus, Search, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle, CalendarDays, CalendarRange } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';

interface Schedule {
  id: number;
  employeeId: number;
  employeeName: string;
  shiftId: number;
  shiftName: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Employee {
  id: number;
  name: string;
  employee_no: string;
}

const mockShifts = [
  { id: 1, shiftName: 'shiftMorning' },
  { id: 2, shiftName: 'shiftAfternoon' },
  { id: 3, shiftName: 'shiftNight' },
];

export default function SchedulesPage() {
  const ts = useTranslations('Common');
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const columns: StandardTableColumn<Schedule>[] = [
    { key: 'employeeName', title: '', render: (record) => <span className="font-medium">{record.employeeName}</span> },
    { key: 'shiftName', title: '', render: (record) => <span>{record.shiftName}</span> },
    { key: 'startDate', title: '', render: (record) => <span>{record.startDate}</span> },
    { key: 'endDate', title: '', render: (record) => <span>{record.endDate}</span> },
    {
      key: 'status',
      title: '',
      render: (record) => (
        <Badge className={
          record.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
        }>
          {record.status === 'active' ? tc('active') : tc('inactive')}
        </Badge>
      ),
    },
  ];

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [_employees, _setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState({
    todayScheduled: 0,
    weekScheduled: 0,
    monthlyCount: 0,
    totalShifts: 0,
    todayLate: 0,
  });
  const [form, setForm] = useState({
    employeeId: 0,
    shiftId: 0,
    startDate: '',
    endDate: '',
  });

  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/hr/schedules');
      const json = await res.json();
      if (json.code === 200) {
        const list = Array.isArray(json.data) ? json.data : json.data?.list || [];
        setSchedules(list);
      } else {
        setSchedules([]);
      }
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/hr/schedules/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchStats();
  }, []);

  const changeMonth = (offset: number) => {
    const d = new Date(currentMonth + '-01');
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.shiftId || !form.startDate || !form.endDate) {
      toast.error(t('fillRequired') || ts('k_p6jf36'));
      return;
    }
    try {
      const res = await authFetch('/api/hr/schedules', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(t('createSuccess') || ts('k_kiombh'));
        setDialogOpen(false);
        fetchSchedules();
      } else {
        toast.error(json.message || tc('error'));
      }
    } catch {
      toast.error(t('saveFailed') || ts('k_1q9u8le'));
    }
  };

  const filtered = schedules.filter((s) =>
    !search || s.employeeName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBatchDelete = async () => {
    const ids = selectedRows;
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/hr/schedules?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.code === 200) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast.success(tc('batchDeleteSuccess', { count: okCount }));
    if (failMsg) toast.error(failMsg);
    setSelectedRows([]);
    fetchSchedules();
  };

  const monthLabel = currentMonth;

  return (
    <MainLayout title={t('schedule')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            <h1 className="text-2xl font-bold">{t('schedule')}</h1>
          </div>
          <Button onClick={() => { setForm({ employeeId: 0, shiftId: 0, startDate: '', endDate: '' }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />{tc('add')}
          </Button>
        </div>        <StatsCards
          configs={[
            { key: 'todayScheduled', label: '今日排班人数', icon: Calendar, ...StatsTheme.blue },
            { key: 'weekScheduled', label: '本周排班人数', icon: CalendarDays, ...StatsTheme.green },
            { key: 'monthlyCount', label: '本月排班次数', icon: CalendarRange, ...StatsTheme.cyan },
            { key: 'totalShifts', label: '班次总数', icon: Clock, ...StatsTheme.orange },
            { key: 'todayLate', label: '今日迟到人数', icon: AlertTriangle, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'todayScheduled', count: stats.todayScheduled },
            { key: 'weekScheduled', count: stats.weekScheduled },
            { key: 'monthlyCount', count: stats.monthlyCount },
            { key: 'totalShifts', count: stats.totalShifts },
            { key: 'todayLate', count: stats.todayLate },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />



        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{monthLabel}</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tc('searchPlaceholder')}
                    className="pl-10 w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} loading={deleting} />
            <StandardTable<Schedule>
              rowSelectable
              selectedRows={filtered.filter((r) => selectedRows.includes(r.id))}
              onRowSelectedChange={(rows) => setSelectedRows(rows.map((r) => r.id))}
              rowKey="id"
              dataSource={filtered}
              columns={columns}
              total={filtered.length}
              showPagination
            />
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('addSchedule')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('employeeId')}</Label>
                <Input
                  type="number"
                  placeholder={t('enterEmployeeId')}
                  value={form.employeeId || ''}
                  onChange={(e) => setForm({ ...form, employeeId: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('shift')}</Label>
                <Select value={String(form.shiftId)} onValueChange={(v) => setForm({ ...form, shiftId: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectShift')} />
                  </SelectTrigger>
                  <SelectContent>
                    {mockShifts.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{t(s.shiftName)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('startDate')}</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('endDate')}</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
