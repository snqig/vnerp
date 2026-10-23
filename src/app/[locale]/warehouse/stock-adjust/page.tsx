'use client';
import { authFetch } from '@/lib/auth-fetch';
import { toDateInput } from '@/lib/date-utils';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeroHeader } from '@/components/layout/PageHeroHeader';
import { ListToolbar } from '@/components/layout/ListToolbar';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Search, Edit, Trash2, ArrowLeftRight, CheckCircle, Clock, AlertTriangle, XCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';

interface Item {
  id: number;
  adjust_no: string;
  warehouse_id?: number;
  warehouse_name: string;
  adjust_date: string;
  adjust_type: number;
  status: number;
  operator_name: string;
  remark: string;
}

export default function StockAdjustPage() {
  const ts = useTranslations('Warehouse');
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: tc('pending'), variant: 'outline' },
    2: { label: tc('approved'), variant: 'default' },
    3: { label: t('completed'), variant: 'secondary' },
    4: { label: t('cancelled'), variant: 'destructive' },
  };
  const typeMap: Record<number, string> = { 1: t('surplus'), 2: t('deficit'), 3: t('otherAdjust') };

  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Item[]>([]);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    executed: 0,
    rejected: 0,
    monthlyCount: 0,
  });

  const _exportColumns = [
    { key: t('adjustNo'), header: t('adjustNo') },
    { key: t('warehouse'), header: t('warehouse') },
    { key: t('adjustDate'), header: t('adjustDate') },
    { key: t('adjustType'), header: t('adjustType') },
    { key: t('operator'), header: t('operator') },
    { key: tc('status'), header: tc('status') },
  ];
  const _getExportData = () =>
    list.map((item) => ({
      [t('adjustNo')]: item.adjust_no,
      [t('warehouse')]: item.warehouse_name || '-',
      [t('adjustDate')]: item.adjust_date || '-',
      [t('adjustType')]: typeMap[item.adjust_type] || '-',
      [t('operator')]: item.operator_name || '-',
      [tc('status')]: statusMap[item.status]?.label || '-',
    }));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        adjustNo: searchNo,
      });
      const res = await authFetch('/api/warehouse/stock-adjust?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {}
  };
  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/warehouse/stock-adjust/stats');
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
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/warehouse/stock-adjust', {
        method: 'POST',
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleStatusChange = async (id: number, status: number, expectedStatus: number) => {
    try {
      const res = await authFetch('/api/warehouse/stock-adjust', {
        method: 'PUT',
        body: JSON.stringify({ id, status, expectedStatus }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('updateSuccess') });
        fetchData();
      } else if (res.status === 409) {
        // 乐观锁冲突：状态已被其他操作变更
        toast({
          title: tc('failed'),
          description: result.message || ts('k_1hw00sx'),
          variant: 'destructive',
        });
        fetchData();
      } else {
        toast({ title: tc('failed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/warehouse/stock-adjust?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('adjustDeleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('failed'), variant: 'destructive' });
    }
  };

  const columns: StandardTableColumn<Item>[] = [
    {
      key: 'adjust_no',
      title: t('adjustNo'),
      dataIndex: 'adjust_no',
      width: 140,
      className: 'text-xs font-mono',
    },
    {
      key: 'warehouse_name',
      title: tc('warehouse'),
      width: 140,
      className: 'text-xs',
      render: (row) => row.warehouse_name || '-',
    },
    {
      key: 'adjust_date',
      title: t('adjustDate'),
      width: 110,
      className: 'text-xs',
      render: (row) => row.adjust_date || '-',
    },
    {
      key: 'adjust_type',
      title: t('adjustType'),
      width: 100,
      className: 'text-xs',
      render: (row) => typeMap[row.adjust_type] || '-',
    },
    {
      key: 'operator_name',
      title: t('operator'),
      width: 100,
      className: 'text-xs',
      render: (row) => row.operator_name || '-',
    },
    {
      key: 'status',
      title: tc('status'),
      width: 100,
      render: (row) => {
        const st = statusMap[row.status] || statusMap[1];
        return (
          <Badge variant={st.variant} className="text-xs">
            {st.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: tc('actions'),
      width: 200,
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(row.id, 2, row.status)}
            >
              {tc('audit')}
            </Button>
          )}
          {row.status === 2 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => handleStatusChange(row.id, 3, row.status)}
            >
              {t('complete')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setEditItem(row);
              setShowDialog(true);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeroHeader
          icon={ArrowLeftRight}
          title={t('stockAdjustTitle')}
          action={
            <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchOrderNo')}
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <GlobalExportToolbar
              filename={ts('k_leccqh')}
              title={ts('k_leccqh')}
              columns={[
                { key: 'adjust_no', label: t('adjustNo'), width: 18 },
                {
                  key: 'warehouse_name',
                  label: t('warehouse'),
                  width: 15,
                  formatter: (v) => v || '-',
                },
                {
                  key: 'adjust_date',
                  label: t('adjustDate'),
                  width: 12,
                  formatter: (v) => v || '-',
                },
                {
                  key: 'adjust_type',
                  label: t('adjustType'),
                  width: 12,
                  formatter: (v) => typeMap[v] || '-',
                },
                {
                  key: 'operator_name',
                  label: t('operator'),
                  width: 12,
                  formatter: (v) => v || '-',
                },
                {
                  key: 'status',
                  label: tc('status'),
                  width: 10,
                  formatter: (v) => statusMap[v]?.label || '-',
                },
              ]}
              data={selectedRows.length > 0 ? selectedRows : list}
            />
            <Button
              size="sm"
              onClick={() => {
                setEditItem({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addAdjust')}
            </Button>
            </div>
          }
        />        <StatsCards
          configs={[
            { key: 'pending', label: '待审批', icon: Clock, ...StatsTheme.orange },
            { key: 'approved', label: '已审批', icon: CheckCircle, ...StatsTheme.blue },
            { key: 'executed', label: '已执行', icon: ArrowLeftRight, ...StatsTheme.green },
            { key: 'rejected', label: '已驳回', icon: XCircle, ...StatsTheme.red },
            { key: 'monthlyCount', label: '本月调整单数', icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'approved', count: stats.approved },
            { key: 'executed', count: stats.executed },
            { key: 'rejected', count: stats.rejected },
            { key: 'monthlyCount', count: stats.monthlyCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />


        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-0">
            <StandardTable<Item>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              rowKey="id"
              emptyText={t('noStockAdjustRecords')}
            />
          </CardContent>
        </Card>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('addAdjustOrder')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tc('warehouse')}</Label>
                <WarehouseSelect
                  value={editItem.warehouse_id || ''}
                  onChange={(v) =>
                    setEditItem({
                      ...editItem,
                      warehouse_id: Number(v),
                    })
                  }
                  placeholder={t('warehousePlaceholder')}
                />
              </div>
              <div>
                <Label>{t('adjustDateLabel')}</Label>
                <Input
                  type="date"
                  value={toDateInput(editItem.adjust_date)}
                  onChange={(e) => setEditItem({ ...editItem, adjust_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('adjustTypeLabel')}</Label>
                <Select
                  value={String(editItem.adjust_type || 1)}
                  onValueChange={(v) => setEditItem({ ...editItem, adjust_type: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('surplus')}</SelectItem>
                    <SelectItem value="2">{t('deficit')}</SelectItem>
                    <SelectItem value="3">{t('otherAdjust')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('operator')}</Label>
                <UserSelect
                  value={editItem.operator_name || ''}
                  onChange={(v) => setEditItem({ ...editItem, operator_name: v })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
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
