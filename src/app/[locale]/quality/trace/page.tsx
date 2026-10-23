'use client';
import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StandardTable,
  type StandardTableColumn,
  type SortState,
} from '@/components/common';
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
import { Search, Scan, QrCode, Layers, Package, Factory, CheckCircle, AlertCircle, ArrowRight, RefreshCw, Clock, AlertTriangle, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

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
  trace_type: string | number;
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

const TRACE_TYPE_MAP: Record<string, { label: string; color: string }> = {
  forward: { label: 'forwardTrace', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  backward: { label: 'backwardTrace', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
};

export default function TracePage() {
  const ts = useTranslations('Quality');
  // 翻译钩子
  const t = useTranslations('Quality');
  const tc = useTranslations('Common');

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [traceResult, setTraceResult] = useState<TraceDetail | null>(null);
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalBatches: 0,
    productCount: 0,
    customerCount: 0,
    monthlyCount: 0,
    abnormalBatches: 0,
  });
  const [_keyword, _setKeyword] = useState('');
  const [traceTypeFilter, setTraceTypeFilter] = useState('all');
  // StandardTable：服务端分页 / 排序 / 勾选
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortState>(null);
  const [selectedRows, setSelectedRows] = useState<TraceRecord[]>([]);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (_keyword) params.set('keyword', _keyword);
      if (traceTypeFilter !== 'all') params.set('traceType', traceTypeFilter);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await authFetch(`/api/dcprint/trace?${params}`);
      const data = await res.json();
      if (data.success) {
        // 统一处理API返回的数据结构
        const rawData = data.data;
        const rawList = Array.isArray(rawData) ? rawData : rawData?.list || [];
        const list = rawList.map((item: Loose) => ({
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
          trace_type: item.traceType || item.trace_type || 'forward',
          operator_name: item.operatorName || item.operator_name,
          trace_time: item.traceTime || item.trace_time,
          remark: item.remark,
        }));
        setRecords(list);
        const tot = rawData?.pagination?.total || 0;
        setTotal(tot);
      }
    } catch {}
  }, [_keyword, page, pageSize, traceTypeFilter]);

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/quality/trace/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchStats();
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
          traceType: record.trace_type === 'backward' ? 'backward' : 'forward',
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

  // 客户端排序（服务端分页返回当前页数据，排序在当前页内进行）
  const sortedData = useMemo(() => {
    const list = [...records];
    if (!sort) return list;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.field];
      const bv = (b as unknown as Record<string, unknown>)[sort.field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      if (typeof av === 'boolean' && typeof bv === 'boolean') return (Number(av) - Number(bv)) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [records, sort]);

  const handleSortChange = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  // 追溯记录列定义
  const columns: StandardTableColumn<TraceRecord>[] = [
    {
      key: 'serial_no',
      title: tc('serialNo'),
      align: 'center',
      width: 60,
      render: (_r, i) => (
        <span className="text-muted-foreground">{(page - 1) * pageSize + i + 1}</span>
      ),
    },
    {
      key: 'trace_no',
      title: t('traceNo'),
      sortable: true,
      render: (r) => <span className="font-mono">{r.trace_no}</span>,
    },
    {
      key: 'card_no',
      title: t('cardNo'),
      sortable: true,
      render: (r) => r.card_no || '-',
    },
    {
      key: 'work_order_no',
      title: tc('workOrderNo'),
      sortable: true,
      render: (r) => r.work_order_no || '-',
    },
    {
      key: 'product_code',
      title: t('productCode'),
      sortable: true,
      render: (r) => r.product_code || '-',
    },
    {
      key: 'product_name',
      title: t('productName'),
      sortable: true,
      render: (r) => r.product_name || '-',
    },
    {
      key: 'main_material_name',
      title: t('mainMaterial'),
      sortable: true,
      render: (r) => r.main_material_name || '-',
    },
    {
      key: 'trace_type',
      title: tc('type'),
      sortable: true,
      render: (r) => (
        <Badge className={TRACE_TYPE_MAP[r.trace_type]?.color || 'bg-gray-100 dark:bg-gray-700'}>
          {t(TRACE_TYPE_MAP[r.trace_type]?.label || String(r.trace_type))}
        </Badge>
      ),
    },
    {
      key: 'operator_name',
      title: tc('operator'),
      sortable: true,
      render: (r) => r.operator_name || '-',
    },
    {
      key: 'trace_time',
      title: t('traceTime'),
      sortable: true,
      render: (r) => r.trace_time || '-',
    },
    {
      key: 'actions',
      title: tc('actions'),
      // 原有操作列：查看追溯详情，逻辑保持原样
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => handleViewRecord(r)}>
          <Search className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // 物料批次追溯明细（只读展示，不分页）
  const materialColumns: StandardTableColumn<TraceDetail['materials'][number]>[] = [
    {
      key: 'labelNo',
      title: t('labelNo'),
      render: (r) => <span className="font-mono">{r.labelNo}</span>,
    },
    {
      key: 'materialType',
      title: t('materialType'),
      render: (r) => (
        <Badge
          className={
            r.materialType === '1' || r.materialType === ts('k_1gqlef2')
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
          }
        >
          {r.materialType === '1' || r.materialType === ts('k_1gqlef2')
            ? t('mainMaterial')
            : t('auxiliaryMaterial')}
        </Badge>
      ),
    },
    {
      key: 'materialCode',
      title: t('materialCode'),
      render: (r) => r.materialCode || '-',
    },
    {
      key: 'materialName',
      title: tc('name'),
      render: (r) => <span className="font-medium">{r.materialName || '-'}</span>,
    },
    {
      key: 'specification',
      title: tc('specification'),
      render: (r) => r.specification || '-',
    },
    {
      key: 'batchNo',
      title: tc('batchNo'),
      render: (r) => <span className="font-mono">{r.batchNo || '-'}</span>,
    },
    {
      key: 'supplierName',
      title: tc('supplier'),
      render: (r) => r.supplierName || '-',
    },
    {
      key: 'receiveDate',
      title: t('receiveDate'),
      render: (r) => r.receiveDate || '-',
    },
  ];

  return (
    <MainLayout title={t('traceQuery')}>
      <div className="space-y-6">        <StatsCards
          configs={[
            { key: 'totalBatches', label: '已追溯批次', icon: Search, ...StatsTheme.blue },
            { key: 'productCount', label: '涉及产品数', icon: Package, ...StatsTheme.green },
            { key: 'customerCount', label: '涉及客户数', icon: Users, ...StatsTheme.cyan },
            { key: 'monthlyCount', label: '本月追溯次数', icon: Calendar, ...StatsTheme.purple },
            { key: 'abnormalBatches', label: '异常批次', icon: AlertTriangle, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'totalBatches', count: stats.totalBatches },
            { key: 'productCount', count: stats.productCount },
            { key: 'customerCount', count: stats.customerCount },
            { key: 'monthlyCount', count: stats.monthlyCount },
            { key: 'abnormalBatches', count: stats.abnormalBatches },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />


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
                      <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-blue-500/10 border border-blue-200 dark:border-blue-800">
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
                        .filter((m) => m.materialType === '2' || m.materialType === ts('k_14rp9uj'))
                        .map((mat, idx) => (
                          <div key={idx} className="flex items-center">
                            <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-green-500/10 border border-green-200 dark:border-green-800">
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
                                (m) => m.materialType === '2' || m.materialType === ts('k_14rp9uj')
                              ).length -
                                1 && <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />}
                          </div>
                        ))}
                      <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                      <div className="flex flex-col items-center p-4 rounded-lg min-w-[100px] bg-purple-500/10 border border-purple-200 dark:border-purple-800">
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
                  <StandardTable<TraceDetail['materials'][number]>
                    columns={materialColumns}
                    dataSource={traceResult.materials || []}
                    total={traceResult.materials?.length || 0}
                    rowKey={(_r, i) => String(i)}
                    showPagination={false}
                    emptyText={t('noMaterialTraceInfo')}
                  />
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
                    <SelectItem value="forward">{t('forwardTrace')}</SelectItem>
                    <SelectItem value="backward">{t('backwardTrace')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchRecords}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {tc('refresh')}
                </Button>
                <GlobalExportToolbar
                  filename={ts('k_1upxefi')}
                  title={ts('k_dfq6ox')}
                  columns={[
                    { key: 'trace_no', label: t('traceNo'), width: 18 },
                    { key: 'card_no', label: t('cardNo'), width: 15 },
                    { key: 'work_order_no', label: tc('workOrderNo'), width: 15 },
                    { key: 'product_code', label: t('productCode'), width: 15 },
                    { key: 'product_name', label: t('productName'), width: 18 },
                    { key: 'main_material_name', label: t('mainMaterial'), width: 18 },
                    { key: 'trace_type', label: tc('type'), width: 12 },
                    { key: 'operator_name', label: tc('operator'), width: 12 },
                    { key: 'trace_time', label: t('traceTime'), width: 18 },
                  ]}
                  data={selectedRows.length > 0 ? selectedRows : sortedData}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StandardTable<TraceRecord>
              columns={columns}
              dataSource={sortedData}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 50, 100]}
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              sortState={sort}
              onSortChange={handleSortChange}
              onRetry={fetchRecords}
              emptyText={t('noTraceRecords')}
            />
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
