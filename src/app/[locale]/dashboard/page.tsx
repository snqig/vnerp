'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Package,
  Factory,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface DashboardData {
  stats: {
    todayOrders: number;
    orderChange: number;
    pendingOrders: number;
    producingOrders: number;
    completedToday: number;
    inventoryAlert: number;
    totalCustomers: number;
    totalEmployees: number;
    todayProduction: number;
    productionChange: number;
  };
  recentOrders: {
    id: number;
    orderNo: string;
    customer: string;
    product: string;
    quantity: number;
    status: number;
    date: string;
  }[];
  alerts: { type: string; message: string; severity: string; time: string }[];
  orderStats: { date: string; count: number }[];
}

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');

  const [currentTime, setCurrentTime] = useState<string>('');
  const [data, setData] = useState<DashboardData>({
    stats: {
      todayOrders: 0,
      orderChange: 0,
      pendingOrders: 0,
      producingOrders: 0,
      completedToday: 0,
      inventoryAlert: 0,
      totalCustomers: 0,
      totalEmployees: 0,
      todayProduction: 0,
      productionChange: 0,
    },
    recentOrders: [],
    alerts: [],
    orderStats: [],
  });
  const [loading, setLoading] = useState(true);

  const s = data.stats;

  const fetchDashboard = async () => {
    try {
      const res = await authFetch('/api/dashboard');
      const result = await res.json();
      if (result.success && result.data) setData(result.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusBadge = (status: number) => {
    const map: Record<
      number,
      { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      0: { label: tc('draft'), variant: 'secondary' },
       1: { label: t('statusConfirmed'), variant: 'default' },
       2: { label: t('statusInProduction'), variant: 'default' },
       3: { label: t('statusCompleted'), variant: 'outline' },
    };
    const cfg = map[status] || { label: tc('unknown'), variant: 'secondary' as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <MainLayout title={t('title')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
            <p className="text-muted-foreground mt-1">
              {t('welcome', { time: currentTime })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-testid="dashboard-refresh"
            onClick={() => {
              setLoading(true);
              fetchDashboard();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {tc('refresh')}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('todayOrders')}</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.todayOrders}</div>
              <div className="flex items-center text-xs">
                {s.orderChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={s.orderChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {s.orderChange >= 0 ? '+' : ''}
                  {s.orderChange}%
                </span>
                <span className="text-muted-foreground ml-1">{t('vsYesterday')}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingWorkOrders')}</CardTitle>
              <Factory className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.pendingOrders}</div>
              <p className="text-xs text-muted-foreground">{t('producingCount', { count: s.producingOrders })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('lowStock')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.inventoryAlert}</div>
              <p className="text-xs text-muted-foreground">{t('needRestock')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('todayCompleted')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.completedToday}</div>
              <p className="text-xs text-muted-foreground">{t('workOrderCompletion')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('customersTitle')}</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">{t('activeCustomers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalEmployees')}</CardTitle>
              <Users className="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">{t('activeEmployees')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('todayProduction')}</CardTitle>
              <Package className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.todayProduction.toLocaleString()}</div>
              <div className="flex items-center text-xs">
                {s.productionChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={s.productionChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  +{s.productionChange}%
                </span>
                <span className="text-muted-foreground ml-1">{t('vsYesterday')}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('todayRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{(s.todayOrders * 15000).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{t('estimatedRevenue')}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">{t('recentOrderList')}</TabsTrigger>
            <TabsTrigger value="alerts">{t('alertNotifications')}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('recentWorkOrderList')}</CardTitle>
                  <CardDescription>{t('recentWorkOrderDesc')}</CardDescription>
                </div>
                <Link href="/production/orders">
                  <Button variant="outline" size="sm">
                    {t('viewAll')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {data.recentOrders.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    {loading ? tc('loading') : t('noWorkOrderData')}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('workOrderNo')}</TableHead>
                        <TableHead>{t('customer')}</TableHead>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead>{t('quantity')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium font-mono">{o.orderNo}</TableCell>
                          <TableCell>{o.customer || '-'}</TableCell>
                          <TableCell>{o.product || '-'}</TableCell>
                          <TableCell>{Number(o.quantity).toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(o.status)}</TableCell>
                          <TableCell>{o.date?.substring(0, 10) || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('alertNotifications')}</CardTitle>
                <CardDescription>{t('alertDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.alerts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">{t('noAlerts')}</p>
                ) : (
                  <div className="space-y-3">
                    {data.alerts.map((a, i) => {
                      const iconMap: Record<string, typeof AlertTriangle> = {
                        order: FileText,
                        production: Factory,
                        inventory: Package,
                        quality: CheckCircle,
                        material: Package,
                        equipment: Factory,
                      };
                      const Icon = iconMap[a.type] || Activity;
                      const colorMap: Record<string, string> = {
                        high: 'text-red-600 bg-red-50',
                        medium: 'text-orange-600 bg-orange-50',
                        low: 'text-blue-600 bg-blue-50',
                      };
                      return (
                        <div
                          key={i}
                          className="flex items-start space-x-4 p-3 rounded-lg border hover:bg-muted transition-colors"
                        >
                          <div
                            className={`p-2 rounded-lg ${colorMap[a.severity] || 'text-gray-600 bg-gray-50'}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{a.message}</p>
                              <Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'}>
                                {a.severity === 'high' ? tc('high') : tc('medium')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{a.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/production">
            <Card className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Factory className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('productionBoard')}</p>
                    <p className="text-xs text-muted-foreground">{t('productionMonitor')}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/warehouse">
            <Card className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('warehouseBoard')}</p>
                    <p className="text-xs text-muted-foreground">{t('warehouseMonitor')}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/sales">
            <Card className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('salesBoard')}</p>
                    <p className="text-xs text-muted-foreground">{t('salesMonitor')}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/quality">
            <Card className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('qualityBoard')}</p>
                    <p className="text-xs text-muted-foreground">{t('qualityMonitor')}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
