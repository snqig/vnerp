'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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
import { Calendar, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    employeeId: 0,
    shiftId: 0,
    startDate: '',
    endDate: '',
  });

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

  useEffect(() => { fetchSchedules(); }, []);

  const changeMonth = (offset: number) => {
    const d = new Date(currentMonth + '-01');
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.shiftId || !form.startDate || !form.endDate) {
      toast.error(t('fillRequired') || '请填写完整信息');
      return;
    }
    try {
      const res = await authFetch('/api/hr/schedules', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(t('createSuccess') || '创建成功');
        setDialogOpen(false);
        fetchSchedules();
      } else {
        toast.error(json.message || tc('error'));
      }
    } catch {
      toast.error(t('saveFailed') || '保存失败');
    }
  };

  const filtered = schedules.filter((s) =>
    !search || s.employeeName?.toLowerCase().includes(search.toLowerCase())
  );

  const monthLabel = currentMonth;

  return (
    <MainLayout title={t('schedule')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{t('schedule')}</h1>
          </div>
          <Button onClick={() => { setForm({ employeeId: 0, shiftId: 0, startDate: '', endDate: '' }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />{tc('add')}
          </Button>
        </div>

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
              <Badge variant="secondary">{t('totalCount')} {filtered.length} {t('records')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('employeeName')}</TableHead>
                  <TableHead>{t('shiftName')}</TableHead>
                  <TableHead>{t('startDate')}</TableHead>
                  <TableHead>{t('endDate')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.employeeName}</TableCell>
                    <TableCell>{s.shiftName}</TableCell>
                    <TableCell>{s.startDate}</TableCell>
                    <TableCell>{s.endDate}</TableCell>
                    <TableCell>
                      <Badge className={
                        s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }>
                        {s.status === 'active' ? tc('active') : tc('inactive')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {loading ? tc('loading') : t('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
