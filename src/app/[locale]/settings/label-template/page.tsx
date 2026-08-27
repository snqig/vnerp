'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Printer, Edit, Plus, RefreshCw } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
import { LabelPreview } from '@/components/label/LabelPreview';

interface LabelTemplateItem {
  id: number;
  name: string;
  scenario: string;
  html_template: string;
  width_mm: number;
  height_mm: number;
  qr_size_mm: number;
  status: number;
}

const defaultTemplate = `<div style="text-align:center;font-family:sans-serif;padding:4px">
  <h3 style="margin:0 0 4px;font-size:14px">{materialName}</h3>
  <p style="margin:2px 0;font-size:11px">批次: {batchNo}</p>
  <p style="margin:2px 0;font-size:11px">数量: {quantity}</p>
  <p style="margin:2px 0;font-size:10px;color:#666">{qrContent}</p>
</div>`;

export default function LabelTemplatePage() {
  const t = useTranslations('trace');
  const tc = useTranslations('Common');
  const [list, setList] = useState<LabelTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<LabelTemplateItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    scenario: 'inbound',
    html_template: defaultTemplate,
    width_mm: 60,
    height_mm: 40,
    qr_size_mm: 20,
  });
  const [previewData] = useState({
    materialName: '示例物料',
    batchNo: 'BATCH-2026-001',
    quantity: '100.0000',
    qrContent: 'QR-EXAMPLE-001',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/trace/label');
      const result = await res.json();
      if (result.success) setList(result.data?.list || []);
    } catch {
      toast.error(t('label.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openEdit = (item?: LabelTemplateItem) => {
    if (item) {
      setEditing(item);
      setForm({
        name: item.name,
        scenario: item.scenario,
        html_template: item.html_template,
        width_mm: item.width_mm,
        height_mm: item.height_mm,
        qr_size_mm: item.qr_size_mm,
      });
    } else {
      setEditing(null);
      setForm({
        name: '',
        scenario: 'inbound',
        html_template: defaultTemplate,
        width_mm: 60,
        height_mm: 40,
        qr_size_mm: 20,
      });
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.html_template) {
      toast.error(tc('required'));
      return;
    }
    try {
      const res = await authFetch(
        editing ? `/api/trace/label/${editing.id}` : '/api/trace/label',
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify(form),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success(tc('success'));
        setEditOpen(false);
        fetchList();
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleToggleStatus = async (item: LabelTemplateItem) => {
    try {
      const res = await authFetch(`/api/trace/label/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: item.status === 1 ? 0 : 1 }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(tc('success'));
        fetchList();
      }
    } catch {
      toast.error(tc('error'));
    }
  };

  const scenarioLabels: Record<string, string> = {
    inbound: t('label.scenario_inbound'),
    split: t('label.scenario_split'),
    finished: t('label.scenario_finished'),
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Printer className="w-6 h-6" />
              {t('label.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('label.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchList}>
              <RefreshCw className="h-3 w-3 mr-1" />
              {tc('refresh')}
            </Button>
            <Button size="sm" onClick={() => openEdit()}>
              <Plus className="h-3 w-3 mr-1" />
              {tc('add')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('label.name')}</TableHead>
                  <TableHead>{t('label.scenario')}</TableHead>
                  <TableHead>{t('label.size')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{t('label.preview')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{scenarioLabels[item.scenario] || item.scenario}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.width_mm}×{item.height_mm}mm</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 1 ? 'default' : 'secondary'}>
                          {item.status === 1 ? tc('active') : tc('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <LabelPreview
                            htmlTemplate={item.html_template}
                            data={previewData}
                            widthMm={item.width_mm}
                            heightMm={item.height_mm}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(item)}>
                            <Edit className="h-3 w-3 mr-1" />
                            {tc('edit')}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => handleToggleStatus(item)}>
                            {item.status === 1 ? tc('deactivate') : tc('activate')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? tc('edit') : tc('add')} {t('label.template')}</DialogTitle>
            <DialogDescription>{t('label.edit_desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t('label.name')} *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('label.scenario')}</Label>
                <Select value={form.scenario} onValueChange={(v) => setForm((f) => ({ ...f, scenario: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">{t('label.scenario_inbound')}</SelectItem>
                    <SelectItem value="split">{t('label.scenario_split')}</SelectItem>
                    <SelectItem value="finished">{t('label.scenario_finished')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>{t('label.width')}</Label>
                  <Input type="number" value={form.width_mm} onChange={(e) => setForm((f) => ({ ...f, width_mm: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>{t('label.height')}</Label>
                  <Input type="number" value={form.height_mm} onChange={(e) => setForm((f) => ({ ...f, height_mm: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>{t('label.qr_size')}</Label>
                  <Input type="number" value={form.qr_size_mm} onChange={(e) => setForm((f) => ({ ...f, qr_size_mm: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t('label.html_template')} *</Label>
                <Textarea
                  className="font-mono text-xs min-h-[200px]"
                  value={form.html_template}
                  onChange={(e) => setForm((f) => ({ ...f, html_template: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('label.preview')}</Label>
              <div className="border rounded-lg p-4 bg-white flex items-center justify-center min-h-[200px]">
                <LabelPreview
                  htmlTemplate={form.html_template}
                  data={previewData}
                  widthMm={form.width_mm}
                  heightMm={form.height_mm}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('label.preview_hint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSave}>{tc('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
