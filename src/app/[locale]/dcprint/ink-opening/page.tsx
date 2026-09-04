'use client';

import { authFetch } from '@/lib/auth-fetch';
import { INK_TYPE_LABEL, INK_STATUS_LABEL } from '@/lib/status-labels';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  Droplets,
  Eye,
  Trash2,
  Timer,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { useTranslations } from 'next-intl';

interface InkOpeningRecord {
  id: number;
  record_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  batch_no: string;
  label_id: number;
  ink_type: string;
  open_time: string;
  expire_hours: number;
  expire_time: string;
  remaining_qty: number;
  unit: string;
  status: number;
  operator_id: number;
  operator_name: string;
  remark: string;
  create_time: string;
}

const INK_TYPE_MAP: Record<string, { label: string; color: string }> = {
  solvent: { label: INK_TYPE_LABEL['solvent'], color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  uv: { label: INK_TYPE_LABEL['uv'], color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  water: { label: INK_TYPE_LABEL['water'], color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
};

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: INK_STATUS_LABEL[1], color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  2: { label: INK_STATUS_LABEL[2], color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  3: { label: INK_STATUS_LABEL[3], color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
};

const EXPIRE_HOURS_OPTIONS = [
  { value: 24, label: '24小时' },
  { value: 48, label: '48小时' },
  { value: 72, label: '72小时' },
  { value: 96, label: '96小时' },
  { value: 120, label: '120小时' },
  { value: 168, label: '168小时(7天)' },
  { value: 336, label: '336小时(14天)' },
  { value: 720, label: '720小时(30天)' },
];

export default function InkOpeningPage() {
  const ts = useTranslations('Dcprint');
  // 翻译钩子
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [records, setRecords] = useState<InkOpeningRecord[]>([]);
  const [overdueList, setOverdueList] = useState<InkOpeningRecord[]>([]);
  const [_loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inkTypeFilter, setInkTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<InkOpeningRecord | null>(null);
  const [summary, setSummary] = useState({
    total_count: 0,
    using_count: 0,
    expired_count: 0,
    scrapped_count: 0,
    overdue_using_count: 0,
  });

  const [form, setForm] = useState({
    material_id: '',
    material_code: '',
    material_name: '',
    batch_no: '',
    ink_type: 'solvent',
    open_time: new Date().toISOString().slice(0, 16),
    expire_hours: 48,
    remaining_qty: '',
    unit: 'kg',
    operator_name: '',
    remark: '',
  });

  const [materials, setMaterials] = useState<Loose[]>([]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (inkTypeFilter !== 'all') params.set('ink_type', inkTypeFilter);
      params.set('pageSize', '50');
      const res = await authFetch(`/api/dcprint/ink-opening?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data?.list || []);
        if (data.data?.summary) setSummary(data.data.summary);
        if (data.data?.overdue_list) setOverdueList(data.data.overdue_list);
      }
    } catch {
      toast({ title: ts('k_7fixno'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, inkTypeFilter]);

  const MOCK_MATERIALS: Loose[] = [
    { id: 1, material_code: 'MAT006', material_name: ts('k_133reaf'), specification: ts('k_mumo5t'), unit: 'kg', status: 1 },
    { id: 2, material_code: 'MAT007', material_name: ts('k_l9kfgb'), specification: ts('k_mumo5t'), unit: 'kg', status: 1 },
    { id: 3, material_code: 'MAT008', material_name: ts('k_aagok0'), specification: ts('k_mumo5t'), unit: 'kg', status: 1 },
    { id: 4, material_code: 'MAT009', material_name: ts('k_1irsna3'), specification: ts('k_mumo5t'), unit: 'kg', status: 1 },
    { id: 5, material_code: 'MAT010', material_name: ts('k_vxbgrq'), specification: ts('k_mumo5t'), unit: 'kg', status: 1 },
    { id: 6, material_code: 'MAT011', material_name: ts('k_76g1oh'), specification: ts('k_chjqhm'), unit: 'kg', status: 1 },
    { id: 7, material_code: 'MAT012', material_name: ts('k_8ozpu5'), specification: ts('k_chjqhm'), unit: 'kg', status: 1 },
    { id: 8, material_code: 'MAT013', material_name: ts('k_l9y2ij'), specification: ts('k_mumo5t'), unit: 'kg', status: 1 },
    { id: 9, material_code: 'MAT014', material_name: ts('k_59pmqr'), specification: ts('k_mumo5t'), unit: 'kg', status: 1 },
    { id: 10, material_code: 'MAT015', material_name: ts('k_6gy97h'), specification: ts('k_mumo5t'), unit: 'kg', status: 1 },
  ];

  const fetchMaterials = async () => {
    try {
      const res = await authFetch('/api/inventory/materials?category=ink&pageSize=100');
      const data = await res.json();
      if (data.success) {
        const list = data.data?.list || data.data || [];
        setMaterials(list.length > 0 ? list : MOCK_MATERIALS);
      } else {
        setMaterials(MOCK_MATERIALS);
      }
    } catch {
      setMaterials(MOCK_MATERIALS);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchMaterials();
  }, [fetchRecords]);

  const handleCreate = async () => {
    if (!form.material_id || !form.open_time || !form.expire_hours) {
      toast({ title: ts('k_fav68u'), variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/dcprint/ink-opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: parseInt(form.material_id),
          material_code: form.material_code,
          material_name: form.material_name,
          batch_no: form.batch_no,
          ink_type: form.ink_type,
          open_time: form.open_time,
          expire_hours: form.expire_hours,
          remaining_qty: form.remaining_qty ? parseFloat(form.remaining_qty) : null,
          unit: form.unit,
          operator_name: form.operator_name,
          remark: form.remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: ts('k_1iho8wf') });
        setDialogOpen(false);
        setForm({
          material_id: '',
          material_code: '',
          material_name: '',
          batch_no: '',
          ink_type: 'solvent',
          open_time: new Date().toISOString().slice(0, 16),
          expire_hours: 48,
          remaining_qty: '',
          unit: 'kg',
          operator_name: '',
          remark: '',
        });
        fetchRecords();
      } else {
        toast({ title: data.message || ts('k_1jxltyq'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_8xkd38'), variant: 'destructive' });
    }
  };

  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/dcprint/ink-opening', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('statusUpdateSuccess') });
        fetchRecords();
      } else {
        toast({ title: data.message || ts('k_10lkv9z'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_10lkv9z'), variant: 'destructive' });
    }
  };

  const _handleDelete = async (id: number) => {
    if (!confirm(ts('k_958ogx'))) return;
    try {
      const res = await authFetch(`/api/dcprint/ink-opening?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: ts('k_1hlqs') });
        fetchRecords();
      } else {
        toast({ title: data.message || ts('k_1ijrr73'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_1ijrr73'), variant: 'destructive' });
    }
  };

  const getTimeRemaining = (expireTime: string) => {
    const now = new Date().getTime();
    const expire = new Date(expireTime).getTime();
    const diff = expire - now;
    if (diff <= 0) return { text: ts('k_1g217or'), isOverdue: true, isWarning: false };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours < 4) return { text: `${hours}时${minutes}分`, isOverdue: false, isWarning: true };
    return { text: `${hours}时${minutes}分`, isOverdue: false, isWarning: false };
  };

  const handleViewDetail = (record: InkOpeningRecord) => {
    setDetailData(record);
    setDetailOpen(true);
  };

  return (
    <MainLayout title={ts('k_1iipc14')}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{ts('k_kr2h4d')}</CardTitle>
              <Droplets className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.using_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tc('dcInUseDesc')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{ts('k_1g217or')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.expired_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tc('dcExpiredDesc')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{ts('k_1fdyuoa')}</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {summary.overdue_using_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tc('dcSoonExpiredDesc')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{ts('k_oy744d')}</CardTitle>
              <Trash2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {summary.scrapped_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tc('dcScrappedDesc')}</p>
            </CardContent>
          </Card>
        </div>

        {overdueList.length > 0 && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                {ts('k_1tqco41')}</CardTitle>
              <CardDescription className="text-red-600 dark:text-red-400">
                {ts('k_3677rg')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts('k_4gtnya')}</TableHead>
                    <TableHead>{ts('k_pegwq9')}</TableHead>
                    <TableHead>{ts('k_10yyuf6')}</TableHead>
                    <TableHead>{tc('dcOpenTimeLabel')}</TableHead>
                    <TableHead>{ts('k_1oc35yx')}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueList.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.record_no}</TableCell>
                      <TableCell>{r.material_name}</TableCell>
                      <TableCell>
                        <Badge className={INK_TYPE_MAP[r.ink_type]?.color || 'bg-gray-100'}>
                          {INK_TYPE_MAP[r.ink_type]?.label || r.ink_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.open_time}</TableCell>
                      <TableCell className="text-red-600 font-medium dark:text-red-400">
                        {r.expire_time}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(r.id, 2)}
                        >
                          {ts('k_p3zbds')}</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-1"
                          onClick={() => handleStatusChange(r.id, 3)}
                        >
                          {ts('k_1tuzpv2')}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{ts('k_dajxpn')}</CardTitle>
                <CardDescription>{tc('dcOpeningRecordDesc')}</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={ts('k_1xilek5')}
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder={tc('status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ts('k_igzce8')}</SelectItem>
                    <SelectItem value="1">{ts('k_kr2h4d')}</SelectItem>
                    <SelectItem value="2">{ts('k_1g217or')}</SelectItem>
                    <SelectItem value="3">{ts('k_oy744d')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={inkTypeFilter} onValueChange={setInkTypeFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder={ts('k_10yyuf6')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ts('k_zao217')}</SelectItem>
                    <SelectItem value="solvent">{ts('k_u0oodq')}</SelectItem>
                    <SelectItem value="uv">{ts('k_1lwyoyj')}</SelectItem>
                    <SelectItem value="water">{ts('k_krqaz0')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchRecords}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {ts('k_12qo56a')}</Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {ts('k_zh5my3')}</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ts('k_4gtnya')}</TableHead>
                  <TableHead>{ts('k_pegwq9')}</TableHead>
                  <TableHead>{ts('k_10yyuf6')}</TableHead>
                  <TableHead>{ts('k_1glawu1')}</TableHead>
                  <TableHead>{tc('dcOpenTimeLabel')}</TableHead>
                  <TableHead>{tc('dcValidHoursHead')}</TableHead>
                  <TableHead>{ts('k_1oc35yx')}</TableHead>
                  <TableHead>{tc('dcRemainingTimeHead')}</TableHead>
                  <TableHead>{ts('k_jfhh72')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {ts('k_1s9iahp')}</TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const timeRemaining = r.status === 1 ? getTimeRemaining(r.expire_time) : null;
                    return (
                      <TableRow
                        key={r.id}
                        className={
                          timeRemaining?.isOverdue
                            ? 'bg-red-50 dark:bg-red-950/30'
                            : timeRemaining?.isWarning
                              ? 'bg-yellow-50 dark:bg-yellow-950/30'
                              : ''
                        }
                      >
                        <TableCell className="font-mono">{r.record_no}</TableCell>
                        <TableCell className="font-medium">
                          {r.material_name || r.material_code}
                        </TableCell>
                        <TableCell>
                          <Badge className={INK_TYPE_MAP[r.ink_type]?.color || 'bg-gray-100'}>
                            {INK_TYPE_MAP[r.ink_type]?.label || r.ink_type || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{r.batch_no || '-'}</TableCell>
                        <TableCell>{r.open_time}</TableCell>
                        <TableCell>
                          {r.expire_hours}
                          {ts('k_e8ttp4')}</TableCell>
                        <TableCell>{r.expire_time}</TableCell>
                        <TableCell>
                          {timeRemaining ? (
                            <span
                              className={`flex items-center gap-1 font-medium ${timeRemaining.isOverdue ? 'text-red-600' : timeRemaining.isWarning ? 'text-yellow-600' : 'text-green-600'}`}
                            >
                              {timeRemaining.isOverdue && <AlertTriangle className="h-3 w-3" />}
                              {timeRemaining.isWarning && <Clock className="h-3 w-3" />}
                              {!timeRemaining.isOverdue && !timeRemaining.isWarning && (
                                <Timer className="h-3 w-3" />
                              )}
                              {timeRemaining.text}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.remaining_qty ? `${r.remaining_qty} ${r.unit || ''}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_MAP[r.status]?.color || 'bg-gray-100'}>
                            {STATUS_MAP[r.status]?.label || r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(r)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {r.status === 1 && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(r.id, 2)}
                                  title={ts('k_p3zbds')}
                                >
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(r.id, 3)}
                                  title={ts('k_1tuzpv2')}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            {r.status === 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(r.id, 3)}
                                title={ts('k_1tuzpv2')}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[550px]" resizable>
            <DialogHeader>
              <DialogTitle>{tc('dcAddOpeningTitle')}</DialogTitle>
              <DialogDescription>{tc('dcAddOpeningDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{ts('k_zsv6bq')}</Label>
                  <Select
                    value={form.material_id ? String(form.material_id) : ''}
                    onValueChange={(v) => {
                      const mat = materials.find((m) => String(m.id) === v);
                      if (mat) {
                        setForm((prev) => ({
                          ...prev,
                          material_id: mat.id,
                          material_code: mat.material_code,
                          material_name: mat.material_name,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={ts('k_e9z8o1')} />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.material_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{ts('k_a60ciy')}</Label>
                  <Input
                    value={form.material_name}
                    readOnly
                    placeholder={ts('k_wb6ua7')}
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{ts('k_10yyuf6')}</Label>
                  <Select
                    value={form.ink_type}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, ink_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solvent">{ts('k_u0oodq')}</SelectItem>
                      <SelectItem value="uv">{ts('k_1lwyoyj')}</SelectItem>
                      <SelectItem value="water">{ts('k_krqaz0')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{ts('k_1glawu1')}</Label>
                  <Input
                    value={form.batch_no}
                    onChange={(e) => setForm((prev) => ({ ...prev, batch_no: e.target.value }))}
                    placeholder={tc('batchNo')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{tc('dcOpenTimeLabel')}</Label>
                  <Input
                    type="datetime-local"
                    value={form.open_time}
                    onChange={(e) => setForm((prev) => ({ ...prev, open_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>{tc('dcValidHoursLabel')}</Label>
                  <Select
                    value={String(form.expire_hours)}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, expire_hours: parseInt(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRE_HOURS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{ts('k_jfhh72')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.remaining_qty}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, remaining_qty: e.target.value }))
                    }
                    placeholder={ts('k_jfhh72')}
                  />
                </div>
                <div>
                  <Label>{tc('unit')}</Label>
                  <Select
                    value={form.unit}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, unit: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value={ts('k_1n8b1jj')}>{ts('k_1n8b1jj')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{ts('k_en6vuk')}</Label>
                <UserSelect
                  value={form.operator_name}
                  onChange={(v) => setForm((prev) => ({ ...prev, operator_name: v }))}
                />
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={form.remark}
                  onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder={ts('k_zxhagq')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {ts('k_1589w37')}</Button>
              <Button onClick={handleCreate}>{tc('dcCreateBtn')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-[500px]" resizable>
            <DialogHeader>
              <DialogTitle>{tc('dcDetailTitle')}</DialogTitle>
            </DialogHeader>
            {detailData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{tc('dcRecordNo')}</span>
                    {detailData.record_no}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('dcMaterialCode')}</span>
                    {detailData.material_code}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_8mdfm8')}</span>
                    {detailData.material_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('dcInkType')}</span>
                    <Badge className={INK_TYPE_MAP[detailData.ink_type]?.color || 'bg-gray-100'}>
                      {INK_TYPE_MAP[detailData.ink_type]?.label || detailData.ink_type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('dcBatchNo')}</span>
                    {detailData.batch_no || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('dcValidHoursLabel')}</span>
                    {detailData.expire_hours}
                    {ts('k_e8ttp4')}</div>
                  <div>
                    <span className="text-muted-foreground">{tc('dcOpenTime')}</span>
                    {detailData.open_time}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('dcExpireTime')}</span>
                    {detailData.expire_time}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('dcRemainingQty')}</span>
                    {detailData.remaining_qty
                      ? `${detailData.remaining_qty} ${detailData.unit}`
                      : '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('dcOperator')}</span>
                    {detailData.operator_name || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ts('k_1pwh7dy')}</span>
                    <Badge className={STATUS_MAP[detailData.status]?.color || 'bg-gray-100'}>
                      {STATUS_MAP[detailData.status]?.label || detailData.status}
                    </Badge>
                  </div>
                </div>
                {detailData.remark && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{ts('k_1ohyab4')}</span>
                    {detailData.remark}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
