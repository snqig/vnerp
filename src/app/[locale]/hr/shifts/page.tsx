'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Shift {
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  allowOvertime: boolean;
  overtimeRate: number;
  nightAllowance: number;
  lateThreshold: number;
  earlyLeaveThreshold: number;
  workingHours: number;
  status: number;
}

const defaultForm = {
  shiftName: '',
  startTime: '08:00',
  endTime: '17:00',
  allowOvertime: false,
  overtimeRate: 1.5,
  nightAllowance: 0,
  lateThreshold: 30,
  earlyLeaveThreshold: 30,
  workingHours: 8,
  status: 1,
};

export default function ShiftsPage() {
  const ts = useTranslations('Common');
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [_loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Shift>>(defaultForm);
  const [search, setSearch] = useState('');

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/hr/shifts');
      const json = await res.json();
      if (json.code === 200) {
        const list = Array.isArray(json.data) ? json.data : json.data?.list || [];
        setShifts(list);
      }
    } catch {
      toast.error(t('fetchFailed') || ts('k_1hljxzm'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShifts(); }, []);

  const handleSave = async () => {
    if (!form.shiftName) {
      toast.error(t('enterShiftName') || ts('k_1we4by5'));
      return;
    }
    try {
      const method = editing ? 'PUT' : 'POST';
      const res = await authFetch('/api/hr/shifts', {
        method,
        body: JSON.stringify(editing ? { id: form.id, ...form } : form),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(editing ? (t('updateSuccess') || ts('k_1795bzg')) : (t('createSuccess') || ts('k_kiombh')));
        setDialogOpen(false);
        fetchShifts();
      } else {
        toast.error(json.message || tc('error'));
      }
    } catch {
      toast.error(t('saveFailed') || ts('k_1q9u8le'));
    }
  };

  const handleDelete = async (shift: Shift) => {
    if (!confirm(t('deleteConfirm') || ts('k_1r6qelo'))) return;
    try {
      const res = await authFetch(`/api/hr/shifts?id=${shift.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(t('deleteSuccess') || ts('k_1hlqs'));
        fetchShifts();
      }
    } catch {
      toast.error(t('deleteFailed') || ts('k_1ijrr73'));
    }
  };

  const openAdd = () => {
    setForm(defaultForm);
    setEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setForm(shift);
    setEditing(true);
    setDialogOpen(true);
  };

  const filtered = shifts.filter((s) =>
    !search || s.shiftName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout title={t('shift') || ts('k_4ndpw8')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{t('shift') || ts('k_4ndpw8')}</h1>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />{tc('add')}</Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tc('searchPlaceholder')}
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Badge variant="secondary">{t('totalCount') || ts('k_1vsm2qk')} {filtered.length} {t('records') || ts('k_1rfm5gs')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('shiftName') || ts('k_cc9p5i')}</TableHead>
                  <TableHead>{t('startTime') || ts('k_j6x7pa')}</TableHead>
                  <TableHead>{t('endTime') || ts('k_9uebcl')}</TableHead>
                  <TableHead>{t('allowOvertime') || ts('k_1udmajf')}</TableHead>
                  <TableHead>{t('overtimeRate') || ts('k_1fqrsmq')}</TableHead>
                  <TableHead>{t('nightAllowance') || ts('k_gw3gw3')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.shiftName}</TableCell>
                    <TableCell>{shift.startTime}</TableCell>
                    <TableCell>{shift.endTime}</TableCell>
                    <TableCell>
                      <Switch checked={shift.allowOvertime} disabled />
                    </TableCell>
                    <TableCell>{shift.overtimeRate}x</TableCell>
                    <TableCell>¥{shift.nightAllowance}</TableCell>
                    <TableCell>
                      <Badge className={shift.status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                        {shift.status === 1 ? (tc('active') || ts('k_5pm2ma')) : (tc('inactive') || ts('k_6q9o5l'))}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(shift)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(shift)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('noData') || ts('k_6tzr61')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editing ? (t('editShift') || ts('k_lb7w2i')) : (t('addShift') || ts('k_18jwn3l'))}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <Label>{t('shiftName') || ts('k_cc9p5i')}</Label>
                <Input value={form.shiftName || ''} onChange={(e) => setForm({ ...form, shiftName: e.target.value })} placeholder={ts('k_zmvcec')} />
              </div>
              <div className="space-y-2">
                <Label>{t('startTime') || ts('k_j6x7pa')}</Label>
                <Input type="time" value={form.startTime || '08:00'} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('endTime') || ts('k_9uebcl')}</Label>
                <Input type="time" value={form.endTime || '17:00'} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('overtimeRate') || ts('k_1fqrsmq')}</Label>
                <Input type="number" step="0.1" value={form.overtimeRate ?? 1.5} onChange={(e) => setForm({ ...form, overtimeRate: parseFloat(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>{t('nightAllowance') || ts('k_gw3gw3')}</Label>
                <Input type="number" value={form.nightAllowance ?? 0} onChange={(e) => setForm({ ...form, nightAllowance: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{t('lateThreshold') || ts('k_1t3lnmo')}</Label>
                <Input type="number" value={form.lateThreshold ?? 30} onChange={(e) => setForm({ ...form, lateThreshold: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{t('earlyLeaveThreshold') || ts('k_c2t5wy')}</Label>
                <Input type="number" value={form.earlyLeaveThreshold ?? 30} onChange={(e) => setForm({ ...form, earlyLeaveThreshold: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{t('workingHours') || ts('k_1gec5qq')}</Label>
                <Input type="number" step="0.5" value={form.workingHours ?? 8} onChange={(e) => setForm({ ...form, workingHours: parseFloat(e.target.value) || 8 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="allowOvertime"
                  checked={form.allowOvertime || false}
                  onCheckedChange={(v) => setForm({ ...form, allowOvertime: !!v })}
                />
                <Label htmlFor="allowOvertime">{t('allowOvertime') || ts('k_1udmajf')}</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Select value={String(form.status ?? 1)} onValueChange={(v) => setForm({ ...form, status: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tc('active') || ts('k_5pm2ma')}</SelectItem>
                    <SelectItem value="0">{tc('inactive') || ts('k_6q9o5l')}</SelectItem>
                  </SelectContent>
                </Select>
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
