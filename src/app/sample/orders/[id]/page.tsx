'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  material_desc: string;
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
  provided_material: string;
  receive_time: string;
  mylar_info: string;
  sample_stock: string;
  customer_confirm: string;
  remark: string;
  status: number;
  create_time: string;
  update_time: string;
}

const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: '待处理', color: 'bg-gray-100 text-gray-700' },
  1: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  2: { label: '已完成', color: 'bg-green-100 text-green-700' },
  3: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

const sampleTypeColors: Record<string, string> = {
  '设变': 'bg-purple-100 text-purple-700',
  '测试': 'bg-blue-100 text-blue-700',
  '新款': 'bg-green-100 text-green-700',
};

export default function SampleOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [order, setOrder] = useState<SampleOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sample/orders?id=${id}`);
      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
      } else {
        toast.error(result.message || '获取打样单详情失败');
      }
    } catch (error) {
      toast.error('获取打样单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/sample/orders?id=${id}`, {
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
        router.push('/sample/orders');
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12 text-muted-foreground">打样单不存在</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/sample/orders')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-blue-500" />
                打样单详情
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {order.sample_no}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/sample/orders/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">打样单号</div>
                  <div className="font-medium">{order.sample_no}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">打样单编号</div>
                  <div className="font-medium">{order.sample_order_no || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">月份</div>
                  <div className="font-medium">{order.order_month}月</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">下单日期</div>
                  <div className="font-medium">{order.order_date}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">客户名称</div>
                <div className="font-medium">{order.customer_name}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">种类</div>
                  <div>
                    {order.sample_type ? (
                      <span className={`px-2 py-1 rounded text-xs ${sampleTypeColors[order.sample_type] || 'bg-gray-100'}`}>
                        {order.sample_type}
                      </span>
                    ) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">跟单人员</div>
                  <div className="font-medium">{order.order_tracker || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 产品信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">产品信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">品名</div>
                <div className="font-medium">{order.product_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">料号</div>
                <div className="font-medium">{order.material_code || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">尺寸</div>
                <div className="font-medium">{order.size_spec || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">材料描述</div>
                <div className="text-sm">{order.material_desc || '-'}</div>
              </div>
            </CardContent>
          </Card>

          {/* 印刷信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">印刷信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">印刷方式</div>
                  <div className="font-medium">{order.print_method || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">色序</div>
                  <div className="font-medium">{order.color_sequence || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">数量</div>
                  <div className="font-medium">{order.quantity || 0} PCS</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">需求日期</div>
                  <div className="font-medium">{order.required_date || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 打样信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">打样信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">进展详情</div>
                  <div className="font-medium">{order.progress_detail || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">打样次数</div>
                  <div className="font-medium">第{order.sample_count}次打样</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">打样原因</div>
                <div className="font-medium">{order.sample_reason || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">提供资料</div>
                  <div className="font-medium">{order.provided_material || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">接单时间</div>
                  <div className="font-medium">{order.receive_time || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 状态信息 */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-base">状态信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">状态</div>
                  <span className={`px-2 py-1 rounded text-xs ${statusMap[order.status]?.color || ''}`}>
                    {statusMap[order.status]?.label || '未知'}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">是否确认</div>
                  <div className="font-medium">{order.is_confirmed ? '是' : '否'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">是否急件</div>
                  <div className={`font-medium ${order.is_urgent ? 'text-red-600' : ''}`}>
                    {order.is_urgent ? '是' : '否'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">同时生产</div>
                  <div className="font-medium">{order.is_produce_together ? '是' : '否'}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">麦拉信息</div>
                  <div className="font-medium">{order.mylar_info || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">样品库存</div>
                  <div className="font-medium">{order.sample_stock || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">客户确认</div>
                  <div className="font-medium">{order.customer_confirm || '-'}</div>
                </div>
              </div>
              {order.remark && (
                <div>
                  <div className="text-sm text-muted-foreground">备注</div>
                  <div className="text-sm mt-1">{order.remark}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent resizable>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                您确定要删除打样单 <strong>{order.sample_no}</strong> 吗？此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
