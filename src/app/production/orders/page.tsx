'use client';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Play,
  Pause,
  QrCode,
  Factory,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useState } from 'react';

// 工单数据
const workOrders = [
  {
    id: 'WO20240115001',
    qrCode: 'DCERP:WO:001',
    product: '包装膜-透明',
    customer: '深圳伟业',
    quantity: 5000,
    completedQty: 3750,
    scrapQty: 50,
    unit: '㎡',
    planStartDate: '2024-01-15',
    planEndDate: '2024-01-17',
    status: 'producing',
    currentProcess: '印刷',
    efficiency: 92,
    priority: 8,
  },
  {
    id: 'WO20240115002',
    qrCode: 'DCERP:WO:002',
    product: '标签贴纸',
    customer: '广州华达',
    quantity: 10000,
    completedQty: 4500,
    scrapQty: 100,
    unit: '张',
    planStartDate: '2024-01-15',
    planEndDate: '2024-01-18',
    status: 'producing',
    currentProcess: '模切',
    efficiency: 78,
    priority: 6,
  },
  {
    id: 'WO20240115003',
    qrCode: 'DCERP:WO:003',
    product: '彩印膜-蓝',
    customer: '东莞恒通',
    quantity: 3000,
    completedQty: 0,
    scrapQty: 0,
    unit: '㎡',
    planStartDate: '2024-01-16',
    planEndDate: '2024-01-18',
    status: 'scheduled',
    currentProcess: '待开工',
    efficiency: 0,
    priority: 5,
  },
  {
    id: 'WO20240115004',
    qrCode: 'DCERP:WO:004',
    product: '热收缩膜',
    customer: '中山新材',
    quantity: 6000,
    completedQty: 5400,
    scrapQty: 30,
    unit: '㎡',
    planStartDate: '2024-01-14',
    planEndDate: '2024-01-16',
    status: 'producing',
    currentProcess: '检验',
    efficiency: 95,
    priority: 9,
  },
  {
    id: 'WO20240114001',
    qrCode: 'DCERP:WO:005',
    product: '防静电膜',
    customer: '佛山利达',
    quantity: 8000,
    completedQty: 8000,
    scrapQty: 120,
    unit: '㎡',
    planStartDate: '2024-01-13',
    planEndDate: '2024-01-15',
    status: 'completed',
    currentProcess: '已完成',
    efficiency: 88,
    priority: 7,
  },
];

// 工序列表
const processes = [
  { code: 'P01', name: '切料', status: 'completed' },
  { code: 'P02', name: '磨切', status: 'completed' },
  { code: 'P03', name: '印刷', status: 'producing' },
  { code: 'P04', name: '烘干', status: 'pending' },
  { code: 'P05', name: '模切', status: 'pending' },
  { code: 'P06', name: '检验', status: 'pending' },
  { code: 'P07', name: '包装', status: 'pending' },
];

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    created: { label: '已创建', className: 'bg-gray-100 text-gray-700' },
    scheduled: { label: '已排产', className: 'bg-blue-100 text-blue-700' },
    producing: { label: '生产中', className: 'bg-orange-100 text-orange-700' },
    completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
    closed: { label: '已关闭', className: 'bg-red-100 text-red-700' },
  };
  const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function WorkOrdersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof workOrders[0] | null>(null);

  return (
    <MainLayout title="生产工单">
      <div className="space-y-6">
        {/* 工具栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索工单号、产品..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="工单状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="created">已创建</SelectItem>
                    <SelectItem value="scheduled">已排产</SelectItem>
                    <SelectItem value="producing">生产中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新建工单
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新建生产工单</DialogTitle>
                    <DialogDescription>从销售订单生成工单</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>销售订单</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择销售订单" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SO001">SO20240115001 - 深圳伟业</SelectItem>
                            <SelectItem value="SO002">SO20240115002 - 广州华达</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>产品</Label>
                        <Input disabled value="包装膜-透明" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>计划数量</Label>
                        <Input type="number" placeholder="生产数量" />
                      </div>
                      <div className="space-y-2">
                        <Label>优先级 (1-10)</Label>
                        <Input type="number" min="1" max="10" defaultValue="5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>计划开始日期</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>计划结束日期</Label>
                        <Input type="date" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={() => setIsCreateOpen(false)}>创建工单</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* 工单列表 */}
        <div className="grid gap-4">
          {workOrders.map((order) => (
            <Card key={order.id} className={order.efficiency < 80 && order.status === 'producing' ? 'border-orange-300' : ''}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* 基本信息 */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">{order.id}</h3>
                        {getStatusBadge(order.status)}
                        {order.efficiency < 80 && order.status === 'producing' && (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            效率预警
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <QrCode className="h-4 w-4 mr-1" />
                          二维码
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Play className="h-4 w-4 mr-2" />
                              开始生产
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pause className="h-4 w-4 mr-2" />
                              暂停
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">产品：</span>
                        <span className="font-medium">{order.product}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">客户：</span>
                        <span>{order.customer}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">当前工序：</span>
                        <span className="font-medium">{order.currentProcess}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">优先级：</span>
                        <span className={order.priority >= 8 ? 'text-red-600 font-bold' : ''}>{order.priority}</span>
                      </div>
                    </div>

                    {/* 进度 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">生产进度</span>
                        <span>
                          {order.completedQty.toLocaleString()} / {order.quantity.toLocaleString()} {order.unit}
                          {order.scrapQty > 0 && (
                            <span className="text-red-500 ml-2">(报废: {order.scrapQty})</span>
                          )}
                        </span>
                      </div>
                      <Progress value={(order.completedQty / order.quantity) * 100} className="h-2" />
                    </div>

                    {/* 效率 */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">效率：</span>
                        <span className={order.efficiency < 80 ? 'text-red-600 font-bold' : 'text-green-600 font-medium'}>
                          {order.efficiency}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{order.planStartDate} ~ {order.planEndDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* 工序进度 */}
                  <div className="lg:w-64 flex-shrink-0">
                    <div className="text-sm font-medium mb-2">工序进度</div>
                    <div className="space-y-1">
                      {processes.map((process, idx) => (
                        <div
                          key={process.code}
                          className={`flex items-center gap-2 text-xs p-2 rounded ${
                            process.status === 'completed' ? 'bg-green-50 text-green-700' :
                            process.status === 'producing' ? 'bg-orange-50 text-orange-700' :
                            'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {process.status === 'completed' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : process.status === 'producing' ? (
                            <Factory className="h-3 w-3" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border" />
                          )}
                          <span>{process.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
