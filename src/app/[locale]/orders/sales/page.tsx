'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
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
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';

type SortField =
  | 'order_no'
  | 'customer_name'
  | 'order_date'
  | 'delivery_date'
  | 'total_amount'
  | 'status';
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

const STATUS_MAP: Record<number, { labelKey: string; className: string }> = {
  1: {
    labelKey: 'statusPending',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  },
  2: {
    labelKey: 'statusConfirmed',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  3: {
    labelKey: 'statusPartialShip',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  4: {
    labelKey: 'statusCompleted',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  5: {
    labelKey: 'statusCancelled',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
};

const getStatusBadge = (status: number, t: (key: string) => string) => {
  const config = STATUS_MAP[status] || {
    labelKey: 'unknown',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  };
  return <Badge className={config.className}>{t(config.labelKey)}</Badge>;
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('zh-CN');
  } catch {
    return dateStr;
  }
};

export default function SalesOrdersPage() {
  const t = useTranslations('Orders');
  const tc = useTranslations('Common');
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
      const response = await authFetch('/api/customers');
      const result = await response.json();
      if (result.success || result.code === 200) {
        setCustomers(result.data?.list || result.data || []);
      }
    } catch {}
  };

  const fetchMaterials = async () => {
    try {
      const response = await authFetch('/api/inventory/materials');
      const result = await response.json();
      if (result.success || result.code === 200) {
        setMaterials(result.data?.list || result.data || []);
      }
    } catch {}
  };

  const fetchOrders = useCallback(
    async (keyword?: string, status?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        const st = status ?? statusFilter;
        if (st && st !== 'all') params.append('status', st);
        const response = await authFetch(`/api/orders?${params}`);
        const result = await response.json();
        if (result.success) {
          const orderList = result.data?.list || [];
          setOrders(orderList);
        } else {
          toast.error(result.message || t('fetchOrdersFailed'));
        }
      } catch {
        toast.error(t('fetchOrdersFailed'));
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, t]
  );

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

  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field || !sortOrder) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const handleSortKeyDown = (e: React.KeyboardEvent, field: SortField) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(field);
    }
  };

  const filteredOrders = useMemo(() => {
    const filtered = [...orders];

    if (sortField && sortOrder) {
      filtered.sort((a, b) => {
        let aVal: string | number = a[sortField];
        let bVal: string | number = b[sortField];

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
      setSelectedOrders(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
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
    if (confirm(t('confirmDelete'))) {
      try {
        const response = await authFetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          toast.success(t('deleteSuccess'));
          fetchOrders();
        } else {
          toast.error(result.message || t('deleteFailed'));
        }
      } catch {
        toast.error(t('deleteFailed'));
      }
    }
  };

  const handleConfirmOrder = async (orderId: number) => {
    try {
      const response = await authFetch('/api/orders', {
        method: 'PUT',
        body: JSON.stringify({ id: orderId, status: 2 }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('confirmSuccess'));
        fetchOrders();
      } else {
        toast.error(result.message || t('confirmFailed'));
      }
    } catch {
      toast.error(t('confirmFailed'));
    }
  };

  const handleBatchConfirm = async () => {
    if (!selectedOrders.length) {
      toast.warning(t('selectOrderFirst'));
      return;
    }
    const pendingOrders = filteredOrders.filter(
      (o) => selectedOrders.includes(o.id) && o.status === 1
    );
    if (pendingOrders.length === 0) {
      toast.warning(t('noPendingOrder'));
      return;
    }
    if (!confirm(t('confirmSelected', { count: pendingOrders.length }))) return;

    try {
      let successCount = 0;
      for (const order of pendingOrders) {
        const res = await authFetch('/api/orders', {
          method: 'PUT',
          body: JSON.stringify({ id: order.id, status: 2 }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      }
      if (successCount > 0) {
        toast.success(t('confirmSuccessCount', { count: successCount }));
        fetchOrders();
      } else {
        toast.error(t('confirmFailed'));
      }
    } catch {
      toast.error(t('confirmFailed'));
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedOrders.length) return;
    if (!confirm(t('confirmDeleteSelected', { count: selectedOrders.length }))) return;

    try {
      setLoading(true);
      let successCount = 0;
      for (const orderId of selectedOrders) {
        const res = await authFetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) successCount++;
      }
      if (successCount > 0) {
        toast.success(t('deleteSuccessCount', { count: successCount }));
        fetchOrders();
      } else {
        toast.error(t('deleteFailed'));
      }
    } catch {
      toast.error(t('deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkOrder = async (order: Order) => {
    if (String(order.status) === '5') {
      toast.error(t('cancelledCannotGenerate'));
      return;
    }
    if (String(order.status) === '4') {
      toast.error(t('completedCannotGenerate'));
      return;
    }
    if (!order.items || order.items.length === 0) {
      toast.error(t('noItemsCannotGenerate'));
      return;
    }
    if (!confirm(t('confirmGenerateWorkOrder', { orderNo: order.order_no }))) return;

    try {
      const response = await authFetch('/api/workorders', {
        method: 'POST',
        body: JSON.stringify({
          order_id: order.id,
          order_no: order.order_no,
          customer_name: order.customer_name,
          items: order.items.map((item) => ({
            material_name: item.material_name,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
          })),
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || t('generateWorkOrderSuccess', { orderNo: order.order_no }));
        fetchOrders();
      } else {
        toast.error(result.message || t('generateWorkOrderFailed'));
      }
    } catch {
      toast.error(t('networkError'));
    }
  };

  const handleExport = (format: string) => {
    const dataToExport =
      selectedOrders.length > 0
        ? filteredOrders.filter((o) => selectedOrders.includes(o.id))
        : filteredOrders;

    if (dataToExport.length === 0) {
      toast.warning(t('noExportData'));
      return;
    }

    const statusLabels: Record<number, string> = {
      1: t('statusPending'),
      2: t('statusConfirmed'),
      3: t('statusPartialShip'),
      4: t('statusCompleted'),
      5: t('statusCancelled'),
    };

    if (format === 'excel') {
      const headers = [
        t('orderNo'),
        t('customer'),
        t('orderDate'),
        t('deliveryDate'),
        t('amount'),
        tc('status'),
        t('productDetail'),
      ];
      const rows = dataToExport.map((o) => {
        const itemsStr =
          o.items?.map((i) => `${i.material_name} x${i.quantity}${i.unit}`).join('; ') || '';
        return [
          o.order_no,
          o.customer_name || '-',
          formatDate(o.order_date),
          formatDate(o.delivery_date),
          Number(o.total_amount || 0).toFixed(2),
          statusLabels[o.status] || `${t('unknown')}(${o.status})`,
          itemsStr,
        ];
      });
      const csvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t('salesOrderTitle')}_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('exportSuccess'));
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error(t('cannotOpenPrintWindow'));
        return;
      }
      const tableRows = dataToExport
        .map((o) => {
          const itemsStr =
            o.items?.map((i) => `${i.material_name} x${i.quantity}${i.unit}`).join('<br>') || '-';
          return `<tr>
          <td>${o.order_no}</td>
          <td>${o.customer_name || '-'}</td>
          <td>${formatDate(o.order_date)}</td>
          <td>${formatDate(o.delivery_date)}</td>
          <td style="text-align:right">¥${Number(o.total_amount || 0).toLocaleString()}</td>
          <td>${statusLabels[o.status] || t('unknown')}</td>
          <td>${itemsStr}</td>
        </tr>`;
        })
        .join('');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('orderList')}</title>
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
          <h1>${t('orderList')}</h1>
          <div class="info">${t('exportTime')}：${new Date().toLocaleString('zh-CN')} | ${tc('total', { count: dataToExport.length })}</div>
          <table>
            <thead><tr><th>${t('orderNo')}</th><th>${t('customer')}</th><th>${t('orderDate')}</th><th>${t('deliveryDate')}</th><th>${t('amount')}</th><th>${tc('status')}</th><th>${t('productDetail')}</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">${companyName}</div>
          <script>window.onload=function(){window.print();}</script>
        </body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success(t('exportPdfSuccess'));
    } else if (format === 'word') {
      const tableRows = dataToExport
        .map((o) => {
          const itemsStr =
            o.items?.map((i) => `${i.material_name} x${i.quantity}${i.unit}`).join('<br>') || '-';
          return `<tr>
          <td style="border:1px solid #333;padding:6px">${o.order_no}</td>
          <td style="border:1px solid #333;padding:6px">${o.customer_name || '-'}</td>
          <td style="border:1px solid #333;padding:6px">${formatDate(o.order_date)}</td>
          <td style="border:1px solid #333;padding:6px">${formatDate(o.delivery_date)}</td>
          <td style="border:1px solid #333;padding:6px;text-align:right">¥${Number(o.total_amount || 0).toLocaleString()}</td>
          <td style="border:1px solid #333;padding:6px">${statusLabels[o.status] || t('unknown')}</td>
          <td style="border:1px solid #333;padding:6px">${itemsStr}</td>
        </tr>`;
        })
        .join('');
      const thCells = [
        t('orderNo'),
        t('customer'),
        t('orderDate'),
        t('deliveryDate'),
        t('amount'),
        tc('status'),
        t('productDetail'),
      ]
        .map((h) => `<th style="border:1px solid #333;padding:6px;background:#f0f0f0">${h}</th>`)
        .join('');
      const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>${t('salesOrderTitle')}</title></head>
        <body style="font-family:'Microsoft YaHei',sans-serif;padding:20px">
          <h1 style="text-align:center">${t('orderList')}</h1>
          <p style="text-align:center;color:#666;font-size:12px">${t('exportTime')}：${new Date().toLocaleString()}</p>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr>${thCells}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body></html>`;
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t('salesOrderTitle')}_${new Date().toISOString().slice(0, 10)}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('exportWordSuccess'));
    }
  };

  const handlePrintList = () => {
    const dataToPrint =
      selectedOrders.length > 0
        ? filteredOrders.filter((o) => selectedOrders.includes(o.id))
        : filteredOrders;

    if (dataToPrint.length === 0) {
      toast.warning(t('noPrintData'));
      return;
    }

    const statusLabels: Record<number, string> = {
      1: t('statusPending'),
      2: t('statusConfirmed'),
      3: t('statusPartialShip'),
      4: t('statusCompleted'),
      5: t('statusCancelled'),
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('checkPopupSettings'));
      return;
    }

    const rows = dataToPrint
      .map(
        (o, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${o.order_no}</td>
        <td>${o.customer_name || '-'}</td>
        <td>${formatDate(o.order_date)}</td>
        <td>${formatDate(o.delivery_date)}</td>
        <td>¥${Number(o.total_amount || 0).toLocaleString()}</td>
        <td>${statusLabels[o.status] || t('unknown')}</td>
        <td>${o.remark || ''}</td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('salesOrderTitle')}${tc('print')}</title>
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
        <h1>${t('orderList')}</h1>
        <div class="info">${t('printTime')}：${new Date().toLocaleString('zh-CN')} | ${tc('total', { count: dataToPrint.length })}</div>
        <table>
          <thead><tr><th>${t('sequence')}</th><th>${t('orderNo')}</th><th>${t('customer')}</th><th>${t('orderDate')}</th><th>${t('deliveryDate')}</th><th>${t('amount')}</th><th>${tc('status')}</th><th>${t('remarkCol')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(t('printSuccess', { count: dataToPrint.length }));
  };

  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      toast.warning(t('selectCustomerWarning'));
      return;
    }

    const deliveryDate = (document.getElementById('deliveryDate') as HTMLInputElement)?.value;
    if (!deliveryDate) {
      toast.warning(t('selectDeliveryDateWarning'));
      return;
    }

    const validItems = orderItems.filter(
      (item) => item.material_name && item.quantity && item.unit_price
    );
    if (validItems.length === 0) {
      toast.warning(t('addValidItemWarning'));
      return;
    }

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      if (parseFloat(item.quantity) <= 0) {
        toast.warning(t('quantityMustBePositive', { row: i + 1 }));
        return;
      }
      if (parseFloat(item.unit_price) < 0) {
        toast.warning(t('priceCannotBeNegative', { row: i + 1 }));
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: parseInt(selectedCustomer),
          delivery_date: deliveryDate,
          items: validItems.map((item) => ({
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
        toast.success(t('submitSuccess'));
        setIsCreateOpen(false);
        fetchOrders();
        setOrderItems([{ material_name: '', quantity: '', unit: '', unit_price: '' }]);
        setSelectedCustomer('');
      } else {
        toast.error(result.message || t('submitFailed'));
      }
    } catch {
      toast.error(t('submitNetworkError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const response = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: parseInt(selectedCustomer) || null,
          delivery_date: (document.getElementById('deliveryDate') as HTMLInputElement)?.value,
          items: orderItems.map((item) => ({
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
        toast.success(t('draftSaveSuccess'));
        setIsCreateOpen(false);
        fetchOrders();
      } else {
        toast.error(result.message || t('saveFailed'));
      }
    } catch {
      toast.error(t('saveFailed'));
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    try {
      const response = await authFetch('/api/orders', {
        method: 'PUT',
        body: JSON.stringify({
          id: selectedOrder.id,
          delivery_date: (document.getElementById('editDeliveryDate') as HTMLInputElement)?.value,
          remark: (document.getElementById('editRemark') as HTMLInputElement)?.value,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('updateSuccess'));
        setIsEditOpen(false);
        fetchOrders();
      } else {
        toast.error(result.message || t('updateFailed'));
      }
    } catch {
      toast.error(t('updateFailed'));
    }
  };

  return (
    <MainLayout title={t('salesOrderTitle')}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder={t('searchPlaceholder')}
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                  onSearch={(kw) => fetchOrders(kw)}
                  className="flex-1 max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('orderStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    <SelectItem value="1">{t('statusPending')}</SelectItem>
                    <SelectItem value="2">{t('statusConfirmed')}</SelectItem>
                    <SelectItem value="3">{t('statusPartialShip')}</SelectItem>
                    <SelectItem value="4">{t('statusCompleted')}</SelectItem>
                    <SelectItem value="5">{t('statusCancelled')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchKeyword('');
                  }}
                >
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
                    {tc('confirm')}(
                    {
                      filteredOrders.filter((o) => selectedOrders.includes(o.id) && o.status === 1)
                        .length
                    }
                    )
                  </Button>
                )}
                <Button variant="outline" onClick={handlePrintList}>
                  <Printer className="h-4 w-4 mr-2" />
                  {tc('print')}
                  {selectedOrders.length > 0 ? `(${selectedOrders.length})` : ''}
                </Button>
                {selectedOrders.length > 0 && (
                  <Button variant="destructive" onClick={handleBatchDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tc('delete')}({selectedOrders.length})
                  </Button>
                )}
                <GlobalExportToolbar
                  filename="销售订单"
                  title="销售订单列表"
                  landscape
                  columns={[
                    { key: 'order_no', label: t('orderNo'), width: 18 },
                    { key: 'customer_name', label: t('customer'), width: 20 },
                    {
                      key: 'order_date',
                      label: t('orderDate'),
                      width: 12,
                      formatter: (v) => formatDate(v),
                    },
                    {
                      key: 'delivery_date',
                      label: t('deliveryDate'),
                      width: 12,
                      formatter: (v) => formatDate(v),
                    },
                    {
                      key: 'total_amount',
                      label: t('amount'),
                      width: 12,
                      formatter: (v) => Number(v || 0).toFixed(2),
                    },
                    {
                      key: 'status',
                      label: tc('status'),
                      width: 10,
                      formatter: (v) => {
                        const m: Record<number, string> = {
                          1: t('statusPending'),
                          2: t('statusConfirmed'),
                          3: t('statusPartialShip'),
                          4: t('statusCompleted'),
                          5: t('statusCancelled'),
                        };
                        return m[v] || `${t('unknown')}(${v})`;
                      },
                    },
                    {
                      key: 'items',
                      label: t('productDetail'),
                      width: 30,
                      formatter: (_v, row) =>
                        row.items
                          ?.map((i: any) => `${i.material_name} x${i.quantity}${i.unit}`)
                          .join('; ') || '-',
                    },
                  ]}
                  data={
                    selectedOrders.length > 0
                      ? filteredOrders.filter((o) => selectedOrders.includes(o.id))
                      : filteredOrders
                  }
                />
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('newOrder')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" resizable>
                    <DialogHeader>
                      <DialogTitle>{t('newSalesOrder')}</DialogTitle>
                      <DialogDescription>{t('fillOrderInfo')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer">{t('customer')} *</Label>
                          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectCustomer')} />
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
                          <Label htmlFor="deliveryDate">{t('deliveryDate')} *</Label>
                          <Input type="date" id="deliveryDate" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>{t('orderItems')}</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                            <Plus className="h-4 w-4 mr-1" />
                            {t('addDetail')}
                          </Button>
                        </div>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('product')}</TableHead>
                                <TableHead className="w-[120px]">{t('quantity')}</TableHead>
                                <TableHead className="w-[80px]">{t('unit')}</TableHead>
                                <TableHead className="w-[120px]">{t('unitPrice')}</TableHead>
                                <TableHead className="w-[120px]">{t('amount')}</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Select
                                      onValueChange={(value) => {
                                        const material = materials.find(
                                          (m) => String(m.id) === value
                                        );
                                        const newItems = [...orderItems];
                                        newItems[index].material_name =
                                          material?.material_name || '';
                                        newItems[index].unit_price =
                                          material?.sale_price?.toString() || '';
                                        newItems[index].unit = material?.unit || '';
                                        setOrderItems(newItems);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('selectProduct')} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {materials
                                          .filter((m) => m.material_type === 3)
                                          .map((m) => (
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
                                      placeholder={t('unit')}
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
                                      {(
                                        (parseFloat(item.quantity) || 0) *
                                        (parseFloat(item.unit_price) || 0)
                                      ).toFixed(2)}
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
                        <Label htmlFor="remark">{tc('remark')}</Label>
                        <Input id="remark" placeholder={t('orderRemark')} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        {tc('cancel')}
                      </Button>
                      <Button variant="outline" onClick={handleSaveDraft}>
                        {t('saveDraft')}
                      </Button>
                      <Button onClick={handleSubmitOrder} disabled={submitting}>
                        {submitting ? t('submitting') : t('submitOrder')}
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
            <CardTitle>{t('orderList')}</CardTitle>
            <CardDescription>
              {tc('total', { count: filteredOrders.length })}
              {statusFilter !== 'all' ? ` (${t('filtered')})` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{orders.length === 0 ? t('noOrderData') : t('noMatchingOrder')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredOrders.length > 0 &&
                          selectedOrders.length === filteredOrders.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('order_no')}
                      onClick={() => handleSort('order_no')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'order_no')}
                    >
                      <span className="inline-flex items-center">
                        {t('orderNo')}
                        {getSortIcon('order_no')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('customer_name')}
                      onClick={() => handleSort('customer_name')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'customer_name')}
                    >
                      <span className="inline-flex items-center">
                        {t('customer')}
                        {getSortIcon('customer_name')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('order_date')}
                      onClick={() => handleSort('order_date')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'order_date')}
                    >
                      <span className="inline-flex items-center">
                        {t('orderDate')}
                        {getSortIcon('order_date')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('delivery_date')}
                      onClick={() => handleSort('delivery_date')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'delivery_date')}
                    >
                      <span className="inline-flex items-center">
                        {t('deliveryDate')}
                        {getSortIcon('delivery_date')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('total_amount')}
                      onClick={() => handleSort('total_amount')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'total_amount')}
                    >
                      <span className="inline-flex items-center justify-end">
                        {t('amount')}
                        {getSortIcon('total_amount')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('status')}
                      onClick={() => handleSort('status')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'status')}
                    >
                      <span className="inline-flex items-center">
                        {tc('status')}
                        {getSortIcon('status')}
                      </span>
                    </TableHead>
                    <TableHead className="text-right">{tc('operation')}</TableHead>
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
                          <TableCell>{getStatusBadge(order.status, t)}</TableCell>
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
                                  {t('viewDetail')}
                                </DropdownMenuItem>
                                {order.status === 1 && (
                                  <DropdownMenuItem onClick={() => handleConfirmOrder(order.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {t('confirmOrder')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {tc('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerateWorkOrder(order)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  {t('generateWorkOrder')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteOrder(order.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {tc('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${order.id}-detail`}>
                            <TableCell colSpan={9} className="p-0">
                              <div className="bg-slate-50 dark:bg-gray-800 border-t">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 dark:bg-gray-700/30 dark:hover:bg-gray-700/50">
                                      <TableHead className="pl-8 text-xs font-normal text-muted-foreground">
                                        {t('productNameCol')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {t('quantity')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">
                                        {t('unit')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {t('unitPrice')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {t('amount')}
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {lines.length > 0 ? (
                                      lines.map((item, idx) => (
                                        <TableRow
                                          key={idx}
                                          className="bg-transparent hover:bg-white/60 dark:hover:bg-gray-700/30"
                                        >
                                          <TableCell className="pl-8 text-sm">
                                            {item.material_name || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm text-right">
                                            {item.quantity ?? 0}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {item.unit || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm text-right">
                                            {Number(item.unit_price || 0).toFixed(2)}
                                          </TableCell>
                                          <TableCell className="text-sm text-right font-medium">
                                            {Number(
                                              item.total_price ||
                                                (item.quantity || 0) * (item.unit_price || 0)
                                            ).toFixed(2)}
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell
                                          colSpan={5}
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
              <DialogTitle>{t('orderDetail')}</DialogTitle>
              <DialogDescription>
                {t('orderNo')}: {selectedOrder?.order_no}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('customer')}</Label>
                  <p className="font-medium">{selectedOrder?.customer_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{tc('status')}</Label>
                  <p>{selectedOrder && getStatusBadge(selectedOrder.status, t)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('orderDate')}</Label>
                  <p className="font-medium">{formatDate(selectedOrder?.order_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('deliveryDate')}</Label>
                  <p className="font-medium">{formatDate(selectedOrder?.delivery_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('orderAmount')}</Label>
                  <p className="font-medium text-lg">
                    ¥{Number(selectedOrder?.total_amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('orderItems')}</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>{t('quantity')}</TableHead>
                      <TableHead>{t('unit')}</TableHead>
                      <TableHead>{t('unitPrice')}</TableHead>
                      <TableHead>{t('amount')}</TableHead>
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
                  <Label className="text-muted-foreground">{tc('remark')}</Label>
                  <p className="text-sm">{selectedOrder.remark}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsViewOpen(false)}>{tc('close')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{t('editOrder')}</DialogTitle>
              <DialogDescription>
                {t('orderNo')}: {selectedOrder?.order_no}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('customer')}</Label>
                  <Input value={selectedOrder?.customer_name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDeliveryDate">{t('deliveryDate')}</Label>
                  <Input
                    type="date"
                    id="editDeliveryDate"
                    defaultValue={
                      selectedOrder?.delivery_date
                        ? new Date(selectedOrder.delivery_date).toISOString().split('T')[0]
                        : ''
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('orderItems')}</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>{t('quantity')}</TableHead>
                      <TableHead>{t('unit')}</TableHead>
                      <TableHead>{t('unitPrice')}</TableHead>
                      <TableHead>{t('amount')}</TableHead>
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
                <Label htmlFor="editRemark">{tc('remark')}</Label>
                <Input id="editRemark" defaultValue={selectedOrder?.remark || ''} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSaveEdit}>{tc('save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
