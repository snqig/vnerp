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
  FileText,
  Download,
  RefreshCw,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileDown,
  Printer,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  CheckCircle,
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useCompanyName } from '@/hooks/useCompanyName';

type SortField = 'order_no' | 'customer_name' | 'order_date' | 'delivery_date' | 'total_amount' | 'status';
type SortOrder = 'asc' | 'desc' | null;

interface Order {
  id: number;
  order_no: string;
  customer_id?: number;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  total_amount: number;
  total_with_tax?: number;
  status: number;
  items: {
    material_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }[];
  remark?: string;
  create_time?: string;
  update_time?: string;
}

interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
}

interface Material {
  id: number;
  material_code: string;
  material_name: string;
  specification?: string;
  unit: string;
  sale_price: number;
  material_type?: number;
}

const STATUS_MAP: Record<number, { label: string; className: string }> = {
  1: { label: '待确认', className: 'bg-gray-100 text-gray-700' },
  2: { label: '已确认', className: 'bg-blue-100 text-blue-700' },
  3: { label: '部分发货', className: 'bg-orange-100 text-orange-700' },
  4: { label: '已完成', className: 'bg-green-100 text-green-700' },
  5: { label: '已取消', className: 'bg-red-100 text-red-700' },
};

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

export default function SalesOrdersPage() {
  const { companyName } = useCompanyName();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [orderItems, setOrderItems] = useState([
    { material_name: '', quantity: '', unit: '', unit_price: '' },
  ]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const result = await response.json();
      if (result.success || result.code === 200) {
        setCustomers(result.data?.list || result.data || []);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/inventory/materials');
      const result = await response.json();
      if (result.success || result.code === 200) {
        setMaterials(result.data?.list || result.data || []);
      }
    } catch (error) {
      console.error('获取物料列表失败:', error);
    }
  };

  const fetchOrders = useCallback(async (keyword?: string, status?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      const st = status ?? statusFilter;
      if (st && st !== 'all') params.append('status', st);
      const response = await fetch(`/api/orders?${params}`);
      const result = await response.json();
      if (result.success) {
        const orderList = result.data?.list || [];
        setOrders(orderList);
      } else {
        toast.error(result.message || '获取订单列表失败');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      toast.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchMaterials();
  }, []);

  const debouncedSearchKeyword = useDebounce(searchKeyword, 300);

  useEffect(() => {
    fetchOrders(debouncedSearchKeyword, statusFilter);
  }, [debouncedSearchKeyword, statusFilter, fetchOrders]);

  const handleSort = (field: SortField) => {
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    if (sortOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    if (sortField && sortOrder) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        if (sortField === 'total_amount') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else if (sortField === 'status') {
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
    }

    return filtered;
  }, [orders, sortField, sortOrder]);

  const toggleRowExpand = (orderId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedOrders(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { material_name: '', quantity: '', unit: '', unit_price: '' }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsViewOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsEditOpen(true);
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (confirm('确定要删除该订单吗？')) {
      try {
        const response = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          toast.success('订单删除成功');
          fetchOrders();
        } else {
          toast.error(result.message || '删除失败');
        }
      } catch (error) {
        toast.error('删除失败');
      }
    }
  };

  const handleConfirmOrder = async (orderId: number) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: 2 }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('订单已确认');
        fetchOrders();
      } else {
        toast.error(result.message || '确认失败');
      }
    } catch (error) {
      toast.error('确认失败');
    }
  };

  const handleBatchConfirm = async () => {
    if (!selectedOrders.length) {
      toast.warning('请先选择订单');
      return;
    }
    const pendingOrders = filteredOrders.filter(o => selectedOrders.includes(o.id) && o.status === 1);
    if (pendingOrders.length === 0) {
      toast.warning('选中的订单中没有待确认状态的订单');
      return;
    }
    if (!confirm(`确定要确认选中的 ${pendingOrders.length} 个订单吗？`)) return;

    try {
      let successCount = 0;
      for (const order of pendingOrders) {
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: order.id, status: 2 }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      }
      if (successCount > 0) {
        toast.success(`成功确认 ${successCount} 个订单`);
        fetchOrders();
      } else {
        toast.error('确认失败');
      }
    } catch (error) {
      toast.error('确认失败');
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedOrders.length) return;
    if (!confirm(`确定要删除选中的 ${selectedOrders.length} 个订单吗？`)) return;

    try {
      setLoading(true);
      let successCount = 0;
      for (const orderId of selectedOrders) {
        const res = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) successCount++;
      }
      if (successCount > 0) {
        toast.success(`成功删除 ${successCount} 个订单`);
        fetchOrders();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkOrder = async (order: Order) => {
    if (String(order.status) === '5') {
      toast.error('已取消的订单不能生成工单');
      return;
    }
    if (String(order.status) === '4') {
      toast.error('已完成的订单不能生成工单');
      return;
    }
    if (!order.items || order.items.length === 0) {
      toast.error('订单没有明细，无法生成工单');
      return;
    }
    if (!confirm(`确认为订单 ${order.order_no} 生成工单？`)) return;

    try {
      const response = await fetch('/api/workorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          order_no: order.order_no,
          customer_name: order.customer_name,
          items: order.items.map(item => ({
            material_name: item.material_name,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
          })),
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || `已为订单 ${order.order_no} 生成工单`);
        fetchOrders();
      } else {
        toast.error(result.message || '生成工单失败');
      }
    } catch (error) {
      toast.error('生成工单失败，请检查网络连接');
    }
  };

  const handleExport = (format: string) => {
    const dataToExport = selectedOrders.length > 0
      ? filteredOrders.filter(o => selectedOrders.includes(o.id))
      : filteredOrders;

    if (dataToExport.length === 0) {
      toast.warning('没有可导出的订单');
      return;
    }

    const statusLabels: Record<number, string> = {
      1: '待确认', 2: '已确认', 3: '部分发货', 4: '已完成', 5: '已取消'
    };

    if (format === 'excel') {
      const headers = ['订单号', '客户', '订单日期', '交货日期', '金额', '状态', '产品明细'];
      const rows = dataToExport.map(o => {
        const itemsStr = o.items?.map(i => `${i.material_name} x${i.quantity}${i.unit}`).join('; ') || '';
        return [
          o.order_no,
          o.customer_name || '-',
          formatDate(o.order_date),
          formatDate(o.delivery_date),
          Number(o.total_amount || 0).toFixed(2),
          statusLabels[o.status] || `未知(${o.status})`,
          itemsStr,
        ];
      });
      const csvContent = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t'))
      ].join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `销售订单_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('已导出为 Excel 文件');
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('无法打开打印窗口');
        return;
      }
      const tableRows = dataToExport.map(o => {
        const itemsStr = o.items?.map(i => `${i.material_name} x${i.quantity}${i.unit}`).join('<br>') || '-';
        return `<tr>
          <td>${o.order_no}</td>
          <td>${o.customer_name || '-'}</td>
          <td>${formatDate(o.order_date)}</td>
          <td>${formatDate(o.delivery_date)}</td>
          <td style="text-align:right">¥${Number(o.total_amount || 0).toLocaleString()}</td>
          <td>${statusLabels[o.status] || '未知'}</td>
          <td>${itemsStr}</td>
        </tr>`;
      }).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>销售订单列表</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; }
          .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #999; padding: 5px 6px; text-align: center; }
          th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
          .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style></head>
        <body>
          <h1>销售订单列表</h1>
          <div class="info">导出时间：${new Date().toLocaleString('zh-CN')} | 共 ${dataToExport.length} 条记录</div>
          <table>
            <thead><tr><th>订单号</th><th>客户</th><th>订单日期</th><th>交货日期</th><th>金额</th><th>状态</th><th>产品明细</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">${companyName}</div>
          <script>window.onload=function(){window.print();}</script>
        </body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success('已导出为 PDF（打印保存）');
    } else if (format === 'word') {
      const tableRows = dataToExport.map(o => {
        const itemsStr = o.items?.map(i => `${i.material_name} x${i.quantity}${i.unit}`).join('<br>') || '-';
        return `<tr>
          <td style="border:1px solid #333;padding:6px">${o.order_no}</td>
          <td style="border:1px solid #333;padding:6px">${o.customer_name || '-'}</td>
          <td style="border:1px solid #333;padding:6px">${formatDate(o.order_date)}</td>
          <td style="border:1px solid #333;padding:6px">${formatDate(o.delivery_date)}</td>
          <td style="border:1px solid #333;padding:6px;text-align:right">¥${Number(o.total_amount || 0).toLocaleString()}</td>
          <td style="border:1px solid #333;padding:6px">${statusLabels[o.status] || '未知'}</td>
          <td style="border:1px solid #333;padding:6px">${itemsStr}</td>
        </tr>`;
      }).join('');
      const thCells = ['订单号', '客户', '订单日期', '交货日期', '金额', '状态', '产品明细']
        .map(h => `<th style="border:1px solid #333;padding:6px;background:#f0f0f0">${h}</th>`).join('');
      const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>销售订单</title></head>
        <body style="font-family:'Microsoft YaHei',sans-serif;padding:20px">
          <h1 style="text-align:center">销售订单列表</h1>
          <p style="text-align:center;color:#666;font-size:12px">导出时间：${new Date().toLocaleString()}</p>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr>${thCells}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body></html>`;
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `销售订单_${new Date().toISOString().slice(0, 10)}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('已导出为 Word 文件');
    }
  };

  const handlePrintList = () => {
    const dataToPrint = selectedOrders.length > 0
      ? filteredOrders.filter(o => selectedOrders.includes(o.id))
      : filteredOrders;

    if (dataToPrint.length === 0) {
      toast.warning('没有数据可打印');
      return;
    }

    const statusLabels: Record<number, string> = {
      1: '待确认', 2: '已确认', 3: '部分发货', 4: '已完成', 5: '已取消'
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('无法打开打印窗口，请检查浏览器弹窗设置');
      return;
    }

    const rows = dataToPrint.map((o, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${o.order_no}</td>
        <td>${o.customer_name || '-'}</td>
        <td>${formatDate(o.order_date)}</td>
        <td>${formatDate(o.delivery_date)}</td>
        <td>¥${Number(o.total_amount || 0).toLocaleString()}</td>
        <td>${statusLabels[o.status] || '未知'}</td>
        <td>${o.remark || ''}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>销售订单打印</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; font-size: 20px; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>销售订单列表</h1>
        <div class="info">打印时间：${new Date().toLocaleString('zh-CN')} | 共 ${dataToPrint.length} 条记录</div>
        <table>
          <thead><tr><th>序号</th><th>订单号</th><th>客户</th><th>订单日期</th><th>交货日期</th><th>金额</th><th>状态</th><th>备注</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(`正在打印 ${dataToPrint.length} 条销售订单`);
  };

  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      toast.warning('请选择客户');
      return;
    }

    const deliveryDate = (document.getElementById('deliveryDate') as HTMLInputElement)?.value;
    if (!deliveryDate) {
      toast.warning('请选择交货日期');
      return;
    }

    const validItems = orderItems.filter(item => item.material_name && item.quantity && item.unit_price);
    if (validItems.length === 0) {
      toast.warning('请至少添加一个有效的订单明细');
      return;
    }

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      if (parseFloat(item.quantity) <= 0) {
        toast.warning(`第${i + 1}行订单数量必须大于0`);
        return;
      }
      if (parseFloat(item.unit_price) < 0) {
        toast.warning(`第${i + 1}行单价不能为负数`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: parseInt(selectedCustomer),
          delivery_date: deliveryDate,
          items: validItems.map(item => ({
            material_name: item.material_name,
            quantity: parseFloat(item.quantity),
            unit: item.unit || '个',
            unit_price: parseFloat(item.unit_price),
          })),
          remark: (document.getElementById('remark') as HTMLInputElement)?.value,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('订单提交成功');
        setIsCreateOpen(false);
        fetchOrders();
        setOrderItems([{ material_name: '', quantity: '', unit: '', unit_price: '' }]);
        setSelectedCustomer('');
      } else {
        toast.error(result.message || '提交失败');
      }
    } catch (error) {
      console.error('提交订单失败:', error);
      toast.error('提交失败，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: parseInt(selectedCustomer) || null,
          delivery_date: (document.getElementById('deliveryDate') as HTMLInputElement)?.value,
          items: orderItems.map(item => ({
            material_name: item.material_name,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit || '个',
            unit_price: parseFloat(item.unit_price) || 0,
          })),
          remark: (document.getElementById('remark') as HTMLInputElement)?.value,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('草稿保存成功');
        setIsCreateOpen(false);
        fetchOrders();
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOrder.id,
          delivery_date: (document.getElementById('editDeliveryDate') as HTMLInputElement)?.value,
          remark: (document.getElementById('editRemark') as HTMLInputElement)?.value,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('订单更新成功');
        setIsEditOpen(false);
        fetchOrders();
      } else {
        toast.error(result.message || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    }
  };

  return (
    <MainLayout title="销售订单">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder="搜索订单号、客户..."
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                  onSearch={(kw) => fetchOrders(kw)}
                  className="flex-1 max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="订单状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="1">待确认</SelectItem>
                    <SelectItem value="2">已确认</SelectItem>
                    <SelectItem value="3">部分发货</SelectItem>
                    <SelectItem value="4">已完成</SelectItem>
                    <SelectItem value="5">已取消</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => { setStatusFilter('all'); setSearchKeyword(''); }}>
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => fetchOrders()}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                {selectedOrders.length > 0 && (
                  <Button variant="default" onClick={handleBatchConfirm}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    确认({filteredOrders.filter(o => selectedOrders.includes(o.id) && o.status === 1).length})
                  </Button>
                )}
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
                    <DropdownMenuItem onClick={() => handleExport('excel')}>
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
                      新建订单
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" resizable>
                    <DialogHeader>
                      <DialogTitle>新建销售订单</DialogTitle>
                      <DialogDescription>填写订单信息，带 * 为必填项</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer">客户 *</Label>
                          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择客户" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.customer_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliveryDate">交货日期 *</Label>
                          <Input type="date" id="deliveryDate" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>订单明细</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                            <Plus className="h-4 w-4 mr-1" />
                            添加明细
                          </Button>
                        </div>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>产品</TableHead>
                                <TableHead className="w-[120px]">数量</TableHead>
                                <TableHead className="w-[80px]">单位</TableHead>
                                <TableHead className="w-[120px]">单价</TableHead>
                                <TableHead className="w-[120px]">金额</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Select onValueChange={(value) => {
                                      const material = materials.find(m => String(m.id) === value);
                                      const newItems = [...orderItems];
                                      newItems[index].material_name = material?.material_name || '';
                                      newItems[index].unit_price = material?.sale_price?.toString() || '';
                                      newItems[index].unit = material?.unit || '';
                                      setOrderItems(newItems);
                                    }}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="选择产品" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {materials.filter(m => m.material_type === 3).map((m) => (
                                          <SelectItem key={m.id} value={String(m.id)}>
                                            {m.material_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newItems = [...orderItems];
                                        newItems[index].quantity = e.target.value;
                                        setOrderItems(newItems);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="单位"
                                      value={item.unit}
                                      onChange={(e) => {
                                        const newItems = [...orderItems];
                                        newItems[index].unit = e.target.value;
                                        setOrderItems(newItems);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      value={item.unit_price}
                                      onChange={(e) => {
                                        const newItems = [...orderItems];
                                        newItems[index].unit_price = e.target.value;
                                        setOrderItems(newItems);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-medium">
                                      {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeOrderItem(index)}
                                      disabled={orderItems.length === 1}
                                    >
                                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="remark">备注</Label>
                        <Input id="remark" placeholder="订单备注信息..." />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
                      <Button variant="outline" onClick={handleSaveDraft}>保存草稿</Button>
                      <Button onClick={handleSubmitOrder} disabled={submitting}>
                        {submitting ? '提交中...' : '提交订单'}
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
            <CardTitle>订单列表</CardTitle>
            <CardDescription>共 {filteredOrders.length} 条订单记录{statusFilter !== 'all' && ' (已筛选)'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{orders.length === 0 ? '暂无订单数据' : '没有符合条件的订单'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('order_no')}>
                      <span className="inline-flex items-center">订单号{getSortIcon('order_no')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('customer_name')}>
                      <span className="inline-flex items-center">客户{getSortIcon('customer_name')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('order_date')}>
                      <span className="inline-flex items-center">订单日期{getSortIcon('order_date')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('delivery_date')}>
                      <span className="inline-flex items-center">交货日期{getSortIcon('delivery_date')}</span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('total_amount')}>
                      <span className="inline-flex items-center justify-end">金额{getSortIcon('total_amount')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('status')}>
                      <span className="inline-flex items-center">状态{getSortIcon('status')}</span>
                    </TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedRows.has(order.id);
                    const lines = order.items || [];
                    return (
                      <React.Fragment key={order.id}>
                        <TableRow className="hover:bg-muted/50">
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
                              onClick={() => toggleRowExpand(order.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono">{order.order_no}</TableCell>
                          <TableCell>{order.customer_name || '-'}</TableCell>
                          <TableCell>{formatDate(order.order_date)}</TableCell>
                          <TableCell>{formatDate(order.delivery_date)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ¥{Number(order.total_amount || 0).toLocaleString()}
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
                                <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                {order.status === 1 && (
                                  <DropdownMenuItem onClick={() => handleConfirmOrder(order.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    确认订单
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerateWorkOrder(order)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  生成工单
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteOrder(order.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${order.id}-detail`}>
                            <TableCell colSpan={9} className="p-0">
                              <div className="bg-slate-50 border-t">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-100/50 hover:bg-slate-100/50">
                                      <TableHead className="pl-8 text-xs font-normal text-muted-foreground">产品名称</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">数量</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">单位</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">单价</TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">金额</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {lines.length > 0 ? lines.map((item, idx) => (
                                      <TableRow key={idx} className="bg-transparent hover:bg-white/60">
                                        <TableCell className="pl-8 text-sm">{item.material_name || '-'}</TableCell>
                                        <TableCell className="text-sm text-right">{item.quantity ?? 0}</TableCell>
                                        <TableCell className="text-sm">{item.unit || '-'}</TableCell>
                                        <TableCell className="text-sm text-right">{Number(item.unit_price || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-sm text-right font-medium">
                                          {Number(item.total_price || (item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    )) : (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center py-3 text-muted-foreground text-sm">
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
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>订单详情</DialogTitle>
              <DialogDescription>订单号: {selectedOrder?.order_no}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">客户</Label>
                  <p className="font-medium">{selectedOrder?.customer_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <p>{selectedOrder && getStatusBadge(selectedOrder.status)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">订单日期</Label>
                  <p className="font-medium">{formatDate(selectedOrder?.order_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">交货日期</Label>
                  <p className="font-medium">{formatDate(selectedOrder?.delivery_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">订单金额</Label>
                  <p className="font-medium text-lg">¥{Number(selectedOrder?.total_amount || 0).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">订单明细</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>产品</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>单位</TableHead>
                      <TableHead>单价</TableHead>
                      <TableHead>金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder?.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.material_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>¥{Number(item.unit_price || 0).toFixed(2)}</TableCell>
                        <TableCell>¥{Number(item.total_price || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedOrder?.remark && (
                <div>
                  <Label className="text-muted-foreground">备注</Label>
                  <p className="text-sm">{selectedOrder.remark}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsViewOpen(false)}>关闭</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>编辑订单</DialogTitle>
              <DialogDescription>订单号: {selectedOrder?.order_no}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>客户</Label>
                  <Input value={selectedOrder?.customer_name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDeliveryDate">交货日期</Label>
                  <Input type="date" id="editDeliveryDate" defaultValue={selectedOrder?.delivery_date ? new Date(selectedOrder.delivery_date).toISOString().split('T')[0] : ''} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>订单明细</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>产品</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>单位</TableHead>
                      <TableHead>单价</TableHead>
                      <TableHead>金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder?.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.material_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>¥{Number(item.unit_price || 0).toFixed(2)}</TableCell>
                        <TableCell>¥{Number(item.total_price || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRemark">备注</Label>
                <Input id="editRemark" defaultValue={selectedOrder?.remark || ''} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>取消</Button>
              <Button onClick={handleSaveEdit}>保存</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
