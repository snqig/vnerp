'use client';

import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  Send,
  FileText,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileDown,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useToastContext } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/use-debounce';
import { useCompanyName } from '@/hooks/useCompanyName';

interface PurchaseOrder {
  id: number;
  po_no: string;
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  order_date: string;
  delivery_date: string;
  currency: string;
  total_amount: number;
  total_quantity: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  status: number;
  over_receipt_tolerance: number;
  payment_terms: string;
  remark: string;
  create_time: string;
  update_time: string;
  audit_time: string | null;
  lines?: any[];
}

interface Supplier {
  id: number;
  supplier_code: string;
  supplier_name: string;
  short_name: string;
  grade: string;
  status: string;
}

interface OrderItem {
  id: number;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

const STATUS_MAP: Record<number, { label: string; className: string }> = {
  10: { label: '草稿', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  20: { label: '待审批', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' },
  30: { label: '已审批', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
  40: { label: '部分到货', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' },
  50: { label: '已完成', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
  90: { label: '已关闭', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
};

const PO_STATUS = {
  DRAFT: 10,
  PENDING_APPROVAL: 20,
  APPROVED: 30,
  PARTIALLY_RECEIVED: 40,
  COMPLETED: 50,
  CLOSED: 90,
} as const;

const getStatusBadge = (status: number) => {
  const config = STATUS_MAP[status] || { label: `未知(${status})`, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
};

export default function PurchaseOrdersPage() {
  const { companyName } = useCompanyName();
  const { addToast: toast } = useToastContext();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const [newOrder, setNewOrder] = useState({
    supplier_id: '',
    delivery_date: '',
    remark: '',
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { id: 1, material_code: '', material_name: '', quantity: 1, unit: '件', unit_price: 0 }
  ]);

  const fetchOrders = useCallback(async (searchKeyword?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (searchKeyword) params.append('keyword', searchKeyword);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/purchase/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(Array.isArray(data.data) ? data.data : []);
        setTotal(data.pagination?.total || 0);
        setSelectedOrders([]);
      } else {
        toast({ title: '错误', description: data.message || '获取采购单列表失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '获取采购单列表失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, toast]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/purchase/suppliers');
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data?.list || data.data || []);
      }
    } catch (error) {
      console.error('获取供应商列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const debouncedKeyword = useDebounce(keyword, 300);

  useEffect(() => {
    fetchOrders(debouncedKeyword);
  }, [debouncedKeyword, statusFilter, fetchOrders]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleViewDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDetailItems(order.lines || []);
    setIsDetailOpen(true);
  };

  const toggleRowExpand = (order: PurchaseOrder) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(order.id)) {
      newExpanded.delete(order.id);
    } else {
      newExpanded.add(order.id);
    }
    setExpandedRows(newExpanded);
  };

  const handleCreateOrder = async () => {
    if (!newOrder.supplier_id) {
      toast({ title: '错误', description: '请选择供应商', variant: 'destructive' });
      return;
    }

    const validItems = orderItems.filter(item => item.material_code && item.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: '错误', description: '请添加至少一项采购物料', variant: 'destructive' });
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === parseInt(newOrder.supplier_id));

    try {
      setLoading(true);
      const res = await fetch('/api/purchase/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: parseInt(newOrder.supplier_id),
          supplier_name: selectedSupplier?.supplier_name || '',
          supplier_code: selectedSupplier?.supplier_code || '',
          delivery_date: newOrder.delivery_date || null,
          remark: newOrder.remark,
          lines: validItems.map(item => ({
            material_code: item.material_code,
            material_name: item.material_name,
            order_qty: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: '成功', description: '采购单创建成功' });
        setIsCreateOpen(false);
        setNewOrder({ supplier_id: '', delivery_date: '', remark: '' });
        setOrderItems([{ id: 1, material_code: '', material_name: '', quantity: 1, unit: '件', unit_price: 0 }]);
        fetchOrders();
      } else {
        toast({ title: '错误', description: data.message || '创建失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '创建采购单失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (order: PurchaseOrder) => {
    if (!confirm(`确定要删除采购单 ${order.po_no} 吗？`)) return;

    try {
      const res = await fetch(`/api/purchase/orders?id=${order.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: '成功', description: '删除成功' });
        fetchOrders();
      } else {
        toast({ title: '错误', description: data.message || '删除失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' });
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedOrders.length) return;
    
    const selectedOrderInfo = orders.filter(o => selectedOrders.includes(o.id));
    const orderNumbers = selectedOrderInfo.map(o => o.po_no).join(', ');
    
    if (!confirm(`确定要删除选中的 ${selectedOrders.length} 个采购单吗？\n采购单号: ${orderNumbers}`)) return;

    try {
      setLoading(true);
      
      // 逐个删除采购单
      let successCount = 0;
      for (const orderId of selectedOrders) {
        const res = await fetch(`/api/purchase/orders?id=${orderId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast({ title: '成功', description: `成功删除 ${successCount} 个采购单` });
        fetchOrders();
      } else {
        toast({ title: '错误', description: '删除失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, action: string) => {
    let newStatus = 0;
    if (action === 'submit') newStatus = PO_STATUS.PENDING_APPROVAL;
    else if (action === 'approve') newStatus = PO_STATUS.APPROVED;
    else return;

    try {
      const res = await fetch('/api/purchase/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: '成功', description: '状态更新成功' });
        fetchOrders();
      } else {
        toast({ title: '错误', description: data.message || '状态更新失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '状态更新失败', variant: 'destructive' });
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders(keyword);
  };

  const handleExport = (format: string) => {
    const statusMap: Record<number, string> = {
      10: '草稿', 20: '待审批', 30: '已审批', 40: '部分到货', 50: '已完成', 90: '已关闭'
    };
    const data = orders.map(o => ({
      '采购单号': o.po_no,
      '供应商': o.supplier_name,
      '下单日期': formatDate(o.order_date),
      '期望到货': formatDate(o.delivery_date),
      '总数量': o.total_quantity,
      '金额': Number(o.grand_total || o.total_amount || 0).toFixed(2),
      '状态': statusMap[o.status] || `未知(${o.status})`,
      '备注': o.remark || '',
    }));

    if (format === 'xls' || format === 'excel') {
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join('\t'),
        ...data.map(row => headers.map(h => (row as any)[h] ?? '').join('\t'))
      ].join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `采购订单_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '导出成功', description: '已导出为 Excel 文件' });
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const headers = Object.keys(data[0] || {});
      const thCells = headers.map(h => `<th>${h}</th>`).join('');
      const rows = data.map(row =>
        '<tr>' + headers.map(h => `<td>${(row as any)[h] ?? ''}</td>`).join('') + '</tr>'
      ).join('');
      printWindow.document.write(`<!DOCTYPE html><html><head><title>采购订单导出</title>
<style>
  body{font-family:"Microsoft YaHei",sans-serif;padding:20px}
  h1{text-align:center;font-size:18px;margin-bottom:4px}
  p.sub{text-align:center;color:#666;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #333;padding:6px 8px;text-align:center}
  th{background:#f0f0f0;font-weight:bold}
  @media print{body{padding:0}}
</style></head><body>
<h1>采购订单列表</h1>
<p class="sub">导出时间：${new Date().toLocaleString()} | 共 ${data.length} 条</p>
<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
      printWindow.document.close();
      toast({ title: '导出成功', description: '已导出为 PDF（打印保存）' });
    } else if (format === 'word') {
      const headers = Object.keys(data[0] || {});
      const thCells = headers.map(h => `<th style="border:1px solid #333;padding:6px;background:#f0f0f0">${h}</th>`).join('');
      const rows = data.map(row =>
        '<tr>' + headers.map(h => `<td style="border:1px solid #333;padding:6px">${(row as any)[h] ?? ''}</td>`).join('') + '</tr>'
      ).join('');
      const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>采购订单</title></head>
<body style="font-family:'Microsoft YaHei',sans-serif;padding:20px">
<h1 style="text-align:center">采购订单列表</h1>
<p style="text-align:center;color:#666;font-size:12px">导出时间：${new Date().toLocaleString()}</p>
<table style="width:100%;border-collapse:collapse;font-size:12px">
<thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `采购订单_${new Date().toISOString().slice(0, 10)}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '导出成功', description: '已导出为 Word 文件' });
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedOrders(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
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
    if (sortOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedOrders = useMemo(() => {
    if (!sortField || !sortOrder) return orders;
    return [...orders].sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];
      if (sortField === 'total_amount' || sortField === 'grand_total' || sortField === 'total_quantity' || sortField === 'status') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortField, sortOrder]);

  const handlePrintList = () => {
    const dataToPrint = selectedOrders.length > 0
      ? orders.filter(o => selectedOrders.includes(o.id))
      : orders;

    if (dataToPrint.length === 0) {
      toast({ title: '提示', description: '没有数据可打印', variant: 'destructive' });
      return;
    }

    const statusLabels: Record<number, string> = {
      10: '草稿', 20: '待审批', 30: '已审批', 40: '部分到货', 50: '已完成', 90: '已关闭'
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: '错误', description: '无法打开打印窗口，请检查浏览器弹窗设置', variant: 'destructive' });
      return;
    }

    const orderSections = dataToPrint.map((o, orderIndex) => {
      const lines = o.lines || [];
      const lineRows = lines.length > 0
        ? lines.map((item: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.material_code || '-'}</td>
            <td>${item.material_name || '-'}</td>
            <td>${item.material_spec || item.specification || '-'}</td>
            <td class="num">${item.order_qty ?? item.quantity ?? 0}</td>
            <td>${item.unit || '-'}</td>
            <td class="num">${Number(item.unit_price || 0).toFixed(2)}</td>
            <td class="num">${Number(item.amount || (item.order_qty || item.quantity) * (item.unit_price || 0)).toFixed(2)}</td>
            <td class="num">${item.received_qty ?? 0}</td>
          </tr>`).join('')
        : '<tr><td colspan="9" style="color:#999;text-align:center;padding:8px;">暂无明细数据</td></tr>';

      return `
        <div class="order-block">
          <div class="order-header">
            <span class="order-no">${o.po_no}</span>
            <span class="order-info">供应商：${o.supplier_name} | 下单日期：${formatDate(o.order_date)} | 期望到货：${formatDate(o.delivery_date)} | 状态：${statusLabels[o.status] || '未知'}</span>
          </div>
          <table>
            <thead><tr><th>序号</th><th>物料编码</th><th>物料名称</th><th>规格型号</th><th>数量</th><th>单位</th><th>单价</th><th>金额</th><th>已收数量</th></tr></thead>
            <tbody>${lineRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align:right;font-weight:bold;">合计</td>
                <td class="num" style="font-weight:bold;">${o.total_quantity || 0}</td>
                <td></td>
                <td></td>
                <td class="num" style="font-weight:bold;">¥${Number(o.grand_total || o.total_amount || 0).toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          ${o.remark ? `<div class="remark">备注：${o.remark}</div>` : ''}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>采购订单打印</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; font-size: 20px; margin-bottom: 5px; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        .order-block { margin-bottom: 20px; page-break-inside: avoid; }
        .order-header { background: #f0f4ff; padding: 8px 12px; border: 1px solid #c8d6f0; border-bottom: none; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; align-items: center; }
        .order-no { font-weight: bold; font-size: 14px; color: #1a56db; }
        .order-info { color: #555; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        tfoot td { background-color: #f8f9fa; }
        .num { text-align: right; }
        .remark { padding: 4px 12px; color: #666; font-size: 11px; border: 1px solid #c8d6f0; border-top: none; border-radius: 0 0 4px 4px; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } .order-block { page-break-inside: avoid; } }
      </style></head>
      <body>
        <h1>采购订单</h1>
        <div class="info">打印时间：${new Date().toLocaleString('zh-CN')} | 共 ${dataToPrint.length} 条采购订单</div>
        ${orderSections}
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast({ title: '打印', description: `正在打印 ${dataToPrint.length} 条采购订单` });
  };

  const addItem = () => {
    setOrderItems(prev => [
      ...prev,
      { id: Date.now(), material_code: '', material_name: '', quantity: 1, unit: '件', unit_price: 0 }
    ]);
  };

  const removeItem = (id: number) => {
    if (orderItems.length <= 1) return;
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: keyof OrderItem, value: any) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  return (
    <MainLayout title="采购订单">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder="搜索采购单号、供应商..."
                  value={keyword}
                  onChange={setKeyword}
                  onSearch={(kw) => { setPage(1); fetchOrders(kw); }}
                  className="flex-1 max-w-sm"
                />
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="订单状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="10">草稿</SelectItem>
                    <SelectItem value="20">待审批</SelectItem>
                    <SelectItem value="30">已审批</SelectItem>
                    <SelectItem value="40">部分到货</SelectItem>
                    <SelectItem value="50">已完成</SelectItem>
                    <SelectItem value="90">已关闭</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleSearch}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrintList}>
                  <Printer className="h-4 w-4 mr-2" />
                  打印{selectedOrders.length > 0 ? `(${selectedOrders.length})` : ''}
                </Button>
                {selectedOrders.length > 0 && (
                  <Button variant="destructive" onClick={handleBatchDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除({selectedOrders.length})
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      导出
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      导出为 PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xls')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      导出为 Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('word')}>
                      <FileText className="h-4 w-4 mr-2" />
                      导出为 Word
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      新建采购单
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" resizable>
                    <DialogHeader>
                      <DialogTitle>新建采购订单</DialogTitle>
                      <DialogDescription>创建采购订单</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>供应商 *</Label>
                          <Select
                            value={newOrder.supplier_id}
                            onValueChange={(v) => setNewOrder(prev => ({ ...prev, supplier_id: v }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="选择供应商" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers
                                .filter((s) => Number(s.status) === 1)
                                .map((s) => (
                                  <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.supplier_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>期望到货日期</Label>
                          <Input
                            type="date"
                            value={newOrder.delivery_date}
                            onChange={(e) => setNewOrder(prev => ({ ...prev, delivery_date: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>采购明细</Label>
                        <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[140px]">物料编码</TableHead>
                              <TableHead className="min-w-[140px]">物料名称</TableHead>
                              <TableHead className="min-w-[100px]">数量</TableHead>
                              <TableHead className="min-w-[80px]">单位</TableHead>
                              <TableHead className="min-w-[100px]">单价</TableHead>
                              <TableHead className="min-w-[100px]">金额</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Input
                                    value={item.material_code}
                                    onChange={(e) => updateItem(item.id, 'material_code', e.target.value)}
                                    placeholder="物料编码"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.material_name}
                                    onChange={(e) => updateItem(item.id, 'material_name', e.target.value)}
                                    placeholder="物料名称"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity || ''}
                                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.unit}
                                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unit_price || ''}
                                    onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {(item.quantity * item.unit_price).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItem(item.id)}
                                    disabled={orderItems.length === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                        <Button variant="outline" size="sm" onClick={addItem}>
                          <Plus className="h-4 w-4 mr-1" />
                          添加物料
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>备注</Label>
                        <Input
                          placeholder="采购备注..."
                          value={newOrder.remark}
                          onChange={(e) => setNewOrder(prev => ({ ...prev, remark: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateOrder} loading={loading}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        创建采购单
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>采购订单列表</CardTitle>
            <CardDescription>共 {total} 条采购记录</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无采购订单</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={orders.length > 0 && selectedOrders.length === orders.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('po_no')}>
                      <span className="inline-flex items-center">采购单号{getSortIcon('po_no')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('supplier_name')}>
                      <span className="inline-flex items-center">供应商{getSortIcon('supplier_name')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('order_date')}>
                      <span className="inline-flex items-center">下单日期{getSortIcon('order_date')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('delivery_date')}>
                      <span className="inline-flex items-center">期望到货{getSortIcon('delivery_date')}</span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('total_quantity')}>
                      <span className="inline-flex items-center justify-end">总数量{getSortIcon('total_quantity')}</span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('grand_total')}>
                      <span className="inline-flex items-center justify-end">金额{getSortIcon('grand_total')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('status')}>
                      <span className="inline-flex items-center">状态{getSortIcon('status')}</span>
                    </TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => {
                    const isExpanded = expandedRows.has(order.id);
                    const lines = order.lines || [];
                    return (
                      <Fragment key={order.id}>
                        <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={() => toggleSelect(order.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleRowExpand(order)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono">{order.po_no}</TableCell>
                          <TableCell>{order.supplier_name}</TableCell>
                          <TableCell>{formatDate(order.order_date)}</TableCell>
                          <TableCell>{formatDate(order.delivery_date)}</TableCell>
                          <TableCell className="text-right">{order.total_quantity}</TableCell>
                          <TableCell className="text-right font-medium">
                            ¥{Number(order.grand_total || order.total_amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetail(order)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                {order.status === 10 && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'submit')}>
                                    <Send className="h-4 w-4 mr-2" />
                                    提交审批
                                  </DropdownMenuItem>
                                )}
                                {order.status === 20 && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'approve')}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    审批通过
                                  </DropdownMenuItem>
                                )}
                                {order.status < 30 && (
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(order)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${order.id}-detail`}>
                            <TableCell colSpan={10} className="p-0">
                              <div className="bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50">
                                      <TableHead className="pl-8 text-xs font-normal text-muted-foreground">物料编码</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">物料名称</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">规格型号</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">数量</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">单位</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">单价</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">金额</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">已收数量</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {lines.length > 0 ? lines.map((item: any, idx: number) => (
                                      <TableRow key={idx} className="bg-transparent hover:bg-white/60 dark:hover:bg-slate-700/60">
                                        <TableCell className="pl-8 font-mono text-sm">{item.material_code || '-'}</TableCell>
                                        <TableCell className="text-sm">{item.material_name || '-'}</TableCell>
                                        <TableCell className="text-sm">{item.material_spec || item.specification || '-'}</TableCell>
                                        <TableCell className="text-sm text-right">{item.order_qty ?? item.quantity ?? 0}</TableCell>
                                        <TableCell className="text-sm">{item.unit || '-'}</TableCell>
                                        <TableCell className="text-sm text-right">{Number(item.unit_price || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-sm text-right font-medium">
                                          {Number(item.amount || (item.order_qty || item.quantity) * (item.unit_price || 0)).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-sm">{item.received_qty ?? 0}</TableCell>
                                      </TableRow>
                                    )) : (
                                      <TableRow>
                                        <TableCell colSpan={8} className="text-center py-3 text-muted-foreground text-sm">
                                          暂无明细数据
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
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>采购单详情</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">采购单号</Label>
                    <p className="font-mono">{selectedOrder.po_no}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">供应商</Label>
                    <p>{selectedOrder.supplier_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">下单日期</Label>
                    <p>{formatDate(selectedOrder.order_date)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">期望到货</Label>
                    <p>{formatDate(selectedOrder.delivery_date)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">总数量</Label>
                    <p>{selectedOrder.total_quantity}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">金额</Label>
                    <p className="font-medium">¥{Number(selectedOrder.grand_total || selectedOrder.total_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">状态</Label>
                    <p>{getStatusBadge(selectedOrder.status)}</p>
                  </div>
                  {selectedOrder.remark && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">备注</Label>
                      <p>{selectedOrder.remark}</p>
                    </div>
                  )}
                </div>
                {detailItems.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">采购明细</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>物料编码</TableHead>
                          <TableHead>物料名称</TableHead>
                          <TableHead>数量</TableHead>
                          <TableHead>单位</TableHead>
                          <TableHead>单价</TableHead>
                          <TableHead>金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailItems.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{item.material_code}</TableCell>
                            <TableCell>{item.material_name}</TableCell>
                            <TableCell>{item.order_qty || item.quantity}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.unit_price}</TableCell>
                            <TableCell>{item.total_price || ((item.order_qty || item.quantity) * item.unit_price).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
