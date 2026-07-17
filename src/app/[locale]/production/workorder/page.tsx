'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { SearchInput } from '@/components/ui/search-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Play,
  Factory,
  CheckCircle,
  Clock,
  Package,
  TrendingUp,
  Filter,
  Printer,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface WorkOrderItem {
  id: number;
  line_no: number;
  material_id: number;
  material_name: string;
  material_code: string;
  required_qty: number;
  unit: string;
  status: number;
}

interface WorkOrder {
  id: number;
  work_order_no: string;
  order_no: string;
  bom_id: number;
  customer_name: string;
  product_name: string;
  product_id: number;
  plan_quantity: number;
  unit: string;
  status: number;
  priority: number;
  plan_start_date: string;
  plan_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
  item_count?: number;
  items?: WorkOrderItem[];
  [key: string]: unknown;
}

interface SalesOrder {
  id: number;
  order_no: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  status: number;
}

interface BOMItem {
  id: number;
  bom_code: string;
  bom_no?: string;
  product_name: string;
  product_id?: number;
  version: string;
}

const getStatusConfig = (status: string, t: (key: string) => string) => {
  const configs: Record<string, { label: string; className: string }> = {
    pending: {
      label: t('status.pending'),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
    confirmed: {
      label: t('status.confirmed'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    producing: {
      label: t('status.producing'),
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    completed: {
      label: t('status.completed'),
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    cancelled: {
      label: t('status.cancelled'),
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
  };
  return (
    configs[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    }
  );
};

const getPriorityConfig = (priority: string, t: (key: string) => string) => {
  const configs: Record<string, { label: string; className: string }> = {
    urgent: {
      label: t('priority.urgent'),
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
    high: {
      label: t('priority.high'),
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    normal: {
      label: t('priority.normal'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    low: {
      label: t('priority.low'),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
  };
  return (
    configs[priority] || {
      label: priority,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    }
  );
};

export default function WorkOrderPage() {
  const t = useTranslations('Production');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const { toast } = useToast();

  const getStatusBadge = (status: number | string) => {
    const config = getStatusConfig(String(status), t);
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: number | string) => {
    const config = getPriorityConfig(String(priority), t);
    return <Badge className={config.className}>{config.label}</Badge>;
  };
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

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
  const sortedWorkOrders = useMemo(() => {
    if (!sortField || !sortOrder) return workOrders;
    return [...workOrders].sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sortField] ?? '').toLowerCase();
      const bVal = String((b as Record<string, unknown>)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [workOrders, sortField, sortOrder]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [bomList, setBomList] = useState<BOMItem[]>([]);
  const [newOrder, setNewOrder] = useState({
    order_no: '',
    bom_id: '',
    quantity: '',
    unit: '㎡',
    priority: 'normal',
    plan_start_date: '',
    plan_end_date: '',
    remark: '',
  });

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchQuery) params.append('order_no', searchQuery);
      params.append('page', '1');
      params.append('page_size', '100');

      const res = await authFetch(`/api/workorders?${params}`);
      const data = await res.json();

      if (data.success) {
        const list = data.data?.list || (Array.isArray(data.data) ? data.data : []);
        setWorkOrders(list);
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('fetchListFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('fetchListFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, toast]);

  const fetchSalesOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setSalesOrders(data.data?.list || (Array.isArray(data.data) ? data.data : []));
      }
    } catch {}
  }, []);

  const fetchBomList = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders/bom');
      const data = await res.json();
      if (data.success) {
        setBomList(data.data?.list || (Array.isArray(data.data) ? data.data : []));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    fetchSalesOrders();
    fetchBomList();
  }, [fetchSalesOrders, fetchBomList]);

  const handleViewDetail = async (order: WorkOrder) => {
    try {
      const res = await authFetch(`/api/workorders?id=${order.work_order_no}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        setSelectedOrder(order);
      }
    } catch {
      setSelectedOrder(order);
    }
    setIsDetailOpen(true);
  };

  const handleCreateOrder = async () => {
    try {
      const res = await authFetch('/api/workorders', {
        method: 'POST',
        body: JSON.stringify({
          order_no: newOrder.order_no,
          bom_id: parseInt(newOrder.bom_id) || null,
          quantity: parseFloat(newOrder.quantity) || 0,
          unit: newOrder.unit,
          priority: newOrder.priority,
          plan_start_date: newOrder.plan_start_date || null,
          plan_end_date: newOrder.plan_end_date || null,
          remark: newOrder.remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('success'), description: t('createSuccess') });
        setIsCreateOpen(false);
        setNewOrder({
          order_no: '',
          bom_id: '',
          quantity: '',
          unit: '㎡',
          priority: 'normal',
          plan_start_date: '',
          plan_end_date: '',
          remark: '',
        });
        fetchWorkOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('createFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('createFailed'), variant: 'destructive' });
    }
  };

  const handleStatusChange = async (order: WorkOrder, newStatus: string) => {
    try {
      const res = await authFetch('/api/workorders', {
        method: 'PUT',
        body: JSON.stringify({ id: order.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        const statusConfig = getStatusConfig(newStatus, t);
        toast({
          title: tc('success'),
          description: t('statusUpdatedTo', { status: statusConfig.label }),
        });
        fetchWorkOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('statusUpdateFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('statusUpdateFailed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (order: WorkOrder) => {
    if (!confirm(t('confirmDelete', { orderNo: order.work_order_no }))) return;
    try {
      const res = await authFetch(`/api/workorders?id=${order.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('success'), description: t('deleteSuccess') });
        fetchWorkOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('deleteFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('deleteFailed'), variant: 'destructive' });
    }
  };

  const stats = {
    total: workOrders.length,
    producing: workOrders.filter((o) => o.status === 2).length,
    completed: workOrders.filter((o) => o.status === 3).length,
    confirmed: workOrders.filter((o) => o.status === 1).length,
    pending: workOrders.filter((o) => o.status === 0).length,
    totalQty: workOrders.reduce((sum, o) => sum + (parseFloat(String(o.plan_quantity)) || 0), 0),
  };

  return (
    <MainLayout title={t('workOrder')}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalOrders')}</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('producing')}: {stats.producing} | {t('status.completed')}: {stats.completed}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('plannedQuantity')}</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQty.toLocaleString(locale)}</div>
              <p className="text-xs text-muted-foreground">
                {t('involvingProducts', { count: workOrders.filter((o) => o.product_name).length })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('producing')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.producing}</div>
              <p className="text-xs text-muted-foreground">{t('inProduction')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingSchedule')}</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending + stats.confirmed}</div>
              <p className="text-xs text-muted-foreground">
                {t('status.pending')}: {stats.pending} | {t('status.confirmed')}: {stats.confirmed}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={() => fetchWorkOrders()}
                  className="flex-1 max-w-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchWorkOrders()}>
                  <Filter className="h-4 w-4 mr-2" />
                  {tc('refresh')}
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('newWorkOrder')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl" resizable>
                    <DialogHeader>
                      <DialogTitle>{t('newWorkOrder')}</DialogTitle>
                      <DialogDescription>{t('createWorkOrderDesc')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('relatedSalesOrder')}</Label>
                          <Select
                            value={newOrder.order_no}
                            onValueChange={(v) => setNewOrder({ ...newOrder, order_no: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectSalesOrder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {salesOrders.map((so) => (
                                <SelectItem key={so.id} value={so.order_no}>
                                  {so.order_no} - {so.customer_name || t('unknownCustomer')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('relatedBOM')}</Label>
                          <Select
                            value={newOrder.bom_id}
                            onValueChange={(v) => setNewOrder({ ...newOrder, bom_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectBOM')} />
                            </SelectTrigger>
                            <SelectContent>
                              {bomList.map((b) => (
                                <SelectItem key={b.id} value={String(b.id)}>
                                  {b.bom_no} - {b.product_name || t('unknownProduct')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('plannedQuantity')}</Label>
                          <Input
                            type="number"
                            placeholder={t('productionQuantity')}
                            value={newOrder.quantity}
                            onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('unit')}</Label>
                          <Select
                            value={newOrder.unit}
                            onValueChange={(v) => setNewOrder({ ...newOrder, unit: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectUnit')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="㎡">㎡</SelectItem>
                              <SelectItem value="张">{t('units.sheet')}</SelectItem>
                              <SelectItem value="卷">{t('units.roll')}</SelectItem>
                              <SelectItem value="个">{t('units.piece')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('priority.label')}</Label>
                          <Select
                            value={newOrder.priority}
                            onValueChange={(v) => setNewOrder({ ...newOrder, priority: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectPriority')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                              <SelectItem value="high">{t('priority.high')}</SelectItem>
                              <SelectItem value="normal">{t('priority.normal')}</SelectItem>
                              <SelectItem value="low">{t('priority.low')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('remark')}</Label>
                          <Input
                            placeholder={t('enterRemark')}
                            value={newOrder.remark}
                            onChange={(e) => setNewOrder({ ...newOrder, remark: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('planStartDate')}</Label>
                          <Input
                            type="date"
                            value={newOrder.plan_start_date}
                            onChange={(e) =>
                              setNewOrder({ ...newOrder, plan_start_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('planEndDate')}</Label>
                          <Input
                            type="date"
                            value={newOrder.plan_end_date}
                            onChange={(e) =>
                              setNewOrder({ ...newOrder, plan_end_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        {tc('cancel')}
                      </Button>
                      <Button onClick={handleCreateOrder}>{t('createWorkOrder')}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              {t('all')} ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="producing">
              {t('producing')} ({stats.producing})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              {t('status.confirmed')} ({stats.confirmed})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t('status.pending')} ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t('status.completed')} ({stats.completed})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    {tc('loading')}
                  </div>
                ) : workOrders.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    {t('noWorkOrderData')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('work_order_no')}
                        >
                          <span className="inline-flex items-center">
                            {t('workOrderNo')}
                            {getSortIcon('work_order_no')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('product_name')}
                        >
                          <span className="inline-flex items-center">
                            {t('productInfo')}
                            {getSortIcon('product_name')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('customer_name')}
                        >
                          <span className="inline-flex items-center">
                            {t('customer')}
                            {getSortIcon('customer_name')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('quantity')}
                        >
                          <span className="inline-flex items-center">
                            {t('quantity')}
                            {getSortIcon('quantity')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('status')}
                        >
                          <span className="inline-flex items-center">
                            {t('status.label')}
                            {getSortIcon('status')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('priority')}
                        >
                          <span className="inline-flex items-center">
                            {t('priority.label')}
                            {getSortIcon('priority')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('planned_start_date')}
                        >
                          <span className="inline-flex items-center">
                            {t('plannedDate')}
                            {getSortIcon('planned_start_date')}
                          </span>
                        </TableHead>
                        <TableHead>{t('operation')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedWorkOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{order.work_order_no}</span>
                              {order.order_no && (
                                <span className="text-xs text-muted-foreground">
                                  {t('related')}: {order.order_no}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.product_name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span>{order.customer_name || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <span>
                              {parseFloat(String(order.quantity)).toLocaleString(locale)}{' '}
                              {order.unit}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>{formatDate(order.plan_start_date) || '-'}</span>
                              <span className="text-muted-foreground">{t('to')}</span>
                              <span>{formatDate(order.plan_end_date) || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetail(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetail(order)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('viewDetail')}
                                  </DropdownMenuItem>
                                  {order.status === 0 && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(order, 'confirmed')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t('confirmWorkOrder')}
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 1 && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(order, 'producing')}
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      {t('startProduction')}
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 2 && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(order, 'completed')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t('completeWorkOrder')}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <Printer className="h-4 w-4 mr-2" />
                                    {t('printWorkOrder')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDelete(order)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {tc('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {t('workOrderDetail')}: {selectedOrder.work_order_no}
                    {getStatusBadge(selectedOrder.status)}
                  </DialogTitle>
                  <DialogDescription>{t('viewWorkOrderDetailDesc')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('productInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('productName')}:</span>
                        <span>{selectedOrder.product_name || '-'}</span>
                        <span className="text-muted-foreground">{t('plannedQuantity')}:</span>
                        <span>
                          {parseFloat(String(selectedOrder.quantity)).toLocaleString(locale)}{' '}
                          {selectedOrder.unit}
                        </span>
                        <span className="text-muted-foreground">{t('priority.label')}:</span>
                        <span>{getPriorityBadge(selectedOrder.priority)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('customerInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('customerName')}:</span>
                        <span>{selectedOrder.customer_name || '-'}</span>
                        <span className="text-muted-foreground">{t('relatedOrder')}:</span>
                        <span>{selectedOrder.order_no || '-'}</span>
                        <span className="text-muted-foreground">{t('status.label')}:</span>
                        <span>{getStatusBadge(selectedOrder.status)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('workOrderMaterials')}
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('lineNo')}</TableHead>
                            <TableHead>{t('materialCode')}</TableHead>
                            <TableHead>{t('materialName')}</TableHead>
                            <TableHead>{t('requiredQty')}</TableHead>
                            <TableHead>{t('unit')}</TableHead>
                            <TableHead>{t('status.label')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.line_no}</TableCell>
                              <TableCell>{item.material_code || '-'}</TableCell>
                              <TableCell>{item.material_name || '-'}</TableCell>
                              <TableCell>
                                {parseFloat(String(item.required_qty)).toLocaleString(locale)}
                              </TableCell>
                              <TableCell>{item.unit || '-'}</TableCell>
                              <TableCell>{getStatusBadge(item.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('plannedTime')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('startDate')}:</span>
                        <span>{formatDate(selectedOrder.plan_start_date) || '-'}</span>
                        <span className="text-muted-foreground">{t('endDate')}:</span>
                        <span>{formatDate(selectedOrder.plan_end_date) || '-'}</span>
                      </div>
                    </div>

                    {selectedOrder.actual_start_date && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground">
                          {t('actualTime')}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">{t('startDate')}:</span>
                          <span>{selectedOrder.actual_start_date}</span>
                          {selectedOrder.actual_end_date && (
                            <>
                              <span className="text-muted-foreground">{t('endDate')}:</span>
                              <span>{selectedOrder.actual_end_date}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedOrder.remark && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">{t('remark')}</h4>
                      <p className="text-sm bg-gray-50 p-3 rounded">{selectedOrder.remark}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      {tc('close')}
                    </Button>
                    {selectedOrder.status === 1 && (
                      <Button
                        onClick={() => {
                          handleStatusChange(selectedOrder, 'producing');
                          setIsDetailOpen(false);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {t('startProduction')}
                      </Button>
                    )}
                    {selectedOrder.status === 2 && (
                      <Button
                        onClick={() => {
                          handleStatusChange(selectedOrder, 'completed');
                          setIsDetailOpen(false);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('completeWorkOrder')}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
