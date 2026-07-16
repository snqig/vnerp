// src/app/[locale]/settings/currency/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { logger } from '@/lib/logger';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  status: number;
  sort: number;
}

export default function CurrencyPage() {
  const tc = useTranslations('Common');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Currency>>({});

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/system/currency');
      const result = await response.json();
      if (result.success) {
        setCurrencies(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      logger.error({ module: 'Currency', action: 'fetchCurrencies' }, '获取币种列表失败', {
        error: (error as Error).message,
      });
      toast.error(tc('fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error('请填写币种代码和名称');
      return;
    }
    try {
      const method = editing ? 'PUT' : 'POST';
      const response = await authFetch('/api/system/currency', {
        method,
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(editing ? '更新成功' : '创建成功');
        setDialogOpen(false);
        fetchCurrencies();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此币种？')) return;
    try {
      const response = await authFetch(`/api/system/currency?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('删除成功');
        fetchCurrencies();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleEdit = (currency: Currency) => {
    setForm(currency);
    setEditing(true);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setForm({ status: 1, decimal_places: 2, sort: 0 });
    setEditing(false);
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tc('currencyManagement')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchCurrencies} disabled={loading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {tc('refresh')}
                </Button>
                <Button size="sm" onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  {tc('add')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc('sort') || '排序'}</TableHead>
                  <TableHead>CODE</TableHead>
                  <TableHead>{tc('currency')}</TableHead>
                  <TableHead>{tc('symbol') || '符号'}</TableHead>
                  <TableHead>{tc('decimalPlaces') || '小数位'}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{tc('operation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((currency) => (
                  <TableRow key={currency.id}>
                    <TableCell>{currency.sort}</TableCell>
                    <TableCell className="font-mono">{currency.code}</TableCell>
                    <TableCell>{currency.name}</TableCell>
                    <TableCell>{currency.symbol}</TableCell>
                    <TableCell>{currency.decimal_places}</TableCell>
                    <TableCell>
                      <Badge variant={currency.status === 1 ? 'default' : 'secondary'}>
                        {currency.status === 1 ? tc('enabled') : tc('disabled')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(currency)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(currency.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? tc('edit') : tc('add')}
                {tc('currency')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>CODE *</Label>
                <Input
                  value={form.code || ''}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={editing}
                  placeholder="CNY / USD / VND"
                />
              </div>
              <div>
                <Label>{tc('currency')}名称 *</Label>
                <Input
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="人民币 / 美元 / 越南盾"
                />
              </div>
              <div>
                <Label>{tc('symbol') || '符号'}</Label>
                <Input
                  value={form.symbol || ''}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="¥ / $ / ₫"
                />
              </div>
              <div>
                <Label>{tc('decimalPlaces') || '小数位'}</Label>
                <Input
                  type="number"
                  value={form.decimal_places ?? 2}
                  onChange={(e) => setForm({ ...form, decimal_places: parseInt(e.target.value) })}
                  min={0}
                  max={4}
                />
              </div>
              <div>
                <Label>{tc('sort') || '排序'}</Label>
                <Input
                  type="number"
                  value={form.sort ?? 0}
                  onChange={(e) => setForm({ ...form, sort: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('status')}</Label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={form.status ?? 1}
                  onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}
                >
                  <option value={1}>{tc('enabled')}</option>
                  <option value={0}>{tc('disabled')}</option>
                </select>
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
