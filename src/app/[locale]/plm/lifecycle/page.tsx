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
import { Plus, Search, Edit, Trash2, GitBranch, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface LifecycleRecord {
  id?: number;
  product_id: number;
  product_code: string;
  product_name: string;
  lifecycle_stage: string;
  stage_status: number;
  version: string;
  change_type: string;
  change_reason: string;
  change_desc: string;
  approver: string;
  approve_time: string;
  effective_date: string;
  remark: string;
  create_time: string;
}

const stageOrder = ['concept', 'design', 'prototype', 'pilot', 'mass', 'eol'];

export default function ProductLifecyclePage() {

  const t = useTranslations('Engineering');
  const tc = useTranslations('Common');

  const stageMap: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    concept: { label: t('stageConcept'), variant: 'outline' },
    design: { label: t('stageDesign'), variant: 'secondary' },
    prototype: { label: t('stagePrototype'), variant: 'default' },
    pilot: { label: t('stagePilot'), variant: 'default' },
    mass: { label: t('stageMass'), variant: 'default' },
    eol: { label: t('stageEol'), variant: 'destructive' },
  };

  const stageStatusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: t('inProgress'), variant: 'default' },
    2: { label: t('completed'), variant: 'secondary' },
    3: { label: t('paused'), variant: 'outline' },
    4: { label: tc('cancel'), variant: 'destructive' },
  };

  const changeTypeMap: Record<string, string> = {
    new: t('changeNew'),
    revision: t('changeRevision'),
    upgrade: t('changeUpgrade'),
    downgrade: t('changeDowngrade'),
  };

  const { toast } = useToast();
  const [records, setRecords] = useState<LifecycleRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchStage, setSearchStage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<LifecycleRecord | null>(null);
  const [form, setForm] = useState<Partial<LifecycleRecord>>({
    product_id: 0,
    product_code: '',
    product_name: '',
    lifecycle_stage: 'concept',
    stage_status: 1,
    version: 'V1.0',
    change_type: 'new',
    change_reason: '',
    change_desc: '',
    effective_date: '',
    remark: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchName) params.set('productName', searchName);
      if (searchStage) params.set('lifecycleStage', searchStage);
      const res = await authFetch('/api/plm/lifecycle?' + params);
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
    if (!form.product_name) {
      toast({ title: t('inputProductName'), variant: 'destructive' });
      return;
    }
    try {
      const url = editRecord ? '/api/plm/lifecycle' : '/api/plm/lifecycle';
      const method = editRecord ? 'PUT' : 'POST';
      const body = editRecord ? { id: editRecord.id, ...form } : form;
      const res = await authFetch(url, {
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
      const res = await authFetch('/api/plm/lifecycle?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const openEdit = (record: LifecycleRecord) => {
    setEditRecord(record);
    setForm({ ...record });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditRecord(null);
    setForm({
      product_id: 0,
      product_code: '',
      product_name: '',
      lifecycle_stage: 'concept',
      stage_status: 1,
      version: 'V1.0',
      change_type: 'new',
      change_reason: '',
      change_desc: '',
      effective_date: '',
      remark: '',
    });
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            {t('lifecycleTitle')}
          </h1>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('newLifecycleRecord')}
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 mb-4">
              <Input
                placeholder={t('searchProductPlaceholder')}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              />
              <Select
                value={searchStage}
                onValueChange={(v) => {
                  setSearchStage(v);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t('lifecycleStage')} />
                </SelectTrigger>
                <SelectContent>
                  {stageOrder.map((s) => (
                    <SelectItem key={s} value={s}>
                      {stageMap[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <Search className="h-4 w-4 mr-1" />
                {tc('search')}
              </Button>
            </div>

            <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
              {stageOrder.map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  <Badge variant={stageMap[s].variant}>{stageMap[s].label}</Badge>
                  {i < stageOrder.length - 1 && <ArrowRight className="h-3 w-3" />}
                </span>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('productCode')}</TableHead>
                  <TableHead>{t('productName')}</TableHead>
                  <TableHead>{t('lifecycleStage')}</TableHead>
                  <TableHead>{t('stageStatus')}</TableHead>
                  <TableHead>{t('version')}</TableHead>
                  <TableHead>{t('changeType')}</TableHead>
                  <TableHead>{t('effectiveDate')}</TableHead>
                  <TableHead>{tc('createTime')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.product_code || '-'}</TableCell>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell>
                      <Badge variant={stageMap[r.lifecycle_stage]?.variant || 'outline'}>
                        {stageMap[r.lifecycle_stage]?.label || r.lifecycle_stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stageStatusMap[r.stage_status]?.variant || 'outline'}>
                        {stageStatusMap[r.stage_status]?.label || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{r.version}</TableCell>
                    <TableCell>{changeTypeMap[r.change_type] || '-'}</TableCell>
                    <TableCell>{r.effective_date || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.create_time?.slice(0, 10)}
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
              <DialogTitle>{editRecord ? t('editLifecycleRecord') : t('newLifecycleRecord')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('productCode')}</Label>
                  <Input
                    value={form.product_code || ''}
                    onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('productName')} *</Label>
                  <Input
                    value={form.product_name || ''}
                    onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('lifecycleStage')}</Label>
                  <Select
                    value={form.lifecycle_stage || 'concept'}
                    onValueChange={(v) => setForm({ ...form, lifecycle_stage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stageOrder.map((s) => (
                        <SelectItem key={s} value={s}>
                          {stageMap[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('stageStatus')}</Label>
                  <Select
                    value={String(form.stage_status || 1)}
                    onValueChange={(v) => setForm({ ...form, stage_status: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('inProgress')}</SelectItem>
                      <SelectItem value="2">{t('completed')}</SelectItem>
                      <SelectItem value="3">{t('paused')}</SelectItem>
                      <SelectItem value="4">{tc('cancel')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('versionNumber')}</Label>
                  <Input
                    value={form.version || ''}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    placeholder="V1.0"
                  />
                </div>
                <div>
                  <Label>{t('changeType')}</Label>
                  <Select
                    value={form.change_type || 'new'}
                    onValueChange={(v) => setForm({ ...form, change_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{t('changeNew')}</SelectItem>
                      <SelectItem value="revision">{t('changeRevision')}</SelectItem>
                      <SelectItem value="upgrade">{t('changeUpgrade')}</SelectItem>
                      <SelectItem value="downgrade">{t('changeDowngrade')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t('effectiveDate')}</Label>
                <Input
                  type="date"
                  value={form.effective_date || ''}
                  onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('changeReason')}</Label>
                <Textarea
                  value={form.change_reason || ''}
                  onChange={(e) => setForm({ ...form, change_reason: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>{t('changeDesc')}</Label>
                <Textarea
                  value={form.change_desc || ''}
                  onChange={(e) => setForm({ ...form, change_desc: e.target.value })}
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
