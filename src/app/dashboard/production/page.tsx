'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Factory,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  BarChart3,
  Activity,
  Zap,
  Users,
  Package,
  Timer,
  Settings,
} from 'lucide-react';

// 生产看板数据类型
interface ProductionData {
  overview: {
    totalOrders: number;
    activeOrders: number;
    completedToday: number;
    efficiency: number;
    oee: number;
    qualityRate: number;
  };
  equipmentStatus: EquipmentStatus[];
  productionProgress: ProductionProgress[];
  efficiencyTrend: EfficiencyData[];
  alerts: AlertItem[];
  staffStatus: StaffStatus;
}

interface EquipmentStatus {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'maintenance' | 'error';
  efficiency: number;
  currentOrder: string;
  operator: string;
  runtime: number;
}

interface ProductionProgress {
  orderNo: string;
  customer: string;
  productName: string;
  process: string;
  progress: number;
  planQty: number;
  completedQty: number;
  status: 'pending' | 'producing' | 'completed';
  priority: 'high' | 'medium' | 'low';
  estimatedComplete: string;
}

interface EfficiencyData {
  time: string;
  efficiency: number;
  target: number;
}

interface AlertItem {
  id: string;
  type: 'efficiency' | 'quality' | 'equipment' | 'material';
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface StaffStatus {
  total: number;
  onDuty: number;
  onLeave: number;
  attendance: number;
}

// 模拟数据
const mockData: ProductionData = {
  overview: {
    totalOrders: 45,
    activeOrders: 18,
    completedToday: 12,
    efficiency: 87.5,
    oee: 82.3,
    qualityRate: 96.8,
  },
  equipmentStatus: [
    {
      id: 'A01',
      name: '全自动丝印机-A01',
      type: '印刷机',
      status: 'running',
      efficiency: 92,
      currentOrder: 'WO20240320001',
      operator: '张三',
      runtime: 360,
    },
    {
      id: 'A02',
      name: '全自动丝印机-A02',
      type: '印刷机',
      status: 'running',
      efficiency: 88,
      currentOrder: 'WO20240320005',
      operator: '李四',
      runtime: 240,
    },
    {
      id: 'B01',
      name: '模切机-B01',
      type: '模切机',
      status: 'maintenance',
      efficiency: 0,
      currentOrder: '-',
      operator: '-',
      runtime: 0,
    },
    {
      id: 'B02',
      name: '模切机-B02',
      type: '模切机',
      status: 'running',
      efficiency: 85,
      currentOrder: 'WO20240320003',
      operator: '王五',
      runtime: 180,
    },
    {
      id: 'C01',
      name: '分条机-C01',
      type: '分条机',
      status: 'idle',
      efficiency: 0,
      currentOrder: '-',
      operator: '赵六',
      runtime: 0,
    },
    {
      id: 'D01',
      name: '检测设备-D01',
      type: '检测设备',
      status: 'running',
      efficiency: 95,
      currentOrder: 'QC-20240320',
      operator: '质检组',
      runtime: 480,
    },
  ],
  productionProgress: [
    {
      orderNo: 'WO20240320001',
      customer: '深圳伟业电子',
      productName: '电池标签-ASUS001',
      process: '丝印',
      progress: 78,
      planQty: 5000,
      completedQty: 3900,
      status: 'producing',
      priority: 'high',
      estimatedComplete: '14:30',
    },
    {
      orderNo: 'WO20240320005',
      customer: '广州华达科技',
      productName: '面板贴纸-HD005',
      process: '丝印',
      progress: 45,
      planQty: 3000,
      completedQty: 1350,
      status: 'producing',
      priority: 'medium',
      estimatedComplete: '16:00',
    },
    {
      orderNo: 'WO20240320003',
      customer: '东莞恒通实业',
      productName: '警示标签-HT003',
      process: '模切',
      progress: 92,
      planQty: 8000,
      completedQty: 7360,
      status: 'producing',
      priority: 'high',
      estimatedComplete: '13:00',
    },
    {
      orderNo: 'WO20240320008',
      customer: '佛山金利宝',
      productName: '保护膜-JLB008',
      process: '分条',
      progress: 0,
      planQty: 10000,
      completedQty: 0,
      status: 'pending',
      priority: 'low',
      estimatedComplete: '18:00',
    },
    {
      orderNo: 'WO20240320002',
      customer: '中山美达印刷',
      productName: '说明书-MD002',
      process: '检测',
      progress: 100,
      planQty: 2000,
      completedQty: 2000,
      status: 'completed',
      priority: 'medium',
      estimatedComplete: '已完成',
    },
  ],
  efficiencyTrend: [
    { time: '08:00', efficiency: 75, target: 85 },
    { time: '09:00', efficiency: 82, target: 85 },
    { time: '10:00', efficiency: 88, target: 85 },
    { time: '11:00', efficiency: 85, target: 85 },
    { time: '12:00', efficiency: 80, target: 85 },
    { time: '13:00', efficiency: 86, target: 85 },
    { time: '14:00', efficiency: 90, target: 85 },
    { time: '15:00', efficiency: 87, target: 85 },
  ],
  alerts: [
    {
      id: '1',
      type: 'efficiency',
      message: '模切机-B02效率低于80%，当前78%',
      severity: 'medium',
      timestamp: '10分钟前',
    },
    {
      id: '2',
      type: 'equipment',
      message: '模切机-B01保养时间到，请安排保养',
      severity: 'high',
      timestamp: '30分钟前',
    },
    {
      id: '3',
      type: 'quality',
      message: '工单WO20240320001连续3件膜厚超差',
      severity: 'high',
      timestamp: '1小时前',
    },
    {
      id: '4',
      type: 'material',
      message: '油墨仓库PET材料库存不足，剩余2卷',
      severity: 'medium',
      timestamp: '2小时前',
    },
  ],
  staffStatus: {
    total: 48,
    onDuty: 42,
    onLeave: 6,
    attendance: 87.5,
  },
};

export default function ProductionDashboard() {
  const [data, setData] = useState<ProductionData>(mockData);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 实时更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-500';
      case 'idle':
        return 'bg-amber-500';
      case 'maintenance':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'idle':
        return '待机';
      case 'maintenance':
        return '保养中';
      case 'error':
        return '故障';
      default:
        return '未知';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'efficiency':
        return <TrendingDown className="h-4 w-4" />;
      case 'quality':
        return <AlertTriangle className="h-4 w-4" />;
      case 'equipment':
        return <Settings className="h-4 w-4" />;
      case 'material':
        return <Package className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <MainLayout title="生产看板">
      <div className="space-y-6">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Factory className="h-6 w-6 text-primary" />
              生产看板
            </h1>
            <p className="text-muted-foreground mt-1">
              实时监控生产状态 · 设备效率 · 工单进度
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {currentTime.toLocaleTimeString('zh-CN')}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">今日工单</p>
                  <p className="text-2xl font-bold">{data.overview.totalOrders}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">进行中</p>
                  <p className="text-2xl font-bold">{data.overview.activeOrders}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <PlayCircle className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold">{data.overview.completedToday}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">生产效率</p>
                  <p className="text-2xl font-bold">{data.overview.efficiency}%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <Progress value={data.overview.efficiency} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OEE</p>
                  <p className="text-2xl font-bold">{data.overview.oee}%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <Progress value={data.overview.oee} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">良品率</p>
                  <p className="text-2xl font-bold">{data.overview.qualityRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
              <Progress value={data.overview.qualityRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：设备状态和工单进度 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 设备状态 */}
            <Card className="card-dashboard">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  设备状态监控
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.equipmentStatus.map((equipment) => (
                    <div
                      key={equipment.id}
                      className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{equipment.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            当前工单: {equipment.currentOrder}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(equipment.status)} text-white border-0`}
                        >
                          {getStatusText(equipment.status)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">效率</span>
                          <span className="font-medium">{equipment.efficiency}%</span>
                        </div>
                        <Progress value={equipment.efficiency} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>操作员: {equipment.operator}</span>
                          <span>运行时长: {Math.floor(equipment.runtime / 60)}h{equipment.runtime % 60}m</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 工单进度 */}
            <Card className="card-dashboard">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  工单生产进度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.productionProgress.map((order) => (
                    <div
                      key={order.orderNo}
                      className="p-4 rounded-lg border border-border/50 bg-card/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{order.orderNo}</h4>
                          <Badge variant="outline" className={getPriorityColor(order.priority)}>
                            {order.priority === 'high' ? '高' : order.priority === 'medium' ? '中' : '低'}优先级
                          </Badge>
                          {order.status === 'completed' && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              已完成
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          预计完成: {order.estimatedComplete}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">客户: </span>
                          <span>{order.customer}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">产品: </span>
                          <span>{order.productName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">工序: </span>
                          <span>{order.process}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">数量: </span>
                          <span>{order.completedQty.toLocaleString()} / {order.planQty.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">进度</span>
                          <span className="font-medium">{order.progress}%</span>
                        </div>
                        <Progress value={order.progress} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：预警信息和人员状态 */}
          <div className="space-y-6">
            {/* 预警信息 */}
            <Card className="card-dashboard">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  实时预警
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.severity === 'high'
                          ? 'border-l-red-500 bg-red-500/5'
                          : alert.severity === 'medium'
                          ? 'border-l-amber-500 bg-amber-500/5'
                          : 'border-l-blue-500 bg-blue-500/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 ${
                            alert.severity === 'high'
                              ? 'text-red-500'
                              : alert.severity === 'medium'
                              ? 'text-amber-500'
                              : 'text-blue-500'
                          }`}
                        >
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 人员状态 */}
            <Card className="card-dashboard">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  人员出勤
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                      <p className="text-2xl font-bold text-emerald-500">
                        {data.staffStatus.onDuty}
                      </p>
                      <p className="text-sm text-muted-foreground">在岗</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-500/10">
                      <p className="text-2xl font-bold text-amber-500">
                        {data.staffStatus.onLeave}
                      </p>
                      <p className="text-sm text-muted-foreground">请假</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">出勤率</span>
                      <span className="font-medium">{data.staffStatus.attendance}%</span>
                    </div>
                    <Progress value={data.staffStatus.attendance} className="h-2" />
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">总人数</span>
                      <span className="font-medium">{data.staffStatus.total}人</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 效率趋势 */}
            <Card className="card-dashboard">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  效率趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.efficiencyTrend.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-12">{item.time}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.efficiency >= item.target
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${item.efficiency}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-10">{item.efficiency}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">达标</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">未达标</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
