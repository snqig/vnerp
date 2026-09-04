'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useTranslations } from 'next-intl';

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
  0: {
    label: '待处理',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  },
  1: {
    label: '进行中',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  2: {
    label: '已完成',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  3: {
    label: '已取消',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
};

const sampleTypeColors: Record<string, string> = {
  设变: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  测试: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  新款: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export default function SampleOrderDetailPage() {
  // 翻译钩子
  const tc = useTranslations('Common');
  const ts = useTranslations('SampleManagement');

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
      const response = await authFetch(`/api/sample/orders?id=${id}`);
      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
      } else {
        toast.error(result.message || ts('k_m0o67a'));
      }
    } catch {
      toast.error(ts('k_m0o67a'));
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
        toast.success(ts('k_13jleo3'));
        router.push('/sample/orders');
      } else {
        toast.error(result.message || ts('k_1ijrr73'));
      }
    } catch {
      toast.error(ts('k_1ijrr73'));
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">{tc('loading')}</div>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12 text-muted-foreground">{ts('orderNotFound')}</div>
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
                {ts('k_1xkq6g7')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{order.sample_no}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/sample/orders/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              {ts('k_qreyeg')}</Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              {ts('k_1t2vi4h')}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ts('k_z5lkkb')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{ts('sampleNoLabel')}</div>
                  <div className="font-medium">{order.sample_no}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('sampleOrderNoLabel')}</div>
                  <div className="font-medium">{order.sample_order_no || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{ts('k_1fsw60u')}</div>
                  <div className="font-medium">{order.order_month}{ts('k_3s1sxj')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{tc('orderDateLabel')}</div>
                  <div className="font-medium">{order.order_date}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{ts('k_1o7upb7')}</div>
                <div className="font-medium">{order.customer_name}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{ts('k_1xvvlg9')}</div>
                  <div>
                    {order.sample_type ? (
                      <span
                        className={`px-2 py-1 rounded text-xs ${sampleTypeColors[order.sample_type] || 'bg-gray-100'}`}
                      >
                        {order.sample_type}
                      </span>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('orderTrackerLabel')}</div>
                  <div className="font-medium">{order.order_tracker || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 产品信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ts('k_fv8aex')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">{ts('k_1kddh77')}</div>
                <div className="font-medium">{order.product_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{ts('k_1bawbh5')}</div>
                <div className="font-medium">{order.material_code || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{tc('size')}</div>
                <div className="font-medium">{order.size_spec || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{ts('materialDescLabel')}</div>
                <div className="text-sm">{order.material_desc || '-'}</div>
              </div>
            </CardContent>
          </Card>

          {/* 印刷信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ts('k_4eu88c')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{ts('k_11ikudg')}</div>
                  <div className="font-medium">{order.print_method || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('colorSequenceLabel')}</div>
                  <div className="font-medium">{order.color_sequence || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{tc('quantity')}</div>
                  <div className="font-medium">{order.quantity || 0} PCS</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('k_2dxkxn')}</div>
                  <div className="font-medium">{order.required_date || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 打样信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ts('k_1uh4efz')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{ts('progressDetailLabel')}</div>
                  <div className="font-medium">{order.progress_detail || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('sampleCountLabel')}</div>
                  <div className="font-medium">
                    {ts('countPrefix')}
                    {order.sample_count}
                    {ts('pieceUnit')}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{ts('sampleReasonLabel')}</div>
                <div className="font-medium">{order.sample_reason || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{ts('providedMaterialLabel')}</div>
                  <div className="font-medium">{order.provided_material || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('receiveTimeLabel')}</div>
                  <div className="font-medium">{order.receive_time || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 状态信息 */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{ts('k_10gqxz0')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">{tc('status')}</div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${statusMap[order.status]?.color || ''}`}
                  >
                    {statusMap[order.status]?.label || tc('unknown')}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('isConfirmedLabel')}</div>
                  <div className="font-medium">{order.is_confirmed ? tc('yes') : tc('no')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('k_16p17ir')}</div>
                  <div className={`font-medium ${order.is_urgent ? 'text-red-600' : ''}`}>
                    {order.is_urgent ? tc('yes') : tc('no')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    {ts('isProduceTogetherLabel')}
                  </div>
                  <div className="font-medium">
                    {order.is_produce_together ? tc('yes') : tc('no')}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">{ts('mylarInfoLabel')}</div>
                  <div className="font-medium">{order.mylar_info || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('sampleStockLabel')}</div>
                  <div className="font-medium">{order.sample_stock || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{ts('k_1priyqs')}</div>
                  <div className="font-medium">{order.customer_confirm || '-'}</div>
                </div>
              </div>
              {order.remark && (
                <div>
                  <div className="text-sm text-muted-foreground">{tc('remark')}</div>
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
              <DialogTitle>{ts('k_d4pkd7')}</DialogTitle>
              <DialogDescription>
                {ts('k_1h5ggd7')}<strong>{order.sample_no}</strong>
                {tc('confirmDeleteSuffix')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {tc('cancel')}</Button>
              <Button variant="destructive" onClick={handleDelete}>
                {ts('k_1t2vi4h')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
