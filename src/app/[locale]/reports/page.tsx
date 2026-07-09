'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, DollarSign, Factory, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

export default function ReportsPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">报表中心</h1>
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
          <h1 className="text-3xl font-bold">报表中心</h1>
          <p className="text-muted-foreground mt-1">{tc('text_px9nzj')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={period === '7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('7')}
          >
            近7天
          </Button>
          <Button
            variant={period === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30')}
          >
            近30天
          </Button>
          <Button
            variant={period === '90' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('90')}
          >
            近90天
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{tc('text_h4h9')}</TabsTrigger>
          <TabsTrigger value="orders">{tc('text_hylwx3')}</TabsTrigger>
          <TabsTrigger value="inventory">{tc('text_cb844p')}</TabsTrigger>
          <TabsTrigger value="costs">生产成本</TabsTrigger>
        </TabsList>

        <div className="flex justify-end mb-2">
          <GlobalExportToolbar
            filename="运营报表总览"
            title="企业运营核心指标报表"
            subtitle={`统计周期: ${data?.period || '近30天'}`}
            columns={
              [
                { key: 'category', label: '指标分类', width: 15 },
                { key: 'metric', label: '指标名称', width: 20 },
                { key: 'value', label: '数值', width: 15 },
                { key: 'unit', label: '单位', width: 8 },
                { key: 'trend', label: '趋势', width: 10 },
              ] as ExportColumn[]
            }
            data={
              data
                ? [
                    {
                      category: '销售订单',
                      metric: '总订单数',
                      value: data.orderMetrics.totalOrders,
                      unit: '个',
                      trend: '',
                    },
                    {
                      category: '销售订单',
                      metric: '已完成数',
                      value: data.orderMetrics.completedOrders,
                      unit: '个',
                      trend: '',
                    },
                    {
                      category: '销售订单',
                      metric: '总金额',
                      value: data.orderMetrics.totalAmount,
                      unit: '元',
                      trend: '',
                    },
                    {
                      category: '销售订单',
                      metric: '完成率',
                      value: `${data.orderMetrics.completionRate.toFixed(1)}%`,
                      unit: '%',
                      trend: '',
                    },
                    {
                      category: '生产',
                      metric: '工单总数',
                      value: data.productionMetrics.totalWorkOrders,
                      unit: '个',
                      trend: '',
                    },
                    {
                      category: '生产',
                      metric: '完成数',
                      value: data.productionMetrics.completedWorkOrders,
                      unit: '个',
                      trend: '',
                    },
                    {
                      category: '生产',
                      metric: '在制数',
                      value: data.productionMetrics.inProgressWorkOrders,
                      unit: '个',
                      trend: '',
                    },
                    {
                      category: '库存',
                      metric: '库存预警',
                      value: data.inventoryMetrics?.lowStockCount || 0,
                      unit: '个',
                      trend: '',
                    },
                    {
                      category: '采购',
                      metric: '采购总额',
                      value: data.purchaseMetrics?.totalPurchaseAmount || 0,
                      unit: '元',
                      trend: '',
                    },
                    {
                      category: '财务',
                      metric: '应收总额',
                      value: data.financeMetrics?.pendingReceivable || 0,
                      unit: '元',
                      trend: '',
                    },
                    {
                      category: '财务',
                      metric: '应付总额',
                      value: data.financeMetrics?.pendingPayable || 0,
                      unit: '元',
                      trend: '',
                    },
                  ]
                : []
            }
            landscape={true}
            footer="本报表由 ERP 系统自动生成。"
          />
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* 核心指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">销售订单</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.orderMetrics.totalOrders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  完成率
                  {data?.orderMetrics.completionRate || 0}%
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                  {tc('text_m2uha')}
                  {formatCurrency(data?.orderMetrics.totalAmount || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">生产工单</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.productionMetrics.totalWorkOrders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  进行中
                  {data?.productionMetrics.inProgressWorkOrders || 0}
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                  完成
                  {formatNumber(data?.productionMetrics.completedWorkOrders || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{tc('text_cbczlh')}</CardTitle>
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
                      缺货
                      {data.inventoryMetrics.zeroStockCount}
                    </Badge>
                  ) : null}
                  {data?.inventoryMetrics.lowStockCount ? (
                    <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                      {tc('text_c2rcj')}
                      {data.inventoryMetrics.lowStockCount}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{tc('text_rf80cx')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data?.financeMetrics.pendingReceivable || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{tc('receivable')}</p>
                <div className="mt-2 text-sm text-red-500">
                  {tc('text_e84c6')}
                  {formatCurrency(data?.financeMetrics.pendingPayable || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 详细数据 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>订单趋势</CardTitle>
                <CardDescription>
                  近{period}
                  {tc('text_whcsy8')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">总订单数</span>
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
                    <span className="text-sm">待处理</span>
                    <span className="font-medium text-orange-500">
                      {formatNumber(data?.orderMetrics.pendingOrders || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">订单金额</span>
                    <span className="font-medium">
                      {formatCurrency(data?.orderMetrics.totalAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{tc('text_byr6k0')}</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(data?.orderMetrics.completedAmount || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tc('text_f40ln7')}</CardTitle>
                <CardDescription>
                  近{period}
                  {tc('text_97c523')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">计划数量</span>
                    <span className="font-medium">
                      {formatNumber(data?.productionMetrics.totalPlanQty || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">完成数量</span>
                    <span className="font-medium text-green-600">
                      {formatNumber(data?.productionMetrics.totalCompletedQty || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">完成率</span>
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
              <CardTitle>订单交付率报表</CardTitle>
              <CardDescription>{tc('text_zf9o8i')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                请访问
                <code>/api/reports/delivery-rate?groupBy=month</code>
                {tc('text_q2ngf7')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>库存周转率报表</CardTitle>
              <CardDescription>{tc('text_hmg0ih')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                请访问
                <code>/api/reports/inventory-turnover?groupBy=category</code>
                {tc('text_q2ngf7')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>生产成本汇总报表</CardTitle>
              <CardDescription>{tc('text_hh5jvg')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                请访问
                <code>/api/reports/production-cost?groupBy=workshop</code>
                {tc('text_q2ngf7')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
