'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StandardTable, type StandardTableColumn } from '@/components/common';
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
import { Plus, Search, Trash2, Calendar, Droplets, CalendarDays, TrendingUp, AlertTriangle } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { useTranslations } from 'next-intl';

interface InkUsage {
  id: number;
  work_order_id: number;
  screen_plate_id: number;
  plate_code: string;
  ink_id: number;
  ink_code: string;
  ink_name: string;
  usage_qty: number;
  unit: string;
  usage_date: string;
  operator_name: string;
  remark: string;
  create_time: string;
}

interface Ink {
  id: number;
  ink_code: string;
  ink_name: string;
  unit: string;
}

export default function InkUsagePage() {
  const ts = useTranslations('Dcprint');
  // 翻译钩子
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<InkUsage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [plateId, setPlateId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InkUsage>>({});
  const [inkList, setInkList] = useState<Ink[]>([]);

  const inkStats = (() => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const totalUsage = list.reduce((s, it) => s + (it.usage_qty || 0), 0);
    const monthUsage = list
      .filter((it) => it.usage_date && it.usage_date.startsWith(thisMonth))
      .reduce((s, it) => s + (it.usage_qty || 0), 0);
    const anomalies = list.filter((it) => it.usage_qty === 0).length;
    return [
      { key: 'total', count: totalUsage },
      { key: 'month', count: monthUsage },
      { key: 'change', count: 0 },
      { key: 'anomalies', count: anomalies },
    ];
  })();

  const fetchInks = async () => {
    try {
      const res = await authFetch('/api/base-inks');
      const result = await res.json();
      if (result.success) {
        setInkList(result.data.list || result.data || []);
      }
    } catch {}
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (plateId) params.set('plateId', plateId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await authFetch('/api/ink-usages?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);
  useEffect(() => {
    fetchInks();
  }, []);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/ink-usages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editItem,
          usageDate: editItem.usage_date || new Date().toISOString(),
          operatorName: editItem.operator_name || '',
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/ink-usages?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  // 注：/api/ink-usages 暂不支持 sortField/sortDirection，故先不开启 sortable，
  // 避免出现点击无反应的排序控件；待后端补齐排序参数后再打开。
  const columns: StandardTableColumn<InkUsage>[] = [
    { key: 'usage_date', title: ts('k_1qsekja'), render: (r) => <span className="text-xs">{r.usage_date}</span> },
    {
      key: 'plate_code',
      title: ts('k_3nrpbh'),
      render: (r) => <span className="text-xs font-mono">{r.plate_code || '-'}</span>,
    },
    { key: 'ink_code', title: ts('k_1nkbox1'), render: (r) => <span className="text-xs font-mono">{r.ink_code}</span> },
    { key: 'ink_name', title: ts('k_pegwq9'), render: (r) => <span className="text-xs">{r.ink_name}</span> },
    { key: 'usage_qty', title: ts('k_1v71803'), render: (r) => <span className="text-xs font-bold">{r.usage_qty}</span> },
    { key: 'unit', title: tc('unit'), render: (r) => <span className="text-xs">{r.unit}</span> },
    { key: 'operator_name', title: ts('k_15sp2wy'), render: (r) => <span className="text-xs">{r.operator_name || '-'}</span> },
    { key: 'remark', title: tc('remark'), render: (r) => <span className="text-xs">{r.remark || '-'}</span> },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      // 原有操作列：删除，逻辑保持原样
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
          onClick={() => handleDelete(r.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: ts('k_totalUsage'), icon: Droplets, ...StatsTheme.blue },
            { key: 'month', label: ts('k_monthUsage'), icon: CalendarDays, ...StatsTheme.green },
            { key: 'change', label: ts('k_yoyChange'), icon: TrendingUp, ...StatsTheme.orange },
            { key: 'anomalies', label: ts('k_anomalyCount'), icon: AlertTriangle, ...StatsTheme.red },
          ]}
          stats={inkStats}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{tc('dcInkUsageTitle')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('dcPlateIdLabel')}
                value={plateId}
                onChange={(e) => setPlateId(e.target.value)}
                className="w-24 h-8 text-sm"
              />
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-28 h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-28 h-8 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {ts('k_15ybbto')}</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <StandardTable<InkUsage>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable={false}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              onRetry={fetchData}
              emptyText={ts('k_11itye0')}
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{tc('dcAddUsageTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{ts('k_w1cwb8')}</Label>
                <Select
                  value={String(editItem.ink_id || '')}
                  onValueChange={(v) => {
                    const ink = inkList.find((i) => i.id === Number(v));
                    setEditItem({
                      ...editItem,
                      ink_id: Number(v),
                      ink_code: ink?.ink_code,
                      ink_name: ink?.ink_name,
                      unit: ink?.unit,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_12okix1')} />
                  </SelectTrigger>
                  <SelectContent>
                    {inkList.map((ink) => (
                      <SelectItem key={ink.id} value={String(ink.id)}>
                        {ink.ink_code} - {ink.ink_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_1v71803')}</Label>
                <Input
                  type="number"
                  value={editItem.usage_qty ?? ''}
                  onChange={(e) => setEditItem({ ...editItem, usage_qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('dcPlateIdLabel')}</Label>
                <Input
                  type="number"
                  value={editItem.screen_plate_id ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, screen_plate_id: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{tc('dcWorkOrderIdLabel')}</Label>
                <Input
                  type="number"
                  value={editItem.work_order_id ?? ''}
                  onChange={(e) =>
                    setEditItem({ ...editItem, work_order_id: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{ts('k_1qsekja')}</Label>
                <Input
                  type="datetime-local"
                  value={editItem.usage_date?.slice(0, 16) || ''}
                  onChange={(e) => setEditItem({ ...editItem, usage_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_15sp2wy')}</Label>
                <UserSelect
                  value={editItem.operator_name || ''}
                  onChange={(v) => setEditItem({ ...editItem, operator_name: v })}
                />
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {ts('k_1589w37')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
