'use client';

import { authFetch } from '@/lib/auth-fetch';
import { EQUIPMENT_TYPE_LABEL, EQUIPMENT_STATUS_LABEL } from '@/lib/status-labels';
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
import { Plus, Edit, Trash2, Search, RefreshCw, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Equipment {
  id: number;
  equipment_code: string;
  equipment_name: string;
  equipment_type: number;
  brand: string;
  model: string;
  serial_no: string;
  location: string;
  purchase_date: string;
  rated_capacity: number;
  oee: number;
  availability: number;
  performance: number;
  quality_rate: number;
  current_status: number;
  status: number;
  remark: string;
}

const EQUIPMENT_TYPES = EQUIPMENT_TYPE_LABEL;

const CURRENT_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: EQUIPMENT_STATUS_LABEL[1], color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  2: { label: EQUIPMENT_STATUS_LABEL[2], color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  3: { label: EQUIPMENT_STATUS_LABEL[3], color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  4: { label: EQUIPMENT_STATUS_LABEL[4], color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
};

export default function EquipmentPage() {
  const ts = useTranslations('Equipment');
  // 翻译钩子
  const tc = useTranslations('Common');

  const [list, setList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Equipment>>({});
  const [typeStats, setTypeStats] = useState<Loose[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (typeFilter !== 'all') params.append('equipment_type', typeFilter);
      const res = await authFetch(`/api/equipment?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTypeStats(result.data?.typeStats || []);
      }
    } catch {
      toast.error(ts('k_tim4fu'));
    } finally {
      setLoading(false);
    }
  }, [keyword, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveEquipment = async () => {
    if (!form.equipment_code || !form.equipment_name) {
      toast.error(ts('k_d89iud'));
      return;
    }
    try {
      const method = editing ? 'PUT' : 'POST';
      const res = await authFetch('/api/equipment', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(editing ? ts('k_q4yls7') : ts('k_p97dky'));
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.message || tc('error'));
      }
    } catch {
      toast.error(ts('k_t22vxx'));
    }
  };

  const deleteEquipment = async (id: number) => {
    if (!confirm(tc('confirmDeleteDevice'))) return;
    try {
      const res = await authFetch(`/api/equipment?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success(ts('k_zxk76f'));
        fetchData();
      } else {
        toast.error(result.message || ts('k_1ijrr73'));
      }
    } catch {
      toast.error(ts('k_1ij9q14'));
    }
  };

  return (
    <MainLayout title={ts('k_14ygvtp')}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {typeStats.map((s: Loose) => (
            <Card key={s.equipment_type}>
              <CardContent className="pt-4">
                <div className="text-sm text-gray-500">
                  {EQUIPMENT_TYPES[s.equipment_type] || ts('k_dcd4ul')}
                </div>
                <div className="text-2xl font-bold">{s.count}</div>
                <div className="text-xs text-gray-400">
                  {tc('avgOee')}
                  {parseFloat(s.avg_oee).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                {tc('equipmentAccount')}</CardTitle>
              <CardDescription>{tc('equipmentAccount')}</CardDescription>
            </div>
            <Button
              onClick={() => {
                setForm({});
                setEditing(false);
                setDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {ts('k_1wff940')}</Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={ts('k_md8kwx')}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={ts('k_6dnny8')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ts('k_zao217')}</SelectItem>
                  {Object.entries(EQUIPMENT_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts('k_17s4qyf')}</TableHead>
                    <TableHead>{ts('k_eb1q6f')}</TableHead>
                    <TableHead>{tc('type')}</TableHead>
                    <TableHead>{tc('brandModel')}</TableHead>
                    <TableHead>{tc('location')}</TableHead>
                    <TableHead>{ts('k_okezj5')}</TableHead>
                    <TableHead>OEE</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead className="text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">{eq.equipment_code}</TableCell>
                      <TableCell>{eq.equipment_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EQUIPMENT_TYPES[eq.equipment_type] || ts('k_dcd4ul')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {eq.brand} {eq.model}
                      </TableCell>
                      <TableCell>{eq.location || '-'}</TableCell>
                      <TableCell>{eq.rated_capacity || '-'}</TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${(eq.oee || 0) >= 85 ? 'text-green-600' : (eq.oee || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
                        >
                          {eq.oee?.toFixed(1) || 0}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={CURRENT_STATUS[eq.current_status]?.color || 'bg-gray-100'}
                        >
                          {CURRENT_STATUS[eq.current_status]?.label || tc('unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setForm(eq);
                              setEditing(true);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteEquipment(eq.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>{editing ? ts('k_11p3hrz') : ts('k_1wff940')}</DialogTitle>
            <DialogDescription>{editing ? ts('k_1buzra7') : ts('k_ix32n0')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {ts('k_17s4qyf')}<span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.equipment_code || ''}
                  onChange={(e) => setForm({ ...form, equipment_code: e.target.value })}
                  placeholder={ts('k_1ktubuq')}
                  disabled={editing}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {ts('k_eb1q6f')}<span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.equipment_name || ''}
                  onChange={(e) => setForm({ ...form, equipment_name: e.target.value })}
                  placeholder={ts('k_1wkt1ns')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{ts('k_6dnny8')}</Label>
                <Select
                  value={String(form.equipment_type ?? 1)}
                  onValueChange={(v) => setForm({ ...form, equipment_type: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EQUIPMENT_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tc('brand')}</Label>
                <Input
                  value={form.brand || ''}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder={tc('brand')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{ts('k_k2pa13')}</Label>
                <Input
                  value={form.model || ''}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder={ts('k_k2pa13')}
                />
              </div>
              <div className="space-y-2">
                <Label>{ts('k_1e6msf0')}</Label>
                <Input
                  value={form.location || ''}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder={tc('location')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{ts('k_3uy4l6')}</Label>
                <Input
                  type="number"
                  value={form.rated_capacity || ''}
                  onChange={(e) =>
                    setForm({ ...form, rated_capacity: parseFloat(e.target.value) || 0 })
                  }
                  placeholder={ts('k_zu5xvv')}
                />
              </div>
              <div className="space-y-2">
                <Label>{ts('k_1ihgm6s')}</Label>
                <Select
                  value={String(form.current_status ?? 1)}
                  onValueChange={(v) => setForm({ ...form, current_status: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENT_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tc('remark')}</Label>
              <Textarea
                value={form.remark || ''}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                placeholder={tc('remark')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}</Button>
            <Button onClick={saveEquipment} className="bg-blue-600 hover:bg-blue-700">
              {ts('k_1c3mapc')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
