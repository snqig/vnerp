'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, RefreshCw, QrCode, Eye, Printer, ScanLine, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations, useLocale } from 'next-intl';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';

interface QRRecord {
  id: number;
  qr_code: string;
  qr_type: string;
  ref_id: number;
  ref_no: string;
  batch_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  specification: string;
  quantity: number;
  unit: string;
  warehouse_name: string;
  supplier_name: string;
  customer_name: string;
  work_order_no: string;
  production_date: string;
  expiry_date: string;
  print_count: number;
  scan_count: number;
  status: number;
  create_time: string;
  remark: string;
}

export default function QRCodePage() {
  const t = useTranslations('QRCode');
  const tc = useTranslations('Common');
  const locale = useLocale();

  const typeMap: Record<string, string> = {
    material: t('rawMaterial'),
    product: t('finished'),
    workorder: t('workOrder'),
    ink: t('ink'),
    screen_plate: t('screen'),
    die: t('blade'),
    shipment: t('shipment'),
    ink_open: t('inkOpen'),
    ink_mixed: t('inkMixed'),
  };

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: t('valid'), variant: 'default' },
    2: { label: t('used'), variant: 'secondary' },
    3: { label: t('expired'), variant: 'outline' },
    9: { label: t('void'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<QRRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [form, setForm] = useState<Loose>({});
  const [traceData, setTraceData] = useState<Loose>(null);
  const [traceInput, setTraceInput] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        keyword,
        qr_type: typeFilter,
      });
      const res = await authFetch('/api/qrcode?' + params);
      const result = await res.json();
      if (result.success || result.code === 200) {
        let rawList: Loose[] = [];
        let totalCount = 0;
        const rawData = result.data;
        if (Array.isArray(rawData)) {
          rawList = rawData;
          totalCount = rawData.length;
        } else if (rawData) {
          rawList = rawData.list || rawData.records || rawData.items || [];
          totalCount =
            rawData.total || rawData.totalCount || rawData.totalRecords || rawList.length;
        }
        setList(rawList);
        setTotal(totalCount);
      }
    } catch {}
  }, [page, keyword, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    try {
      const res = await authFetch('/api/qrcode', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('generateSuccess'), description: result.data?.qr_code });
        setShowDialog(false);
        setForm({});
        fetchData();
      } else {
        toast({ title: t('generateFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handlePrint = async (id: number) => {
    try {
      await authFetch('/api/qrcode', {
        method: 'PUT',
        body: JSON.stringify({ id, action: 'print' }),
      });
      toast({ title: t('printRecordUpdated') });
      fetchData();
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleTrace = async () => {
    if (!traceInput) {
      toast({ title: t('enterQrCodeOrRefNo') });
      return;
    }
    try {
      const params = new URLSearchParams();
      if (
        traceInput.startsWith('MA-') ||
        traceInput.startsWith('PR-') ||
        traceInput.startsWith('WO-') ||
        traceInput.startsWith('IN-') ||
        traceInput.startsWith('SP-') ||
        traceInput.startsWith('DI-') ||
        traceInput.startsWith('SH-') ||
        traceInput.startsWith('IK-')
      ) {
        params.set('qr_code', traceInput);
      } else if (
        traceInput.startsWith('SO') ||
        traceInput.startsWith('PO') ||
        traceInput.startsWith('WO')
      ) {
        params.set('ref_no', traceInput);
      } else {
        params.set('qr_code', traceInput);
      }
      const res = await fetch('/api/qrcode/trace?' + params);
      const result = await res.json();
      if (result.success) {
        setTraceData(result.data);
        setShowTrace(true);
      } else {
        toast({ title: t('queryFailed'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: t('queryFailed'), variant: 'destructive' });
    }
  };

  const handleInvalidate = async (id: number) => {
    if (!confirm(t('confirmInvalidate'))) return;
    try {
      await authFetch('/api/qrcode', {
        method: 'PUT',
        body: JSON.stringify({ id, action: 'invalidate' }),
      });
      toast({ title: t('qrCodeInvalidated') });
      fetchData();
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('qrCodeManagement')}</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={keyword}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v === 'all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-28 h-9">
                <SelectValue placeholder={tc('type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                <SelectItem value="material">{t('rawMaterial')}</SelectItem>
                <SelectItem value="product">{t('finished')}</SelectItem>
                <SelectItem value="workorder">{tc('workOrder')}</SelectItem>
                <SelectItem value="ink">{t('ink')}</SelectItem>
                <SelectItem value="screen_plate">{t('screen')}</SelectItem>
                <SelectItem value="die">{t('blade')}</SelectItem>
                <SelectItem value="shipment">{t('shipment')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <GlobalExportToolbar
              filename="二维码记录列表"
              title="二维码记录列表"
              columns={
                [
                  { key: 'qr_code', label: '二维码编码', width: 25 },
                  { key: 'qr_type', label: '类型', width: 12 },
                  { key: 'ref_no', label: '关联单号', width: 18 },
                  { key: 'material_code', label: '物料编码', width: 15 },
                  { key: 'material_name', label: '物料名称', width: 20 },
                  { key: 'batch_no', label: '批次号', width: 15 },
                  { key: 'quantity', label: '数量', width: 10 },
                  { key: 'unit', label: '单位', width: 8 },
                  { key: 'warehouse_name', label: '仓库', width: 12 },
                  { key: 'print_count', label: '打印次数', width: 10 },
                  { key: 'scan_count', label: '扫描次数', width: 10 },
                  {
                    key: 'status',
                    label: '状态',
                    width: 10,
                    formatter: (v: Loose) => ['', '有效', '已用', '过期', '作废'][v] || String(v),
                  },
                  { key: 'create_time', label: '创建时间', width: 18 },
                ] as ExportColumn[]
              }
              data={list}
              landscape={true}
            />
            <Button
              size="sm"
              onClick={() => {
                setShowDialog(true);
                setForm({});
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('generateQRCode')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="records">
          <TabsList>
            <TabsTrigger value="records">{t('tabRecords')}</TabsTrigger>
            <TabsTrigger value="trace">{t('tabTrace')}</TabsTrigger>
          </TabsList>
          <TabsContent value="records">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('qrCode')}</TableHead>
                      <TableHead>{tc('type')}</TableHead>
                      <TableHead>{t('refNo')}</TableHead>
                      <TableHead>{t('materialName')}</TableHead>
                      <TableHead>{tc('specification')}</TableHead>
                      <TableHead className="text-right">{tc('quantity')}</TableHead>
                      <TableHead>{tc('warehouse')}</TableHead>
                      <TableHead>{tc('print')}</TableHead>
                      <TableHead>{t('scanCount')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                      <TableHead>{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          {tc('noData')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      list.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.qr_code}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{typeMap[r.qr_type] || r.qr_type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{r.ref_no || '-'}</TableCell>
                          <TableCell>
                            {(() => {
                              // 处理可能的编码问题
                              try {
                                return r.material_name ? String(r.material_name) : '-';
                              } catch {
                                return '-';
                              }
                            })()}
                          </TableCell>
                          <TableCell className="text-sm">{r.specification || '-'}</TableCell>
                          <TableCell className="text-right">
                            {r.quantity}
                            {r.unit}
                          </TableCell>
                          <TableCell className="text-sm">{r.warehouse_name || '-'}</TableCell>
                          <TableCell className="text-center">{r.print_count}</TableCell>
                          <TableCell className="text-center">{r.scan_count}</TableCell>
                          <TableCell>
                            <Badge variant={statusMap[r.status]?.variant || 'outline'}>
                              {statusMap[r.status]?.label || tc('unknown')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrint(r.id)}
                                title={tc('print')}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTraceInput(r.qr_code);
                                  handleTrace();
                                }}
                                title={t('trace')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {r.status === 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInvalidate(r.id)}
                                  title={t('invalidate')}
                                >
                                  <QrCode className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('totalRecords', { total })}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc('prevPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('nextPage')}
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="trace">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <ScanLine className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{t('traceQuery')}</CardTitle>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder={t('tracePlaceholder')}
                      value={traceInput}
                      onChange={(e) => setTraceInput(e.target.value)}
                      className="max-w-md"
                    />
                    <Button onClick={handleTrace}>
                      <History className="h-4 w-4 mr-1" />
                      {t('trace')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('generateQRCode')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('qrType')}</Label>
                <Select
                  value={form.qr_type || ''}
                  onValueChange={(v) => setForm({ ...form, qr_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">{t('rawMaterial')}</SelectItem>
                    <SelectItem value="product">{t('finished')}</SelectItem>
                    <SelectItem value="workorder">{tc('workOrder')}</SelectItem>
                    <SelectItem value="ink">{t('ink')}</SelectItem>
                    <SelectItem value="screen_plate">{t('screen')}</SelectItem>
                    <SelectItem value="die">{t('blade')}</SelectItem>
                    <SelectItem value="shipment">{t('shipment')}</SelectItem>
                    <SelectItem value="ink_open">{t('inkOpen')}</SelectItem>
                    <SelectItem value="ink_mixed">{t('inkMixed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('refNo')}</Label>
                <Input
                  value={form.ref_no || ''}
                  onChange={(e) => setForm({ ...form, ref_no: e.target.value })}
                  placeholder={t('refNoPlaceholder')}
                />
              </div>
              <div>
                <Label>{tc('materialCode')}</Label>
                <Input
                  value={form.material_code || ''}
                  onChange={(e) => setForm({ ...form, material_code: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('materialName')}</Label>
                <Input
                  value={form.material_name || ''}
                  onChange={(e) => setForm({ ...form, material_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('specification')}</Label>
                <Input
                  value={form.specification || ''}
                  onChange={(e) => setForm({ ...form, specification: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('batchNo')}</Label>
                <Input
                  value={form.batch_no || ''}
                  onChange={(e) => setForm({ ...form, batch_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('quantity')}</Label>
                <Input
                  type="number"
                  value={form.quantity || ''}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('unit')}</Label>
                <Input
                  value={form.unit || ''}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('warehouseName')}</Label>
                <Input
                  value={form.warehouse_name || ''}
                  onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('supplier')}</Label>
                <Input
                  value={form.supplier_name || ''}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('customer')}</Label>
                <Input
                  value={form.customer_name || ''}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('workOrderNo')}</Label>
                <Input
                  value={form.work_order_no || ''}
                  onChange={(e) => setForm({ ...form, work_order_no: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('productionDate')}</Label>
                <Input
                  type="date"
                  value={form.production_date || ''}
                  onChange={(e) => setForm({ ...form, production_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('expiryDate')}</Label>
                <Input
                  type="date"
                  value={form.expiry_date || ''}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={form.remark || ''}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleGenerate}>{t('generateQRCode')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTrace} onOpenChange={setShowTrace}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('qrTraceDetails')}</DialogTitle>
            </DialogHeader>
            {traceData && (
              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">{t('basicInfo')}</TabsTrigger>
                  <TabsTrigger value="timeline">{t('traceTimeline')}</TabsTrigger>
                  <TabsTrigger value="related">{t('relatedRecords')}</TabsTrigger>
                  <TabsTrigger value="inventory">{t('inventoryInfo')}</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('qrCode')}：</span>
                      <span className="font-mono">{traceData.record?.qr_code}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tc('type')}：</span>
                      {typeMap[traceData.record?.qr_type] || traceData.record?.qr_type}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('refNo')}：</span>
                      {traceData.record?.ref_no || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tc('batchNo')}：</span>
                      {traceData.record?.batch_no || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tc('materialCode')}：</span>
                      {traceData.record?.material_code || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('materialName')}：</span>
                      {traceData.record?.material_name || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tc('specification')}：</span>
                      {traceData.record?.specification || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tc('quantity')}：</span>
                      {traceData.record?.quantity}
                      {traceData.record?.unit}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tc('warehouse')}：</span>
                      {traceData.record?.warehouse_name || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tc('supplier')}：</span>
                      {traceData.record?.supplier_name || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tc('customer')}：</span>
                      {traceData.record?.customer_name || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('workOrderNo')}：</span>
                      {traceData.record?.work_order_no || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('productionDate')}：</span>
                      {traceData.record?.production_date?.slice(0, 10) || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('expiryDate')}：</span>
                      {traceData.record?.expiry_date?.slice(0, 10) || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('printCount')}：</span>
                      {traceData.record?.print_count}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('scanCount')}：</span>
                      {traceData.record?.scan_count}
                    </div>
                  </div>
                  {traceData.order && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">{t('relatedOrder')}</h4>
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(traceData.order, null, 2)}
                      </pre>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="timeline">
                  {traceData.timeline?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('noTraceRecords')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {traceData.timeline?.map((item: Loose, i: number) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="flex flex-col items-center">
                            <div
                              className={`h-3 w-3 rounded-full ${item.result === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                            />
                            {i < traceData.timeline.length - 1 && (
                              <div className="w-0.5 h-8 bg-border" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex justify-between">
                              <span className="font-medium">{item.event}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.time).toLocaleString(locale)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {t('operator')}: {item.operator}
                            </div>
                            {item.message && (
                              <div className="text-sm text-muted-foreground">{item.message}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="related">
                  {traceData.related_records?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('noRelatedRecords')}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('qrCode')}</TableHead>
                          <TableHead>{tc('type')}</TableHead>
                          <TableHead>{t('orderNo')}</TableHead>
                          <TableHead>{tc('material')}</TableHead>
                          <TableHead>{tc('quantity')}</TableHead>
                          <TableHead>{tc('status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceData.related_records?.map((r: Loose) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs">{r.qr_code}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{typeMap[r.qr_type] || r.qr_type}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{r.ref_no || '-'}</TableCell>
                            <TableCell>{r.material_name || '-'}</TableCell>
                            <TableCell>{r.quantity}</TableCell>
                            <TableCell>
                              <Badge variant={statusMap[r.status]?.variant || 'outline'}>
                                {statusMap[r.status]?.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
                <TabsContent value="inventory">
                  {traceData.inventory?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('noInventoryInfo')}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc('warehouse')}</TableHead>
                          <TableHead>{tc('materialCode')}</TableHead>
                          <TableHead>{t('materialName')}</TableHead>
                          <TableHead className="text-right">{t('inventoryQty')}</TableHead>
                          <TableHead>{tc('unit')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceData.inventory?.map((inv: Loose, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{inv.warehouse_name || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{inv.material_code}</TableCell>
                            <TableCell>{inv.material_name}</TableCell>
                            <TableCell className="text-right">{inv.quantity}</TableCell>
                            <TableCell>{inv.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTrace(false)}>
                {tc('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
