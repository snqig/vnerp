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
import { ArrowLeft, Package, Receipt, FileText } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import ApiClient from '@/lib/api-client';
import { logger } from '@/lib/logger';

interface PurchaseOrderDetail {
  id: number;
  po_no: string;
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  order_date: string;
  delivery_date: string;
  total_amount: number;
  total_quantity: number;
  grand_total: number;
  status: number;
  status_label?: string;
  remark: string;
  create_time: string;
  audit_time: string | null;
  lines: PurchaseOrderLine[];
  [key: string]: unknown;
}

interface PurchaseOrderLine {
  id: number;
  line_no: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  unit: string;
  order_qty: number;
  received_qty: number;
  unit_price: number;
  amount: number;
  [key: string]: unknown;
}

interface InboundRecord {
  id: number;
  order_no: string;
  inbound_date: string;
  supplier_name: string;
  order_type: string;
  total_quantity: number;
  total_amount: number;
  status: string;
  [key: string]: unknown;
}

interface PurchaseReturnRecord {
  id: number;
  return_no: string;
  return_date: string;
  supplier_name: string;
  reason: string;
  total_amount: number;
  status: number;
  outbound_order_no: string;
  payable_no: string;
  [key: string]: unknown;
}

interface PayableRecord {
  id: number;
  payable_no: string;
  source_no: string;
  supplier_id: number;
  amount: number;
  paid_amount: number;
  balance: number;
  status: number;
  payable_date: string;
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

const PO_STATUS_CLASS: Record<number, string> = {
  10: 'bg-gray-100 text-gray-700',
  20: 'bg-yellow-100 text-yellow-700',
  30: 'bg-blue-100 text-blue-700',
  40: 'bg-orange-100 text-orange-700',
  50: 'bg-green-100 text-green-700',
  90: 'bg-red-100 text-red-700',
};

const INBOUND_STATUS_KEY: Record<string, string> = {
  draft: 'draft',
  pending: 'pending',
  approved: 'approved',
  cancelled: 'cancelled',
};

const PAYABLE_STATUS_KEY: Record<number, string> = {
  1: 'unpaid',
  2: 'partialPaid',
  3: 'settled',
};

const RETURN_STATUS_KEY: Record<number, string> = {
  10: 'draft',
  20: 'approved',
  30: 'completed',
  90: 'closed',
};

export default function PurchaseOrderDetailPage() {
  const t = useTranslations('Purchase');
  const tc = useTranslations('Common');
  const params = useParams();
  const router = useRouter();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>([]);
  const [returnRecords, setReturnRecords] = useState<PurchaseReturnRecord[]>([]);
  const [payableRecords, setPayableRecords] = useState<PayableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      // 列表 API 支持按 ID 不可直接查，使用 keyword 精确匹配
      const data = await ApiClient.get('/api/purchase/orders', {
        page: 1,
        pageSize: 50,
        keyword: String(orderId),
      });
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : data.data?.list || [];
        // 找到 id 匹配的订单
        const matched = list.find((o: Loose) => String(o.id) === String(orderId));
        if (matched) {
          setOrder(matched as PurchaseOrderDetail);
        } else if (list.length > 0) {
          // keyword 搜索 po_no 也可能命中
          setOrder(list[0] as PurchaseOrderDetail);
        }
      }
    } catch (error) {
      logger.error(
        { module: 'Purchase', action: 'fetchOrderDetail' },
        'Failed to fetch purchase order detail',
        {
          error: (error as Error).message,
          orderId,
        }
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const fetchInboundRecords = useCallback(async () => {
    if (!order?.po_no) return;
    setTabLoading('inbound');
    try {
      const data = await ApiClient.get('/api/warehouse/inbound', {
        page: 1,
        pageSize: 100,
        keyword: order.po_no,
      });
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : data.data?.list || [];
        // 仅保留关联当前采购单的入库单
        const filtered = list.filter(
          (r: Loose) => r.po_no === order.po_no || r.order_type === 'purchase'
        );
        setInboundRecords(filtered);
      }
    } catch (error) {
      logger.warn({ module: 'Purchase', action: 'fetchInboundRecords' }, '获取入库记录失败', {
        error: (error as Error).message,
      });
    } finally {
      setTabLoading(null);
    }
  }, [order?.po_no]);

  const fetchReturnRecords = useCallback(async () => {
    if (!order?.id) return;
    setTabLoading('return');
    try {
      const data = await ApiClient.get('/api/purchase/return', {
        page: 1,
        pageSize: 100,
      });
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : data.data?.list || [];
        // 仅保留关联当前采购订单的退货单
        const filtered = list.filter((r: Loose) => String(r.order_id) === String(order.id));
        setReturnRecords(filtered);
      }
    } catch (error) {
      logger.warn({ module: 'Purchase', action: 'fetchReturnRecords' }, '获取退货记录失败', {
        error: (error as Error).message,
      });
    } finally {
      setTabLoading(null);
    }
  }, [order?.id]);

  const fetchPayableRecords = useCallback(async () => {
    if (!order?.po_no) return;
    setTabLoading('payable');
    try {
      const data = await ApiClient.get('/api/finance/payable', {
        page: 1,
        pageSize: 100,
        sourceNo: order.po_no,
      });
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : data.data?.list || [];
        setPayableRecords(list);
      }
    } catch (error) {
      logger.warn({ module: 'Purchase', action: 'fetchPayableRecords' }, '获取应付记录失败', {
        error: (error as Error).message,
      });
    } finally {
      setTabLoading(null);
    }
  }, [order?.po_no]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleTabChange = (value: string) => {
    if (value === 'inbound' && inboundRecords.length === 0) {
      fetchInboundRecords();
    } else if (value === 'return' && returnRecords.length === 0) {
      fetchReturnRecords();
    } else if (value === 'payable' && payableRecords.length === 0) {
      fetchPayableRecords();
    }
  };

  if (loading) {
    return (
      <MainLayout title={t('purchaseOrderDetail')}>
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
      <MainLayout title={t('purchaseOrderDetail')}>
        <div className="p-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tc('back')}
          </Button>
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('noPurchaseOrders')}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('purchaseOrderDetail')}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tc('back')}
          </Button>
          <h1 className="text-xl font-semibold">{t('purchaseOrderDetail')}</h1>
        </div>

        {/* 订单基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {order.po_no}
              <Badge className={PO_STATUS_CLASS[order.status] || 'bg-gray-100'}>
                {order.status_label || tc('unknown')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('supplier')}</span>
                <p className="font-medium">{order.supplier_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('orderDate')}</span>
                <p className="font-medium">{formatDate(order.order_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('expectedDelivery')}</span>
                <p className="font-medium">{formatDate(order.delivery_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{tc('amount')}</span>
                <p className="font-medium">
                  {formatCurrency(order.grand_total || order.total_amount)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('totalQty')}</span>
                <p className="font-medium">{order.total_quantity}</p>
              </div>
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
            <TabsTrigger value="inbound">
              <Package className="h-4 w-4 mr-1" />
              {tc('inboundRecord')}
            </TabsTrigger>
            <TabsTrigger value="return">
              <Receipt className="h-4 w-4 mr-1" />
              {tc('returnRecord')}
            </TabsTrigger>
            <TabsTrigger value="payable">
              <FileText className="h-4 w-4 mr-1" />
              {tc('payableRecord')}
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
                      <TableHead>{t('materialCode')}</TableHead>
                      <TableHead>{t('materialName')}</TableHead>
                      <TableHead>{t('specification')}</TableHead>
                      <TableHead className="text-right">{tc('quantity')}</TableHead>
                      <TableHead>{tc('unit')}</TableHead>
                      <TableHead className="text-right">{t('unitPrice')}</TableHead>
                      <TableHead className="text-right">{tc('amount')}</TableHead>
                      <TableHead className="text-right">{t('receivedQty')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lines && order.lines.length > 0 ? (
                      order.lines.map((line, idx) => (
                        <TableRow key={line.id || idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono">{line.material_code || '-'}</TableCell>
                          <TableCell>{line.material_name || '-'}</TableCell>
                          <TableCell>{line.material_spec || '-'}</TableCell>
                          <TableCell className="text-right">{line.order_qty}</TableCell>
                          <TableCell>{line.unit || '-'}</TableCell>
                          <TableCell className="text-right">
                            {Number(line.unit_price || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(line.amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">{line.received_qty ?? 0}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                          {t('noDetailData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 入库记录 */}
          <TabsContent value="inbound">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {tc('inboundRecord')}
                  {tabLoading === 'inbound' && (
                    <span className="ml-2 text-xs text-muted-foreground">{tc('loading')}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('orderNo')}</TableHead>
                      <TableHead>{tc('date')}</TableHead>
                      <TableHead>{t('supplier')}</TableHead>
                      <TableHead className="text-right">{tc('quantity')}</TableHead>
                      <TableHead className="text-right">{tc('amount')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inboundRecords.length > 0 ? (
                      inboundRecords.map((rec) => (
                        <TableRow
                          key={rec.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/warehouse/inbound?id=${rec.id}`)}
                        >
                          <TableCell className="font-mono">{rec.order_no}</TableCell>
                          <TableCell>{formatDate(rec.inbound_date)}</TableCell>
                          <TableCell>{rec.supplier_name || '-'}</TableCell>
                          <TableCell className="text-right">{rec.total_quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(rec.total_amount || 0))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {INBOUND_STATUS_KEY[rec.status]
                                ? tc(INBOUND_STATUS_KEY[rec.status])
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
                      <TableHead>{t('returnNo')}</TableHead>
                      <TableHead>{t('returnDate')}</TableHead>
                      <TableHead>{t('supplier')}</TableHead>
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
                          onClick={() => router.push(`/purchase/return?id=${rec.id}`)}
                        >
                          <TableCell className="font-mono">{rec.return_no}</TableCell>
                          <TableCell>{formatDate(rec.return_date)}</TableCell>
                          <TableCell>{rec.supplier_name || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{rec.reason || '-'}</TableCell>
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

          {/* 应付记录 */}
          <TabsContent value="payable">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {tc('payableRecord')}
                  {tabLoading === 'payable' && (
                    <span className="ml-2 text-xs text-muted-foreground">{tc('loading')}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('payableNo')}</TableHead>
                      <TableHead>{tc('sourceNo')}</TableHead>
                      <TableHead className="text-right">{tc('amount')}</TableHead>
                      <TableHead className="text-right">{tc('paidAmount')}</TableHead>
                      <TableHead className="text-right">{tc('balance')}</TableHead>
                      <TableHead>{tc('dueDate')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payableRecords.length > 0 ? (
                      payableRecords.map((rec) => (
                        <TableRow
                          key={rec.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/finance/payables?id=${rec.id}`)}
                        >
                          <TableCell className="font-mono">{rec.payable_no}</TableCell>
                          <TableCell className="font-mono">{rec.source_no || '-'}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(rec.amount || 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(rec.paid_amount || 0))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(rec.balance || 0))}
                          </TableCell>
                          <TableCell>{formatDate(rec.due_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {PAYABLE_STATUS_KEY[rec.status]
                                ? tc(PAYABLE_STATUS_KEY[rec.status])
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
        </Tabs>
      </div>
    </MainLayout>
  );
}
