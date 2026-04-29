'use client';

import { MainLayout } from '@/components/layout';
import {
  FileText,
  Package,
  Factory,
  AlertTriangle,
  CheckCircle,
  Activity,
  Loader2,
  Maximize,
  Minimize,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useCompanyName } from '@/hooks/useCompanyName';

interface DashboardStats {
  todayOrders: number;
  pendingWorkOrders: number;
  inventoryWarnings: number;
  todayCompleted: number;
  pendingOrderCount: number;
  producingCount: number;
  completedCount: number;
  totalValue: number;
}

interface RecentOrder {
  id: string;
  customer: string;
  product: string;
  quantity: number;
  status: string;
  statusClass: string;
  delivery: string;
}

interface RecentWorkOrder {
  id: string;
  product: string;
  quantity: number;
  status: string;
  statusClass: string;
  date: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  1: { label: '待确认', className: 'bg-gray-500/20 text-gray-300 border border-gray-500/30' },
  2: { label: '已确认', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  3: { label: '部分发货', className: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
  4: { label: '已完成', className: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  5: { label: '已取消', className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};

const WORK_ORDER_STATUS_MAP: Record<string, { label: string; className: string }> = {
  1: { label: '草稿', className: 'bg-gray-500/20 text-gray-300 border border-gray-500/30' },
  2: { label: '已确认', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  3: { label: '生产中', className: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
  4: { label: '已完成', className: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  5: { label: '已取消', className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};

export default function DashboardPage() {
  const { companyName } = useCompanyName();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentWorkOrders, setRecentWorkOrders] = useState<RecentWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const orderScrollRef = useRef<HTMLDivElement>(null);
  const workOrderScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const salesRes = await fetch('/api/orders/sales?pageSize=20');
        const salesData = await salesRes.json();
        
        if (salesData.success) {
          const orders = salesData.data?.list || salesData.data || [];
          
          const today = new Date().toISOString().split('T')[0];
          const todayOrders = orders.filter((o: any) => o.order_date?.startsWith(today)).length;
          const pendingOrderCount = orders.filter((o: any) => o.status === 1 || o.status === 2).length;
          const producingCount = orders.filter((o: any) => o.status === 3).length;
          const completedCount = orders.filter((o: any) => o.status === 4).length;
          const totalValue = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);

          setRecentOrders(orders.slice(0, 20).map((o: any) => ({
            id: o.order_no,
            customer: o.customer_name,
            product: o.items?.[0]?.material_name || '-',
            quantity: o.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0,
            status: STATUS_MAP[o.status]?.label || '未知',
            statusClass: STATUS_MAP[o.status]?.className || '',
            delivery: o.delivery_date || '-',
          })));

          const inventoryRes = await fetch('/api/warehouse/inventory?pageSize=100');
          const inventoryData = await inventoryRes.json();
          let inventoryWarnings = 0;
          if (inventoryData.success) {
            const inventoryList = inventoryData.data?.list || inventoryData.data || [];
            inventoryWarnings = inventoryList.filter((item: any) => 
              (item.quantity || 0) < (item.min_quantity || 0)
            ).length;
          }

          const workOrdersRes = await fetch('/api/production/orders?pageSize=20');
          const workOrdersData = await workOrdersRes.json();
          let pendingWorkOrders = 0;
          if (workOrdersData.success) {
            const workOrders = workOrdersData.data?.list || workOrdersData.data || [];
            pendingWorkOrders = workOrders.filter((wo: any) => 
              wo.status === 1 || wo.status === 2
            ).length;

            setRecentWorkOrders(workOrders.slice(0, 20).map((wo: any) => ({
              id: wo.work_order_no,
              product: wo.product_name || '-',
              quantity: wo.quantity || 0,
              status: WORK_ORDER_STATUS_MAP[wo.status]?.label || '未知',
              statusClass: WORK_ORDER_STATUS_MAP[wo.status]?.className || '',
              date: wo.create_time?.substring(0, 10) || '-',
            })));
          }

          setStats({
            todayOrders,
            pendingWorkOrders,
            inventoryWarnings,
            todayCompleted: completedCount,
            pendingOrderCount,
            producingCount,
            completedCount,
            totalValue,
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const scrollElement = (ref: React.RefObject<HTMLDivElement | null>, dataLength: number) => {
      if (!ref.current || dataLength <= 5) return;
      const el = ref.current;
      let scrollAmount = 0;
      const timer = setInterval(() => {
        scrollAmount += 0.5;
        if (scrollAmount >= el.scrollHeight / 2) {
          scrollAmount = 0;
          el.scrollTop = 0;
        } else {
          el.scrollTop = scrollAmount;
        }
      }, 50);
      return () => clearInterval(timer);
    };

    const cleanup1 = scrollElement(orderScrollRef, recentOrders.length);
    const cleanup2 = scrollElement(workOrderScrollRef, recentWorkOrders.length);

    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  }, [recentOrders.length, recentWorkOrders.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      dashboardRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatMoney = (v: number) => '¥' + (v / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <MainLayout title="仪表盘">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-400" />
            <p className="text-white/60">正在加载数据...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const displayStats = [
    { title: '今日订单', value: stats?.todayOrders || 0, icon: FileText, color: 'from-cyan-500 to-blue-500', change: '+12%' },
    { title: '待产工单', value: stats?.pendingWorkOrders || 0, icon: Factory, color: 'from-orange-500 to-amber-500', change: '-5%' },
    { title: '库存预警', value: stats?.inventoryWarnings || 0, icon: AlertTriangle, color: 'from-red-500 to-pink-500', change: '+3' },
    { title: '今日完成', value: stats?.todayCompleted || 0, icon: CheckCircle, color: 'from-green-500 to-emerald-500', change: '+8%' },
    { title: '订单总额', value: formatMoney(stats?.totalValue || 0), icon: TrendingUp, color: 'from-purple-500 to-indigo-500', change: '+15%' },
    { title: '生产中', value: stats?.producingCount || 0, icon: Activity, color: 'from-teal-500 to-cyan-500', change: '+2' },
  ];

  return (
    <MainLayout title="仪表盘">
      <div
        ref={dashboardRef}
        className="min-h-screen text-white p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #091637 0%, #010205 100%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>
        <div className="absolute inset-0 tech-grid-bg pointer-events-none" />

        {/* 顶部标题栏 */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex-1" />
          <div className="tech-title-wrapper">
            <div className="tech-title-row">
              <div className="tech-title-line-left" />
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  {companyName}
                </h1>
                <p className="text-xs text-white/50 mt-0.5">企业运营数据实时监控</p>
              </div>
              <div className="tech-title-line-right" />
            </div>
            <div className="tech-title-bottom-line" />
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-cyan-400">
                {currentTime && formatTime(currentTime)}
              </div>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏显示'}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 text-cyan-400" />
              ) : (
                <Maximize className="h-4 w-4 text-cyan-400" />
              )}
            </button>
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300">
              ● 实时
            </div>
          </div>
        </div>

        {/* 关键指标卡片 */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {displayStats.map((s, i) => (
            <div
              key={i}
              className={`tech-card tech-glow tech-card-delay-${i + 1} p-4`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">{s.title}</p>
                  <p className="text-xl font-bold mt-1 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                    {s.value}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {s.change.startsWith('+') ? (
                      <ArrowUpRight className="h-3 w-3 text-green-400" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs ${s.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                      {s.change}
                    </span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 滚动数据区 */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 近期订单滚动 */}
          <div
            className="rounded-xl p-5 backdrop-blur-md border border-white/10"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            <h3 className="text-sm font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              近期订单
            </h3>
            {recentOrders.length === 0 ? (
              <p className="text-white/40 text-center py-8">暂无订单数据</p>
            ) : (
              <div
                ref={orderScrollRef}
                className="overflow-hidden"
                style={{ maxHeight: '400px' }}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-white/60 font-medium">订单号</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">客户</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">产品</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">数量</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">状态</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">交货日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...recentOrders, ...recentOrders].map((order, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3 font-mono text-cyan-300 text-xs">{order.id}</td>
                        <td className="py-2 px-3 text-white/80 text-xs">{order.customer}</td>
                        <td className="py-2 px-3 text-white/60 text-xs">{order.product}</td>
                        <td className="py-2 px-3 text-white/60 text-xs">{order.quantity.toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${order.statusClass}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white/50 text-xs">{order.delivery}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 近期工单滚动 */}
          <div
            className="rounded-xl p-5 backdrop-blur-md border border-white/10"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            <h3 className="text-sm font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Factory className="h-4 w-4" />
              近期工单
            </h3>
            {recentWorkOrders.length === 0 ? (
              <p className="text-white/40 text-center py-8">暂无工单数据</p>
            ) : (
              <div
                ref={workOrderScrollRef}
                className="overflow-hidden"
                style={{ maxHeight: '400px' }}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-white/60 font-medium">工单号</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">产品</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">数量</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">状态</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...recentWorkOrders, ...recentWorkOrders].map((wo, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3 font-mono text-cyan-300 text-xs">{wo.id}</td>
                        <td className="py-2 px-3 text-white/80 text-xs">{wo.product}</td>
                        <td className="py-2 px-3 text-white/60 text-xs">{wo.quantity.toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${wo.statusClass}`}>
                            {wo.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white/50 text-xs">{wo.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 快速统计 */}
        <div
          className="relative z-10 rounded-xl p-5 backdrop-blur-md border border-white/10 mt-6"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <h3 className="text-sm font-semibold text-cyan-300 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            快速统计
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white/60">待处理订单</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">{stats?.pendingOrderCount || 0}</p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <FileText className="h-8 w-8 text-cyan-400" />
              </div>
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white/60">生产中</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-300 to-amber-300 bg-clip-text text-transparent">{stats?.producingCount || 0}</p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
                <Factory className="h-8 w-8 text-orange-400" />
              </div>
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white/60">已完成</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">{stats?.completedCount || 0}</p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
