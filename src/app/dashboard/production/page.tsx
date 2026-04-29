'use client';

import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { useCompanyName } from '@/hooks/useCompanyName';
import {
  Factory, TrendingUp, TrendingDown, Clock, CheckCircle,
  AlertTriangle, PauseCircle, PlayCircle, BarChart3, Activity,
  Zap, Users, Package, Timer, Settings, Maximize, Minimize, Target,
} from 'lucide-react';

interface ProductionData {
  overview: { totalOrders: number; activeOrders: number; completedToday: number; efficiency: number; oee: number; qualityRate: number };
  equipmentStatus: { id: string; name: string; type: string; status: string; efficiency: number; currentOrder: string; operator: string; runtime: number }[];
  productionProgress: { orderNo: string; customer: string; productName: string; process: string; progress: number; planQty: number; completedQty: number; status: string; priority: string; estimatedComplete: string }[];
  efficiencyTrend: { time: string; efficiency: number; target: number }[];
  alerts: { id: string; type: string; message: string; severity: string; timestamp: string }[];
  staffStatus: { total: number; onDuty: number; onLeave: number; attendance: number };
}

function RingChart({ percent, label, color = '#06b6d4' }: { percent: number; label: string; color?: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
          <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{percent}%</span>
        </div>
      </div>
      <span className="text-xs text-white/50">{label}</span>
    </div>
  );
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  running: { label: '运行中', className: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  idle: { label: '待机', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  maintenance: { label: '保养中', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  error: { label: '故障', className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  medium: { label: '中', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  low: { label: '低', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
};

export default function ProductionDashboard() {
  const { companyName } = useCompanyName();
  const [data, setData] = useState<ProductionData>({
    overview: { totalOrders: 0, activeOrders: 0, completedToday: 0, efficiency: 0, oee: 0, qualityRate: 0 },
    equipmentStatus: [], productionProgress: [], efficiencyTrend: [], alerts: [],
    staffStatus: { total: 0, onDuty: 0, onLeave: 0, attendance: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard/production');
        const result = await res.json();
        if (result.success && result.data) {
          const d = result.data;
          setData({
            overview: d.overview || { totalOrders: 0, activeOrders: 0, completedToday: 0, efficiency: 0, oee: 0, qualityRate: 0 },
            equipmentStatus: d.equipmentStatus || [],
            productionProgress: (d.recentOrders || []).map((o: any) => ({
              orderNo: o.orderNo || '', customer: o.customer || '', productName: o.product || '', process: '',
              progress: o.status === 3 ? 100 : o.status === 2 ? 50 : 0,
              planQty: o.quantity || 0, completedQty: o.status === 3 ? o.quantity : Math.round(o.quantity * 0.5),
              status: o.status === 3 ? 'completed' : o.status === 2 ? 'producing' : 'pending',
              priority: 'medium', estimatedComplete: '',
            })),
            efficiencyTrend: d.efficiencyTrend || [],
            alerts: [
              ...(d.inkStatus?.expiringSoon > 0 ? [{ id: 'ink-exp', type: 'material', message: `${d.inkStatus.expiringSoon}罐油墨即将过期`, severity: 'medium', timestamp: '' }] : []),
              ...(d.dieStatus?.warning > 0 ? [{ id: 'die-warn', type: 'equipment', message: `${d.dieStatus.warning}个刀模/网版使用率超过80%`, severity: 'medium', timestamp: '' }] : []),
            ],
            staffStatus: d.personnel || { total: 0, onDuty: 0, onLeave: 0, attendance: 0 },
          });
        }
      } catch (e) { console.error('获取生产看板数据失败:', e); } finally { setLoading(false); }
    };
    fetchData();
    setCurrentTime(new Date());
    const timer1 = setInterval(fetchData, 60000);
    const timer2 = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(timer1); clearInterval(timer2); };
  }, []);

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
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (date: Date) => date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <MainLayout>
      <div ref={dashboardRef} className="min-h-screen text-white p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #091637 0%, #010205 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>
        <div className="absolute inset-0 tech-grid-bg pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="tech-title-wrapper">
            <div className="tech-title-row">
              <div className="tech-title-line-left" />
              <div>
                <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">{companyName}</h1>
                <p className="text-xs text-white/50 mt-0.5">实时监控生产状态 · 设备效率 · 工单进度</p>
              </div>
              <div className="tech-title-line-right" />
            </div>
            <div className="tech-title-bottom-line" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-cyan-400">{currentTime && formatTime(currentTime)}</div>
            </div>
            <button onClick={toggleFullscreen} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title={isFullscreen ? '退出全屏' : '全屏显示'}>
              {isFullscreen ? <Minimize className="h-4 w-4 text-cyan-400" /> : <Maximize className="h-4 w-4 text-cyan-400" />}
            </button>
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300">
              {loading ? '加载中...' : '● 实时'}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { title: '今日工单', value: data.overview.totalOrders, icon: Package, color: 'from-cyan-500 to-blue-500' },
            { title: '进行中', value: data.overview.activeOrders, icon: PlayCircle, color: 'from-amber-500 to-orange-500' },
            { title: '已完成', value: data.overview.completedToday, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
            { title: '生产效率', value: `${data.overview.efficiency}%`, icon: TrendingUp, color: 'from-blue-500 to-indigo-500' },
            { title: 'OEE', value: `${data.overview.oee}%`, icon: BarChart3, color: 'from-purple-500 to-pink-500' },
            { title: '良品率', value: `${data.overview.qualityRate}%`, icon: Activity, color: 'from-emerald-500 to-teal-500' },
          ].map((s, i) => (
            <div key={i} className={`tech-card tech-glow tech-card-delay-${i + 1} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">{s.title}</p>
                  <p className="text-xl font-bold mt-1 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">{s.value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="tech-card tech-glow p-5">
            <h3 className="text-sm font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />核心指标
            </h3>
            <div className="flex justify-center gap-6">
              <RingChart percent={data.overview.efficiency} label="生产效率" color="#06b6d4" />
              <RingChart percent={data.overview.oee} label="OEE" color="#8b5cf6" />
              <RingChart percent={data.overview.qualityRate} label="良品率" color="#10b981" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-white/5 text-center">
                <p className="text-xs text-white/40">在岗人数</p>
                <p className="text-sm font-bold text-cyan-300">{data.staffStatus.onDuty}/{data.staffStatus.total}</p>
              </div>
              <div className="p-2 rounded bg-white/5 text-center">
                <p className="text-xs text-white/40">出勤率</p>
                <p className="text-sm font-bold text-green-300">{data.staffStatus.attendance}%</p>
              </div>
            </div>
          </div>

          <div className="tech-card tech-glow p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />设备状态监控
            </h3>
            {data.equipmentStatus.length === 0 ? (
              <p className="text-white/40 text-center py-8">暂无数据</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.equipmentStatus.map((eq) => {
                  const cfg = STATUS_MAP[eq.status] || STATUS_MAP.idle;
                  return (
                    <div key={eq.id} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-xs font-medium text-white/80">{eq.name}</h4>
                          <p className="text-[10px] text-white/40 mt-0.5">当前工单: {eq.currentOrder}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${cfg.className}`}>{cfg.label}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">效率</span>
                          <span className="font-medium">{eq.efficiency}%</span>
                        </div>
                        <div className="bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${eq.efficiency > 80 ? 'bg-green-400' : eq.efficiency > 60 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${eq.efficiency}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/30">
                          <span>操作员: {eq.operator}</span>
                          <span>运行: {Math.floor(eq.runtime / 60)}h{eq.runtime % 60}m</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="tech-card tech-glow p-5">
            <h3 className="text-sm font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />工单生产进度
            </h3>
            {data.productionProgress.length === 0 ? (
              <p className="text-white/40 text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {data.productionProgress.map((order) => {
                  const priCfg = PRIORITY_MAP[order.priority] || PRIORITY_MAP.medium;
                  return (
                    <div key={order.orderNo} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-cyan-300">{order.orderNo}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${priCfg.className}`}>{priCfg.label}</span>
                          {order.status === 'completed' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-300 border border-green-500/30">已完成</span>}
                        </div>
                        <span className="text-[10px] text-white/40">预计: {order.estimatedComplete || '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div><span className="text-white/40">客户: </span><span className="text-white/70">{order.customer}</span></div>
                        <div><span className="text-white/40">产品: </span><span className="text-white/70">{order.productName}</span></div>
                        <div><span className="text-white/40">工序: </span><span className="text-white/70">{order.process || '-'}</span></div>
                        <div><span className="text-white/40">数量: </span><span className="text-white/70">{order.completedQty.toLocaleString()} / {order.planQty.toLocaleString()}</span></div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">进度</span>
                          <span className="font-medium">{order.progress}%</span>
                        </div>
                        <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${order.progress >= 100 ? 'bg-green-400' : order.progress >= 50 ? 'bg-cyan-400' : 'bg-amber-400'}`} style={{ width: `${order.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="tech-card tech-glow p-5">
            <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />预警通知
            </h3>
            {data.alerts.length === 0 ? (
              <p className="text-white/40 text-center py-8">暂无预警</p>
            ) : (
              <div className="space-y-3">
                {data.alerts.map((alert) => {
                  const severityClass = alert.severity === 'high' ? 'border-red-500/30 bg-red-500/5' : alert.severity === 'medium' ? 'border-amber-500/30 bg-amber-500/5' : 'border-blue-500/30 bg-blue-500/5';
                  const iconColor = alert.severity === 'high' ? 'text-red-400' : alert.severity === 'medium' ? 'text-amber-400' : 'text-blue-400';
                  const AlertIcon = alert.type === 'efficiency' ? TrendingDown : alert.type === 'quality' ? AlertTriangle : alert.type === 'equipment' ? Settings : Package;
                  return (
                    <div key={alert.id} className={`p-3 rounded-lg border ${severityClass}`}>
                      <div className="flex items-start gap-2">
                        <AlertIcon className={`h-4 w-4 mt-0.5 ${iconColor}`} />
                        <div className="flex-1">
                          <p className="text-xs text-white/80">{alert.message}</p>
                          {alert.timestamp && <p className="text-[10px] text-white/30 mt-1">{alert.timestamp}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
