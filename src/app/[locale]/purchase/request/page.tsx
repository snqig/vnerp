'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useMemo, Fragment } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Printer,
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce } from '@/hooks/use-debounce';
import { SearchInput } from '@/components/ui/search-input';
import { useCompanyName } from '@/hooks/useCompanyName';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';

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
  remark: string;
  create_time: string;
  items?: RequestItem[];
}

interface RequestItem {
  id: number;
  request_id: number;
  line_no: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  material_unit: string;
  quantity: number;
  price: number;
  amount: number;
  supplier_name: string;
  expected_date: string;
  remark: string;
}

export default function PurchaseRequestPage() {
  const t = useTranslations('Purchase');
  const tc = useTranslations('Common');
  const { companyName } = useCompanyName();

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    0: { label: tc('draft'), variant: 'secondary' },
    1: { label: tc('pending'), variant: 'outline' },
    2: { label: tc('approved'), variant: 'default' },
    3: { label: t('statusTransferred'), variant: 'default' },
    9: { label: tc('closed'), variant: 'secondary' },
  };

  const priorityMap: Record<number, { label: string; color: string }> = {
    0: { label: tc('low'), color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
    1: {
      label: tc('medium'),
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    },
    2: {
      label: tc('high'),
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
    },
    3: {
      label: tc('critical'),
      color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    },
  };

  const statusMapCN: Record<number, string> = {
    0: tc('draft'),
    1: t('statusPendingApproval'),
    2: t('statusApproved'),
    3: t('statusTransferred'),
    9: tc('closed'),
  };

  const priorityMapCN: Record<number, string> = {
    0: tc('low'),
    1: tc('medium'),
    2: tc('high'),
    3: tc('critical'),
  };
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };
  const sortedRequests = useMemo(() => {
    if (!sortField || !sortOrder) return requests;
    return [...requests].sort((a, b) => {
      const aVal = String((a as any)[sortField] ?? '').toLowerCase();
      const bVal = String((b as any)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [requests, sortField, sortOrder]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [page, status, debouncedKeyword]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (status !== 'all') params.append('status', status);
      if (debouncedKeyword) params.append('keyword', debouncedKeyword);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await authFetch(`/api/purchase/request?${params}`);
      const result = await response.json();

      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : result.data?.list || [];
        setRequests(data);
        setTotal(result.pagination?.total || result.data?.total || data.length);
      } else {
        toast.error(result.message || t('fetchFailed'));
      }
    } catch {
      toast.error(t('fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;

    try {
      const response = await authFetch(`/api/purchase/request?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success(tc('deleteSuccess'));
        fetchRequests();
      } else {
        toast.error(result.message || tc('deleteFailed'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchRequests();
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map((r) => r.id));
    }
  };

  const toggleRowExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrint = () => {
    const recordsToPrint =
      selectedIds.length > 0 ? requests.filter((r) => selectedIds.includes(r.id)) : requests;
    if (recordsToPrint.length === 0) {
      toast.error(t('noDataToPrint'));
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('cannotOpenPrintWindow'));
      return;
    }

    const orderSections = recordsToPrint
      .map((r) => {
        const items = r.items || [];
        const itemRows =
          items.length > 0
            ? items
                .map(
                  (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.material_code || '-'}</td>
            <td>${item.material_name || '-'}</td>
            <td>${item.material_spec || '-'}</td>
            <td>${item.material_unit || '-'}</td>
            <td class="num">${item.quantity ?? 0}</td>
            <td class="num">${Number(item.price || 0).toFixed(2)}</td>
            <td class="num">${Number(item.amount || 0).toFixed(2)}</td>
          </tr>`
                )
                .join('')
            : '<tr><td colspan="8" style="color:#999;text-align:center;padding:6px;">暂无明细数据</td></tr>';

        return `
        <div class="order-block">
          <div class="order-header">
            <span class="order-no">${r.request_no}</span>
            <span class="order-info">申请部门：${r.request_dept || '-'} | 申请人：${r.requester_name || '-'} | 申请日期：${formatDate(r.request_date)} | 优先级：${priorityMapCN[r.priority] || '中'} | 状态：${statusMapCN[r.status] || '未知'}</span>
          </div>
          <table>
            <thead><tr><th>{tc("serialNo")}</th><th>物料编码</th><th>物料名称</th><th>规格型号</th><th>{tc("unit")}</th><th>{tc("quantity")}</th><th>单价</th><th>{tc("amount")}</th></tr></thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;font-weight:bold;">{tc("total")}</td>
                <td class="num" style="font-weight:bold;">${items.reduce((s, i) => s + (i.quantity || 0), 0)}</td>
                <td></td>
                <td class="num" style="font-weight:bold;">${formatAmount(r.total_amount, r.currency)}</td>
              </tr>
            </tfoot>
          </table>
          ${r.remark ? `<div class="remark">备注：${r.remark}</div>` : ''}
        </div>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>采购申请打印</title>
      <style>
        @page { size: A5; margin: 8mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 15px; color: #333; font-size: 11px; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 8px; color: #1a56db; font-size: 16px; margin-bottom: 4px; }
        .info { text-align: center; color: #666; margin-bottom: 10px; font-size: 11px; }
        .order-block { margin-bottom: 15px; page-break-inside: avoid; }
        .order-header { background: #f0f4ff; padding: 6px 10px; border: 1px solid #c8d6f0; border-bottom: none; border-radius: 3px 3px 0 0; display: flex; justify-content: space-between; align-items: center; }
        .order-no { font-weight: bold; font-size: 12px; color: #1a56db; }
        .order-info { color: #555; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { border: 1px solid #999; padding: 3px 5px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        tfoot td { background-color: #f8f9fa; }
        .num { text-align: right; }
        .remark { padding: 3px 10px; color: #666; font-size: 10px; border: 1px solid #c8d6f0; border-top: none; border-radius: 0 0 3px 3px; }
        .footer { margin-top: 15px; text-align: right; color: #999; font-size: 10px; }
        @media print { body { padding: 0; } .order-block { page-break-inside: avoid; } }
      </style></head>
      <body>
        <h1>采购申请</h1>
        <div class="info">打印时间：${new Date().toLocaleString('zh-CN')} | 共 ${recordsToPrint.length} 条采购申请</div>
        ${orderSections}
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportXLS = () => {
    const recordsToExport =
      selectedIds.length > 0 ? requests.filter((r) => selectedIds.includes(r.id)) : requests;
    if (recordsToExport.length === 0) {
      toast.error(t('noDataToExport'));
      return;
    }
    const headers = [
      '申请单号',
      '申请日期',
      '申请部门',
      '申请人',
      '类型',
      '优先级',
      '金额',
      '状态',
    ];
    const rows = recordsToExport.map((r) => [
      r.request_no,
      formatDate(r.request_date),
      r.request_dept || '',
      r.requester_name || '',
      r.request_type || '',
      priorityMapCN[r.priority] || '中',
      String(r.total_amount),
      statusMapCN[r.status] || '未知',
    ]);
    const BOM = '\uFEFF';
    const csvContent =
      BOM + [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `采购申请列表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(t('xlsExportSuccess'));
  };

  const handleExportPDF = () => {
    const recordsToExport =
      selectedIds.length > 0 ? requests.filter((r) => selectedIds.includes(r.id)) : requests;
    if (recordsToExport.length === 0) {
      toast.error(t('noDataToExport'));
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('cannotOpenExportWindow'));
      return;
    }
    const rows = recordsToExport
      .map(
        (r) => `<tr>
      <td>${r.request_no}</td>
      <td>${formatDate(r.request_date)}</td>
      <td>${r.request_dept || '-'}</td>
      <td>${r.requester_name || '-'}</td>
      <td>${r.request_type || '-'}</td>
      <td>${priorityMapCN[r.priority] || '中'}</td>
      <td>${formatAmount(r.total_amount, r.currency)}</td>
      <td>${statusMapCN[r.status] || '未知'}</td>
    </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>采购申请列表</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>采购申请列表</h1>
        <div class="info">导出时间：${new Date().toLocaleString('zh-CN')} | 共 ${recordsToExport.length} 条</div>
        <table>
          <thead><tr><th>申请单号</th><th>申请日期</th><th>申请部门</th><th>{tc("applicant")}</th><th>{tc("type")}</th><th>{tc("priority")}</th><th>{tc("amount")}</th><th>{tc("status")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(t('pdfExportSuccess'));
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {t('purchaseRequest')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('purchaseRequestDesc')}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={() => router.push('/purchase/request/new')} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              {t('newRequest')}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/purchase/request/form')}
              className="rounded-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              {t('traditionalEntry')}
            </Button>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                <Printer className="h-4 w-4" />
                {tc('print')}
              </Button>
              <GlobalExportToolbar
                filename="采购申请"
                title="采购申请列表"
                columns={[
                  { key: 'request_no', label: t('requestNo'), width: 18 },
                  {
                    key: 'request_date',
                    label: t('requestDate'),
                    width: 12,
                    formatter: (v) => formatDate(v),
                  },
                  { key: 'request_dept', label: t('requestDept'), width: 12 },
                  { key: 'requester_name', label: t('requester'), width: 12 },
                  { key: 'request_type', label: tc('type'), width: 10 },
                  {
                    key: 'priority',
                    label: tc('priority'),
                    width: 10,
                    formatter: (v) => priorityMapCN[v] || tc('medium'),
                  },
                  {
                    key: 'total_amount',
                    label: tc('amount'),
                    width: 12,
                    formatter: (v, row) => formatAmount(v, row.currency),
                  },
                  {
                    key: 'status',
                    label: tc('status'),
                    width: 10,
                    formatter: (v) => statusMapCN[v] || tc('unknown'),
                  },
                ]}
                data={
                  selectedIds.length > 0
                    ? requests.filter((r) => selectedIds.includes(r.id))
                    : sortedRequests
                }
              />
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <SearchInput
            placeholder={t('searchPlaceholder')}
            value={keyword}
            onChange={setKeyword}
            onSearch={() => {
              setPage(1);
              fetchRequests();
            }}
            className="flex-1 min-w-[200px]"
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
              placeholder={tc('startDate')}
            />
            <span className="text-muted-foreground">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
              placeholder={tc('endDate')}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">{tc('allStatus')}</option>
            <option value="0">{tc('draft')}</option>
            <option value="1">{tc('pending')}</option>
            <option value="2">{tc('approved')}</option>
            <option value="3">{t('statusTransferred')}</option>
            <option value="9">{tc('closed')}</option>
          </select>
          <Button variant="outline" onClick={handleSearch}>
            {tc('search')}
          </Button>
        </div>

        {/* 申请列表 */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={requests.length > 0 && selectedIds.length === requests.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>{t('requestNo')}</TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('request_date')}
                >
                  <span className="inline-flex items-center">
                    {t('requestDate')}
                    {getSortIcon('request_date')}
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('request_dept')}
                >
                  <span className="inline-flex items-center">
                    {t('requestDept')}
                    {getSortIcon('request_dept')}
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('requester_name')}
                >
                  <span className="inline-flex items-center">
                    {t('requester')}
                    {getSortIcon('requester_name')}
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('request_type')}
                >
                  <span className="inline-flex items-center">
                    {tc('type')}
                    {getSortIcon('request_type')}
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('priority')}
                >
                  <span className="inline-flex items-center">
                    {tc('priority')}
                    {getSortIcon('priority')}
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('total_amount')}
                >
                  <span className="inline-flex items-center">
                    {tc('amount')}
                    {getSortIcon('total_amount')}
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted"
                  onClick={() => handleSort('status')}
                >
                  <span className="inline-flex items-center">
                    {tc('status')}
                    {getSortIcon('status')}
                  </span>
                </TableHead>
                <TableHead className="w-[100px]">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    {tc('loading')}
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {t('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                sortedRequests.map((request) => {
                  const isExpanded = expandedRows.has(request.id);
                  const items = request.items || [];
                  return (
                    <Fragment key={request.id}>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(request.id)}
                            onCheckedChange={() => toggleSelect(request.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleRowExpand(request.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="font-medium ml-1">{request.request_no}</span>
                        </TableCell>
                        <TableCell>{formatDate(request.request_date)}</TableCell>
                        <TableCell>{request.request_dept || '-'}</TableCell>
                        <TableCell>{request.requester_name || '-'}</TableCell>
                        <TableCell>{request.request_type || '-'}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${priorityMap[request.priority]?.color || ''}`}
                          >
                            {priorityMap[request.priority]?.label || tc('medium')}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(request.total_amount, request.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusMap[request.status]?.variant || 'default'}>
                            {statusMap[request.status]?.label || tc('unknown')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/purchase/request/${request.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {tc('view')}
                              </DropdownMenuItem>
                              {request.status <= 1 && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/purchase/request/${request.id}/edit`)
                                  }
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {tc('edit')}
                                </DropdownMenuItem>
                              )}
                              {request.status === 1 && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => toast.info(t('approvalInProgress'))}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {tc('approve')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => toast.info(t('approvalInProgress'))}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {tc('reject')}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {request.status <= 1 && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(request.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {tc('delete')}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={10} className="p-0">
                            <div className="bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50">
                                    <TableHead className="pl-8 text-xs font-normal text-muted-foreground">
                                      {t('materialCode')}
                                    </TableHead>
                                    <TableHead className="text-xs font-normal text-muted-foreground">
                                      {t('materialName')}
                                    </TableHead>
                                    <TableHead className="text-xs font-normal text-muted-foreground">
                                      {t('materialSpec')}
                                    </TableHead>
                                    <TableHead className="text-xs font-normal text-muted-foreground">
                                      {tc('unit')}
                                    </TableHead>
                                    <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                      {tc('quantity')}
                                    </TableHead>
                                    <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                      {t('unitPrice')}
                                    </TableHead>
                                    <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                      {tc('amount')}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.length > 0 ? (
                                    items.map((item, idx) => (
                                      <TableRow
                                        key={idx}
                                        className="bg-transparent hover:bg-white/60 dark:hover:bg-slate-700/60"
                                      >
                                        <TableCell className="pl-8 font-mono text-sm">
                                          {item.material_code || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {item.material_name || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {item.material_spec || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {item.material_unit || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-right">
                                          {item.quantity ?? 0}
                                        </TableCell>
                                        <TableCell className="text-sm text-right">
                                          {Number(item.price || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-sm text-right font-medium">
                                          {Number(item.amount || 0).toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell
                                        colSpan={7}
                                        className="text-center py-3 text-muted-foreground text-sm"
                                      >
                                        {t('noDetailData')}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {total > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {tc('totalRecords', { count: total })}，
              {tc('pageInfo', { current: page, total: Math.ceil(total / pageSize) })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {tc('prevPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                {tc('nextPage')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
