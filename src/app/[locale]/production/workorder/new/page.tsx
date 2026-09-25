'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useRouter } from '@/i18n/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SalesOrder {
  id: number;
  order_no: string;
  customer_name: string;
}

interface BOMItem {
  id: number;
  bom_code: string;
  bom_no?: string;
  product_name: string;
  product_id?: number;
  version: string;
}

export default function NewWorkOrderPage() {
  const t = useTranslations('Production');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [bomList, setBomList] = useState<BOMItem[]>([]);
  const [orderNo, setOrderNo] = useState('');
  const [bomId, setBomId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [planStartDate, setPlanStartDate] = useState('');
  const [planEndDate, setPlanEndDate] = useState('');
  const [remark, setRemark] = useState('');
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<{
    customer_name: string;
    items: {
      material_id: number | null;
      material_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

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

  const fetchSalesOrderDetail = useCallback(async (no: string) => {
    try {
      const res = await authFetch(`/api/orders?id=${encodeURIComponent(no)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedSalesOrder({
          customer_name: data.data.customer_name || '',
          items: Array.isArray(data.data.items) ? data.data.items : [],
        });
      } else {
        setSelectedSalesOrder(null);
      }
    } catch {
      setSelectedSalesOrder(null);
    }
  }, []);

  useEffect(() => {
    fetchSalesOrders();
    fetchBomList();
  }, [fetchSalesOrders, fetchBomList]);

  const handleSubmit = async () => {
    if (!orderNo) {
      toast({ title: tc('error'), description: t('selectSalesOrder'), variant: 'destructive' });
      return;
    }
    const items = selectedSalesOrder?.items || [];
    if (items.length === 0) {
      toast({ title: tc('error'), description: t('salesOrderNoItems'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/workorders', {
        method: 'POST',
        body: JSON.stringify({
          order_no: orderNo,
          customer_name: selectedSalesOrder?.customer_name || '',
          items: items.map((i) => ({
            material_id: i.material_id ?? null,
            material_name: i.material_name,
            quantity: i.quantity,
            unit: i.unit,
            unit_price: i.unit_price,
          })),
          bom_id: parseInt(bomId) || null,
          priority,
          plan_start_date: planStartDate || null,
          plan_end_date: planEndDate || null,
          remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('success'), description: t('createSuccess') });
        router.push('/production/workorder');
      } else {
        toast({ title: tc('error'), description: data.message || t('createFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('createFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/production/workorder')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tc('back')}
        </Button>
        <h1 className="text-2xl font-bold">{t('newWorkOrder')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('createWorkOrderDesc')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('relatedSalesOrder')}</Label>
              <Select value={orderNo} onValueChange={(v) => { setOrderNo(v); fetchSalesOrderDetail(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSalesOrder')} />
                </SelectTrigger>
                <SelectContent position="popper">
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
              <Select value={bomId} onValueChange={setBomId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectBOM')} />
                </SelectTrigger>
                <SelectContent position="popper">
                  {bomList.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.bom_no} - {b.product_name || t('unknownProduct')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedSalesOrder ? (
            <div className="space-y-2">
              <Label>{t('workOrderMaterials')}</Label>
              <div className="max-h-44 overflow-auto rounded-md border p-3 text-sm">
                <p className="mb-2 text-muted-foreground">
                  {t('customer')}: {selectedSalesOrder.customer_name || t('unknownCustomer')}
                  {' · '}
                  {t('quantity')}: {selectedSalesOrder.items.length}
                </p>
                {selectedSalesOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <span>{it.material_name || t('unknownProduct')}</span>
                    <span className="text-muted-foreground">
                      {parseFloat(String(it.quantity)).toLocaleString(locale)} {it.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t('selectSalesOrder')}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('priority.label')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPriority')} />
                </SelectTrigger>
                <SelectContent position="popper">
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
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('planStartDate')}</Label>
              <Input
                type="date"
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('planEndDate')}</Label>
              <Input
                type="date"
                value={planEndDate}
                onChange={(e) => setPlanEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => router.push('/production/workorder')}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {t('createWorkOrder')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
