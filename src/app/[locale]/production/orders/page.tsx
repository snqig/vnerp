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
import { useToast } from '@/hooks/use-toast';
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
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { authFetch } from '@/lib/auth-fetch';

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

interface ProcessStep {
  id: number;
  workOrderId: number;
  stepNo: number;
  stepName: string;
  processType: 'production' | 'inspection';
  status: StepStatus;
  startTime: string | null;
  endTime: string | null;
  remark: string;
}

interface WorkOrder {
  id: string; // work_order_no
  qrCode: string;
  product: string;
  customer: string;
  quantity: number;
  completedQty: number;
  scrapQty: number;
  unit: string;
  planStartDate: string;
  planEndDate: string;
  status: string;
  currentProcess: string;
  efficiency: number;
  priority: string;
  remark: string;
}

const STATUS_LABEL_KEY: Record<string, string> = {
  pending: 'orderCreated',
  confirmed: 'orderScheduled',
  producing: 'orderProducing',
  completed: 'orderCompleted',
  cancelled: 'orderCancelled',
};
const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  producing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
const STEP_LABEL_KEY: Record<string, string> = {
  pending: 'stepPending',
  in_progress: 'stepInProgress',
  completed: 'stepCompleted',
  skipped: 'stepSkipped',
  failed: 'stepFailed',
};
const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'text-red-600 font-bold',
  high: 'text-orange-600 font-semibold',
  normal: '',
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(url, init);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || '请求失败');
  return json.data as T;
}

function mapOrder(r: Record<string, unknown>): WorkOrder {
  // prod_work_order 同时存在 quantity/finished_qty 与 planned_qty/completed_qty 两套列,
  // 但运行时核实(全表 28 行)只有 quantity 被写入,其余三列恒为 0。
  // 故优先取 quantity 作为计划总量、finished_qty 作为已完工量,并各自兜底到同名列,
  // 避免 schema 版本漂移时再次渲染成 0。DECIMAL 经 mysql2 返回字符串,需 Number() 归一。
  const qty = Number(r.quantity) || Number(r.planned_qty) || 0;
  const done = Number(r.finished_qty) || Number(r.completed_qty) || 0;
  const ps = r.plan_start_date ? String(r.plan_start_date) : '';
  const pe = r.plan_end_date ? String(r.plan_end_date) : '';
  return {
    id: String(r.work_order_no),
    qrCode: String(r.work_order_no),
    product: String(r.product_name || '-'),
    customer: String(r.customer_name || '-'),
    quantity: qty,
    completedQty: done,
    scrapQty: 0,
    unit: String(r.unit || 'pcs'),
    planStartDate: ps ? ps.slice(0, 10) : '',
    planEndDate: pe ? pe.slice(0, 10) : '',
    status: String(r.status || 'pending'),
    currentProcess: '',
    efficiency: qty > 0 ? Math.round((done / qty) * 100) : 0,
    priority: String(r.priority || 'normal'),
    remark: String(r.remark || ''),
  };
}

export default function WorkOrdersPage() {
  const t = useTranslations('Production');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const { toast } = useToast();

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [stepsByOrder, setStepsByOrder] = useState<Record<string, ProcessStep[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrOrder, setQrOrder] = useState<WorkOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<WorkOrder | null>(null);
  const [editOrder, setEditOrder] = useState<WorkOrder | null>(null);
  const [editForm, setEditForm] = useState({
    customer: '',
    planStartDate: '',
    planEndDate: '',
    priority: 'normal',
    remark: '',
  });

  const loadSteps = async (workOrderNo: string): Promise<ProcessStep[]> => {
    try {
      const data = await apiJson<{ list: ProcessStep[] }>(
        `/api/production/work-orders/${encodeURIComponent(workOrderNo)}/process-step`
      );
      return data.list || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiJson<{ list: Record<string, unknown>[] }>(
          '/api/production/work-orders?pageSize=100'
        );
        const mapped = (data.list || []).map(mapOrder);
        setOrders(mapped);
        const pairs = await Promise.all(
          mapped.map(async (o) => [o.id, await loadSteps(o.id)] as const)
        );
        const map: Record<string, ProcessStep[]> = {};
        pairs.forEach(([k, v]) => {
          map[k] = v;
        });
        setStepsByOrder(map);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const deriveCurrentProcess = (steps: ProcessStep[]): string => {
    if (!steps.length) return '';
    const inProg = steps.find((s) => s.status === 'in_progress');
    if (inProg) return inProg.stepName;
    if (steps.every((s) => s.status === 'completed')) return t('stepCompleted');
    const next = steps.find((s) => s.status === 'pending' || s.status === 'skipped');
    return next ? next.stepName : '';
  };

  const advanceStep = async (orderId: string, step: ProcessStep) => {
    const next: StepStatus | null =
      step.status === 'pending' ? 'in_progress' : step.status === 'in_progress' ? 'completed' : null;
    if (!next) return;
    try {
      const updated = await apiJson<ProcessStep>(
        `/api/production/work-orders/${encodeURIComponent(orderId)}/process-step`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepId: step.id, status: next }),
        }
      );
      setStepsByOrder((prev) => ({
        ...prev,
        [orderId]: (prev[orderId] || []).map((s) => (s.id === step.id ? updated : s)),
      }));
      toast({ title: t('processStepUpdated'), description: `${step.stepName} → ${t(STEP_LABEL_KEY[next])}` });
    } catch (e) {
      toast({
        title: t('updateFailed'),
        description: e instanceof Error ? e.message : '',
      });
    }
  };

  const handleStart = async (order: WorkOrder) => {
    try {
      await apiJson('/api/workorders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_order_no: order.id, status: 'producing' }),
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'producing' } : o)));
      toast({ title: t('startProduction'), description: order.id });
    } catch (e) {
      toast({ title: t('updateFailed'), description: e instanceof Error ? e.message : '' });
    }
  };

  const handlePause = (order: WorkOrder) => {
    toast({ title: t('pause'), description: t('noPausedState') });
  };

  const handleView = (order: WorkOrder) => setDetailOrder(order);
  const handleQr = (order: WorkOrder) => setQrOrder(order);

  const handleEditOpen = (order: WorkOrder) => {
    setEditOrder(order);
    setEditForm({
      customer: order.customer,
      planStartDate: order.planStartDate,
      planEndDate: order.planEndDate,
      priority: order.priority,
      remark: order.remark,
    });
  };

  const handleEditSave = async () => {
    if (!editOrder) return;
    try {
      await apiJson('/api/workorders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_no: editOrder.id,
          customer_name: editForm.customer,
          plan_start_date: editForm.planStartDate || null,
          plan_end_date: editForm.planEndDate || null,
          priority: editForm.priority,
          remark: editForm.remark,
        }),
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editOrder.id
            ? {
                ...o,
                customer: editForm.customer,
                planStartDate: editForm.planStartDate,
                planEndDate: editForm.planEndDate,
                priority: editForm.priority,
                remark: editForm.remark,
              }
            : o
        )
      );
      setEditOrder(null);
      toast({ title: t('editWorkOrder'), description: editOrder.id });
    } catch (e) {
      toast({ title: t('updateFailed'), description: e instanceof Error ? e.message : '' });
    }
  };

  const getStatusBadge = (status: string) => {
    const label = t(STATUS_LABEL_KEY[status] || 'orderCreated');
    const className = STATUS_CLASS[status] || STATUS_CLASS.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const renderSteps = (steps: ProcessStep[], orderId: string, compact?: boolean) => {
    if (!steps.length) {
      return <div className="text-xs text-muted-foreground p-2">—</div>;
    }
    return (
      <div className="space-y-1">
        {steps.map((step) => {
          const cls =
            step.status === 'completed'
              ? 'bg-green-50 text-green-700'
              : step.status === 'in_progress'
                ? 'bg-orange-50 text-orange-700'
                : step.status === 'failed'
                  ? 'bg-red-50 text-red-700'
                  : step.status === 'skipped'
                    ? 'bg-gray-50 text-gray-400'
                    : 'bg-gray-50 text-gray-500';
          const icon =
            step.status === 'completed' ? (
              <CheckCircle className="h-3 w-3" />
            ) : step.status === 'in_progress' ? (
              <Factory className="h-3 w-3" />
            ) : (
              <div className="h-3 w-3 rounded-full border" />
            );
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => advanceStep(orderId, step)}
              title={t('clickToAdvance')}
              className={`flex items-center gap-2 text-xs p-2 rounded w-full text-left transition-colors hover:opacity-80 ${cls}`}
            >
              {icon}
              <span className="flex-1 truncate">{step.stepName}</span>
              {!compact && (
                <span className="text-[10px] opacity-70">
                  {step.processType === 'inspection' ? t('processTypeInspection') : t('processTypeProduction')}
                </span>
              )}
              <span className="opacity-70">{t(STEP_LABEL_KEY[step.status])}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (
      search &&
      !`${o.id} ${o.product} ${o.customer}`.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <MainLayout title={t('workOrders')}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchOrderPlaceholder')}
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('orderStatusFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    <SelectItem value="pending">{t('orderCreated')}</SelectItem>
                    <SelectItem value="confirmed">{t('orderScheduled')}</SelectItem>
                    <SelectItem value="producing">{t('orderProducing')}</SelectItem>
                    <SelectItem value="completed">{t('orderCompleted')}</SelectItem>
                    <SelectItem value="cancelled">{t('orderCancelled')}</SelectItem>
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

        {loading && <div className="text-sm text-muted-foreground p-4">{t('loading')}</div>}
        {error && (
          <div className="text-sm text-red-600 p-4">
            {t('loadFailed')}: {error}
          </div>
        )}

        <div className="grid gap-4">
          {filtered.map((order) => {
            const steps = stepsByOrder[order.id] || [];
            const currentProcess = deriveCurrentProcess(steps);
            return (
              <Card
                key={order.id}
                className={
                  order.efficiency < 80 && order.status === 'producing'
                    ? 'border-orange-300'
                    : ''
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
                          <Button variant="outline" size="sm" onClick={() => handleQr(order)}>
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
                              <DropdownMenuItem onClick={() => handleView(order)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('viewDetail')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditOpen(order)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {tc('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStart(order)}>
                                <Play className="h-4 w-4 mr-2" />
                                {t('startProduction')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePause(order)}>
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
                          <span className="font-medium">{currentProcess}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('priorityLabel')}：</span>
                          <span className={PRIORITY_CLASS[order.priority] || ''}>
                            {t(
                              order.priority === 'urgent'
                                ? 'priorityUrgent'
                                : order.priority === 'high'
                                  ? 'priorityHigh'
                                  : 'priorityNormal'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t('productionProgress')}</span>
                          <span>
                            {order.completedQty.toLocaleString(locale)} /{' '}
                            {order.quantity.toLocaleString(locale)} {order.unit}
                          </span>
                        </div>
                        <Progress
                          value={order.quantity > 0 ? (order.completedQty / order.quantity) * 100 : 0}
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
                      {renderSteps(steps, order.id, true)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!loading && !filtered.length && (
            <div className="text-sm text-muted-foreground p-4">{t('noData')}</div>
          )}
        </div>
      </div>

      {/* 二维码弹窗 */}
      <Dialog open={!!qrOrder} onOpenChange={(o) => !o && setQrOrder(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('qrCode')}</DialogTitle>
            <DialogDescription>{qrOrder?.id}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrOrder && <QRCodeSVG value={qrOrder.qrCode} size={200} level="M" />}
            <div className="text-sm text-muted-foreground break-all text-center">
              {qrOrder?.qrCode}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 查看详情弹窗 */}
      <Dialog open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('viewDetail')}</DialogTitle>
            <DialogDescription>{detailOrder?.id}</DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('productName')}：</span>
                  <span className="font-medium">{detailOrder.product}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('customerLabel')}：</span>
                  <span>{detailOrder.customer}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('quantity')}：</span>
                  <span>
                    {detailOrder.quantity.toLocaleString(locale)} {detailOrder.unit}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('priorityLabel')}：</span>
                  <span className={PRIORITY_CLASS[detailOrder.priority] || ''}>
                    {t(
                      detailOrder.priority === 'urgent'
                        ? 'priorityUrgent'
                        : detailOrder.priority === 'high'
                          ? 'priorityHigh'
                          : 'priorityNormal'
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('currentProcessLabel')}：</span>
                  <span>{deriveCurrentProcess(stepsByOrder[detailOrder.id] || [])}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('productionProgress')}：</span>
                  <span>
                    {detailOrder.completedQty.toLocaleString(locale)} /{' '}
                    {detailOrder.quantity.toLocaleString(locale)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t('plannedDate')}：</span>
                  <span>
                    {detailOrder.planStartDate} ~ {detailOrder.planEndDate}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">
                  {t('processProgress')}
                  <span className="text-muted-foreground ml-2 text-xs">
                    ({t('clickToAdvance')})
                  </span>
                </div>
                {renderSteps(stepsByOrder[detailOrder.id] || [], detailOrder.id)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={!!editOrder} onOpenChange={(o) => !o && setEditOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editWorkOrder')}</DialogTitle>
            <DialogDescription>{editOrder?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>{t('productName')}</Label>
              <Input disabled value={editOrder?.product || ''} />
            </div>
            <div className="space-y-1">
              <Label>{t('customerLabel')}</Label>
              <Input
                value={editForm.customer}
                onChange={(e) => setEditForm((f) => ({ ...f, customer: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('planStartDate')}</Label>
                <Input
                  type="date"
                  value={editForm.planStartDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, planStartDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('planEndDate')}</Label>
                <Input
                  type="date"
                  value={editForm.planEndDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, planEndDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('priorityLabel')}</Label>
              <Select
                value={editForm.priority}
                onValueChange={(v) => setEditForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t('priorityNormal')}</SelectItem>
                  <SelectItem value="high">{t('priorityHigh')}</SelectItem>
                  <SelectItem value="urgent">{t('priorityUrgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('remark')}</Label>
              <Input
                value={editForm.remark}
                onChange={(e) => setEditForm((f) => ({ ...f, remark: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOrder(null)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleEditSave}>{tc('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
