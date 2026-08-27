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
import { Plus, Search, Edit, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { useTranslations } from 'next-intl';

interface EcoRecord {
  id?: number;
  eco_no: string;
  eco_type: string;
  product_id?: number;
  product_code: string;
  product_name: string;
  old_version: string;
  new_version: string;
  change_reason: string;
  change_content: string;
  impact_analysis: string;
  status: number;
  applicant: string;
  apply_time: string;
  approver: string;
  approve_time: string;
  remark: string;
  create_time: string;
}

export default function EcoPage() {

  const t = useTranslations('Engineering');
  const tc = useTranslations('Common');

  const ecoTypeMap: Record<string, string> = {
    bom: t('bomChange'),
    process: t('processChange'),
    material: t('materialChange'),
    design: t('designChange'),
  };

  const ecoStatusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: tc('draft'), variant: 'outline' },
    2: { label: t('pendingReview'), variant: 'secondary' },
    3: { label: t('approved'), variant: 'default' },
    4: { label: t('executed'), variant: 'default' },
    5: { label: tc('closed'), variant: 'secondary' },
    6: { label: t('rejected'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [records, setRecords] = useState<EcoRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [_loading, setLoading] = useState(false);
  const [searchEcoNo, setSearchEcoNo] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EcoRecord | null>(null);
  const [form, setForm] = useState<Partial<EcoRecord>>({
    eco_type: 'bom',
    product_code: '',
    product_name: '',
    old_version: '',
    new_version: '',
    change_reason: '',
    change_content: '',
    impact_analysis: '',
    applicant: '',
    remark: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchEcoNo) params.set('ecoNo', searchEcoNo);
      if (searchType) params.set('ecoType', searchType);
      if (searchStatus) params.set('status', searchStatus);
      const res = await authFetch('/api/plm/eco?' + params);
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
    if (!form.eco_type) {
      toast({ title: t('selectChangeType'), variant: 'destructive' });
      return;
    }
    try {
      const method = editRecord ? 'PUT' : 'POST';
      const body = editRecord ? { id: editRecord.id, ...form } : form;
      const res = await authFetch('/api/plm/eco', {
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
      const res = await authFetch('/api/plm/eco?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const openEdit = (record: EcoRecord) => {
    setEditRecord(record);
    setForm({ ...record });
    setDialogOpen(true);
  };
  const openCreate = () => {
    setEditRecord(null);
    setForm({
      eco_type: 'bom',
      product_code: '',
      product_name: '',
      old_version: '',
      new_version: '',
      change_reason: '',
      change_content: '',
      impact_analysis: '',
      applicant: '',
      remark: '',
    });
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t('ecoTitle')}
          </h1>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('newEco')}
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 mb-4">
              <Input
                placeholder={t('searchEcoNo')}
                value={searchEcoNo}
                onChange={(e) => setSearchEcoNo(e.target.value)}
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              />
              <Select value={searchType} onValueChange={(v) => setSearchType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('changeType')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ecoTypeMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={searchStatus} onValueChange={(v) => setSearchStatus(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ecoStatusMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
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
                  <TableHead>{t('ecoNo')}</TableHead>
                  <TableHead>{t('changeType')}</TableHead>
                  <TableHead>{t('productName')}</TableHead>
                  <TableHead>{t('oldVersion')}</TableHead>
                  <TableHead>{t('newVersion')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{t('applicant')}</TableHead>
                  <TableHead>{t('applyTime')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.eco_no}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ecoTypeMap[r.eco_type] || r.eco_type}</Badge>
                    </TableCell>
                    <TableCell>{r.product_name || '-'}</TableCell>
                    <TableCell className="font-mono">{r.old_version || '-'}</TableCell>
                    <TableCell className="font-mono">{r.new_version || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={ecoStatusMap[r.status]?.variant || 'outline'}>
                        {ecoStatusMap[r.status]?.label || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.applicant || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.apply_time?.slice(0, 10)}
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
              <span>{tc('total', { count: total })}</span>
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
              <DialogTitle>{editRecord ? t('editEco') : t('newEco')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('changeType')} *</Label>
                  <Select
                    value={form.eco_type || 'bom'}
                    onValueChange={(v) => setForm({ ...form, eco_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ecoTypeMap).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('productName')}</Label>
                  <Input
                    value={form.product_name || ''}
                    onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('productCode')}</Label>
                  <Input
                    value={form.product_code || ''}
                    onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('applicant')}</Label>
                  <UserSelect
                    value={form.applicant || ''}
                    onChange={(v) => setForm({ ...form, applicant: v })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('oldVersion')}</Label>
                  <Input
                    value={form.old_version || ''}
                    onChange={(e) => setForm({ ...form, old_version: e.target.value })}
                    placeholder="V1.0"
                  />
                </div>
                <div>
                  <Label>{t('newVersion')}</Label>
                  <Input
                    value={form.new_version || ''}
                    onChange={(e) => setForm({ ...form, new_version: e.target.value })}
                    placeholder="V2.0"
                  />
                </div>
              </div>
              {editRecord && (
                <div>
                  <Label>{tc('status')}</Label>
                  <Select
                    value={String(form.status || 1)}
                    onValueChange={(v) => setForm({ ...form, status: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ecoStatusMap).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>{t('changeReason')}</Label>
                <Textarea
                  value={form.change_reason || ''}
                  onChange={(e) => setForm({ ...form, change_reason: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>{t('changeContent')}</Label>
                <Textarea
                  value={form.change_content || ''}
                  onChange={(e) => setForm({ ...form, change_content: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>{t('impactAnalysis')}</Label>
                <Textarea
                  value={form.impact_analysis || ''}
                  onChange={(e) => setForm({ ...form, impact_analysis: e.target.value })}
                  rows={2}
                />
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
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
