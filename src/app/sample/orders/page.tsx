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
  Edit,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/components/ui/toast';

// 打样订单类型定义
interface SampleOrder {
  id: number;
  order_no: string;
  notify_date: string;
  customer_name: string;
  product_name: string;
  material_no: string;
  version: string;
  size_spec: string;
  material_spec: string;
  quantity: number;
  customer_require_date: string;
  actual_delivery_date: string | null;
  delivery_status: 'pending' | 'delivered' | 'signed';
  remark: string;
  create_time: string;
  update_time: string;
}

export default function SampleOrdersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SampleOrder | null>(null);
  const [orders, setOrders] = useState<SampleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const { addToast: toast } = useToastContext();

  // 表单数据
  const [formData, setFormData] = useState({
    notify_date: '',
    customer_name: '',
    product_name: '',
    material_no: '',
    version: 'A',
    size_spec: '',
    material_spec: '',
    quantity: '',
    customer_require_date: '',
    remark: '',
  });

  // 获取打样订单列表
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (searchKeyword) {
        params.append('keyword', searchKeyword);
      }

      if (selectedStatus && selectedStatus !== 'all') {
        params.append('delivery_status', selectedStatus);
      }

      if (selectedCustomer && selectedCustomer !== 'all') {
        params.append('customer_name', selectedCustomer);
      }

      const response = await fetch(`/api/sample/orders?${params}`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data);
        setPagination(result.pagination);
      } else {
        toast({
          title: '获取打样订单列表失败',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '获取打样订单列表失败',
        description: '网络请求错误',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, searchKeyword, selectedStatus, selectedCustomer, toast]);

  // 初始加载
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, selectedStatus, selectedCustomer]);

  // 创建打样订单
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/sample/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity) || 0,
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: '创建成功',
          description: `打样订单 ${result.data.order_no} 已创建`,
        });
        setIsCreateOpen(false);
        resetForm();
        fetchOrders();
      } else {
        toast({
          title: '创建失败',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '创建失败',
        description: '网络请求错误',
        variant: 'destructive',
      });
    }
  };

  // 更新打样订单
  const handleUpdate = async () => {
    if (!editingOrder) return;

    try {
      const response = await fetch('/api/sample/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrder.id,
          ...formData,
          quantity: parseInt(formData.quantity) || 0,
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: '更新成功',
          description: '打样订单已更新',
        });
        setIsEditOpen(false);
        setEditingOrder(null);
        resetForm();
        fetchOrders();
      } else {
        toast({
          title: '更新失败',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '更新失败',
        description: '网络请求错误',
        variant: 'destructive',
      });
    }
  };

  // 删除打样订单
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此打样订单吗？')) return;

    try {
      const response = await fetch(`/api/sample/orders?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: '删除成功',
          description: '打样订单已删除',
        });
        fetchOrders();
      } else {
        toast({
          title: '删除失败',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '删除失败',
        description: '网络请求错误',
        variant: 'destructive',
      });
    }
  };

  // 更新交付状态
  const handleUpdateStatus = async (id: number, status: string, actualDate?: string) => {
    try {
      const response = await fetch('/api/sample/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          delivery_status: status,
          actual_delivery_date: actualDate || new Date().toISOString().split('T')[0],
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: '状态更新成功',
          description: `订单状态已更新为${status === 'signed' ? '已签样' : status === 'delivered' ? '已交付' : '待交付'}`,
        });
        fetchOrders();
      } else {
        toast({
          title: '状态更新失败',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '状态更新失败',
        description: '网络请求错误',
        variant: 'destructive',
      });
    }
  };

  // 打开编辑对话框
  const openEditDialog = (order: SampleOrder) => {
    setEditingOrder(order);
    setFormData({
      notify_date: order.notify_date,
      customer_name: order.customer_name,
      product_name: order.product_name,
      material_no: order.material_no,
      version: order.version,
      size_spec: order.size_spec,
      material_spec: order.material_spec,
      quantity: order.quantity.toString(),
      customer_require_date: order.customer_require_date,
      remark: order.remark,
    });
    setIsEditOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      notify_date: '',
      customer_name: '',
      product_name: '',
      material_no: '',
      version: 'A',
      size_spec: '',
      material_spec: '',
      quantity: '',
      customer_require_date: '',
      remark: '',
    });
  };

  // 获取状态显示
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />已签样</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-100 text-blue-700"><FileText className="h-3 w-3 mr-1" />已交付</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />待交付</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // 获取客户列表（去重）
  const customers = Array.from(new Set(orders.map(o => o.customer_name)));

  // 表单输入处理
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout title="打样订单管理">
      <div className="space-y-6">
        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索订单号、品名、料号..."
                    className="pl-10"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="客户筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部客户</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer} value={customer}>
                        {customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待交付</SelectItem>
                    <SelectItem value="delivered">已交付</SelectItem>
                    <SelectItem value="signed">已签样</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新建打样单
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
                  <DialogHeader>
                    <DialogTitle>新建打样订单</DialogTitle>
                    <DialogDescription>填写打样订单信息</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="notify_date">通知打样日期 *</Label>
                      <Input
                        id="notify_date"
                        type="date"
                        value={formData.notify_date}
                        onChange={(e) => handleInputChange('notify_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_name">客户名称 *</Label>
                      <Input
                        id="customer_name"
                        placeholder="客户名称"
                        value={formData.customer_name}
                        onChange={(e) => handleInputChange('customer_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product_name">品名 *</Label>
                      <Input
                        id="product_name"
                        placeholder="品名"
                        value={formData.product_name}
                        onChange={(e) => handleInputChange('product_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="material_no">料号 *</Label>
                      <Input
                        id="material_no"
                        placeholder="料号"
                        value={formData.material_no}
                        onChange={(e) => handleInputChange('material_no', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="version">版本</Label>
                      <Input
                        id="version"
                        placeholder="版本"
                        value={formData.version}
                        onChange={(e) => handleInputChange('version', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">数量</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="数量"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="size_spec">尺寸规格</Label>
                      <Input
                        id="size_spec"
                        placeholder="尺寸规格"
                        value={formData.size_spec}
                        onChange={(e) => handleInputChange('size_spec', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_require_date">客户需求日期</Label>
                      <Input
                        id="customer_require_date"
                        type="date"
                        value={formData.customer_require_date}
                        onChange={(e) => handleInputChange('customer_require_date', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="material_spec">材料规格</Label>
                      <Input
                        id="material_spec"
                        placeholder="材料规格"
                        value={formData.material_spec}
                        onChange={(e) => handleInputChange('material_spec', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="remark">备注</Label>
                      <Input
                        id="remark"
                        placeholder="备注"
                        value={formData.remark}
                        onChange={(e) => handleInputChange('remark', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                      取消
                    </Button>
                    <Button onClick={handleCreate}>保存</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* 打样订单列表 */}
        <Card>
          <CardHeader>
            <CardTitle>打样订单列表</CardTitle>
            <CardDescription>共 {pagination.total} 个打样订单</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">序号</TableHead>
                      <TableHead>通知日期</TableHead>
                      <TableHead>客户</TableHead>
                      <TableHead>品名</TableHead>
                      <TableHead>料号</TableHead>
                      <TableHead>版本</TableHead>
                      <TableHead>尺寸</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>需求日期</TableHead>
                      <TableHead>交样日期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                          暂无打样订单数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order, index) => (
                        <TableRow key={order.id}>
                          <TableCell>{(pagination.page - 1) * pagination.pageSize + index + 1}</TableCell>
                          <TableCell>{order.notify_date}</TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell className="font-medium">{order.product_name}</TableCell>
                          <TableCell className="font-mono text-xs">{order.material_no}</TableCell>
                          <TableCell>{order.version}</TableCell>
                          <TableCell className="text-xs">{order.size_spec}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>{order.customer_require_date}</TableCell>
                          <TableCell>{order.actual_delivery_date || '-'}</TableCell>
                          <TableCell>{getStatusBadge(order.delivery_status)}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{order.remark}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {order.delivery_status === 'pending' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    标记已交付
                                  </DropdownMenuItem>
                                )}
                                {order.delivery_status === 'delivered' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'signed')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    标记已签样
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openEditDialog(order)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(order.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 分页 */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  上一页
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  第 {pagination.page} / {pagination.totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>编辑打样订单</DialogTitle>
            <DialogDescription>修改打样订单信息</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-notify_date">通知打样日期 *</Label>
              <Input
                id="edit-notify_date"
                type="date"
                value={formData.notify_date}
                onChange={(e) => handleInputChange('notify_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-customer_name">客户名称 *</Label>
              <Input
                id="edit-customer_name"
                placeholder="客户名称"
                value={formData.customer_name}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-product_name">品名 *</Label>
              <Input
                id="edit-product_name"
                placeholder="品名"
                value={formData.product_name}
                onChange={(e) => handleInputChange('product_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-material_no">料号 *</Label>
              <Input
                id="edit-material_no"
                placeholder="料号"
                value={formData.material_no}
                onChange={(e) => handleInputChange('material_no', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-version">版本</Label>
              <Input
                id="edit-version"
                placeholder="版本"
                value={formData.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">数量</Label>
              <Input
                id="edit-quantity"
                type="number"
                placeholder="数量"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-size_spec">尺寸规格</Label>
              <Input
                id="edit-size_spec"
                placeholder="尺寸规格"
                value={formData.size_spec}
                onChange={(e) => handleInputChange('size_spec', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-customer_require_date">客户需求日期</Label>
              <Input
                id="edit-customer_require_date"
                type="date"
                value={formData.customer_require_date}
                onChange={(e) => handleInputChange('customer_require_date', e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-material_spec">材料规格</Label>
              <Input
                id="edit-material_spec"
                placeholder="材料规格"
                value={formData.material_spec}
                onChange={(e) => handleInputChange('material_spec', e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-remark">备注</Label>
              <Input
                id="edit-remark"
                placeholder="备注"
                value={formData.remark}
                onChange={(e) => handleInputChange('remark', e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingOrder(null); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleUpdate}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
