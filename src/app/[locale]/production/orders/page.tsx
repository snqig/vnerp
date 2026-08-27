'use client';

import { MainLayout } from '@/components/layout';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
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

const processes = [
  { code: 'P01', name: '切料', status: 'completed' },
  { code: 'P02', name: '磨切', status: 'completed' },
  { code: 'P03', name: '印刷', status: 'producing' },
  { code: 'P04', name: '烘干', status: 'pending' },
  { code: 'P05', name: '模切', status: 'pending' },
  { code: 'P06', name: '检验', status: 'pending' },
  { code: 'P07', name: '包装', status: 'pending' },
];

export default function WorkOrdersPage() {
  const t = useTranslations('Production');
  const tc = useTranslations('Common');
  const locale = useLocale();

  const ORDER_STATUS_CLASSES: Record<string, string> = {
    created: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    producing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    closed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      created: t('orderCreated'),
      scheduled: t('orderScheduled'),
      producing: t('orderProducing'),
      completed: t('orderCompleted'),
      closed: tc('closed'),
    };
    const label = statusLabels[status] || status;
    const className =
      ORDER_STATUS_CLASSES[status] ||
      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    return <Badge className={className}>{label}</Badge>;
  };

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [_selectedOrder, _setSelectedOrder] = useState<(typeof workOrders)[0] | null>(null);

  return (
    <MainLayout title={t('workOrders')}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('searchOrderPlaceholder')} className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('orderStatusFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    <SelectItem value="created">{t('orderCreated')}</SelectItem>
                    <SelectItem value="scheduled">{t('orderScheduled')}</SelectItem>
                    <SelectItem value="producing">{t('orderProducing')}</SelectItem>
                    <SelectItem value="completed">{t('orderCompleted')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('newWorkOrder')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" resizable>
                  <DialogHeader>
                    <DialogTitle>{t('newWorkOrder')}</DialogTitle>
                    <DialogDescription>{t('createWorkOrderDesc')}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('salesOrder')}</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectSalesOrder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SO001">{t('salesOrderSO001')}</SelectItem>
                            <SelectItem value="SO002">{t('salesOrderSO002')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('product')}</Label>
                        <Input disabled value={t('sampleProductFilm')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('plannedQuantity')}</Label>
                        <Input type="number" placeholder={t('productionQtyPlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('priorityRange')}</Label>
                        <Input type="number" min="1" max="10" defaultValue="5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('plannedStartDate')}</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('plannedEndDate')}</Label>
                        <Input type="date" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      {tc('cancel')}
                    </Button>
                    <Button onClick={() => setIsCreateOpen(false)}>{t('createWorkOrder')}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {workOrders.map((order) => (
            <Card
              key={order.id}
              className={
                order.efficiency < 80 && order.status === 'producing' ? 'border-orange-300' : ''
              }
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">{order.id}</h3>
                        {getStatusBadge(order.status)}
                        {order.efficiency < 80 && order.status === 'producing' && (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {t('efficiencyWarning')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <QrCode className="h-4 w-4 mr-1" />
                          {t('qrCode')}
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
                              {t('viewDetail')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              {tc('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Play className="h-4 w-4 mr-2" />
                              {t('startProduction')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pause className="h-4 w-4 mr-2" />
                              {t('pause')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('productName')}：</span>
                        <span className="font-medium">{order.product}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('customerLabel')}：</span>
                        <span>{order.customer}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('currentProcessLabel')}：</span>
                        <span className="font-medium">{order.currentProcess}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('priorityLabel')}：</span>
                        <span className={order.priority >= 8 ? 'text-red-600 font-bold' : ''}>
                          {order.priority}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('productionProgress')}</span>
                        <span>
                          {order.completedQty.toLocaleString(locale)} /{' '}
                          {order.quantity.toLocaleString(locale)} {order.unit}
                          {order.scrapQty > 0 && (
                            <span className="text-red-500 ml-2">
                              ({t('scrapLabel')}: {order.scrapQty})
                            </span>
                          )}
                        </span>
                      </div>
                      <Progress
                        value={(order.completedQty / order.quantity) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{t('efficiencyLabel')}：</span>
                        <span
                          className={
                            order.efficiency < 80
                              ? 'text-red-600 font-bold'
                              : 'text-green-600 font-medium'
                          }
                        >
                          {order.efficiency}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {order.planStartDate} ~ {order.planEndDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-64 flex-shrink-0">
                    <div className="text-sm font-medium mb-2">{t('processProgress')}</div>
                    <div className="space-y-1">
                      {processes.map((process, _idx) => (
                        <div
                          key={process.code}
                          className={`flex items-center gap-2 text-xs p-2 rounded ${
                            process.status === 'completed'
                              ? 'bg-green-50 text-green-700'
                              : process.status === 'producing'
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-gray-50 text-gray-500'
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
