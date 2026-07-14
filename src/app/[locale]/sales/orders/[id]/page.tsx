'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Truck, Receipt, FileText, Package } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { logger } from '@/lib/logger';

interface SalesOrderDetail {
  id: number;
  order_no: string;
  customer_id: number;
  customer_name: string;
  contact_name: string;
  contact_phone: string;
  delivery_address: string;
  order_date: string;
  delivery_date: string;
  total_amount: number;
  total_with_tax: number;
  status: number;
  remark: string;
  create_time: string;
  items?: SalesOrderItem[];
  [key: string]: unknown;
}

interface SalesOrderItem {
  id: number;
  material_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  delivered_qty?: number;
  [key: string]: unknown;
}

interface DeliveryRecord {
  id: number;
  delivery_no: string;
  delivery_date: string;
  customer_name: string;
  total_qty: number;
  total_amount: number;
  status: number;
  logistics_company: string;
  tracking_no: string;
  delivery_address: string;
  contact_name: string;
  contact_phone: string;
  ship_time: string;
  sign_status: number;
  [key: string]: unknown;
}

interface SalesReturnRecord {
  id: number;
  return_no: string;
  return_date: string;
  customer_name: string;
  reason: string;
  remark: string;
  total_amount: number;
  status: number;
  [key: string]: unknown;
}

interface ReceivableRecord {
  id: number;
  receivable_no: string;
  source_no: string;
  customer_id: number;
  amount: number;
  received_amount: number;
  balance: number;
  status: number;
  receivable_date: string;
  due_date: string;
  [key: string]: unknown;
}

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

const formatCurrency = (amount: number) => {
  return `¥${Number(amount || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const SALES_STATUS_CLASS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-orange-100 text-orange-700',
  4: 'bg-green-100 text-green-700',
  5: 'bg-red-100 text-red-700',
  6: 'bg-red-100 text-red-700',
};

const SALES_STATUS_KEY: Record<number, string> = {
  1: 'statusPending',
  2: 'statusConfirmed',
  3: 'statusPartialShip',
  4: 'statusCompleted',
  5: 'statusCancelled',
  6: 'statusCancelled',
};

const DELIVERY_STATUS_KEY: Record<number, string> = {
  1: 'pendingDelivery',
  2: 'delivered',
  3: 'partialSigned',
  4: 'signed',
  5: 'rejected',
};

const SIGN_STATUS_KEY: Record<number, string> = {
  0: 'notSigned',
  1: 'partialSigned',
  2: 'signed',
  3: 'rejected',
};

const RETURN_STATUS_KEY: Record<number, string> = {
  10: 'draft',
  20: 'approved',
  30: 'completed',
  90: 'closed',
};

const RECEIVABLE_STATUS_KEY: Record<number, string> = {
  1: 'unpaid',
  2: 'partialPaid',
  3: 'settled',
  4: 'void',
};

async function fetchJson(response: Response): Promise<Loose> {
  return (await response.json()) as Loose;
}

export default function SalesOrderDetailPage() {
  const t = useTranslations('Sales');
  const tc = useTranslations('Common');
  const params = useParams();
  const router = useRouter();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [returnRecords, setReturnRecords] = useState<SalesReturnRecord[]>([]);
  const [receivableRecords, setReceivableRecords] = useState<ReceivableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const response = await authFetch(
        `/api/orders/sales?keyword=${encodeURIComponent(String(orderId))}`
      );
      const result = await fetchJson(response);
      if (result.success) {
        const list = Array.isArray(result.data?.list) ? result.data.list : [];
        const matched = list.find((o: Loose) => String(o.id) === String(orderId));
        if (matched) {
          setOrder(matched as SalesOrderDetail);
        } else if (list.length > 0) {
          setOrder(list[0] as SalesOrderDetail);
        }
      }
    } catch (error) {
      logger.error(
        { module: 'Sales', action: 'fetchOrderDetail' },
        'Failed to fetch sales order detail',
        {
          error: (error as Error).message,
          orderId,
        }
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const fetchDeliveryRecords = useCallback(async () => {
    if (!orderId) return;
    setTabLoading('delivery');
    try {
      const response = await authFetch(
        `/api/sales/delivery?order_id=${encodeURIComponent(String(orderId))}`
      );
      const result = await fetchJson(response);
      if (result.success) {
        const list = Array.isArray(result.data) ? result.data : result.data?.list || [];
        setDeliveryRecords(list);
      }
    } catch (error) {
      logger.warn({ module: 'Sales', action: 'fetchDeliveryRecords' }, '获取发货记录失败', {
        error: (error as Error).message,
      });
    } finally {
      setTabLoading(null);
    }
  }, [orderId]);

  const fetchReturnRecords = useCallback(async () => {
    if (!orderId) return;
    setTabLoading('return');
    try {
      const response = await authFetch(
        `/api/sales/return?orderId=${encodeURIComponent(String(orderId))}&pageSize=100`
      );
      const result = await fetchJson(response);
      if (result.success) {
        const list = Array.isArray(result.data) ? result.data : result.data?.list || [];
        setReturnRecords(list);
      }
    } catch (error) {
      logger.warn({ module: 'Sales', action: 'fetchReturnRecords' }, '获取退货记录失败', {
        error: (error as Error).message,
      });
    } finally {
      setTabLoading(null);
    }
  }, [orderId]);

  const fetchReceivableRecords = useCallback(async () => {
    if (!order?.order_no) return;
    setTabLoading('receivable');
    try {
      const response = await authFetch(
        `/api/finance/receivable?sourceNo=${encodeURIComponent(order.order_no)}&pageSize=100`
      );
      const result = await fetchJson(response);
      if (result.success) {
        const list = Array.isArray(result.data) ? result.data : result.data?.list || [];
        setReceivableRecords(list);
      }
    } catch (error) {
      logger.warn({ module: 'Sales', action: 'fetchReceivableRecords' }, '获取应收记录失败', {
        error: (error as Error).message,
      });
    } finally {
      setTabLoading(null);
    }
  }, [order?.order_no]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleTabChange = (value: string) => {
    if (value === 'delivery' && deliveryRecords.length === 0) {
      fetchDeliveryRecords();
    } else if (value === 'return' && returnRecords.length === 0) {
      fetchReturnRecords();
    } else if (value === 'receivable' && receivableRecords.length === 0) {
      fetchReceivableRecords();
    }
  };

  if (loading) {
    return (
      <MainLayout title={t('order')}>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout title={t('order')}>
        <div className="p-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tc('back')}
          </Button>
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{tc('noData')}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('order')}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tc('back')}
          </Button>
          <h1 className="text-xl font-semibold">
            {t('orderNo')}: {order.order_no}
          </h1>
        </div>

        {/* 订单基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {order.order_no}
              <Badge className={SALES_STATUS_CLASS[order.status] || 'bg-gray-100'}>
                {SALES_STATUS_KEY[order.status] ? t(SALES_STATUS_KEY[order.status]) : tc('unknown')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('customerName')}</span>
                <p className="font-medium">{order.customer_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{tc('date')}</span>
                <p className="font-medium">{formatDate(order.order_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('deliveryDate')}</span>
                <p className="font-medium">{formatDate(order.delivery_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{tc('amount')}</span>
                <p className="font-medium">
                  {formatCurrency(Number(order.total_with_tax || order.total_amount || 0))}
                </p>
              </div>
              {order.contact_name && (
                <div>
                  <span className="text-muted-foreground">{tc('contact')}</span>
                  <p className="font-medium">{order.contact_name}</p>
                </div>
              )}
              {order.contact_phone && (
                <div>
                  <span className="text-muted-foreground">{tc('phone')}</span>
                  <p className="font-medium">{order.contact_phone}</p>
                </div>
              )}
              {order.delivery_address && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{tc('address')}</span>
                  <p className="font-medium">{order.delivery_address}</p>
                </div>
              )}
              {order.remark && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{tc('remark')}</span>
                  <p className="font-medium">{order.remark}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 全链路 Tab */}
        <Tabs defaultValue="lines" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="lines">{tc('orderLines')}</TabsTrigger>
            <TabsTrigger value="delivery">
              <Truck className="h-4 w-4 mr-1" />
              {tc('deliveryRecord')}
            </TabsTrigger>
            <TabsTrigger value="return">
              <Receipt className="h-4 w-4 mr-1" />
              {tc('returnRecord')}
            </TabsTrigger>
            <TabsTrigger value="receivable">
              <FileText className="h-4 w-4 mr-1" />
              {tc('receivableRecord')}
            </TabsTrigger>
            <TabsTrigger value="logistics">
              <Package className="h-4 w-4 mr-1" />
              {tc('logisticsInfo')}
            </TabsTrigger>
          </TabsList>

          {/* 订单明细 */}
          <TabsContent value="lines">
            <Card>
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{tc('materialName')}</TableHead>
                      <TableHead className="text-right">{tc('quantity')}</TableHead>
                      <TableHead>{tc('unit')}</TableHead>
                      <TableHead className="text-right">{t('unitPrice')}</TableHead>
                      <TableHead className="text-right">{tc('amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <TableRow key={item.id || idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>{item.material_name || '-'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit || '-'}</TableCell>
                          <TableCell className="text-right">
                            {Number(item.unit_price || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(item.total_price || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          {tc('noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 发货记录 */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {tc('deliveryRecord')}
                  {tabLoading === 'delivery' && (
                    <span className="ml-2 text-xs text-muted-foreground">{tc('loading')}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('deliveryNo')}</TableHead>
                      <TableHead>{tc('date')}</TableHead>
                      <TableHead>{t('customerName')}</TableHead>
                      <TableHead className="text-right">{tc('quantity')}</TableHead>
                      <TableHead className="text-right">{tc('amount')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryRecords.length > 0 ? (
                      deliveryRecords.map((rec) => (
                        <TableRow
                          key={rec.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/sales/delivery?id=${rec.id}`)}
                        >
                          <TableCell className="font-mono">{rec.delivery_no}</TableCell>
                          <TableCell>{formatDate(rec.delivery_date)}</TableCell>
                          <TableCell>{rec.customer_name || '-'}</TableCell>
                          <TableCell className="text-right">{rec.total_qty}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(rec.total_amount || 0))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {DELIVERY_STATUS_KEY[rec.status]
                                ? t(DELIVERY_STATUS_KEY[rec.status])
                                : rec.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          {tc('noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 退货记录 */}
          <TabsContent value="return">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {tc('returnRecord')}
                  {tabLoading === 'return' && (
                    <span className="ml-2 text-xs text-muted-foreground">{tc('loading')}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('returnNo') || tc('returnNo')}</TableHead>
                      <TableHead>{tc('date')}</TableHead>
                      <TableHead>{t('customerName')}</TableHead>
                      <TableHead>{tc('reason')}</TableHead>
                      <TableHead className="text-right">{tc('amount')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnRecords.length > 0 ? (
                      returnRecords.map((rec) => (
                        <TableRow
                          key={rec.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/sales/return?id=${rec.id}`)}
                        >
                          <TableCell className="font-mono">{rec.return_no}</TableCell>
                          <TableCell>{formatDate(rec.return_date)}</TableCell>
                          <TableCell>{rec.customer_name || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {rec.reason || rec.remark || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(rec.total_amount || 0))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {RETURN_STATUS_KEY[rec.status]
                                ? tc(RETURN_STATUS_KEY[rec.status])
                                : rec.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          {tc('noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 应收记录 */}
          <TabsContent value="receivable">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {tc('receivableRecord')}
                  {tabLoading === 'receivable' && (
                    <span className="ml-2 text-xs text-muted-foreground">{tc('loading')}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('receivableNo')}</TableHead>
                      <TableHead>{tc('sourceNo')}</TableHead>
                      <TableHead className="text-right">{tc('amount')}</TableHead>
                      <TableHead className="text-right">{tc('receivedAmount')}</TableHead>
                      <TableHead className="text-right">{tc('balance')}</TableHead>
                      <TableHead>{tc('dueDate')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivableRecords.length > 0 ? (
                      receivableRecords.map((rec) => (
                        <TableRow
                          key={rec.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/finance/receivables?id=${rec.id}`)}
                        >
                          <TableCell className="font-mono">{rec.receivable_no}</TableCell>
                          <TableCell className="font-mono">{rec.source_no || '-'}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(rec.amount || 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(rec.received_amount || 0))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(rec.balance || 0))}
                          </TableCell>
                          <TableCell>{formatDate(rec.due_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {RECEIVABLE_STATUS_KEY[rec.status]
                                ? tc(RECEIVABLE_STATUS_KEY[rec.status])
                                : rec.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          {tc('noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 物流信息 */}
          <TabsContent value="logistics">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {tc('logisticsInfo')}
                  {tabLoading === 'delivery' && (
                    <span className="ml-2 text-xs text-muted-foreground">{tc('loading')}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deliveryRecords.length > 0 ? (
                  <div className="space-y-4">
                    {deliveryRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="border rounded-lg p-4 hover:bg-muted/30 cursor-pointer"
                        onClick={() => router.push(`/sales/delivery?id=${rec.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-medium">{rec.delivery_no}</span>
                          <Badge variant="outline">
                            {DELIVERY_STATUS_KEY[rec.status]
                              ? t(DELIVERY_STATUS_KEY[rec.status])
                              : rec.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('logisticsCompany')}</span>
                            <p className="font-medium">{rec.logistics_company || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('trackingNo')}</span>
                            <p className="font-mono text-sm">{rec.tracking_no || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('signStatus')}</span>
                            <p className="font-medium">
                              {SIGN_STATUS_KEY[rec.sign_status]
                                ? t(SIGN_STATUS_KEY[rec.sign_status])
                                : rec.sign_status}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{tc('contact')}</span>
                            <p className="font-medium">{rec.contact_name || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{tc('phone')}</span>
                            <p className="font-medium">{rec.contact_phone || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('shipTime')}</span>
                            <p className="font-medium">{formatDate(rec.ship_time)}</p>
                          </div>
                          {rec.delivery_address && (
                            <div className="col-span-2 md:col-span-3">
                              <span className="text-muted-foreground">{tc('address')}</span>
                              <p className="font-medium">{rec.delivery_address}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">{tc('noData')}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
