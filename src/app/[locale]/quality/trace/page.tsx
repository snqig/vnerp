'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Scan,
  QrCode,
  Layers,
  Package,
  Factory,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { SortableTableHeader, useTableSort } from '@/components/ui/sortable-table';
import { useTranslations } from 'next-intl';

interface TraceRecord {
  id: number;
  trace_no: string;
  card_no: string;
  work_order_no: string;
  product_code: string;
  product_name?: string;
  main_label_id: number;
  main_material_code?: string;
  main_material_name?: string;
  main_batch_no?: string;
  trace_type: number;
  operator_name: string;
  trace_time: string;
  remark: string;
}

interface TraceDetail {
  traceNo: string;
  card: {
    cardNo: string;
    workOrderNo: string;
    productCode?: string;
    productName?: string;
  };
  mainMaterial: {
    labelNo: string;
    materialCode?: string;
    materialName?: string;
    specification?: string;
    batchNo?: string;
    supplierName?: string;
    receiveDate?: string;
  };
  materials: {
    labelNo: string;
    materialType: string;
    materialCode?: string;
    materialName?: string;
    specification?: string;
    batchNo?: string;
    supplierName?: string;
    receiveDate?: string;
    quantity?: number;
    unit?: string;
  }[];
}

const TRACE_TYPE_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'forwardTrace', color: 'bg-blue-100 text-blue-800' },
  2: { label: 'backwardTrace', color: 'bg-purple-100 text-purple-800' },
};

export default function TracePage() {
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [traceResult, setTraceResult] = useState<TraceDetail | null>(null);
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [traceTypeFilter, setTraceTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { sortField, sortDirection, handleSort, sortedData } = useTableSort(records, 'trace_no');

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (traceTypeFilter !== 'all') params.set('traceType', traceTypeFilter);
      params.set('pageSize', '20');
      const res = await authFetch(`/api/dcprint/trace?${params}`);
      const data = await res.json();
      if (data.success) {
        // 统一处理API返回的数据结构
        const rawData = data.data;
        const rawList = Array.isArray(rawData) ? rawData : rawData?.list || [];
        const list = rawList.map((item: any) => ({
          id: item.id,
          trace_no: item.traceNo || item.trace_no,
          card_no: item.cardNo || item.card_no,
          work_order_no: item.workOrderNo || item.work_order_no,
          product_code: item.productCode || item.product_code,
          product_name: item.productName || item.product_name,
          main_label_id: item.mainLabelId || item.main_label_id,
          main_material_code: item.mainMaterialCode || item.main_material_code,
          main_material_name: item.mainMaterialName || item.main_material_name,
          main_batch_no: item.mainBatchNo || item.main_batch_no,
          trace_type: item.traceType || item.trace_type || 1,
          operator_name: item.operatorName || item.operator_name,
          trace_time: item.traceTime || item.trace_time,
          remark: item.remark,
        }));
        setRecords(list);
      }
    } catch {}
  }, [keyword, traceTypeFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = async () => {
    if (!scannedCode.trim()) {
      toast.error(t('pleaseEnterTraceCode'));
      return;
    }

    setLoading(true);
    setError('');
    setTraceResult(null);

    try {
      const response = await authFetch('/api/dcprint/trace', {
        method: 'POST',
        body: JSON.stringify({
          cardNo: scannedCode.trim(),
          traceType: 'forward',
          operatorId: 1,
          operatorName: tc('operator'),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTraceResult(result.data);
        toast.success(t('traceQuerySuccess'));
        setIsScanOpen(false);
        fetchRecords();
      } else {
        setError(result.message || t('traceQueryFailed'));
      }
    } catch {
      setError(t('traceQueryNetworkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScannedCode('');
    setTraceResult(null);
    setError('');
  };

  const handleViewRecord = async (record: TraceRecord) => {
    setScannedCode(record.card_no || record.work_order_no || '');
    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/api/dcprint/trace', {
        method: 'POST',
        body: JSON.stringify({
          cardNo: record.card_no,
          traceType: record.trace_type === 2 ? 'backward' : 'forward',
          operatorId: 1,
          operatorName: tc('operator'),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTraceResult(result.data);
        toast.success(t('traceQuerySuccess'));
      } else {
        setError(result.message || t('traceQueryFailed'));
      }
    } catch {
      setError(t('traceQueryFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title={t('traceQuery')}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('scanCardPlaceholder')}
                    className="pl-10"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={loading}
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  <Layers className="h-4 w-4 mr-2" />
                  {t('trace')}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {tc('reset')}
                </Button>
              </div>
              <Button variant="outline" onClick={() => setIsScanOpen(true)}>
                <Scan className="h-4 w-4 mr-2" />
                {t('scanTrace')}
              </Button>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {traceResult && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">{tc('overview')}</TabsTrigger>
              <TabsTrigger value="materials">{t('materialInfo')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {t('cardInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('traceNo')}：</span>
                        {traceResult.traceNo}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('cardNo')}：</span>
                        {traceResult.card?.cardNo}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('workOrderNo')}：</span>
                        {traceResult.card?.workOrderNo}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('productCode')}：</span>
                        {traceResult.card?.productCode || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('productName')}：</span>
                        {traceResult.card?.productName || '-'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      {t('mainMaterialInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('labelNo')}：</span>
                        {traceResult.mainMaterial?.labelNo}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('materialCode')}：</span>
                        {traceResult.mainMaterial?.materialCode || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('name')}：</span>
                        {traceResult.mainMaterial?.materialName || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('specification')}：</span>
                        {traceResult.mainMaterial?.specification || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('batchNo')}：</span>
                        {traceResult.mainMaterial?.batchNo || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tc('supplier')}：</span>
                        {traceResult.mainMaterial?.supplierName || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receiveDate')}：</span>
                        {traceResult.mainMaterial?.receiveDate || '-'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {traceResult.materials && traceResult.materials.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>{t('materialTraceChain')}</CardTitle>
                    <CardDescription>{t('materialTraceChainDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between overflow-x-auto pb-4">
                      <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-blue-50 border border-blue-200">
                        <div className="p-2 rounded-full mb-2 bg-blue-500">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-sm">{t('mainMaterial')}</span>
                        <span className="text-xs text-muted-foreground">
                          {traceResult.mainMaterial?.materialName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {traceResult.mainMaterial?.batchNo}
                        </span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                      {traceResult.materials
                        .filter((m) => m.materialType === '2' || m.materialType === '辅料')
                        .map((mat, idx) => (
                          <div key={idx} className="flex items-center">
                            <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-green-50 border border-green-200">
                              <div className="p-2 rounded-full mb-2 bg-green-500">
                                <CheckCircle className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-medium text-sm">
                                {mat.materialName || t('auxiliaryMaterial')}
                              </span>
                              <span className="text-xs text-muted-foreground">{mat.batchNo}</span>
                              <span className="text-xs text-muted-foreground">
                                {mat.supplierName}
                              </span>
                            </div>
                            {idx <
                              traceResult.materials.filter(
                                (m) => m.materialType === '2' || m.materialType === '辅料'
                              ).length -
                                1 && <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />}
                          </div>
                        ))}
                      <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                      <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-purple-50 border border-purple-200">
                        <div className="p-2 rounded-full mb-2 bg-purple-500">
                          <Factory className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-sm">{t('finishedProduct')}</span>
                        <span className="text-xs text-muted-foreground">
                          {traceResult.card?.productName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {traceResult.card?.productCode}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <CardTitle>{t('materialBatchTrace')}</CardTitle>
                  <CardDescription>{t('materialBatchTraceDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('labelNo')}</TableHead>
                        <TableHead>{t('materialType')}</TableHead>
                        <TableHead>{t('materialCode')}</TableHead>
                        <TableHead>{tc('name')}</TableHead>
                        <TableHead>{tc('specification')}</TableHead>
                        <TableHead>{tc('batchNo')}</TableHead>
                        <TableHead>{tc('supplier')}</TableHead>
                        <TableHead>{t('receiveDate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!traceResult.materials || traceResult.materials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {t('noMaterialTraceInfo')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        traceResult.materials.map((mat, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{mat.labelNo}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  mat.materialType === '1' || mat.materialType === '主材'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }
                              >
                                {mat.materialType === '1' || mat.materialType === '主材'
                                  ? t('mainMaterial')
                                  : t('auxiliaryMaterial')}
                              </Badge>
                            </TableCell>
                            <TableCell>{mat.materialCode || '-'}</TableCell>
                            <TableCell className="font-medium">{mat.materialName || '-'}</TableCell>
                            <TableCell>{mat.specification || '-'}</TableCell>
                            <TableCell className="font-mono">{mat.batchNo || '-'}</TableCell>
                            <TableCell>{mat.supplierName || '-'}</TableCell>
                            <TableCell>{mat.receiveDate || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('traceRecords')}</CardTitle>
                <CardDescription>{t('traceRecordsDesc')}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={traceTypeFilter} onValueChange={setTraceTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t('traceType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('allTypes')}</SelectItem>
                    <SelectItem value="1">{t('forwardTrace')}</SelectItem>
                    <SelectItem value="2">{t('backwardTrace')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchRecords}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {tc('refresh')}
                </Button>
                <GlobalExportToolbar
                  filename="追溯记录"
                  title="追溯记录报告"
                  columns={[
                    { key: 'trace_no', label: t('traceNo'), width: 18 },
                    { key: 'card_no', label: t('cardNo'), width: 15 },
                    { key: 'work_order_no', label: tc('workOrderNo'), width: 15 },
                    { key: 'product_code', label: t('productCode'), width: 15 },
                    { key: 'trace_type', label: tc('type'), width: 12 },
                    { key: 'operator_name', label: tc('operator'), width: 12 },
                    { key: 'trace_time', label: t('traceTime'), width: 18 },
                  ]}
                  data={
                    selectedIds.length > 0
                      ? sortedData.filter((r) => selectedIds.includes(r.id))
                      : sortedData
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === sortedData.length && sortedData.length > 0}
                      onCheckedChange={() =>
                        setSelectedIds(
                          selectedIds.length === sortedData.length
                            ? []
                            : sortedData.map((r) => r.id)
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center">{tc('serialNo')}</TableHead>
                  <SortableTableHeader
                    field="trace_no"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('traceNo')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="card_no"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('cardNo')}
                  </SortableTableHeader>
                  <TableHead>{tc('workOrderNo')}</TableHead>
                  <TableHead>{t('productCode')}</TableHead>
                  <SortableTableHeader
                    field="trace_type"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {tc('type')}
                  </SortableTableHeader>
                  <TableHead>{tc('operator')}</TableHead>
                  <SortableTableHeader
                    field="trace_time"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {t('traceTime')}
                  </SortableTableHeader>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {t('noTraceRecords')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((r, index) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(r.id)}
                          onCheckedChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(r.id) ? prev.filter((i) => i !== r.id) : [...prev, r.id]
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono">{r.trace_no}</TableCell>
                      <TableCell>{r.card_no || '-'}</TableCell>
                      <TableCell>{r.work_order_no || '-'}</TableCell>
                      <TableCell>{r.product_code || '-'}</TableCell>
                      <TableCell>
                        <Badge className={TRACE_TYPE_MAP[r.trace_type]?.color || 'bg-gray-100'}>
                          {t(TRACE_TYPE_MAP[r.trace_type]?.label || String(r.trace_type))}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.operator_name || '-'}</TableCell>
                      <TableCell>{r.trace_time || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewRecord(r)}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{t('scanTrace')}</DialogTitle>
              <DialogDescription>{t('scanTraceDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-8 border-2 border-dashed rounded-lg text-center">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">{t('usePDAScan')}</p>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder={t('manualCardInput')}
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScanOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSearch} disabled={loading}>
                {t('traceQuery')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
