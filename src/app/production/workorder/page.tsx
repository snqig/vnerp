﻿'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
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
import { Progress } from '@/components/ui/progress';
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
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Play,
  Pause,
  QrCode,
  Factory,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  TrendingUp,
  Filter,
  Download,
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
  status: string;
}

interface WorkOrder {
  id: number;
  work_order_no: string;
  order_no: string;
  bom_id: number;
  customer_name: string;
  product_name: string;
  product_id: number;
  quantity: number;
  unit: string;
  status: string;
  priority: string;
  plan_start_date: string;
  plan_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
  item_count?: number;
  items?: WorkOrderItem[];
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: '待确认', className: 'bg-gray-100 text-gray-700' },
  confirmed: { label: '已确认', className: 'bg-blue-100 text-blue-700' },
  producing: { label: '生产中', className: 'bg-orange-100 text-orange-700' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', className: 'bg-red-100 text-red-700' },
};

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  urgent: { label: '紧急', className: 'bg-red-100 text-red-700' },
  high: { label: '高', className: 'bg-orange-100 text-orange-700' },
  normal: { label: '中', className: 'bg-blue-100 text-blue-700' },
  low: { label: '低', className: 'bg-gray-100 text-gray-700' },
};

const getStatusBadge = (status: string) => {
  const config = STATUS_MAP[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

const getPriorityBadge = (priority: string) => {
  const config = PRIORITY_MAP[priority] || { label: priority, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function WorkOrderPage() {
  const { toast } = useToast();
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
      else if (sortOrder === 'desc') { setSortField(null); setSortOrder(null); }
    } else { setSortField(field); setSortOrder('asc'); }
  };
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };
  const sortedWorkOrders = useMemo(() => {
    if (!sortField || !sortOrder) return workOrders;
    return [...workOrders].sort((a, b) => {
      const aVal = String((a as any)[sortField] ?? '').toLowerCase();
      const bVal = String((b as any)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [workOrders, sortField, sortOrder]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [bomList, setBomList] = useState<any[]>([]);
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

      const res = await fetch(`/api/workorders?${params}`);
      const data = await res.json();

      if (data.success) {
        const list = data.data?.list || (Array.isArray(data.data) ? data.data : []);
        setWorkOrders(list);
      } else {
        toast({ title: '错误', description: data.message || '获取工单列表失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '获取工单列表失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, toast]);

  const fetchSalesOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setSalesOrders(data.data?.list || (Array.isArray(data.data) ? data.data : []));
      }
    } catch (error) {
      console.error('获取销售订单失败:', error);
    }
  }, []);

  const fetchBomList = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/bom');
      const data = await res.json();
      if (data.success) {
        setBomList(data.data?.list || (Array.isArray(data.data) ? data.data : []));
      }
    } catch (error) {
      console.error('获取BOM列表失败:', error);
    }
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
      const res = await fetch(`/api/workorders?id=${order.work_order_no}`);
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
      const res = await fetch('/api/workorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        toast({ title: '成功', description: '工单创建成功' });
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
        toast({ title: '错误', description: data.message || '创建工单失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '创建工单失败', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (order: WorkOrder, newStatus: string) => {
    try {
      const res = await fetch('/api/workorders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: '成功', description: `工单状态已更新为${STATUS_MAP[newStatus]?.label || newStatus}` });
        fetchWorkOrders();
      } else {
        toast({ title: '错误', description: data.message || '状态更新失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '状态更新失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (order: WorkOrder) => {
    if (!confirm(`确定要删除工单 ${order.work_order_no} 吗？`)) return;
    try {
      const res = await fetch(`/api/workorders?id=${order.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: '成功', description: '工单已删除' });
        fetchWorkOrders();
      } else {
        toast({ title: '错误', description: data.message || '删除失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' });
    }
  };

  const stats = {
    total: workOrders.length,
    producing: workOrders.filter((o) => o.status === 'producing').length,
    completed: workOrders.filter((o) => o.status === 'completed').length,
    confirmed: workOrders.filter((o) => o.status === 'confirmed').length,
    pending: workOrders.filter((o) => o.status === 'pending').length,
    totalQty: workOrders.reduce((sum, o) => sum + (parseFloat(String(o.quantity)) || 0), 0),
  };

  return (
    <MainLayout title="生产工单">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总工单数</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                生产中: {stats.producing} | 已完成: {stats.completed}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">计划产量</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQty.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                涉及 {workOrders.filter((o) => o.product_name).length} 种产品
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">生产中</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.producing}</div>
              <p className="text-xs text-muted-foreground">
                正在生产
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待排产</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending + stats.confirmed}</div>
              <p className="text-xs text-muted-foreground">
                待确认: {stats.pending} | 已确认: {stats.confirmed}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder="搜索工单号..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={() => fetchWorkOrders()}
                  className="flex-1 max-w-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchWorkOrders()}>
                  <Filter className="h-4 w-4 mr-2" />
                  刷新
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      新建工单
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl" resizable>
                    <DialogHeader>
                      <DialogTitle>新建生产工单</DialogTitle>
                      <DialogDescription>创建新的生产工单</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>关联销售订单</Label>
                          <Select value={newOrder.order_no} onValueChange={(v) => setNewOrder({ ...newOrder, order_no: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择销售订单" />
                            </SelectTrigger>
                            <SelectContent>
                              {salesOrders.map((so) => (
                                <SelectItem key={so.id} value={so.order_no}>
                                  {so.order_no} - {so.customer_name || '未知客户'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>关联BOM</Label>
                          <Select value={newOrder.bom_id} onValueChange={(v) => setNewOrder({ ...newOrder, bom_id: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择BOM" />
                            </SelectTrigger>
                            <SelectContent>
                              {bomList.map((b) => (
                                <SelectItem key={b.id} value={String(b.id)}>
                                  {b.bom_no} - {b.product_name || '未知产品'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>计划数量</Label>
                          <Input
                            type="number"
                            placeholder="生产数量"
                            value={newOrder.quantity}
                            onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>单位</Label>
                          <Select value={newOrder.unit} onValueChange={(v) => setNewOrder({ ...newOrder, unit: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择单位" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="㎡">㎡</SelectItem>
                              <SelectItem value="张">张</SelectItem>
                              <SelectItem value="卷">卷</SelectItem>
                              <SelectItem value="个">个</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>优先级</Label>
                          <Select value={newOrder.priority} onValueChange={(v) => setNewOrder({ ...newOrder, priority: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择优先级" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgent">紧急</SelectItem>
                              <SelectItem value="high">高</SelectItem>
                              <SelectItem value="normal">中</SelectItem>
                              <SelectItem value="low">低</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>备注</Label>
                          <Input
                            placeholder="输入备注信息"
                            value={newOrder.remark}
                            onChange={(e) => setNewOrder({ ...newOrder, remark: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>计划开始日期</Label>
                          <Input
                            type="date"
                            value={newOrder.plan_start_date}
                            onChange={(e) => setNewOrder({ ...newOrder, plan_start_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>计划结束日期</Label>
                          <Input
                            type="date"
                            value={newOrder.plan_end_date}
                            onChange={(e) => setNewOrder({ ...newOrder, plan_end_date: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateOrder}>创建工单</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">全部 ({stats.total})</TabsTrigger>
            <TabsTrigger value="producing">生产中 ({stats.producing})</TabsTrigger>
            <TabsTrigger value="confirmed">已确认 ({stats.confirmed})</TabsTrigger>
            <TabsTrigger value="pending">待确认 ({stats.pending})</TabsTrigger>
            <TabsTrigger value="completed">已完成 ({stats.completed})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    加载中...
                  </div>
                ) : workOrders.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    暂无工单数据
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('work_order_no')}>
                          <span className="inline-flex items-center">工单号{getSortIcon('work_order_no')}</span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('product_name')}>
                          <span className="inline-flex items-center">产品信息{getSortIcon('product_name')}</span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('customer_name')}>
                          <span className="inline-flex items-center">客户{getSortIcon('customer_name')}</span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('quantity')}>
                          <span className="inline-flex items-center">数量{getSortIcon('quantity')}</span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('status')}>
                          <span className="inline-flex items-center">状态{getSortIcon('status')}</span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('priority')}>
                          <span className="inline-flex items-center">优先级{getSortIcon('priority')}</span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-muted" onClick={() => handleSort('planned_start_date')}>
                          <span className="inline-flex items-center">计划日期{getSortIcon('planned_start_date')}</span>
                        </TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedWorkOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{order.work_order_no}</span>
                              {order.order_no && (
                                <span className="text-xs text-muted-foreground">关联: {order.order_no}</span>
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
                            <span>{parseFloat(String(order.quantity)).toLocaleString()} {order.unit}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>{order.plan_start_date || '-'}</span>
                              <span className="text-muted-foreground">至</span>
                              <span>{order.plan_end_date || '-'}</span>
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
                                    查看详情
                                  </DropdownMenuItem>
                                  {order.status === 'pending' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(order, 'confirmed')}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      确认工单
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'confirmed' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(order, 'producing')}>
                                      <Play className="h-4 w-4 mr-2" />
                                      开始生产
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'producing' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(order, 'completed')}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      完成工单
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <Printer className="h-4 w-4 mr-2" />
                                    打印工单
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(order)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除
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
                    工单详情: {selectedOrder.work_order_no}
                    {getStatusBadge(selectedOrder.status)}
                  </DialogTitle>
                  <DialogDescription>
                    查看工单详细信息和生产进度
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">产品信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">产品名称:</span>
                        <span>{selectedOrder.product_name || '-'}</span>
                        <span className="text-muted-foreground">计划数量:</span>
                        <span>{parseFloat(String(selectedOrder.quantity)).toLocaleString()} {selectedOrder.unit}</span>
                        <span className="text-muted-foreground">优先级:</span>
                        <span>{getPriorityBadge(selectedOrder.priority)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">客户信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">客户名称:</span>
                        <span>{selectedOrder.customer_name || '-'}</span>
                        <span className="text-muted-foreground">关联订单:</span>
                        <span>{selectedOrder.order_no || '-'}</span>
                        <span className="text-muted-foreground">状态:</span>
                        <span>{getStatusBadge(selectedOrder.status)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">工单物料</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>行号</TableHead>
                            <TableHead>物料编码</TableHead>
                            <TableHead>物料名称</TableHead>
                            <TableHead>需求数量</TableHead>
                            <TableHead>单位</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.line_no}</TableCell>
                              <TableCell>{item.material_code || '-'}</TableCell>
                              <TableCell>{item.material_name || '-'}</TableCell>
                              <TableCell>{parseFloat(String(item.required_qty)).toLocaleString()}</TableCell>
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
                      <h4 className="font-semibold text-sm text-muted-foreground">计划时间</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">开始日期:</span>
                        <span>{selectedOrder.plan_start_date || '-'}</span>
                        <span className="text-muted-foreground">结束日期:</span>
                        <span>{selectedOrder.plan_end_date || '-'}</span>
                      </div>
                    </div>

                    {selectedOrder.actual_start_date && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground">实际时间</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">开始日期:</span>
                          <span>{selectedOrder.actual_start_date}</span>
                          {selectedOrder.actual_end_date && (
                            <>
                              <span className="text-muted-foreground">结束日期:</span>
                              <span>{selectedOrder.actual_end_date}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedOrder.remark && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">备注</h4>
                      <p className="text-sm bg-gray-50 p-3 rounded">{selectedOrder.remark}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      关闭
                    </Button>
                    {selectedOrder.status === 'confirmed' && (
                      <Button onClick={() => { handleStatusChange(selectedOrder, 'producing'); setIsDetailOpen(false); }}>
                        <Play className="h-4 w-4 mr-2" />
                        开始生产
                      </Button>
                    )}
                    {selectedOrder.status === 'producing' && (
                      <Button onClick={() => { handleStatusChange(selectedOrder, 'completed'); setIsDetailOpen(false); }}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        完成工单
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
