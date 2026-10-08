'use client';

import { authFetch } from '@/lib/auth-fetch';
import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Package,
  Layers,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  PlusCircle,
  History as HistoryIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToastContext } from '@/components/ui/toast';
import { MainLayout } from '@/components/layout/main-layout';
import { useTranslations } from 'next-intl';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface BOMItem {
  id: number;
  bom_no: string;
  product_code: string;
  product_name: string;
  product_spec: string;
  version: string;
  is_default: number;
  status: number;
  status_name: string;
  unit: string;
  base_qty: number;
  total_material_count: number;
  total_cost: number;
  remark: string;
  create_time: string;
  update_time: string;
}

interface BomLine {
  id: number;
  line_no: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  consumption_qty: number;
  unit: string;
  loss_rate: number;
  actual_qty: number;
  total_cost: number;
}

const statusMap: Record<number, { labelKey: string; color: string }> = {
  10: { labelKey: 'draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  20: {
    labelKey: 'approved',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  30: {
    labelKey: 'published',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  90: { labelKey: 'disabled', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const getStatusLabel = (status: number, t: (k: string) => string, tc: (k: string) => string) => {
  const key = statusMap[status]?.labelKey;
  if (!key) return tc('unknown');
  if (key === 'draft' || key === 'approved' || key === 'disabled') return tc(key);
  return t(key);
};

export default function BOMPage() {
  const ts = useTranslations('Orders');
  const t = useTranslations('Orders');
  const tc = useTranslations('Common');

  const router = useRouter();
  const { addToast: toast } = useToastContext();
  const [bomList, setBomList] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    monthlyNew: 0,
    withVersion: 0,
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [bomDetail, setBomDetail] = useState<Loose>(null);

  const [selectedRows, setSelectedRows] = useState<BOMItem[]>([]);
  const clear = () => setSelectedRows([]);
  const [deleting, setDeleting] = useState(false);

  const fetchBOMList = async (overridePage?: number) => {
    try {
      setLoading(true);
      const pageToUse = overridePage ?? currentPage;
      const params = new URLSearchParams({
        page: pageToUse.toString(),
        pageSize: String(pageSize),
      });
      if (searchKeyword) params.append('keyword', searchKeyword);

      const res = await authFetch(`/api/orders/bom?${params}`);
      const data = await res.json();

      if (data.success) {
        const bomList = Array.isArray(data.data) ? data.data : data.data?.list || [];
        setBomList(bomList);
        setTotal(data.data?.total || 0);
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('fetchBomFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: tc('error'),
        description: t('fetchBomFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBOMDetail = async (id: number) => {
    try {
      const res = await authFetch(`/api/orders/bom/${id}`);
      const data = await res.json();

      if (data.success) {
        setBomDetail(data.data);
        setDetailDialogOpen(true);
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('fetchBomDetailFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: tc('error'),
        description: t('fetchBomDetailFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteBom'))) return;

    try {
      const res = await authFetch(`/api/orders/bom?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: tc('success'),
          description: t('deleteBomSuccess'),
        });
        fetchBOMList();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('deleteFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: tc('error'),
        description: t('deleteFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: number, action: string) => {
    try {
      const res = await authFetch('/api/orders/bom', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: tc('success'),
          description:
            action === 'audit'
              ? t('auditSuccess')
              : action === 'publish'
                ? t('publishSuccess')
                : t('disableSuccess'),
        });
        fetchBOMList();
      } else {
        toast({
          title: ts('k_v9pftt'),
          description: data.message || tc('error'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: ts('k_v9pftt'),
        description: tc('error'),
        variant: 'destructive',
      });
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchBOMList(1);
  };

  const handleBatchDelete = async () => {
    const ids = selectedRows.map((r) => r.id);
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/orders/bom?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear();
    fetchBOMList();
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/orders/bom/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchBOMList();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  const columns: StandardTableColumn<BOMItem>[] = [
    {
      key: 'bom_no',
      title: t('bomNo'),
      render: (r) => <span className="font-medium">{r.bom_no}</span>,
    },
    {
      key: 'product_name',
      title: t('productInfo'),
      render: (r) => (
        <div>
          <div className="font-medium">{r.product_name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{r.product_code}</div>
          {r.product_spec && (
            <div className="text-xs text-gray-400 dark:text-gray-500">{r.product_spec}</div>
          )}
        </div>
      ),
    },
    {
      key: 'version',
      title: t('version'),
      render: (r) => (
        <div className="flex items-center gap-2">
          <span>{r.version}</span>
          {r.is_default === 1 && (
            <Badge variant="default" className="text-xs">
              {t('default')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => (
        <Badge className={statusMap[r.status]?.color || 'bg-gray-100 dark:bg-gray-700'}>
          {getStatusLabel(r.status, t, tc)}
        </Badge>
      ),
    },
    {
      key: 'total_material_count',
      title: t('materialCount'),
      render: (r) => (
        <>
          {r.total_material_count} {t('itemsUnit')}
        </>
      ),
    },
    {
      key: 'total_cost',
      title: t('totalCost'),
      render: (r) => `¥${Number(r.total_cost || 0).toFixed(4)}`,
    },
    {
      key: 'create_time',
      title: tc('createTime'),
      render: (r) => new Date(r.create_time).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: tc('operation'),
      align: 'right',
      // 原有操作列：查看 / 审核 / 发布 / 停用 / 编辑 / 删除，逻辑保持原样
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => fetchBOMDetail(r.id)}>
              <Eye className="w-4 h-4 mr-2" />
              {t('viewDetail')}
            </DropdownMenuItem>
            {r.status === 10 && (
              <DropdownMenuItem onClick={() => handleStatusChange(r.id, 'audit')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('audit')}
              </DropdownMenuItem>
            )}
            {r.status === 20 && (
              <DropdownMenuItem onClick={() => handleStatusChange(r.id, 'publish')}>
                <FileText className="w-4 h-4 mr-2" />
                {t('publish')}
              </DropdownMenuItem>
            )}
            {r.status === 30 && (
              <DropdownMenuItem onClick={() => handleStatusChange(r.id, 'disable')}>
                <XCircle className="w-4 h-4 mr-2" />
                {t('disable')}
              </DropdownMenuItem>
            )}
            {r.status < 30 && (
              <DropdownMenuItem onClick={() => router.push(`/orders/bom/edit/${r.id}`)}>
                <Edit className="w-4 h-4 mr-2" />
                {tc('edit')}
              </DropdownMenuItem>
            )}
            {r.status < 30 && (
              <DropdownMenuItem
                onClick={() => handleDelete(r.id)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {tc('delete')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const detailColumns: StandardTableColumn<BomLine>[] = [
    { key: 'line_no', title: t('lineNo') },
    { key: 'material_code', title: t('materialCode') },
    { key: 'material_name', title: t('materialName') },
    {
      key: 'material_spec',
      title: t('spec'),
      render: (r) => <span className="text-sm text-gray-500 dark:text-gray-400">{r.material_spec}</span>,
    },
    {
      key: 'consumption_qty',
      title: t('consumption'),
      render: (r) => (
        <>
          {r.consumption_qty} {r.unit}
        </>
      ),
    },
    {
      key: 'loss_rate',
      title: t('lossRate'),
      render: (r) => `${r.loss_rate}%`,
    },
    {
      key: 'actual_qty',
      title: t('actualUsage'),
      render: (r) => parseFloat(String(r.actual_qty || 0)).toFixed(4),
    },
    {
      key: 'total_cost',
      title: t('cost'),
      render: (r) => `¥${parseFloat(String(r.total_cost || 0)).toFixed(4)}`,
    },
  ];

  return (
    <MainLayout title={t('bomManagement')}>
      <div className="p-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: 'BOM总数', icon: FileText, ...StatsTheme.blue },
            { key: 'approved', label: '已审核', icon: CheckCircle, ...StatsTheme.green },
            { key: 'pending', label: '待审核', icon: Clock, ...StatsTheme.orange },
            { key: 'monthlyNew', label: '本月新增', icon: PlusCircle, ...StatsTheme.cyan },
            { key: 'withVersion', label: '有版本BOM', icon: HistoryIcon, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'total', count: stats.total },
            { key: 'approved', count: stats.approved },
            { key: 'pending', count: stats.pending },
            { key: 'monthlyNew', count: stats.monthlyNew },
            { key: 'withVersion', count: stats.withVersion },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
          showTrend={false}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-200 dark:text-white">
                {t('bomManagement')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('bomListManagement')}</p>
            </div>
          </div>
          <Button onClick={() => router.push('/orders/bom/create')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('newBom')}
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('searchBom')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            <Search className="w-4 h-4 mr-2" />
            {tc('search')}
          </Button>
        </div>

        <div className="rounded-lg border shadow-sm bg-card">
          <BatchDeleteBar count={selectedRows.length} onClear={clear} onDelete={handleBatchDelete} loading={deleting} />
          <StandardTable<BOMItem>
            columns={columns}
            dataSource={bomList}
            total={total}
            page={currentPage}
            pageSize={pageSize}
            pageSizeOptions={[20, 25, 30]}
            rowKey="id"
            rowSelectable
            selectedRows={selectedRows}
            onRowSelectedChange={setSelectedRows}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
            loading={loading}
            onRetry={() => fetchBOMList()}
            emptyText={t('noBomData')}
            customStyle={{ containerClassName: 'px-2 pb-2' }}
          />
        </div>

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('bomDetail')}</DialogTitle>
            </DialogHeader>
            {bomDetail && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('bomNo')}</label>
                    <div className="font-medium">{bomDetail.header.bom_no}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {t('version')}
                    </label>
                    <div className="font-medium">{bomDetail.header.version}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {t('productName')}
                    </label>
                    <div className="font-medium">{bomDetail.header.product_name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {t('productCode')}
                    </label>
                    <div className="font-medium">{bomDetail.header.product_code}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {tc('status')}
                    </label>
                    <div>
                      <Badge className={statusMap[bomDetail.header.status]?.color}>
                        {bomDetail.header.status_name}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">
                      {t('totalCost')}
                    </label>
                    <div className="font-medium text-blue-600 dark:text-blue-400">
                      ¥{parseFloat(bomDetail.header.total_cost || 0).toFixed(4)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {t('bomDetailInfo', { count: bomDetail.lines?.length || 0 })}
                  </h3>
                  <StandardTable<BomLine>
                    columns={detailColumns}
                    dataSource={(bomDetail.lines ?? []) as BomLine[]}
                    total={bomDetail.lines?.length || 0}
                    rowKey="id"
                    showPagination={false}
                    emptyText={tc('noData')}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
