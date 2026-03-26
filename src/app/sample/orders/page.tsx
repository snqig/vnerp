'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Eye,
  FlaskConical,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface SampleOrder {
  id: number;
  sample_no: string;
  order_month: number;
  order_date: string;
  sample_type: string;
  customer_name: string;
  print_method: string;
  color_sequence: string;
  product_name: string;
  material_code: string;
  size_spec: string;
  sample_order_no: string;
  required_date: string;
  progress_status: string;
  is_confirmed: number;
  is_urgent: number;
  is_produce_together: number;
  quantity: number;
  progress_detail: string;
  sample_count: number;
  sample_reason: string;
  order_tracker: string;
  status: number;
}

const statusMap: Record<number, { label: string; color: string; icon: any }> = {
  0: { label: '待处理', color: 'bg-gray-100 text-gray-700', icon: Clock },
  1: { label: '进行中', color: 'bg-blue-100 text-blue-700', icon: FlaskConical },
  2: { label: '已完成', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  3: { label: '已取消', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const sampleTypeColors: Record<string, string> = {
  '设变': 'bg-purple-100 text-purple-700',
  '测试': 'bg-blue-100 text-blue-700',
  '新款': 'bg-green-100 text-green-700',
};

export default function SampleOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SampleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [sampleType, setSampleType] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<SampleOrder | null>(null);
  const pageSize = 10;

  useEffect(() => {
    fetchOrders();
  }, [page, status, sampleType]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (status !== 'all') params.append('status', status);
      if (sampleType !== 'all') params.append('sampleType', sampleType);
      if (keyword) params.append('keyword', keyword);

      const response = await fetch(`/api/sample/orders?${params}`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data);
        setTotal(result.pagination.total);
      } else {
        toast.error(result.message || '获取打样单列表失败');
      }
    } catch (error) {
      toast.error('获取打样单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleDelete = (order: SampleOrder) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    
    try {
      const response = await fetch(`/api/sample/orders?id=${orderToDelete.id}`, {
        method: 'DELETE',
      });
      
      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = { success: response.ok };
      }

      if (result.success) {
        toast.success('打样单删除成功');
        fetchOrders();
        setDeleteDialogOpen(false);
        setOrderToDelete(null);
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getProgressBadge = (progress: string) => {
    const colors: Record<string, string> = {
      '产线拿': 'bg-green-100 text-green-700',
      '等材料': 'bg-yellow-100 text-yellow-700',
      '冲压': 'bg-blue-100 text-blue-700',
      '印刷': 'bg-purple-100 text-purple-700',
      '切割': 'bg-orange-100 text-orange-700',
      'UV': 'bg-pink-100 text-pink-700',
      '嗮版': 'bg-cyan-100 text-cyan-700',
      '出片': 'bg-indigo-100 text-indigo-700',
      '检样': 'bg-teal-100 text-teal-700',
      '做卡': 'bg-gray-100 text-gray-700',
    };
    return colors[progress] || 'bg-gray-100 text-gray-700';
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-blue-500" />
              打样单管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理产品打样单，跟踪打样进度
            </p>
          </div>
          <Button onClick={() => router.push('/sample/orders/new')}>
            <Plus className="h-4 w-4 mr-2" />
            新增打样单
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 1).length}</div>
              <div className="text-sm text-muted-foreground">进行中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 2).length}</div>
              <div className="text-sm text-muted-foreground">已完成</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{orders.filter(o => o.sample_type === '设变').length}</div>
              <div className="text-sm text-muted-foreground">设变打样</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{orders.filter(o => o.is_urgent).length}</div>
              <div className="text-sm text-muted-foreground">急件</div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索打样单号、客户、品名、料号..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">全部状态</option>
            <option value="0">待处理</option>
            <option value="1">进行中</option>
            <option value="2">已完成</option>
            <option value="3">已取消</option>
          </select>
          <select
            value={sampleType}
            onChange={(e) => { setSampleType(e.target.value); setPage(1); }}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">全部类型</option>
            <option value="设变">设变</option>
            <option value="测试">测试</option>
            <option value="新款">新款</option>
          </select>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
        </div>

        {/* 打样单列表 */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>打样单号</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>品名/料号</TableHead>
                <TableHead>印刷方式</TableHead>
                <TableHead>需求日期</TableHead>
                <TableHead>进展</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无打样单数据
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <div>{order.sample_no}</div>
                      {order.sample_order_no && (
                        <div className="text-xs text-muted-foreground">{order.sample_order_no}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.order_tracker}</div>
                    </TableCell>
                    <TableCell>
                      {order.sample_type && (
                        <span className={`px-2 py-1 rounded text-xs ${sampleTypeColors[order.sample_type] || 'bg-gray-100'}`}>
                          {order.sample_type}
                        </span>
                      )}
                      {order.is_urgent === 1 && (
                        <span className="ml-1 px-2 py-1 rounded text-xs bg-red-100 text-red-700">急</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.product_name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{order.material_code || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{order.print_method || '-'}</div>
                      <div className="text-xs text-muted-foreground">{order.color_sequence || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{order.required_date || '-'}</div>
                      <div className="text-xs text-muted-foreground">{order.quantity} PCS</div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${getProgressBadge(order.progress_detail)}`}>
                        {order.progress_detail || '-'}
                      </span>
                      {order.sample_count > 1 && (
                        <div className="text-xs text-muted-foreground mt-1">第{order.sample_count}次打样</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const StatusIcon = statusMap[order.status]?.icon || Clock;
                        return (
                          <div className="flex items-center gap-1">
                            <StatusIcon className="h-4 w-4" />
                            <span className={`px-2 py-1 rounded text-xs ${statusMap[order.status]?.color || ''}`}>
                              {statusMap[order.status]?.label || '未知'}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/sample/orders/${order.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/sample/orders/${order.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(order)} className="text-red-600">
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

        {/* 分页 */}
        {total > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                您确定要删除打样单 <strong>{orderToDelete?.sample_no}</strong> 吗？此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
