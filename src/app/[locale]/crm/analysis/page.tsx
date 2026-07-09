'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface AnalysisRecord {
  id?: number;
  customer_id: number;
  customer_name: string;
  analysis_period: string;
  period_start: string;
  period_end: string;
  order_count: number;
  order_amount: number;
  delivery_count: number;
  return_count: number;
  complaint_count: number;
  on_time_rate: number;
  satisfaction_score: number;
  customer_level: string;
  growth_rate: number;
  remark: string;
  create_time: string;
}

interface Summary {
  total_customers: number;
  total_orders: number;
  total_amount: number;
  avg_satisfaction: number;
  avg_on_time_rate: number;
}

export default function CustomerAnalysisPage() {
  const t = useTranslations('Crm');
  const tc = useTranslations('Common');

  const periodMap: Record<string, string> = {
    month: t('monthly'),
    quarter: t('quarterly'),
    year: t('yearly'),
  };
  const levelMap: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    A: { label: t('levelA'), variant: 'default' },
    B: { label: t('levelB'), variant: 'secondary' },
    C: { label: t('levelC'), variant: 'outline' },
    D: { label: t('levelD'), variant: 'outline' },
  };

  const { toast } = useToast();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<Summary>({
    total_customers: 0,
    total_orders: 0,
    total_amount: 0,
    avg_satisfaction: 0,
    avg_on_time_rate: 0,
  });
  const [searchName, setSearchName] = useState('');
  const [searchLevel, setSearchLevel] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AnalysisRecord | null>(null);
  const [form, setForm] = useState<Partial<AnalysisRecord>>({
    customer_id: 0,
    customer_name: '',
    analysis_period: 'month',
    period_start: '',
    period_end: '',
    order_count: 0,
    order_amount: 0,
    delivery_count: 0,
    return_count: 0,
    complaint_count: 0,
    on_time_rate: 0,
    satisfaction_score: 0,
    customer_level: 'C',
    growth_rate: 0,
    remark: '',
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchName) params.set('customerName', searchName);
      if (searchLevel) params.set('customerLevel', searchLevel);
      const res = await authFetch('/api/crm/analysis?' + params);
      const data = await res.json();
      if (data.code === 200) {
        const rawList = data.data.list || [];
        const rawSummary = data.data.summary || {};
        setRecords(
          rawList.map((r: Loose) => ({
            ...r,
            on_time_rate: r.on_time_rate != null ? Number(r.on_time_rate) : null,
            satisfaction_score: r.satisfaction_score != null ? Number(r.satisfaction_score) : null,
            growth_rate: r.growth_rate != null ? Number(r.growth_rate) : null,
            order_amount: Number(r.order_amount || 0),
          }))
        );
        setTotal(data.data.total || 0);
        setSummary({
          total_customers: Number(rawSummary.total_customers || 0),
          total_orders: Number(rawSummary.total_orders || 0),
          total_amount: Number(rawSummary.total_amount || 0),
          avg_satisfaction: Number(rawSummary.avg_satisfaction || 0),
          avg_on_time_rate: Number(rawSummary.avg_on_time_rate || 0),
        });
      }
    } catch {
      toast({ title: t('fetchDataFail'), variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSave = async () => {
    if (!form.customer_name) {
      toast({ title: t('enterCustomerName'), variant: 'destructive' });
      return;
    }
    try {
      const method = editRecord ? 'PUT' : 'POST';
      const body = editRecord ? { id: editRecord.id, ...form } : form;
      const res = await authFetch('/api/crm/analysis', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.code === 200) {
        toast({ title: editRecord ? tc('updateSuccess') : tc('createSuccess') });
        setDialogOpen(false);
        fetchData();
      } else {
        toast({ title: data.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/crm/analysis?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) {
        toast({ title: t('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: t('deleteFail'), variant: 'destructive' });
    }
  };

  const openEdit = (record: AnalysisRecord) => {
    setEditRecord(record);
    setForm({ ...record });
    setDialogOpen(true);
  };
  const openCreate = () => {
    setEditRecord(null);
    setForm({
      customer_id: 0,
      customer_name: '',
      analysis_period: 'month',
      period_start: '',
      period_end: '',
      order_count: 0,
      order_amount: 0,
      delivery_count: 0,
      return_count: 0,
      complaint_count: 0,
      on_time_rate: 0,
      satisfaction_score: 0,
      customer_level: 'C',
      growth_rate: 0,
      remark: '',
    });
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            {t('customerAnalysisStats')}
          </h1>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('newAnalysis')}
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('totalCustomers')}</p>
                <p className="text-2xl font-bold">{summary.total_customers || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('totalOrderAmount')}</p>
                <p className="text-2xl font-bold">
                  ¥{(summary.total_amount || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('avgSatisfaction')}</p>
                <p className="text-2xl font-bold">{(summary.avg_satisfaction || 0).toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('avgOnTimeRate')}</p>
                <p className="text-2xl font-bold">{(summary.avg_on_time_rate || 0).toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 mb-4">
              <Input
                placeholder={t('searchCustomerName')}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              />
              <Select value={searchLevel} onValueChange={(v) => setSearchLevel(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('customerLevel')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(levelMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <Search className="h-4 w-4 mr-1" />
                {t('search')}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('customerName')}</TableHead>
                  <TableHead>{t('level')}</TableHead>
                  <TableHead>{t('period')}</TableHead>
                  <TableHead>{t('orderCount')}</TableHead>
                  <TableHead>{t('orderAmount')}</TableHead>
                  <TableHead>{t('returnCount')}</TableHead>
                  <TableHead>{t('complaintCount')}</TableHead>
                  <TableHead>{t('onTimeRateShort')}</TableHead>
                  <TableHead>{t('satisfaction')}</TableHead>
                  <TableHead>{t('growthRate')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant={levelMap[r.customer_level]?.variant || 'outline'}>
                        {levelMap[r.customer_level]?.label || r.customer_level}
                      </Badge>
                    </TableCell>
                    <TableCell>{periodMap[r.analysis_period] || r.analysis_period}</TableCell>
                    <TableCell>{r.order_count}</TableCell>
                    <TableCell className="font-mono">
                      ¥{(r.order_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{r.return_count}</TableCell>
                    <TableCell>{r.complaint_count}</TableCell>
                    <TableCell>{r.on_time_rate != null ? r.on_time_rate + '%' : '-'}</TableCell>
                    <TableCell>
                      {r.satisfaction_score != null ? r.satisfaction_score : '-'}
                    </TableCell>
                    <TableCell>
                      {r.growth_rate != null
                        ? (r.growth_rate > 0 ? '+' : '') + r.growth_rate + '%'
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id!)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4 text-sm">
              <span>{t('totalRecords', { total })}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc('prevPage')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('nextPage')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{editRecord ? t('editAnalysis') : t('newAnalysis')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>{t('customerName')} *</Label>
                  <Input
                    value={form.customer_name || ''}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('analysisPeriod')}</Label>
                  <Select
                    value={form.analysis_period || 'month'}
                    onValueChange={(v) => setForm({ ...form, analysis_period: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(periodMap).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('customerLevel')}</Label>
                  <Select
                    value={form.customer_level || 'C'}
                    onValueChange={(v) => setForm({ ...form, customer_level: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(levelMap).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('periodStart')}</Label>
                  <Input
                    type="date"
                    value={form.period_start || ''}
                    onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('periodEnd')}</Label>
                  <Input
                    type="date"
                    value={form.period_end || ''}
                    onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>{t('orderCount')}</Label>
                  <Input
                    type="number"
                    value={form.order_count || 0}
                    onChange={(e) => setForm({ ...form, order_count: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('orderAmount')}</Label>
                  <Input
                    type="number"
                    value={form.order_amount || 0}
                    onChange={(e) => setForm({ ...form, order_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('deliveryCount')}</Label>
                  <Input
                    type="number"
                    value={form.delivery_count || 0}
                    onChange={(e) => setForm({ ...form, delivery_count: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('returnCount')}</Label>
                  <Input
                    type="number"
                    value={form.return_count || 0}
                    onChange={(e) => setForm({ ...form, return_count: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>{t('complaintCount')}</Label>
                  <Input
                    type="number"
                    value={form.complaint_count || 0}
                    onChange={(e) => setForm({ ...form, complaint_count: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('onTimeRatePct')}</Label>
                  <Input
                    type="number"
                    value={form.on_time_rate || 0}
                    onChange={(e) => setForm({ ...form, on_time_rate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('satisfactionScore')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.satisfaction_score || 0}
                    onChange={(e) =>
                      setForm({ ...form, satisfaction_score: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>{t('growthRatePct')}</Label>
                  <Input
                    type="number"
                    value={form.growth_rate || 0}
                    onChange={(e) => setForm({ ...form, growth_rate: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={form.remark || ''}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{t('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
