'use client';

import { authFetch } from '@/lib/auth-fetch';
import { toDateInput } from '@/lib/date-utils';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, Phone, Users, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { StandardTable, StandardTableColumn, SortState } from '@/components/common';

interface FollowRecord {
  id?: number;
  customer_id: number;
  customer_name: string;
  follow_type: string;
  follow_content: string;
  contact_name: string;
  salesman_name: string;
  next_follow_date: string;
  opportunity: string;
  status: number;
  remark: string;
  create_time: string;
}

export default function CustomerFollowPage() {

  const t = useTranslations('Crm');
  const tc = useTranslations('Common');

  const followTypeMap: Record<string, string> = {
    visit: t('visit'),
    phone: t('phone'),
    email: t('email'),
    wechat: t('wechat'),
    other: tc('other'),
  };

  const followStatusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: t('pendingFollow'), variant: 'outline' },
    2: { label: t('followed'), variant: 'default' },
    3: { label: t('converted'), variant: 'secondary' },
  };

  const { toast } = useToast();
  const [records, setRecords] = useState<FollowRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchType, setSearchType] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    following: 0,
    converted: 0,
    lost: 0,
    monthlyCount: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FollowRecord | null>(null);
  const [selectedRows, setSelectedRows] = useState<FollowRecord[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [customers, setCustomers] = useState<{ id: number; customer_name: string }[]>([]);
  const [form, setForm] = useState<Partial<FollowRecord>>({
    customer_id: 0,
    customer_name: '',
    follow_type: 'phone',
    follow_content: '',
    contact_name: '',
    salesman_name: '',
    next_follow_date: '',
    opportunity: '',
    status: 1,
    remark: '',
  });
  const [sort, setSort] = useState<SortState>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchName) params.set('customerName', searchName);
      if (searchType) params.set('followType', searchType);
      if (sort) {
        params.set('sortField', sort.field);
        params.set('sortDir', sort.direction);
      }
      const res = await authFetch('/api/crm/follow?' + params);
      const data = await res.json();
      if (data.code === 200) {
        setRecords(data.data.list || []);
        setTotal(data.data.total || 0);
      }
    } catch {
      toast({ title: tc('fetchFailed'), variant: 'destructive' });
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    try {
      const res = await authFetch('/api/customers');
      const data = await res.json();
      if (data.success || data.code === 200) {
        setCustomers(data.data?.list || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/crm/follow/stats');
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
    fetchCustomers();
    fetchStats();
  }, [page, sort]);

  const columns: StandardTableColumn<FollowRecord>[] = [
    {
      key: 'customer_name',
      title: t('customerName'),
      render: (r) => <span>{r.customer_name}</span>,
    },
    {
      key: 'follow_type',
      title: t('followType'),
      render: (r) => (
        <Badge variant="outline">
          {followTypeMap[r.follow_type] || r.follow_type}
        </Badge>
      ),
    },
    {
      key: 'follow_content',
      title: t('followContent'),
      render: (r) => <span className="max-w-48 truncate block">{r.follow_content || '-'}</span>,
    },
    {
      key: 'contact_name',
      title: t('contactPerson'),
      render: (r) => <span>{r.contact_name || '-'}</span>,
    },
    {
      key: 'salesman_name',
      title: t('salesman'),
      render: (r) => <span>{r.salesman_name || '-'}</span>,
    },
    {
      key: 'next_follow_date',
      title: t('nextFollow'),
      render: (r) => <span>{r.next_follow_date || '-'}</span>,
    },
    {
      key: 'opportunity',
      title: t('opportunity'),
      render: (r) => <span className="max-w-32 truncate block">{r.opportunity || '-'}</span>,
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => (
        <Badge variant={followStatusMap[r.status]?.variant || 'outline'}>
          {followStatusMap[r.status]?.label || '-'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id!)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSave = async () => {
    if (!form.customer_id) {
      toast({ title: t('enterCustomerName'), variant: 'destructive' });
      return;
    }
    try {
      const method = editRecord ? 'PUT' : 'POST';
      const body = editRecord ? { id: editRecord.id, ...form } : form;
      const res = await authFetch('/api/crm/follow', {
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
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/crm/follow?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const handleBatchDelete = async () => {
    const ids = selectedRows.map((r) => r.id).filter(Boolean) as number[];
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/crm/follow?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.code === 200) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    setSelectedRows([]);
    fetchData();
  };

  const openEdit = (record: FollowRecord) => {
    setEditRecord(record);
    setForm({ ...record });
    setDialogOpen(true);
  };
  const openCreate = () => {
    setEditRecord(null);
    setForm({
      customer_id: 0,
      customer_name: '',
      follow_type: 'phone',
      follow_content: '',
      contact_name: '',
      salesman_name: '',
      next_follow_date: '',
      opportunity: '',
      status: 1,
      remark: '',
    });
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <StatsCards
          configs={[
            { key: 'pending', label: '待跟进', icon: Clock, ...StatsTheme.orange },
            { key: 'following', label: '跟进中', icon: Phone, ...StatsTheme.blue },
            { key: 'converted', label: '已转化', icon: CheckCircle, ...StatsTheme.green },
            { key: 'lost', label: '已流失', icon: AlertCircle, ...StatsTheme.red },
            { key: 'monthlyCount', label: '本月跟进次数', icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'following', count: stats.following },
            { key: 'converted', count: stats.converted },
            { key: 'lost', count: stats.lost },
            { key: 'monthlyCount', count: stats.monthlyCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
          showTrend={false}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6" />
            {t('followRecords')}
          </h1>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('newFollow')}
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 mb-4">
              <Input
                placeholder={t('searchCustomerPlaceholder')}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              />
              <Select value={searchType} onValueChange={(v) => setSearchType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('followType')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(followTypeMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <Search className="h-4 w-4 mr-1" />
                {tc('search')}
              </Button>
            </div>

            <BatchDeleteBar count={selectedRows.length} onClear={() => setSelectedRows([])} onDelete={handleBatchDelete} loading={deleting} />
            <StandardTable
              columns={columns}
              dataSource={records}
              total={total}
              page={page}
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              onSortChange={setSort}
              sortState={sort}
              onPageChange={(p) => setPage(p)}
              loading={loading}
            />
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editRecord ? t('editFollowRecord') : t('newFollowRecord')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('customerNameRequired')}</Label>
                  <Select
                    value={String(form.customer_id || '')}
                    onValueChange={(v) => {
                      const cust = customers.find((c) => String(c.id) === v);
                      setForm({ ...form, customer_id: parseInt(v), customer_name: cust?.customer_name || '' });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCustomer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('followType')}</Label>
                  <Select
                    value={form.follow_type || 'phone'}
                    onValueChange={(v) => setForm({ ...form, follow_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(followTypeMap).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('contactPerson')}</Label>
                  <Input
                    value={form.contact_name || ''}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('salesman')}</Label>
                  <Input
                    value={form.salesman_name || ''}
                    onChange={(e) => setForm({ ...form, salesman_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('followContent')}</Label>
                <Textarea
                  value={form.follow_content || ''}
                  onChange={(e) => setForm({ ...form, follow_content: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('nextFollowDate')}</Label>
                  <Input
                    type="date"
                    value={toDateInput(form.next_follow_date)}
                    onChange={(e) => setForm({ ...form, next_follow_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{tc("status")}</Label>
                  <Select
                    value={String(form.status || 1)}
                    onValueChange={(v) => setForm({ ...form, status: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('pendingFollow')}</SelectItem>
                      <SelectItem value="2">{t('followed')}</SelectItem>
                      <SelectItem value="3">{t('converted')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t('opportunityDesc')}</Label>
                <Input
                  value={form.opportunity || ''}
                  onChange={(e) => setForm({ ...form, opportunity: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc("remark")}</Label>
                <Textarea
                  value={form.remark || ''}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleSave}>{tc("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
