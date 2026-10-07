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
  PurchaseOrderForm,
  type PurchaseOrderFormInitial,
} from '../../purchase-order-form';

interface OrderDetailLine {
  material_id?: number | null;
  material_code?: string;
  material_name?: string;
  order_qty?: number;
  unit?: string;
  unit_price?: number;
}

interface OrderDetail {
  id: number;
  po_no: string;
  supplier_id?: number | null;
  order_date?: string | null;
  delivery_date?: string | null;
  currency?: string;
  remark?: string;
  status?: number;
  lines?: OrderDetailLine[];
}

export default function EditPurchaseOrderPage() {
  const t = useTranslations('Purchase');
  const tc = useTranslations('Common');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [initial, setInitial] = useState<PurchaseOrderFormInitial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await authFetch(`/api/purchase/orders/${id}`);
        const body = await res.json();
        const data: OrderDetail | undefined = body?.data;
        if (!body?.success || !data?.id) {
          setError(body?.message || t('fetchFailed'));
          return;
        }
        if (data.status !== 10) {
          toast.warning(t('k_v9pftt'));
        }
        setInitial({
          orderId: data.id,
          poNo: data.po_no,
          supplierId: data.supplier_id ?? '',
          orderDate: data.order_date ? String(data.order_date).slice(0, 10) : '',
          deliveryDate: data.delivery_date ? String(data.delivery_date).slice(0, 10) : '',
          currency: data.currency || 'CNY',
          remark: data.remark || '',
          status: data.status ?? 10,
          items: (data.lines || []).map((item) => ({
            material_id: item.material_id ?? '',
            material_code: item.material_code || '',
            material_name: item.material_name || '',
            quantity: item.order_qty != null ? String(item.order_qty) : '',
            unit: item.unit || '',
            unit_price: item.unit_price != null ? String(item.unit_price) : '',
          })),
        });
      } catch {
        setError(t('fetchFailed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, t]);

  if (loading) {
    return (
      <MainLayout title={t('editPurchaseOrder')}>
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          {tc('loading')}
        </div>
      </MainLayout>
    );
  }

  if (error || !initial) {
    return (
      <MainLayout title={t('editPurchaseOrder')}>
        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="py-16 text-center space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error || t('fetchFailed')}
            </p>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => router.push('/purchase/orders')}
            >
              {tc('back')}
            </button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return <PurchaseOrderForm mode="edit" initial={initial} />;
}
