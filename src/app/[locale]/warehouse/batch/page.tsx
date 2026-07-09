'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Layers,
  RefreshCw,
  Search,
  AlertTriangle,
  Snowflake,
  ThermometerSun,
  Eye,
} from 'lucide-react';
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
  expiry_date: string | null;
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
  const [page, setPage] = useState(1);
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
    expiry_date: '',
    supplier_name: '',
    remark: '',
  });
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
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
  }, [page, searchBatchNo, expiryWarningOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [matRes, whRes] = await Promise.all([
          authFetch('/api/materials?page=1&pageSize=100'),
          authFetch('/api/warehouses'),
        ]);
        const matResult = await matRes.json();
        const whResult = await whRes.json();
        if (matResult.success) setMaterials(matResult.data?.list || []);
        if (whResult.success) setWarehouses(whResult.data?.list || whResult.data || []);
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
          expiry_date: form.expiry_date || null,
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
          expiry_date: '',
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
    const status = getExpiryStatus(b.expiry_date);
    return status !== null;
  }).length;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
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
                <Layers className="w-5 h-5 text-blue-600" />
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
                <Snowflake className="w-5 h-5 text-cyan-600" />
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
                <AlertTriangle className="w-5 h-5 text-orange-600" />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('batchNo')}</TableHead>
                  <TableHead>{t('materialCode')}</TableHead>
                  <TableHead>{t('materialName')}</TableHead>
                  <TableHead>{t('warehouse')}</TableHead>
                  <TableHead>{t('quantity')}</TableHead>
                  <TableHead>{t('availableQty')}</TableHead>
                  <TableHead>{t('costPrice')}</TableHead>
                  <TableHead>{t('expiryDate')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item) => {
                    const expiryStatus = getExpiryStatus(item.expiry_date);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.batch_no}</TableCell>
                        <TableCell className="font-mono text-sm">{item.material_code}</TableCell>
                        <TableCell className="text-sm font-medium">{item.material_name}</TableCell>
                        <TableCell className="text-sm">{item.warehouse_name || '-'}</TableCell>
                        <TableCell className="text-sm font-mono">
                          {Number(item.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {Number(item.available_qty).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          ¥{Number(item.cost_price || 0).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.expiry_date ? (
                            <div>
                              <div>{item.expiry_date}</div>
                              {expiryStatus && (
                                <div className={`text-xs ${expiryStatus.color}`}>
                                  {expiryStatus.label}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {item.status === 'frozen' ? (
                            <Badge
                              variant="secondary"
                              className="bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                            >
                              <Snowflake className="h-3 w-3 mr-1" />
                              {t('frozen')}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{t('active')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7"
                              onClick={() => {
                                setDetailData(item);
                                setDetailOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {tc('detail')}
                            </Button>
                            {item.status === 'frozen' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-green-600"
                                onClick={() => handleFreeze(item.id, 'unfreeze')}
                              >
                                <ThermometerSun className="h-3 w-3 mr-1" />
                                {t('unfreeze')}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-cyan-600"
                                onClick={() => handleFreeze(item.id, 'freeze')}
                              >
                                <Snowflake className="h-3 w-3 mr-1" />
                                {t('freeze')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 分页 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {tc('total')} {total} {t('batchUnit')}
          </span>
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
                  {detailData.expiry_date || '-'}
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
                    {materials.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.material_code} - {m.material_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('warehouse')} *</Label>
                <Select
                  value={form.warehouse_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, warehouse_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectWarehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w: any) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  value={form.expiry_date}
                  onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
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
