// src/app/[locale]/settings/exchange-rate/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, RefreshCw, Coins, CheckCircle, Clock } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { CurrencySelect } from '@/components/ui/currency-select';
import { logger } from '@/lib/logger';

interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: string;
  rate_date: string;
  source: string;
  remark: string | null;
}

export default function ExchangeRatePage() {
  const ts = useTranslations('Common');
  const tc = useTranslations('Common');
  const tStd = useTranslations('StandardTable');
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [jumpValue, setJumpValue] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);
  const doJump = () => {
    const n = Number(jumpValue);
    if (!jumpValue || isNaN(n) || n < 1 || n > totalPages) {
      setJumpError(tStd('invalidPage', { max: totalPages }));
      return;
    }
    setJumpError(null);
    setPage(n);
  };
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    from_currency: 'USD',
    to_currency: 'CNY',
    rate: '',
    rate_date: new Date().toISOString().split('T')[0],
    remark: '',
  });

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/system/exchange-rate?page=${page}&pageSize=${pageSize}`);
      const result = await response.json();
      if (result.success) {
        const data = result.data;
        setRates(Array.isArray(data) ? data : data?.list || []);
        const totalCount = Array.isArray(data) ? data.length : data?.total || 0;
        setTotal(totalCount);
        setTotalPages(Math.ceil(totalCount / pageSize));
      } else {
        toast.error(result.message || tc('fetchFailed'));
      }
    } catch (error) {
      logger.error({ module: 'Currency', action: 'fetchRates' }, ts('k_6sc3y7'), {
        error: (error as Error).message,
      });
      toast.error(tc('fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [tc, page, pageSize]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleSave = async () => {
    if (!form.rate || parseFloat(form.rate) <= 0) {
      toast.error(tc('invalidRate'));
      return;
    }
    if (form.from_currency === form.to_currency) {
      toast.error(tc('sameCurrencyError'));
      return;
    }
    setSaving(true);
    try {
      const response = await authFetch('/api/system/exchange-rate', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(tc('createSuccess'));
        setDialogOpen(false);
        fetchRates();
      } else {
        toast.error(result.message || tc('operationFailed'));
      }
    } catch {
      toast.error(tc('operationFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const response = await authFetch(`/api/system/exchange-rate?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success(tc('deleteSuccess'));
        fetchRates();
      }
    } catch {
      toast.error(tc('deleteFailed'));
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <StatsCards
          configs={[
            { key: 'currencies', label: tc('currencyCount'), icon: Coins, ...StatsTheme.blue },
            { key: 'active', label: tc('activeRates'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'expiring', label: tc('expiringRates'), icon: Clock, ...StatsTheme.orange },
            { key: 'pending', label: tc('pendingUpdate'), icon: RefreshCw, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'currencies', count: new Set(rates.map((r) => r.from_currency)).size + 1 },
            { key: 'active', count: rates.filter((r) => r.rate_date >= new Date().toISOString().split('T')[0]).length },
            { key: 'expiring', count: rates.filter((r) => { const d = new Date(r.rate_date); const n = new Date(); const diff = (d.getTime() - n.getTime()) / (1000 * 60 * 60 * 24); return diff > 0 && diff <= 7; }).length },
            { key: 'pending', count: rates.filter((r) => r.rate_date < new Date().toISOString().split('T')[0]).length },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tc('exchangeRateManagement')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchRates} disabled={loading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {tc('refresh')}
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
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
                  <TableHead>{tc('originalCurrency')}</TableHead>
                  <TableHead>{tc('baseCurrency')}</TableHead>
                  <TableHead>{tc('exchangeRate')}</TableHead>
                  <TableHead>{tc('date')}</TableHead>
                  <TableHead>{tc('source')}</TableHead>
                  <TableHead>{tc('remark')}</TableHead>
                  <TableHead>{tc('operation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : rates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-mono">{rate.from_currency}</TableCell>
                      <TableCell className="font-mono">{rate.to_currency}</TableCell>
                      <TableCell className="font-mono">{rate.rate}</TableCell>
                      <TableCell>{rate.rate_date}</TableCell>
                      <TableCell>{rate.source}</TableCell>
                      <TableCell>{rate.remark || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(rate.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {total > 0 && (
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {tStd('paginationSummary', { total, pages: totalPages })}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20{tStd('pageSizeUnit')}</SelectItem>
                  <SelectItem value="50">50{tStd('pageSizeUnit')}</SelectItem>
                  <SelectItem value="100">100{tStd('pageSizeUnit')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>{tStd('prevPage')}</Button>
              <span className="text-sm">{tStd('pageNumber', { page, pages: totalPages })}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>{tStd('nextPage')}</Button>
              <div className="flex items-center gap-1">
                <Input className="w-[70px]" value={jumpValue} onChange={(e) => setJumpValue(e.target.value)} placeholder={tStd('pageNumber', { page, pages: totalPages })} onKeyDown={(e) => { if (e.key === 'Enter') doJump(); }} />
                <Button variant="outline" size="sm" onClick={doJump}>{tStd('jump')}</Button>
              </div>
            </div>
          </div>
        )}
        {jumpError && <p className="text-destructive text-sm mt-2">{jumpError}</p>}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {tc('add')}
                {tc('exchangeRate')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>{tc('originalCurrency')}</Label>
                <CurrencySelect
                  value={form.from_currency}
                  onChange={(v) => setForm({ ...form, from_currency: v })}
                />
              </div>
              <div>
                <Label>{tc('baseCurrency')}</Label>
                <CurrencySelect
                  value={form.to_currency}
                  onChange={(v) => setForm({ ...form, to_currency: v })}
                />
              </div>
              <div>
                <Label>{tc('exchangeRate')} *</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  placeholder="7.250000"
                />
              </div>
              <div>
                <Label>{tc('date')} *</Label>
                <Input
                  type="date"
                  value={form.rate_date}
                  onChange={(e) => setForm({ ...form, rate_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder={tc('remarkPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {tc('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
