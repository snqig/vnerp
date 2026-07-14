'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, DollarSign, Factory, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';

interface DashboardData {
  period: string;
  orderMetrics: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalAmount: number;
    completedAmount: number;
    completionRate: number;
  };
  productionMetrics: {
    totalWorkOrders: number;
    completedWorkOrders: number;
    inProgressWorkOrders: number;
    totalPlanQty: number;
    totalCompletedQty: number;
    completionRate: number;
  };
  inventoryMetrics: {
    materialCount: number;
    totalStock: number;
    totalLocked: number;
    totalAvailable: number;
    zeroStockCount: number;
    lowStockCount: number;
  };
  purchaseMetrics: {
    totalPurchaseOrders: number;
    receivedOrders: number;
    totalPurchaseAmount: number;
  };
  financeMetrics: {
    pendingReceivable: number;
    pendingPayable: number;
  };
}

interface SupplierStat {
  rank: number;
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  orderCount: number;
  receivedCount: number;
  totalAmount: number;
  totalQuantity: number;
  proportion: number;
}

interface CustomerStat {
  rank: number;
  customerId: number;
  customerName: string;
  customerCode: string;
  orderCount: number;
  completedCount: number;
  totalAmount: number;
  totalWithTax: number;
  proportion: number;
}

export default function ReportsPage() {
  const tc = useTranslations('Common');
  const t = useTranslations('Reports');
  const locale = useLocale();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [supplierStats, setSupplierStats] = useState<SupplierStat[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/reports/dashboard?period=${period}`);
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierStats = async () => {
    try {
      const response = await authFetch(`/api/reports/purchase-supplier?period=${period}`);
      const result = await response.json();
      if (result.success) {
        setSupplierStats(result.data.list);
      }
    } catch {}
  };

  const fetchCustomerStats = async () => {
    try {
      const response = await authFetch(`/api/reports/sales-customer?period=${period}`);
      const result = await response.json();
      if (result.success) {
        setCustomerStats(result.data.list);
      }
    } catch {}
  };

  const handleTabChange = (value: string) => {
    if (value === 'purchaseSupplier' && supplierStats.length === 0) {
      fetchSupplierStats();
    } else if (value === 'salesCustomer' && customerStats.length === 0) {
      fetchCustomerStats();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US').format(num);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const data = dashboardData;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={period === '7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('7')}
          >
            {t('last7Days')}
          </Button>
          <Button
            variant={period === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30')}
          >
            {t('last30Days')}
          </Button>
          <Button
            variant={period === '90' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('90')}
          >
            {t('last90Days')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="orders">{t('orders')}</TabsTrigger>
          <TabsTrigger value="inventory">{t('inventory')}</TabsTrigger>
          <TabsTrigger value="costs">{t('costs')}</TabsTrigger>
          <TabsTrigger value="purchaseSupplier">{t('purchaseSupplier')}</TabsTrigger>
          <TabsTrigger value="salesCustomer">{t('salesCustomer')}</TabsTrigger>
        </TabsList>

        <div className="flex justify-end mb-2">
          <GlobalExportToolbar
            filename={t('exportFilename')}
            title={t('exportTitle')}
            subtitle={`${t('exportSubtitle')}: ${data?.period || t('last30Days')}`}
            columns={
              [
                { key: 'category', label: t('colCategory'), width: 15 },
                { key: 'metric', label: t('colMetric'), width: 20 },
                { key: 'value', label: t('colValue'), width: 15 },
                { key: 'unit', label: t('colUnit'), width: 8 },
                { key: 'trend', label: t('colTrend'), width: 10 },
              ] as ExportColumn[]
            }
            data={
              data
                ? [
                    {
                      category: t('catSalesOrder'),
                      metric: t('metricTotalOrders'),
                      value: data.orderMetrics.totalOrders,
                      unit: t('unitPiece'),
                      trend: '',
                    },
                    {
                      category: t('catSalesOrder'),
                      metric: t('metricCompletedOrders'),
                      value: data.orderMetrics.completedOrders,
                      unit: t('unitPiece'),
                      trend: '',
                    },
                    {
                      category: t('catSalesOrder'),
                      metric: t('metricTotalAmount'),
                      value: data.orderMetrics.totalAmount,
                      unit: t('unitYuan'),
                      trend: '',
                    },
                    {
                      category: t('catSalesOrder'),
                      metric: t('metricCompletionRate'),
                      value: `${data.orderMetrics.completionRate.toFixed(1)}%`,
                      unit: t('unitPercent'),
                      trend: '',
                    },
                    {
                      category: t('catProduction'),
                      metric: t('metricTotalWorkOrders'),
                      value: data.productionMetrics.totalWorkOrders,
                      unit: t('unitPiece'),
                      trend: '',
                    },
                    {
                      category: t('catProduction'),
                      metric: t('metricCompletedWorkOrders'),
                      value: data.productionMetrics.completedWorkOrders,
                      unit: t('unitPiece'),
                      trend: '',
                    },
                    {
                      category: t('catProduction'),
                      metric: t('metricInProgressWorkOrders'),
                      value: data.productionMetrics.inProgressWorkOrders,
                      unit: t('unitPiece'),
                      trend: '',
                    },
                    {
                      category: t('catInventory'),
                      metric: t('metricLowStockAlert'),
                      value: data.inventoryMetrics?.lowStockCount || 0,
                      unit: t('unitPiece'),
                      trend: '',
                    },
                    {
                      category: t('catPurchase'),
                      metric: t('metricTotalPurchaseAmount'),
                      value: data.purchaseMetrics?.totalPurchaseAmount || 0,
                      unit: t('unitYuan'),
                      trend: '',
                    },
                    {
                      category: t('catFinance'),
                      metric: t('metricPendingReceivable'),
                      value: data.financeMetrics?.pendingReceivable || 0,
                      unit: t('unitYuan'),
                      trend: '',
                    },
                    {
                      category: t('catFinance'),
                      metric: t('metricPendingPayable'),
                      value: data.financeMetrics?.pendingPayable || 0,
                      unit: t('unitYuan'),
                      trend: '',
                    },
                  ]
                : []
            }
            landscape={true}
            footer={t('exportFooter')}
          />
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('cardSalesOrder')}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.orderMetrics.totalOrders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('labelCompletionRate')}
                  {data?.orderMetrics.completionRate || 0}%
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                  {t('labelOrderAmount')}
                  {formatCurrency(data?.orderMetrics.totalAmount || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('cardProductionOrder')}</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.productionMetrics.totalWorkOrders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('labelInProgress')}
                  {data?.productionMetrics.inProgressWorkOrders || 0}
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                  {t('labelCompleted')}
                  {formatNumber(data?.productionMetrics.completedWorkOrders || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('cardInventory')}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.inventoryMetrics.materialCount || 0)}
                </div>
                <div className="flex gap-2 mt-2">
                  {data?.inventoryMetrics.zeroStockCount ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {t('labelOutOfStock')}
                      {data.inventoryMetrics.zeroStockCount}
                    </Badge>
                  ) : null}
                  {data?.inventoryMetrics.lowStockCount ? (
                    <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                      {t('labelLowStock')}
                      {data.inventoryMetrics.lowStockCount}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('cardFinance')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data?.financeMetrics.pendingReceivable || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{t('labelReceivable')}</p>
                <div className="mt-2 text-sm text-red-500">
                  {t('labelPayable')}
                  {formatCurrency(data?.financeMetrics.pendingPayable || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('orderTrendTitle')}</CardTitle>
                <CardDescription>{t('orderTrendDesc', { period })}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('labelTotalOrders')}</span>
                    <span className="font-medium">
                      {formatNumber(data?.orderMetrics.totalOrders || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{tc('completed')}</span>
                    <span className="font-medium text-green-600">
                      {formatNumber(data?.orderMetrics.completedOrders || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('labelPending')}</span>
                    <span className="font-medium text-orange-500">
                      {formatNumber(data?.orderMetrics.pendingOrders || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('labelOrderAmount')}</span>
                    <span className="font-medium">
                      {formatCurrency(data?.orderMetrics.totalAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('labelCompletedAmount')}</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(data?.orderMetrics.completedAmount || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('productionTitle')}</CardTitle>
                <CardDescription>{t('productionDesc', { period })}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('labelPlanQty')}</span>
                    <span className="font-medium">
                      {formatNumber(data?.productionMetrics.totalPlanQty || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('labelCompletedQty')}</span>
                    <span className="font-medium text-green-600">
                      {formatNumber(data?.productionMetrics.totalCompletedQty || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('labelCompletionRate')}</span>
                    <span className="font-medium">
                      {data?.productionMetrics.completionRate || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{tc('inProgress')}</span>
                    <span className="font-medium text-blue-500">
                      {formatNumber(data?.productionMetrics.inProgressWorkOrders || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('deliveryRateTitle')}</CardTitle>
              <CardDescription>{t('deliveryRateDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {t('deliveryRateHint')}
                <code className="ml-1">/api/reports/delivery-rate?groupBy=month</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventoryTurnoverTitle')}</CardTitle>
              <CardDescription>{t('inventoryTurnoverDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {t('deliveryRateHint')}
                <code className="ml-1">/api/reports/inventory-turnover?groupBy=category</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('productionCostTitle')}</CardTitle>
              <CardDescription>{t('productionCostDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {t('deliveryRateHint')}
                <code className="ml-1">/api/reports/production-cost?groupBy=workshop</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchaseSupplier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('purchaseSupplierTitle')}</CardTitle>
              <CardDescription>{t('purchaseSupplierDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {supplierStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t('rank')}</TableHead>
                      <TableHead>{t('supplierName')}</TableHead>
                      <TableHead>{t('supplierCode')}</TableHead>
                      <TableHead className="text-right">{t('orderCount')}</TableHead>
                      <TableHead className="text-right">{t('purchaseAmount')}</TableHead>
                      <TableHead className="text-right">{t('purchaseQty')}</TableHead>
                      <TableHead className="text-right">{t('unitPercent')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierStats.map((stat) => (
                      <TableRow key={stat.supplierId || stat.supplierName}>
                        <TableCell className="font-mono">{stat.rank}</TableCell>
                        <TableCell className="font-medium">{stat.supplierName}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {stat.supplierCode || '-'}
                        </TableCell>
                        <TableCell className="text-right">{stat.orderCount}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(stat.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(stat.totalQuantity)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {stat.proportion}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{tc('noData')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salesCustomer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('salesCustomerTitle')}</CardTitle>
              <CardDescription>{t('salesCustomerDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {customerStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t('rank')}</TableHead>
                      <TableHead>{t('customerName')}</TableHead>
                      <TableHead>{t('customerCode')}</TableHead>
                      <TableHead className="text-right">{t('orderCount')}</TableHead>
                      <TableHead className="text-right">{t('salesAmount')}</TableHead>
                      <TableHead className="text-right">{t('unitPercent')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerStats.map((stat) => (
                      <TableRow key={stat.customerId || stat.customerName}>
                        <TableCell className="font-mono">{stat.rank}</TableCell>
                        <TableCell className="font-medium">{stat.customerName}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {stat.customerCode || '-'}
                        </TableCell>
                        <TableCell className="text-right">{stat.orderCount}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(stat.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {stat.proportion}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{tc('noData')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
