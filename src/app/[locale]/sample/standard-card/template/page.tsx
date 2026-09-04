'use client';
import { useTranslations } from 'next-intl';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, Edit, Trash2, ArrowLeft, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: number;
  template_no: string;
  template_name: string;
  category: string | null;
  tags: string | null;
  total_cost: number;
  usage_count: number;
  status: number;
  create_time: string;
}

interface TemplateFormData {
  template_name: string;
  category: string;
  tags: string;
  remark: string;
}

const emptyForm: TemplateFormData = {
  template_name: '',
  category: '',
  tags: '',
  remark: '',
};

export default function SampleTemplateListPage() {
  const tc = useTranslations('Common');
  const ts = useTranslations('StandardCard');
  const router = useRouter();
  const { toast } = useToast();
  const [list, setList] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        keyword,
        category,
      });
      const res = await authFetch(`/api/dcprint/sample-card/template?${params}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, keyword, category]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/template/${id}`);
      const result = await res.json();
      if (result.success && result.data) {
        const t = result.data;
        setEditingId(id);
        setFormData({
          template_name: t.template_name || '',
          category: t.category || '',
          tags: t.tags || '',
          remark: t.remark || '',
        });
        setDialogOpen(true);
      }
    } catch {
      toast({ title: ts('k_10p0umw'), variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!formData.template_name.trim()) {
      toast({ title: ts('k_10gd1pi'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        template_name: formData.template_name,
        category: formData.category || undefined,
        tags: formData.tags || undefined,
        remark: formData.remark || undefined,
      };
      const url = editingId
        ? `/api/dcprint/sample-card/template/${editingId}`
        : '/api/dcprint/sample-card/template';
      const method = editingId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editingId ? ts('k_1nodtxp') : ts('k_1t4tvng') });
        setDialogOpen(false);
        fetchList();
      } else {
        toast({ title: ts('k_1q9u8le'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_1q9u8le'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(ts('k_10cgsv5'))) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/template/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: ts('k_1gyqcpd') });
        fetchList();
      } else {
        toast({ title: ts('k_1ijrr73'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_1ijrr73'), variant: 'destructive' });
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sample/standard-card')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Library className="h-5 w-5" />
            {ts('k_1u0fhic')}</h1>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {ts('k_ytmxn3')}</Button>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 flex gap-2 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8"
              placeholder={ts('k_p2wuj2')}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Input
            className="w-40"
            placeholder={ts('k_1kbcp7q')}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          />
          <Button variant="outline" onClick={fetchList} disabled={loading}>
            {ts('k_12qo56a')}</Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ts('k_1vzh69a')}</TableHead>
              <TableHead>{ts('k_qrxllg')}</TableHead>
              <TableHead>{ts('k_1kbcp7q')}</TableHead>
              <TableHead className="text-right">{ts('k_1ugaydy')}</TableHead>
              <TableHead className="text-center">{ts('k_t5e2ez')}</TableHead>
              <TableHead>{tc('createdAt')}</TableHead>
              <TableHead className="text-center">{ts('k_501w24')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                  {ts('k_1e5xkpv')}</TableCell>
              </TableRow>
            )}
            {list.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.template_no}</TableCell>
                <TableCell className="font-medium">{t.template_name}</TableCell>
                <TableCell>
                  {t.category ? <Badge variant="outline">{t.category}</Badge> : '-'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ¥{(t.total_cost || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{t.usage_count || 0}</Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {t.create_time ? new Date(t.create_time).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title={ts('k_qreyeg')}
                      onClick={() => handleOpenEdit(t.id)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={ts('k_1t2vi4h')}
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {ts('k_mtyn6e')}</Button>
          <span className="text-sm text-gray-600">
            {ts('k_biig97')}{page} / {totalPages} {ts('k_1ymbj0f')}{total} {ts('k_1xoauwk')}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {ts('k_1yw313l')}</Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? ts('k_dqtebg') : ts('k_ytmxn3')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="template_name">{ts('k_1jj60ua')}</Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder={ts('k_1e5fthn')}
              />
            </div>
            <div>
              <Label htmlFor="category">{ts('k_1kbcp7q')}</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder={ts('k_l8mszz')}
              />
            </div>
            <div>
              <Label htmlFor="tags">{ts('k_14yx0jz')}</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder={ts('k_m3l3y7')}
              />
            </div>
            <div>
              <Label htmlFor="remark">{ts('k_b5m1l6')}</Label>
              <Textarea
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder={ts('k_ssp8k7')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {ts('k_1589w37')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? ts('k_rr6ulf') : ts('k_1c3mapc')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
