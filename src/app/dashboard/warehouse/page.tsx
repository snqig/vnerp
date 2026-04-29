'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { useCompanyName } from '@/hooks/useCompanyName';
import {
  Package, ArrowDown, ArrowUp, AlertTriangle, TrendingUp,
  Warehouse, BarChart3, Maximize, Minimize, Clock,
} from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls, Box, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface WarehouseData {
  overview: { totalItems: number; totalValue: number; lowStock: number; todayInbound: number; todayOutbound: number; pendingInbound: number; pendingOutbound: number };
  categoryDistribution: { material_type: string; count: number; value: number }[];
  lowStockItems: { material_code: string; material_name: string; stock_qty: number; min_stock: number; unit: string; specification: string }[];
  recentTransactions: { transaction_type: string; material_code: string; material_name: string; quantity: number; unit: string; create_time: string; remark: string }[];
  warehouseOccupancy: { warehouse_name: string; item_count: number; total_qty: number; capacity?: number }[];
}

// 3D 仓库可视化组件
function Warehouse3D({ warehouses }: { warehouses: { name: string; occupancy: number; color: string }[] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.5} />
      </mesh>

      {/* 仓库货架 */}
      {warehouses.map((w, i) => {
        const x = (i - (warehouses.length - 1) / 2) * 3;
        const height = Math.max(0.5, (w.occupancy / 100) * 4);
        const color = w.occupancy > 80 ? '#ef4444' : w.occupancy > 50 ? '#f59e0b' : '#10b981';

        return (
          <group key={i} position={[x, 0, 0]}>
            {/* 货架主体 */}
            <Box args={[2, height, 1.5]} position={[0, height / 2 - 0.5, 0]}>
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.8}
                metalness={0.3}
                roughness={0.7}
              />
            </Box>

            {/* 货架边框 */}
            <Box args={[2.05, height + 0.05, 1.55]} position={[0, height / 2 - 0.5, 0]}>
              <meshStandardMaterial color="#06b6d4" wireframe />
            </Box>

            {/* 仓库名称 */}
            <Text
              position={[0, height + 0.3, 0]}
              fontSize={0.25}
              color="#06b6d4"
              anchorX="center"
              anchorY="middle"
              font={undefined}
            >
              {w.name}
            </Text>

            {/* 占用率 */}
            <Text
              position={[0, height / 2 - 0.5, 1]}
              fontSize={0.3}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {w.occupancy.toFixed(0)}%
            </Text>
          </group>
        );
      })}

      {/* 灯光 */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 3, 0]} intensity={0.5} color="#06b6d4" />
      <pointLight position={[5, 3, 0]} intensity={0.5} color="#3b82f6" />
    </group>
  );
}

// 环形图组件
function DonutChart({ percentage, color, size = 120 }: { percentage: number; color: string; size?: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="12"
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        className="transition-all duration-1000 ease-out"
      />
      <text
        x="60"
        y="55"
        textAnchor="middle"
        fill="white"
        fontSize="18"
        fontWeight="bold"
      >
        {percentage.toFixed(1)}%
      </text>
      <text
        x="60"
        y="75"
        textAnchor="middle"
        fill="rgba(255,255,255,0.6)"
        fontSize="10"
      >
        利用率
      </text>
    </svg>
  );
}

export default function WarehouseDashboard() {
  const { companyName } = useCompanyName();
  const [data, setData] = useState<WarehouseData>({
    overview: { totalItems: 0, totalValue: 0, lowStock: 0, todayInbound: 0, todayOutbound: 0, pendingInbound: 0, pendingOutbound: 0 },
    categoryDistribution: [],
    lowStockItems: [],
    recentTransactions: [],
    warehouseOccupancy: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard/warehouse');
        const result = await res.json();
        if (result.success && result.data) setData(result.data);
      } catch (e) { console.error('获取仓库看板数据失败:', e); } finally { setLoading(false); }
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

  const warehouses3D = useMemo(() => {
    const maxQty = Math.max(...data.warehouseOccupancy.map(w => w.total_qty), 1);
    return data.warehouseOccupancy.map(w => ({
      name: w.warehouse_name,
      occupancy: w.capacity ? (w.total_qty / w.capacity) * 100 : (w.total_qty / maxQty) * 100,
      color: '#06b6d4',
    }));
  }, [data.warehouseOccupancy]);

  const avgOccupancy = warehouses3D.length > 0
    ? warehouses3D.reduce((sum, w) => sum + w.occupancy, 0) / warehouses3D.length
    : 0;

  return (
    <MainLayout>
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

        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex-1" />
          <div className="tech-title-wrapper">
            <div className="tech-title-row">
              <div className="tech-title-line-left" />
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  {companyName}
                </h1>
                <p className="text-xs text-white/50 mt-0.5">实时仓库库存与出入库监控</p>
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
              {loading ? '加载中...' : '● 实时'}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { title: '物料种类', value: data.overview.totalItems, icon: Package, color: 'from-cyan-500 to-blue-500' },
            { title: '库存总值', value: formatMoney(data.overview.totalValue), icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
            { title: '库存预警', value: data.overview.lowStock, icon: AlertTriangle, color: 'from-red-500 to-orange-500' },
            { title: '今日入库', value: data.overview.todayInbound, icon: ArrowDown, color: 'from-emerald-500 to-teal-500' },
            { title: '今日出库', value: data.overview.todayOutbound, icon: ArrowUp, color: 'from-orange-500 to-amber-500' },
            { title: '仓库数量', value: data.warehouseOccupancy.length, icon: Warehouse, color: 'from-purple-500 to-pink-500' },
          ].map((s, i) => (
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
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="tech-card tech-glow p-0 lg:col-span-2">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <Warehouse className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">3D 仓库位置占用</span>
            </div>
            <div className="p-4">
              {warehouses3D.length === 0 ? (
                <p className="text-white/40 text-center py-8">暂无数据</p>
              ) : (
                <div className="h-[300px]">
                  <Canvas camera={{ position: [0, 3, 8], fov: 50 }}>
                    <Warehouse3D warehouses={warehouses3D} />
                    <OrbitControls
                      enableZoom={true}
                      enablePan={false}
                      maxPolarAngle={Math.PI / 2.5}
                      minPolarAngle={Math.PI / 6}
                      autoRotate
                      autoRotateSpeed={0.5}
                    />
                  </Canvas>
                </div>
              )}
            </div>
          </div>

          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">平均仓库利用率</span>
            </div>
            <div className="p-4">
              <div className="flex justify-center">
                <DonutChart
                  percentage={avgOccupancy}
                  color={avgOccupancy > 80 ? '#ef4444' : avgOccupancy > 50 ? '#f59e0b' : '#10b981'}
                  size={160}
                />
              </div>
              <div className="mt-4 space-y-2">
                {warehouses3D.slice(0, 5).map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white/60 text-xs">{w.name}</span>
                    <span className={`font-bold text-xs ${
                      w.occupancy > 80 ? 'text-red-400' : w.occupancy > 50 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {w.occupancy.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">物料分类分布</span>
            </div>
            <div className="p-4">
              {data.categoryDistribution.length === 0 ? (
                <p className="text-white/40 text-center py-8">暂无数据</p>
              ) : (
                <div className="space-y-3">
                  {data.categoryDistribution.map((c, i) => {
                    const maxCount = Math.max(...data.categoryDistribution.map(x => x.count), 1);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs w-20 text-right text-cyan-300 truncate">{c.material_type || '未分类'}</span>
                        <div className="flex-1 bg-white/10 rounded-full h-5 relative overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(c.count / maxCount) * 100}%`,
                              background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                            }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                            {c.count} 种
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-red-400 to-orange-500" />
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-white/80">库存预警</span>
            </div>
            <div className="p-4">
              {data.lowStockItems.length === 0 ? (
                <p className="text-white/40 text-center py-8">暂无预警</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 px-3 text-white/60 font-medium">物料编码</th>
                        <th className="text-left py-2 px-3 text-white/60 font-medium">名称</th>
                        <th className="text-left py-2 px-3 text-white/60 font-medium">当前库存</th>
                        <th className="text-left py-2 px-3 text-white/60 font-medium">最低库存</th>
                        <th className="text-left py-2 px-3 text-white/60 font-medium">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lowStockItems.slice(0, 8).map((item, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 px-3 font-mono text-cyan-300 text-xs">{item.material_code}</td>
                          <td className="py-2 px-3 text-white/80 text-xs">{item.material_name}</td>
                          <td className="py-2 px-3 text-red-400 font-bold text-xs">{Number(item.stock_qty).toLocaleString()} {item.unit}</td>
                          <td className="py-2 px-3 text-white/60 text-xs">{Number(item.min_stock).toLocaleString()} {item.unit}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                              不足
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 tech-card tech-glow p-0">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-white/80">最近出入库记录</span>
          </div>
          <div className="p-4">
            {data.recentTransactions.length === 0 ? (
              <p className="text-white/40 text-center py-8">暂无记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-white/60 font-medium">类型</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">物料编码</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">物料名称</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">数量</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">时间</th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.slice(0, 10).map((t, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            t.transaction_type === 'inbound'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            {t.transaction_type === 'inbound' ? '入库' : t.transaction_type === 'outbound' ? '出库' : t.transaction_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-cyan-300 text-xs">{t.material_code}</td>
                        <td className="py-2 px-3 text-white/80 text-xs">{t.material_name}</td>
                        <td className="py-2 px-3 text-white/60 text-xs font-medium">{Number(t.quantity).toLocaleString()} {t.unit}</td>
                        <td className="py-2 px-3 text-white/50 text-xs">{t.create_time?.substring(5, 16)}</td>
                        <td className="py-2 px-3 text-white/40 text-xs">{t.remark || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
