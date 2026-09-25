'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  SalesOrderForm,
  type SalesOrderFormInitial,
} from '../../sales-order-form';

interface OrderDetailItem {
  material_id?: number | null;
  material_code?: string;
  material_name?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
}

interface OrderDetail {
  id: number;
  order_no: string;
  customer_id?: number | null;
  order_date?: string | null;
  delivery_date?: string | null;
  currency?: string;
  remark?: string;
  items?: OrderDetailItem[];
}

/**
 * 编辑页路由参数是订单号（order_no）而非主键 —— /api/orders?id= 按 order_no 匹配。
 */
export default function EditSalesOrderPage() {
  const t = useTranslations('Orders');
  const tc = useTranslations('Common');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderNo = typeof params?.id === 'string' ? params.id : '';
  const [initial, setInitial] = useState<SalesOrderFormInitial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNo) return;
    const load = async () => {
      try {
        const res = await authFetch(`/api/orders?id=${encodeURIComponent(orderNo)}`);
        const body = await res.json();
        const data: OrderDetail | undefined = body?.data;
        if (!body?.success || !data?.id) {
          setError(body?.message || t('fetchOrdersFailed'));
          return;
        }
        setInitial({
          orderId: data.id,
          customerId: data.customer_id ?? '',
          orderDate: data.order_date ? String(data.order_date).slice(0, 10) : '',
          deliveryDate: data.delivery_date ? String(data.delivery_date).slice(0, 10) : '',
          currency: data.currency || 'CNY',
          remark: data.remark || '',
          items: (data.items || []).map((item) => ({
            material_id: item.material_id ?? '',
            material_code: item.material_code || '',
            material_name: item.material_name || '',
            quantity: item.quantity != null ? String(item.quantity) : '',
            unit: item.unit || '',
            unit_price: item.unit_price != null ? String(item.unit_price) : '',
          })),
        });
      } catch {
        setError(t('fetchOrdersFailed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderNo, t]);

  if (loading) {
    return (
      <MainLayout title={t('editOrder')}>
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          {tc('loading')}
        </div>
      </MainLayout>
    );
  }

  if (error || !initial) {
    return (
      <MainLayout title={t('editOrder')}>
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error || t('fetchOrdersFailed')}
            </p>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => router.push('/orders/sales')}
            >
              {tc('back')}
            </button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return <SalesOrderForm mode="edit" initial={initial} />;
}
