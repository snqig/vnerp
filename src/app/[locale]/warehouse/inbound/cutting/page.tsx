'use client';
import { authFetch } from '@/lib/auth-fetch';
import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { MainLayout, PageHeroHeader } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  StandardTable,
  type StandardTableColumn,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Trash2, Scissors, CheckCircle, Clock, AlertTriangle, PackageOpen, Boxes } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';

// 分切记录类型
interface CuttingRecord {
  id: number;
  recordNo: string;
  sourceLabelId: number;
  sourceLabelNo: string;
  cutWidthStr: string;
  originalWidth: number;
  cutTotalWidth: number;
  remainWidth: number;
  operatorId: number;
  operatorName: string;
  cutTime: string;
  remark: string;
  status: number;
  createTime: string;
  materialCode: string;
  materialName: string;
  specification: string;
}

export default function CuttingRecordsPage() {
  const ts = useTranslations('Warehouse');
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  // 状态徽章：inv_cutting_record.status 为 tinyint（1=正常，4=已作废）
  const getStatusBadge = (status: number) => {
    const statusMap: Record<number, { label: string; className: string }> = {
      1: {
        label: tc('normal'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      },
      4: {
        label: tc('disabled'),
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
      },
    };
    const config = statusMap[status] || {
      label: String(status),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const { user: _user } = useAuth();
  const [records, setRecords] = useState<CuttingRecord[]>([]);
  const [selectedRows, setSelectedRows] = useState<CuttingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sourceLabelNo, setSourceLabelNo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    partial: 0,
    todayCount: 0,
    monthlyQty: 0,
  });

  const _exportColumns = [
    { key: 'recordNo', header: t('recordNoCol') },
    { key: 'sourceLabelNo', header: t('sourceLabelNoCol') },
    { key: 'materialName', header: t('materialName') },
    { key: 'materialCode', header: t('materialCode') },
    { key: 'specification', header: t('specification') },
    { key: 'originalWidth', header: t('originalWidthMM') },
    { key: 'cutWidth', header: t('cutWidthMM') },
    { key: 'cutTotal', header: t('cutTotalMM') },
    { key: 'remainWidth', header: t('remainWidthMM') },
    { key: 'operator', header: t('operator') },
    { key: 'cutTime', header: t('cutTime') },
    { key: tc('status'), header: tc('status') },
  ];
  const _getExportData = () =>
    records.map((r) => ({
      recordNo: r.recordNo,
      sourceLabelNo: r.sourceLabelNo,
      materialName: r.materialName,
      materialCode: r.materialCode,
      specification: r.specification,
      originalWidth: r.originalWidth,
      cutWidth: r.cutWidthStr,
      cutTotal: r.cutTotalWidth,
      remainWidth: r.remainWidth,
      operator: r.operatorName,
      cutTime: new Date(r.cutTime).toLocaleString(),
      status:
        Number(r.status) === 1
          ? tc('normal')
          : Number(r.status) === 4
            ? tc('disabled')
            : String(r.status),
    }));

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/warehouse/inbound/cutting/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        fetchStats();
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (sourceLabelNo) params.append('sourceLabelNo', sourceLabelNo);
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());

        const response = await authFetch(`/api/warehouse/inbound/cutting?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API 响应错误: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setRecords(result.data?.list || []);
          setTotal(result.data?.pagination?.total || 0);
        }
      } catch (error) {
        // AbortError 是组件卸载/依赖变化时主动取消请求，静默忽略
        if ((error as Error).name !== 'AbortError') {
          logger.error(ts('k_29ma58'), error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [page, pageSize, keyword, sourceLabelNo]);

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setSourceLabelNo('');
    setPage(1);
  };

  // /api/warehouse/inbound/cutting 未支持 sortField / sortDirection，故不开列排序（需后端补排序参数）
  const columns: StandardTableColumn<CuttingRecord>[] = [
    {
      key: 'recordNo',
      title: t('recordNoCol'),
      render: (r) => <span className="font-medium">{r.recordNo}</span>,
    },
    { key: 'sourceLabelNo', title: t('sourceLabelNoCol') },
    {
      key: 'materialInfo',
      title: t('materialInfo'),
      render: (r) => (
        <div className="space-y-1">
          <div className="font-medium">{r.materialName}</div>
          <div className="text-sm text-muted-foreground">{r.materialCode}</div>
          <div className="text-sm text-muted-foreground">{r.specification}</div>
        </div>
      ),
    },
    {
      key: 'originalWidth',
      title: t('originalWidthMM'),
      render: (r) => `${r.originalWidth}mm`,
    },
    {
      key: 'cutWidthStr',
      title: t('cutWidthMM'),
      render: (r) => `${r.cutWidthStr}mm`,
    },
    {
      key: 'cutTotalWidth',
      title: t('cutTotalMM'),
      render: (r) => `${r.cutTotalWidth}mm`,
    },
    {
      key: 'remainWidth',
      title: t('remainWidthMM'),
      render: (r) => `${r.remainWidth}mm`,
    },
    { key: 'operatorName', title: t('operator') },
    {
      key: 'cutTime',
      title: t('cutTime'),
      render: (r) => new Date(r.cutTime).toLocaleString(),
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => getStatusBadge(r.status),
    },
  ];

  return (
    <MainLayout title={t('cuttingRecordManagement')}>
      <div className="space-y-6">
        <PageHeroHeader
          icon={Scissors}
          title={t('cuttingRecordManagement')}
          description={t('cuttingRecordQueryDesc')}
        />

        <StatsCards
          configs={[
            { key: 'pending', label: '待入库', icon: Clock, ...StatsTheme.orange },
            { key: 'partial', label: '部分入库', icon: PackageOpen, ...StatsTheme.yellow },
            { key: 'completed', label: '已入库', icon: CheckCircle, ...StatsTheme.green },
            { key: 'todayCount', label: '今日入库单数', icon: Scissors, ...StatsTheme.blue },
            { key: 'monthlyQty', label: '本月入库数量', icon: Boxes, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'partial', count: stats.partial },
            { key: 'completed', count: stats.completed },
            { key: 'todayCount', count: stats.todayCount },
            { key: 'monthlyQty', count: stats.monthlyQty },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
          showTrend={false}
        />

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              {t('cuttingRecordQuery')}
            </CardTitle>
            <CardDescription>{t('cuttingRecordQueryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{t('keyword')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('keywordPlaceholder')}
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{t('sourceLabelNo')}</label>
                <Input
                  placeholder={t('inputSourceLabelNo')}
                  value={sourceLabelNo}
                  onChange={(e) => setSourceLabelNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('reset')}
                </Button>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  {t('query')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('cuttingRecords')}</CardTitle>
                <CardDescription>{t('recordCount', { count: total })}</CardDescription>
              </div>
              <div className="flex gap-2">
                <GlobalExportToolbar
                  filename={ts('k_1e1td5d')}
                  title={ts('k_1e1td5d')}
                  landscape
                  columns={[
                    { key: 'recordNo', label: t('recordNoCol'), width: 15 },
                    { key: 'sourceLabelNo', label: t('sourceLabelNoCol'), width: 15 },
                    { key: 'materialName', label: t('materialName'), width: 18 },
                    { key: 'materialCode', label: t('materialCode'), width: 15 },
                    { key: 'specification', label: t('specification'), width: 12 },
                    { key: 'originalWidth', label: t('originalWidthMM'), width: 12 },
                    { key: 'cutWidthStr', label: t('cutWidthMM'), width: 12 },
                    { key: 'cutTotalWidth', label: t('cutTotalMM'), width: 12 },
                    { key: 'remainWidth', label: t('remainWidthMM'), width: 12 },
                    { key: 'operatorName', label: t('operator'), width: 10 },
                    {
                      key: 'cutTime',
                      label: t('cutTime'),
                      width: 18,
                      formatter: (v) => new Date(v).toLocaleString(),
                    },
                    {
                      key: 'status',
                      label: tc('status'),
                      width: 10,
                      formatter: (v) =>
                        Number(v) === 1
                          ? tc('normal')
                          : Number(v) === 4
                            ? tc('disabled')
                            : String(v),
                    },
                  ]}
                  data={selectedRows.length > 0 ? selectedRows : records}
                />
                <Button variant="outline" onClick={() => setPage((prevPage) => prevPage)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('refresh')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StandardTable<CuttingRecord>
              columns={columns}
              dataSource={records}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              loading={loading}
              onRetry={() => setPage((p) => p)}
              emptyText={t('noData')}
              customStyle={{ containerClassName: 'border rounded-lg' }}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
