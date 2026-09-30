'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import {
  Layers,
  Clock,
  RefreshCw,
  Search,
  AlertTriangle,
  Snowflake,
  ThermometerSun,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { useToast } from '@/hooks/use-toast';

interface BatchItem {
  id: number;
  material_id: number;
  warehouse_id: number;
  batch_no: string;
  serial_no: string | null;
  quantity: number;
  available_qty: number;
  unit_price: number;
  cost_price: number;
  production_date: string | null;
  expire_date: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  status: string;
  remark: string | null;
  material_name: string;
  material_code: string;
  material_spec: string;
  unit: string;
  warehouse_name: string;
}

export default function BatchPage() {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const [list, setList] = useState<BatchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searchBatchNo, setSearchBatchNo] = useState('');
  const [expiryWarningOnly, setExpiryWarningOnly] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<BatchItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    material_id: '',
    warehouse_id: '',
    batch_no: '',
    serial_no: '',
    quantity: '',
    unit_price: '',
    cost_price: '',
    production_date: '',
    expire_date: '',
    supplier_name: '',
    remark: '',
  });
  const [materials, setMaterials] = useState<Loose[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchBatchNo) params.set('batchNo', searchBatchNo);
      if (expiryWarningOnly) params.set('expiryWarning', 'true');

      const res = await authFetch(`/api/warehouse/batch?${params}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchBatchNo, expiryWarningOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const matRes = await authFetch('/api/materials?page=1&pageSize=100');
        const matResult = await matRes.json();
        if (matResult.success) setMaterials(matResult.data?.list || []);
      } catch {}
    };
    loadOptions();
  }, []);

  const handleCreate = async () => {
    if (!form.material_id || !form.warehouse_id || !form.batch_no || !form.quantity) {
      toast({ title: tc('required'), variant: 'destructive' });
      return;
    }
    try {
      const res = await authFetch('/api/warehouse/batch', {
        method: 'POST',
        body: JSON.stringify({
          material_id: Number(form.material_id),
          warehouse_id: Number(form.warehouse_id),
          batch_no: form.batch_no,
          serial_no: form.serial_no || null,
          quantity: Number(form.quantity),
          unit_price: Number(form.unit_price) || 0,
          cost_price: Number(form.cost_price) || 0,
          production_date: form.production_date || null,
          expire_date: form.expire_date || null,
          supplier_name: form.supplier_name || null,
          remark: form.remark || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('batchCreateSuccess') });
        setCreateOpen(false);
        setForm({
          material_id: '',
          warehouse_id: '',
          batch_no: '',
          serial_no: '',
          quantity: '',
          unit_price: '',
          cost_price: '',
          production_date: '',
          expire_date: '',
          supplier_name: '',
          remark: '',
        });
        fetchData();
      } else {
        toast({ title: result.message || tc('createFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('createFailed'), variant: 'destructive' });
    }
  };

  const handleFreeze = async (id: number, action: 'freeze' | 'unfreeze') => {
    try {
      const res = await authFetch('/api/warehouse/batch', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: action === 'freeze' ? t('batchFrozen') : t('batchUnfrozen') });
        fetchData();
      } else {
        toast({ title: result.message || tc('operationFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: t('expired'), color: 'text-red-600 dark:text-red-400' };
    if (diffDays <= 30)
      return {
        label: t('expireSoon', { days: diffDays }),
        color: 'text-orange-600 dark:text-orange-400',
      };
    if (diffDays <= 90)
      return {
        label: t('shelfLife', { days: diffDays }),
        color: 'text-yellow-600 dark:text-yellow-400',
      };
    return null;
  };

  const expiryWarningCount = list.filter((b) => {
    const status = getExpiryStatus(b.expire_date);
    return status !== null;
  }).length;

  // StandardTable 列定义（服务端分页，接口暂不支持 sortField/sortDirection，故不开启 sortable）
  const columns: StandardTableColumn<BatchItem>[] = [
    {
      key: 'batch_no',
      title: t('batchNo'),
      render: (r) => <span className="font-mono text-sm">{r.batch_no}</span>,
    },
    {
      key: 'material_code',
      title: t('materialCode'),
      render: (r) => <span className="font-mono text-sm">{r.material_code}</span>,
    },
    {
      key: 'material_name',
      title: t('materialName'),
      render: (r) => <span className="text-sm font-medium">{r.material_name}</span>,
    },
    {
      key: 'warehouse_name',
      title: t('warehouse'),
      render: (r) => <span className="text-sm">{r.warehouse_name || '-'}</span>,
    },
    {
      key: 'quantity',
      title: t('quantity'),
      align: 'right',
      render: (r) => <span className="text-sm font-mono">{Number(r.quantity).toLocaleString()}</span>,
    },
    {
      key: 'available_qty',
      title: t('availableQty'),
      align: 'right',
      render: (r) => (
        <span className="text-sm font-mono">{Number(r.available_qty).toLocaleString()}</span>
      ),
    },
    {
      key: 'unit_price',
      title: t('costPrice'),
      align: 'right',
      render: (r) => <span className="text-sm font-mono">¥{Number(r.unit_price || 0).toFixed(4)}</span>,
    },
    {
      key: 'expire_date',
      title: t('expiryDate'),
      render: (r) => {
        const expiryStatus = getExpiryStatus(r.expire_date);
        return r.expire_date ? (
          <div>
            <div>{r.expire_date}</div>
            {expiryStatus && (
              <div className={`text-xs ${expiryStatus.color}`}>{expiryStatus.label}</div>
            )}
          </div>
        ) : (
          '-'
        );
      },
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) =>
        r.status === 'frozen' ? (
          <Badge
            variant="secondary"
            className="bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
          >
            <Snowflake className="h-3 w-3 mr-1" />
            {t('frozen')}
          </Badge>
        ) : (
          <Badge variant="outline">{t('active')}</Badge>
        ),
    },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      // 原有操作列：详情 / 冻结 / 解冻，逻辑保持原样
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => {
              setDetailData(r);
              setDetailOpen(true);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            {tc('detail')}
          </Button>
          {r.status === 'frozen' ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-green-600 dark:text-green-400"
              onClick={() => handleFreeze(r.id, 'unfreeze')}
            >
              <ThermometerSun className="h-3 w-3 mr-1" />
              {t('unfreeze')}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-cyan-600 dark:text-cyan-400"
              onClick={() => handleFreeze(r.id, 'freeze')}
            >
              <Snowflake className="h-3 w-3 mr-1" />
              {t('freeze')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: tc('totalBatches'), icon: Layers, ...StatsTheme.blue },
            { key: 'expiring', label: tc('expiringSoon'), icon: Clock, ...StatsTheme.orange },
            { key: 'expired', label: tc('expired'), icon: AlertTriangle, ...StatsTheme.red },
            { key: 'available', label: tc('availableBatches'), icon: CheckCircle, ...StatsTheme.green },
          ]}
          stats={[
            { key: 'total', count: total },
            { key: 'expiring', count: list.filter((b) => { const s = getExpiryStatus(b.expire_date); return s?.label === t('expiringSoon'); }).length },
            { key: 'expired', count: list.filter((b) => { const s = getExpiryStatus(b.expire_date); return s?.label === t('expired'); }).length },
            { key: 'available', count: list.filter((b) => b.available_qty > 0 && b.status !== 'frozen').length },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="w-6 h-6" />
              {t('batchManagement')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('batchManagementDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="h-3 w-3 mr-1" />
              {tc('refresh')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              + {tc('create')}
            </Button>
          </div>
        </div>

        {/* 汇总卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="text-sm text-muted-foreground">{t('totalBatches')}</div>
                  <div className="text-2xl font-bold">{total}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <div>
                  <div className="text-sm text-muted-foreground">{t('frozenBatches')}</div>
                  <div className="text-2xl font-bold">
                    {list.filter((b) => b.status === 'frozen').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <div className="text-sm text-muted-foreground">{t('expiryWarning')}</div>
                  <div className="text-2xl font-bold">{expiryWarningCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索栏 */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchBatchNo')}
                  value={searchBatchNo}
                  onChange={(e) => setSearchBatchNo(e.target.value)}
                  className="max-w-xs"
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                />
              </div>
              <Button
                size="sm"
                variant={expiryWarningOnly ? 'default' : 'outline'}
                onClick={() => {
                  setExpiryWarningOnly(!expiryWarningOnly);
                  setPage(1);
                }}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('expiryWarningFilter')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 批次列表 */}
        <Card>
          <CardContent className="p-0">
            <StandardTable<BatchItem>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              loading={loading}
              onRetry={() => fetchData()}
              emptyText={tc('noData')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* 批次详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('batchDetail')}</DialogTitle>
            <DialogDescription>{t('batchDetailDesc')}</DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">{t('batchNo')}:</span>{' '}
                  <span className="font-mono">{detailData.batch_no}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('serialNo')}:</span>{' '}
                  <span className="font-mono">{detailData.serial_no || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('materialCode')}:</span>{' '}
                  <span className="font-mono">{detailData.material_code}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('materialName')}:</span>{' '}
                  {detailData.material_name}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('warehouse')}:</span>{' '}
                  {detailData.warehouse_name || '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('spec')}:</span>{' '}
                  {detailData.material_spec || '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('quantity')}:</span>{' '}
                  {Number(detailData.quantity).toLocaleString()} {detailData.unit}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('availableQty')}:</span>{' '}
                  {Number(detailData.available_qty).toLocaleString()} {detailData.unit}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('costPrice')}:</span> ¥
                  {Number(detailData.cost_price || 0).toFixed(4)}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('unitPrice')}:</span> ¥
                  {Number(detailData.unit_price || 0).toFixed(4)}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('productionDate')}:</span>{' '}
                  {detailData.production_date || '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('expiryDate')}:</span>{' '}
                  {detailData.expire_date || '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">{tc('status')}:</span>{' '}
                  {detailData.status === 'frozen' ? t('frozen') : t('active')}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('supplier')}:</span>{' '}
                  {detailData.supplier_name || '-'}
                </div>
              </div>
              {detailData.remark && (
                <div>
                  <span className="text-muted-foreground">{tc('remark')}:</span> {detailData.remark}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建批次对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('createBatch')}</DialogTitle>
            <DialogDescription>{t('createBatchDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('material')} *</Label>
                <Select
                  value={form.material_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, material_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectMaterial')} />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m: Loose) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.material_code} - {m.material_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('warehouse')} *</Label>
                <WarehouseSelect
                  value={form.warehouse_id}
                  onChange={(v) => setForm((f) => ({ ...f, warehouse_id: v }))}
                  placeholder={t('selectWarehouse')}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('batchNo')} *</Label>
                <Input
                  value={form.batch_no}
                  onChange={(e) => setForm((f) => ({ ...f, batch_no: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('serialNo')}</Label>
                <Input
                  value={form.serial_no}
                  onChange={(e) => setForm((f) => ({ ...f, serial_no: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('quantity')} *</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('costPrice')}</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.cost_price}
                  onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('productionDate')}</Label>
                <Input
                  type="date"
                  value={form.production_date}
                  onChange={(e) => setForm((f) => ({ ...f, production_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('expiryDate')}</Label>
                <Input
                  type="date"
                  value={form.expire_date}
                  onChange={(e) => setForm((f) => ({ ...f, expire_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={form.remark}
                  onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreate}>{tc('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
