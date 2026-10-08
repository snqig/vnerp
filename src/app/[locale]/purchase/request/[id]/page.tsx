'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StandardTable,
  type StandardTableColumn,
  type SortState,
} from '@/components/common';
import { ArrowLeft, Edit, Printer, CheckCircle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseRequest {
  id: number;
  request_no: string;
  request_date: string;
  request_type: string;
  request_dept: string;
  requester_name: string;
  total_amount: number;
  currency: string;
  status: number;
  priority: number;
  expected_date: string;
  supplier_name: string;
  remark: string;
  approver_name: string;
  approve_date: string;
  approve_remark: string;
  create_time: string;
  items: RequestItem[];
}

interface RequestItem {
  id: number;
  line_no: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  material_unit: string;
  quantity: number;
  price: number;
  amount: number;
  remark: string;
}

export default function PurchaseRequestDetailPage() {
  const ts = useTranslations('Purchase');
  // 翻译钩子
  const tc = useTranslations('Common');

  const statusMap: Record<number, { label: string; color: string }> = {
    0: {
      label: tc('draft'),
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
    1: {
      label: tc('pending'),
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    2: {
      label: ts('k_10hmnl2'),
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    3: { label: ts('k_16h1qdk'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    4: {
      label: tc('convertedToPurchase'),
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    5: {
      label: ts('k_19j4h'),
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    },
  };

  const priorityMap: Record<number, { label: string; color: string }> = {
    0: { label: tc('low'), color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
    1: {
      label: tc('medium'),
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    2: {
      label: tc('high'),
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    3: {
      label: tc('critical'),
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  // StandardTable：分页 / 排序（明细为一次性全量返回，走客户端分页 + 本地排序）
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await authFetch(`/api/purchase/request?id=${id}`);
      const result = await response.json();

      if (result.success) {
        setRequest(result.data);
      } else {
        toast.error(result.message || ts('k_i82tec'));
      }
    } catch {
      toast.error(ts('k_i82tec'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    toast.info(ts('k_10h1w4z'));
  };

  const handleReject = async () => {
    toast.info(ts('k_10h1w4z'));
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY',
    }).format(amount);
  };

  const items = request?.items ?? [];

  const columns: StandardTableColumn<RequestItem>[] = [
    { key: 'line_no', title: ts('k_11vy4t0'), sortable: true },
    {
      key: 'material_code',
      title: tc('materialCode'),
      sortable: true,
      render: (r) => r.material_code || '-',
    },
    {
      key: 'material_name',
      title: tc('materialName'),
      sortable: true,
      render: (r) => <span className="font-medium">{r.material_name}</span>,
    },
    {
      key: 'material_spec',
      title: ts('k_17faar3'),
      sortable: true,
      render: (r) => r.material_spec || '-',
    },
    { key: 'material_unit', title: tc('unit'), sortable: true, render: (r) => r.material_unit || '-' },
    { key: 'quantity', title: tc('quantity'), align: 'right', sortable: true },
    {
      key: 'price',
      title: ts('k_isc1c5'),
      align: 'right',
      sortable: true,
      render: (r) => Number(r.price || 0).toFixed(4),
    },
    {
      key: 'amount',
      title: tc('amount'),
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="font-medium">
          {formatAmount(Number(r.amount || 0), request?.currency || 'CNY')}
        </span>
      ),
    },
    { key: 'remark', title: tc('remark'), sortable: true, render: (r) => r.remark || '-' },
  ];

  // 客户端分页：先排序再切片
  const sorted = useMemo(() => {
    const source = request?.items ?? [];
    if (!sort) return source;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...source].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.field];
      const bv = (b as unknown as Record<string, unknown>)[sort.field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      if (typeof av === 'boolean' && typeof bv === 'boolean') return (Number(av) - Number(bv)) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [request, sort]);

  const paged = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  const handleSortChange = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-20">{tc('loading')}</div>
        </div>
      </MainLayout>
    );
  }

  if (!request) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-20 text-muted-foreground">{ts('k_j6p1hr')}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-6xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                {ts('k_9o6zla')}</h1>
              <p className="text-sm text-muted-foreground">
                {tc('requestNoLabelPrefix')}
                {request.request_no}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              {ts('k_fx6uxi')}</Button>
            {request.status <= 1 && (
              <Button onClick={() => router.push(`/purchase/request/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                {ts('k_qreyeg')}</Button>
            )}
            {request.status === 1 && (
              <>
                <Button variant="outline" className="text-green-600 dark:text-green-400" onClick={handleApprove}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {ts('k_1tmnt86')}</Button>
                <Button variant="outline" className="text-red-600 dark:text-red-400" onClick={handleReject}>
                  <XCircle className="h-4 w-4 mr-2" />
                  {tc('auditReject')}</Button>
              </>
            )}
          </div>
        </div>

        {/* 状态栏 */}
        <div className="flex items-center gap-4 mb-6">
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${statusMap[request.status]?.color}`}
          >
            {statusMap[request.status]?.label || tc('unknown')}
          </span>
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${priorityMap[request.priority]?.color}`}
          >
            {tc('priorityLabelPrefix')}
            {priorityMap[request.priority]?.label || tc('medium')}
          </span>
        </div>

        {/* 基本信息 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{ts('k_z5lkkb')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">{ts('k_1i2qe7n')}</div>
                <div className="font-medium">{request.request_date}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{ts('k_1subwph')}</div>
                <div className="font-medium">{request.request_type || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{ts('k_1x9z28n')}</div>
                <div className="font-medium">{request.request_dept || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{tc('applicant')}</div>
                <div className="font-medium">{request.requester_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{tc('expectedArrivalDate')}</div>
                <div className="font-medium">{request.expected_date || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{ts('k_yrjgkw')}</div>
                <div className="font-medium">{request.supplier_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{tc('createdAt')}</div>
                <div className="font-medium">{new Date(request.create_time).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{tc('totalAmountLabel')}</div>
                <div className="font-medium text-blue-600 dark:text-blue-400">
                  {formatAmount(request.total_amount, request.currency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 物料明细 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{ts('k_1fk0uv7')}</CardTitle>
          </CardHeader>
          <CardContent>
            <StandardTable<RequestItem>
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
              onRetry={fetchRequest}
              emptyText={tc('noData')}
            />

            {/* 合计 */}
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-lg font-bold">
                {ts('k_71hi4y')}<span className="text-blue-600 dark:text-blue-400">
                  {formatAmount(request.total_amount, request.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 审批信息 */}
        {(request.approver_name || request.approve_remark) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{ts('k_14w3di7')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">{tc('approver')}</div>
                  <div className="font-medium">{request.approver_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{tc('approveDate')}</div>
                  <div className="font-medium">{request.approve_date || '-'}</div>
                </div>
                <div className="md:col-span-3">
                  <div className="text-sm text-muted-foreground">{ts('k_15z9tqr')}</div>
                  <div className="font-medium">{request.approve_remark || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 备注 */}
        {request.remark && (
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle>{tc('remark')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-200">{request.remark}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
