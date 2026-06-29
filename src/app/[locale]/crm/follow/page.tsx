'use client';
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
import { Plus, Search, Edit, Trash2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

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
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FollowRecord | null>(null);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchName) params.set('customerName', searchName);
      if (searchType) params.set('followType', searchType);
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

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('customerName')}</TableHead>
                  <TableHead>{t('followType')}</TableHead>
                  <TableHead>{t('followContent')}</TableHead>
                  <TableHead>{t('contactPerson')}</TableHead>
                  <TableHead>{t('salesman')}</TableHead>
                  <TableHead>{t('nextFollow')}</TableHead>
                  <TableHead>{t('opportunity')}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {followTypeMap[r.follow_type] || r.follow_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{r.follow_content || '-'}</TableCell>
                    <TableCell>{r.contact_name || '-'}</TableCell>
                    <TableCell>{r.salesman_name || '-'}</TableCell>
                    <TableCell>{r.next_follow_date || '-'}</TableCell>
                    <TableCell className="max-w-32 truncate">{r.opportunity || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={followStatusMap[r.status]?.variant || 'outline'}>
                        {followStatusMap[r.status]?.label || '-'}
                      </Badge>
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
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4 text-sm">
              <span>{tc('totalRecords', { total })}</span>
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
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{editRecord ? t('editFollowRecord') : t('newFollowRecord')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('customerNameRequired')}</Label>
                  <Input
                    value={form.customer_name || ''}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  />
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
                    value={form.next_follow_date || ''}
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
