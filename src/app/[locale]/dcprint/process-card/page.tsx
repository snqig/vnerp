'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROCESS_CARD_STATUS_LABEL } from '@/lib/status-labels';
import { Badge } from '@/components/ui/badge';
import {
  StandardTable,
  type StandardTableColumn,
  type SortState,
} from '@/components/common';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/auth-fetch';

interface SampleCard {
  id: number;
  sample_no: string;
  sample_name: string;
  customer_name: string;
  product_name: string;
  version_no: string;
  status: number;
  substrate_material_name: string;
  print_color: string;
  total_cost: number;
  estimated_hour: number;
  quote_id: number | null;
  create_time: string;
}

const STATUS_MAP: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  1: { label: PROCESS_CARD_STATUS_LABEL[1], variant: 'secondary' },
  2: { label: PROCESS_CARD_STATUS_LABEL[2], variant: 'default' },
  3: { label: PROCESS_CARD_STATUS_LABEL[3], variant: 'outline' },
  4: { label: PROCESS_CARD_STATUS_LABEL[4], variant: 'destructive' },
};

export default function ProcessCardPage() {
  const ts = useTranslations('Dcprint');
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');
  const router = useRouter();

  const [cards, setCards] = useState<SampleCard[]>([]);
  const [loading, setLoading] = useState(false);
  // StandardTable：分页 / 排序（列表为全量拉取，走客户端分页 + 本地排序）
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sampling: 0,
    confirmed: 0,
    cancelled: 0,
  });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100' });
      if (searchKeyword) params.append('keyword', searchKeyword);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const res = await authFetch(`/api/dcprint/sample-card?${params}`);
      const data = await res.json();
      if (data.success) {
        const list = data.data?.list || data.data || [];
        setCards(list);
        setStats({
          total: data.data?.total || list.length,
          draft: list.filter((c: SampleCard) => c.status === 1).length,
          sampling: list.filter((c: SampleCard) => c.status === 2).length,
          confirmed: list.filter((c: SampleCard) => c.status === 3).length,
          cancelled: list.filter((c: SampleCard) => c.status === 4).length,
        });
      }
    } catch {
      toast.error(ts('k_1945u9p'));
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, filterStatus]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSubmit = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/submit`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_14yk4ax'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_sojurb'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm(ts('k_1yr6vyp'))) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_regfno'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(ts('k_1s94v9q'))) return;
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(ts('k_1hlqs'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_1ijrr73'));
      }
    } catch {
      toast.error(ts('k_1ijrr73'));
    }
  };

  // 已确认工艺卡 → 生成报价单（POST /api/dcprint/sample-card/[id]/generate-quote）
  const handleGenerateQuote = async (id: number) => {
    try {
      const res = await authFetch(`/api/dcprint/sample-card/${id}/generate-quote`, { method: 'POST' });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        toast.success(data.message || ts('k_hn069'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  // 报价单 → 销售订单（POST /api/quotes/[id]/convert，后端幂等：重复点击返回既有订单）
  const handleConvertToOrder = async (quoteId: number) => {
    try {
      const res = await authFetch(`/api/quotes/${quoteId}/convert`, { method: 'POST' });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        toast.success(data.message || ts('k_9vwt5c'));
        fetchCards();
      } else {
        toast.error(data.message || ts('k_ydow7a'));
      }
    } catch {
      toast.error(ts('k_ydow7a'));
    }
  };

  const columns: StandardTableColumn<SampleCard>[] = [
    {
      key: 'sample_no',
      title: ts('k_1y8ybpg'),
      sortable: true,
      render: (r) => <span className="font-mono">{r.sample_no}</span>,
    },
    { key: 'sample_name', title: ts('k_11gs5ia'), sortable: true },
    {
      key: 'customer_name',
      title: ts('k_ush9hy'),
      sortable: true,
      render: (r) => r.customer_name || '-',
    },
    {
      key: 'product_name',
      title: ts('k_aa5e9x'),
      sortable: true,
      render: (r) => r.product_name || '-',
    },
    { key: 'version_no', title: ts('k_va46gx'), sortable: true },
    {
      key: 'substrate_material_name',
      title: ts('k_1t8ltxj'),
      sortable: true,
      render: (r) => r.substrate_material_name || '-',
    },
    {
      key: 'print_color',
      title: ts('k_4sf5la'),
      sortable: true,
      render: (r) => r.print_color || '-',
    },
    {
      key: 'estimated_hour',
      title: ts('k_q7sxwm'),
      sortable: true,
      render: (r) => (r.estimated_hour ? `${r.estimated_hour}h` : '-'),
    },
    {
      key: 'total_cost',
      title: ts('k_1ugaydy'),
      sortable: true,
      render: (r) => `¥${Number(r.total_cost || 0).toFixed(2)}`,
    },
    {
      key: 'status',
      title: ts('k_1ccx4t4'),
      sortable: true,
      render: (r) => (
        <Badge variant={STATUS_MAP[r.status]?.variant || 'secondary'}>
          {STATUS_MAP[r.status]?.label || ts('k_1lpnuh4')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: tc('actions'),
      align: 'right',
      // 原有操作列：查看 / 编辑 / 提交 / 确认 / 作废 / 删除，逻辑保持原样
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => router.push(`/dcprint/process-card/${r.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              {ts('k_10fbkvl')}
            </DropdownMenuItem>
            {r.status === 1 && (
              <>
                <DropdownMenuItem onClick={() => router.push(`/dcprint/process-card/${r.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {tc('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSubmit(r.id)}>
                  <Send className="h-4 w-4 mr-2" />
                  {ts('k_ybr38x')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                  {tc('delete')}
                </DropdownMenuItem>
              </>
            )}
            {r.status === 2 && (
              <>
                <DropdownMenuItem onClick={() => handleConfirm(r.id)}>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                  {ts('k_kre8wf')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCancel(r.id)}>
                  <XCircle className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                  {ts('k_wph6a4')}
                </DropdownMenuItem>
              </>
            )}
            {r.status === 3 && !r.quote_id && (
              <DropdownMenuItem onClick={() => handleGenerateQuote(r.id)}>
                <FileText className="h-4 w-4 mr-2" />
                {ts('k_8fdq2m')}
              </DropdownMenuItem>
            )}
            {r.status === 3 && r.quote_id && (
              <DropdownMenuItem onClick={() => handleConvertToOrder(r.quote_id!)}>
                <ShoppingCart className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                {ts('k_9vwt5c')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // 客户端分页：先排序再切片（列表为一次性全量拉取）
  const sorted = useMemo(() => {
    if (!sort) return cards;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...cards].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.field];
      const bv = (b as unknown as Record<string, unknown>)[sort.field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      if (typeof av === 'boolean' && typeof bv === 'boolean') return (Number(av) - Number(bv)) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [cards, sort]);

  const paged = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  const handleSortChange = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [searchKeyword, filterStatus]);

  return (
    <MainLayout title={t('processCardManagement')}>
      <div className="space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: tc('totalProcessCards'), icon: FileText, ...StatsTheme.blue },
            { key: 'pending', label: tc('pendingConfirm'), icon: Eye, ...StatsTheme.orange },
            { key: 'completed', label: tc('completed'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'abnormal', label: tc('abnormal'), icon: AlertTriangle, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'total', count: stats.total },
            { key: 'pending', count: stats.draft + stats.sampling },
            { key: 'completed', count: stats.confirmed },
            { key: 'abnormal', count: stats.cancelled },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div className="flex justify-between items-center">
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('all')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">{ts('k_q6w6ul')}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('1')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
              <div className="text-sm text-muted-foreground">{ts('k_oc54qp')}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('2')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">{stats.sampling}</div>
              <div className="text-sm text-muted-foreground">{ts('k_1lta3ye')}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('3')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500 dark:text-green-400">{stats.confirmed}</div>
              <div className="text-sm text-muted-foreground">{ts('k_nmir1b')}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('processCardList')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 max-w-sm">
                <Input
                  placeholder={tc('search')}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCards()}
                />
              </div>
              <Button onClick={() => fetchCards()} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                {tc('search')}
              </Button>
              <Button onClick={() => router.push('/dcprint/process-card/new')}>
                <Plus className="h-4 w-4 mr-2" />
                {tc('add')}
              </Button>
            </div>

            <StandardTable<SampleCard>
              columns={columns}
              dataSource={paged}
              total={sorted.length}
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
              sortState={sort}
              onSortChange={handleSortChange}
              loading={loading}
              onRetry={fetchCards}
              emptyText={tc('noData')}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
