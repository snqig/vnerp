import { ClientProviders } from '@/components/ClientProviders';
import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Package,
  Factory,
  AlertTriangle,
  CheckCircle,
  Activity,
} from 'lucide-react';

const stats = [
  {
    title: '今日订单',
    value: '23',
    change: '+12%',
    trend: 'up',
    icon: FileText,
    color: 'text-blue-600',
  },
  {
    title: '待产工单',
    value: '18',
    change: '-5%',
    trend: 'down',
    icon: Factory,
    color: 'text-orange-600',
  },
  {
    title: '库存预警',
    value: '7',
    change: '+3',
    trend: 'up',
    icon: AlertTriangle,
    color: 'text-red-600',
  },
  {
    title: '今日完成',
    value: '15',
    change: '+25%',
    trend: 'up',
    icon: CheckCircle,
    color: 'text-green-600',
  },
];

const recentOrders = [
  { id: 'SO20240115001', customer: '深圳伟业', product: '包装膜-透明', quantity: 5000, status: 'producing', delivery: '2024-01-18' },
  { id: 'SO20240115002', customer: '广州华达', product: '标签贴纸', quantity: 10000, status: 'confirmed', delivery: '2024-01-20' },
  { id: 'SO20240115003', customer: '东莞恒通', product: '彩印膜-蓝', quantity: 3000, status: 'draft', delivery: '2024-01-22' },
  { id: 'SO20240115004', customer: '佛山利达', product: '防静电膜', quantity: 8000, status: 'completed', delivery: '2024-01-16' },
  { id: 'SO20240115005', customer: '中山新材', product: '热收缩膜', quantity: 6000, status: 'producing', delivery: '2024-01-19' },
];

function DashboardContent() {
  return (
    <MainLayout title="仪表盘">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">仪表盘</h2>
          <p className="text-muted-foreground">欢迎回来，这里是您的企业运营概览。</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${stat.color}`}>
                  {stat.change} {stat.trend === 'up' ? '↑' : '↓'} 从上月
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>近期订单</CardTitle>
              <CardDescription>最近创建的订单列表。</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>产品</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>交货日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>{order.product}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.status === 'producing' && '生产中'}
                          {order.status === 'confirmed' && '已确认'}
                          {order.status === 'draft' && '草稿'}
                          {order.status === 'completed' && '已完成'}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.delivery}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>快速统计</CardTitle>
              <CardDescription>今日运营数据概览。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">待处理订单</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              <div className="flex items-center justify-between space-x-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">生产中</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Factory className="h-6 w-6 text-orange-600" />
                </div>
              </div>

              <div className="flex items-center justify-between space-x-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold">15</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

export default function DashboardPage() {
  return (
    <ClientProviders>
      <DashboardContent />
    </ClientProviders>
  );
}
