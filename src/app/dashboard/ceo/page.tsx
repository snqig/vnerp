'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Factory,
  Users,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Activity,
  CheckCircle,
  Clock,
} from 'lucide-react';

// 仪表盘数据
const dashboardData = {
  overview: {
    todayOrders: 23,
    orderChange: 12,
    todayProduction: 15000,
    productionChange: 8,
    todayDelivery: 5,
    deliveryChange: -2,
    inventoryValue: 4376000,
    inventoryChange: 3.5,
  },
  production: {
    efficiency: 87,
    activeOrders: 18,
    completedToday: 15,
    warningCount: 3,
    equipmentStatus: [
      { name: '印刷机-A01', status: 'running', efficiency: 92 },
      { name: '印刷机-A02', status: 'running', efficiency: 88 },
      { name: '模切机-B01', status: 'maintenance', efficiency: 0 },
      { name: '模切机-B02', status: 'running', efficiency: 78 },
    ],
  },
  quality: {
    passRate: 96.5,
    inspectionToday: 28,
    defectCount: 12,
    spcAlert: false,
  },
  inventory: {
    warehouses: [
      { name: '原料仓库', utilization: 78, value: 1250000, alert: 3 },
      { name: '成品仓库', utilization: 65, value: 2350000, alert: 0 },
      { name: '板房仓库', utilization: 42, value: 456000, alert: 1 },
      { name: '油墨仓库', utilization: 55, value: 320000, alert: 2 },
    ],
    turnover: 8.5,
    turnoverChange: 0.5,
  },
  pending: {
    orders: [
      { id: 'SO20240115001', customer: '深圳伟业', status: 'producing', urgency: 'high' },
      { id: 'SO20240115002', customer: '广州华达', status: 'confirmed', urgency: 'medium' },
      { id: 'SO20240115003', customer: '东莞恒通', status: 'draft', urgency: 'low' },
    ],
    alerts: [
      { type: 'inventory', message: '物料PET膜库存低于安全库存', time: '10分钟前' },
      { type: 'efficiency', message: '工单WO002效率低于80%', time: '30分钟前' },
      { type: 'equipment', message: '模切机-B01今日需保养', time: '1小时前' },
      { type: 'quality', message: '连续3件膜厚超差预警', time: '2小时前' },
    ],
  },
};

export default function CEODashboard() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">老板驾驶舱</h1>
          <p className="text-slate-400 mt-1">越南达昌丝网印刷科技有限公司 · 实时数据看板</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{new Date().toLocaleDateString('zh-CN')}</div>
            <div className="text-slate-400">{new Date().toLocaleTimeString('zh-CN')}</div>
          </div>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">今日订单</p>
                <p className="text-3xl font-bold mt-1">{dashboardData.overview.todayOrders}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm">+{dashboardData.overview.orderChange}%</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">今日产量</p>
                <p className="text-3xl font-bold mt-1">{dashboardData.overview.todayProduction.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm">+{dashboardData.overview.productionChange}%</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <Factory className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">生产效率</p>
                <p className="text-3xl font-bold mt-1">{dashboardData.production.efficiency}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400 text-sm">正常范围</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">库存金额</p>
                <p className="text-3xl font-bold mt-1">¥{(dashboardData.overview.inventoryValue / 10000).toFixed(0)}万</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm">+{dashboardData.overview.inventoryChange}%</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/20">
                <DollarSign className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 生产状态 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Factory className="h-5 w-5 text-green-400" />
              生产状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">进行中工单</span>
                <span className="text-2xl font-bold">{dashboardData.production.activeOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">今日完成</span>
                <span className="text-2xl font-bold text-green-400">{dashboardData.production.completedToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">效率预警</span>
                <span className="text-2xl font-bold text-orange-400">{dashboardData.production.warningCount}</span>
              </div>
              
              <div className="pt-2 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-2">设备状态</p>
                <div className="grid grid-cols-2 gap-2">
                  {dashboardData.production.equipmentStatus.map((eq) => (
                    <div key={eq.name} className="bg-slate-700/50 rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">{eq.name}</span>
                        {eq.status === 'running' ? (
                          <Badge className="bg-green-500/20 text-green-400 text-xs">运行</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">保养</Badge>
                        )}
                      </div>
                      {eq.status === 'running' && (
                        <Progress value={eq.efficiency} className="h-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 仓库概览 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-400" />
              仓库概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.inventory.warehouses.map((wh) => (
                <div key={wh.name} className="bg-slate-700/50 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{wh.name}</span>
                    <div className="flex items-center gap-2">
                      {wh.alert > 0 && (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          {wh.alert} 预警
                        </Badge>
                      )}
                      <span className="text-sm text-slate-400">{wh.utilization}%</span>
                    </div>
                  </div>
                  <Progress value={wh.utilization} className="h-2" />
                  <div className="text-right text-sm text-slate-400 mt-1">
                    ¥{(wh.value / 10000).toFixed(0)}万
                  </div>
                </div>
              ))}
              
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                <span className="text-slate-400">库存周转率</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{dashboardData.inventory.turnover}次/年</span>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 品质状态 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              品质状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-5xl font-bold text-green-400">{dashboardData.quality.passRate}%</div>
                <p className="text-slate-400 mt-1">合格率</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded p-3 text-center">
                  <div className="text-2xl font-bold">{dashboardData.quality.inspectionToday}</div>
                  <p className="text-slate-400 text-sm">今日检验</p>
                </div>
                <div className="bg-slate-700/50 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">{dashboardData.quality.defectCount}</div>
                  <p className="text-slate-400 text-sm">不良品</p>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">SPC状态</span>
                  <Badge className="bg-green-500/20 text-green-400">正常</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部区域 */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* 待处理订单 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              待处理订单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData.pending.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between bg-slate-700/50 rounded p-3">
                  <div>
                    <span className="font-mono">{order.id}</span>
                    <span className="text-slate-400 ml-2">{order.customer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      order.status === 'producing' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }>
                      {order.status === 'producing' ? '生产中' :
                       order.status === 'confirmed' ? '已确认' : '草稿'}
                    </Badge>
                    {order.urgency === 'high' && (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 预警信息 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              预警信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData.pending.alerts.map((alert, index) => (
                <div key={index} className="flex items-start gap-3 bg-slate-700/50 rounded p-3">
                  {alert.type === 'inventory' ? (
                    <Package className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  ) : alert.type === 'efficiency' ? (
                    <Activity className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  ) : alert.type === 'equipment' ? (
                    <Factory className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
