'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  MoreHorizontal,
  Eye,
  Play,
  CheckCircle,
  Pause,
  RotateCcw,
  Factory,
  Calendar,
  TrendingUp,
  Package,
  Clock,
  ChevronRight,
  Printer,
  QrCode,
} from 'lucide-react';

interface ProcessCard {
  id: number;
  card_no: string;
  qr_code: string;
  work_order_no: string;
  product_code: string;
  product_name: string;
  material_spec: string;
  work_order_date: string;
  plan_qty: number;
  main_label_no: string;
  burdening_status: number;
  lock_status: number;
  create_user_name: string;
  create_time: string;
  update_time: string;
  customer_name?: string;
  customer_code?: string;
  process_flow1?: string;
  process_flow2?: string;
  print_type?: string;
  film_manufacturer?: string;
  film_code?: string;
  mold_code?: string;
}

const STATUS_CLASSES: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  3: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export default function ProductionProcessPage() {
  // 翻译钩子
  const t = useTranslations('Production');
  const tc = useTranslations('Common');

  const getStatusBadge = (status: number) => {
    const statusLabels: Record<number, string> = {
      0: t('pendingSchedule'),
      1: t('statusScheduled'),
      2: t('statusProducing'),
      3: t('statusCompleted'),
    };
    const label = statusLabels[status] || tc('unknown');
    const className =
      STATUS_CLASSES[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    return <Badge className={className}>{label}</Badge>;
  };

  const { toast } = useToast();
  const [processes, setProcesses] = useState<ProcessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProcessCard | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [processRemark, setProcessRemark] = useState('');

  const fetchProcesses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        const statusMap: Record<string, string> = {
          scheduled: '1',
          producing: '2',
          completed: '3',
        };
        if (statusMap[activeTab]) params.append('status', statusMap[activeTab]);
      }
      if (searchQuery) params.append('cardNo', searchQuery);

      const res = await authFetch(`/api/production/process?${params}`);
      const data = await res.json();

      if (data.success) {
        const processList = Array.isArray(data.data) ? data.data : data.data?.list || [];
        setProcesses(processList);
      } else {
        toast({
          title: t('error'),
          description: data.message || t('fetchProcessListFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('error'),
        description: t('fetchProcessListFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, toast]);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  const stats = {
    scheduled: processes.filter((p) => p.burdening_status === 1).length,
    producing: processes.filter((p) => p.burdening_status === 2).length,
    completed: processes.filter((p) => p.burdening_status === 3).length,
    totalQty: processes.reduce((sum, p) => sum + (parseFloat(String(p.plan_qty)) || 0), 0),
  };

  const getProcessFlow = (process: ProcessCard) => {
    const flow1 = process.process_flow1?.split('-') || [];
    const flow2 = process.process_flow2?.split('-') || [];
    return [...flow1, ...flow2];
  };

  const getProgressPercent = (process: ProcessCard) => {
    if (process.burdening_status === 1) return 0;
    if (process.burdening_status === 2) return 50;
    if (process.burdening_status === 3) return 100;
    return 0;
  };

  const handleViewDetail = (process: ProcessCard) => {
    setSelectedProcess(process);
    setCurrentStep(0);
    setIsDetailOpen(true);
  };

  const handleStartProcess = (process: ProcessCard) => {
    setSelectedProcess(process);
    setCurrentStep(0);
    setProcessRemark('');
    setIsProcessOpen(true);
  };

  const handleStatusUpdate = async (process: ProcessCard, newStatus: number) => {
    try {
      const res = await authFetch('/api/production/process', {
        method: 'PUT',
        body: JSON.stringify({
          id: process.id,
          processStatus: newStatus,
          cardNo: process.card_no,
          currentProcess: getProcessFlow(process)[currentStep] || '',
          operatorName: '',
          remark: processRemark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const statusLabels: Record<number, string> = {
          0: t('pendingSchedule'),
          1: t('statusScheduled'),
          2: t('statusProducing'),
          3: t('statusCompleted'),
        };
        toast({
          title: t('success'),
          description: t('statusUpdated', { status: statusLabels[newStatus] || newStatus }),
        });
        fetchProcesses();
      } else {
        toast({
          title: t('error'),
          description: data.message || tc('updateFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: t('error'), description: tc('updateFailed'), variant: 'destructive' });
    }
  };

  const handleReportWork = async () => {
    if (!selectedProcess) return;
    const newStatus = selectedProcess.burdening_status === 1 ? 2 : 3;
    await handleStatusUpdate(selectedProcess, newStatus);
    setIsProcessOpen(false);
  };

  return (
    <MainLayout title={t('processManagement')}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('statusScheduled')}</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('statusProducing')}</CardTitle>
              <Factory className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.producing}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('statusCompleted')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalPlanQty')}</CardTitle>
              <Package className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQty.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchCardNo')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fetchProcesses()}>
                  {tc('refresh')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              {tc('all')} ({processes.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              {t('statusScheduled')} ({stats.scheduled})
            </TabsTrigger>
            <TabsTrigger value="producing">
              {t('statusProducing')} ({stats.producing})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t('statusCompleted')} ({stats.completed})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    {tc('loading')}
                  </div>
                ) : processes.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    {t('noProcessData')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('processCardNo')}</TableHead>
                        <TableHead>{t('productInfo')}</TableHead>
                        <TableHead>{t('customer')}</TableHead>
                        <TableHead>{tc('quantity')}</TableHead>
                        <TableHead>{t('processFlow')}</TableHead>
                        <TableHead>{t('progress')}</TableHead>
                        <TableHead>{tc('status')}</TableHead>
                        <TableHead>{tc('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processes.map((process) => (
                        <TableRow key={process.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{process.card_no}</span>
                              <span className="text-xs text-muted-foreground">
                                {process.work_order_no}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{process.product_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {process.material_spec}
                              </span>
                              {process.print_type && (
                                <span className="text-xs text-muted-foreground">
                                  {process.print_type}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{process.customer_name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {parseFloat(String(process.plan_qty)).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="text-xs">{process.process_flow1 || '-'}</div>
                              {process.process_flow2 && (
                                <div className="text-xs text-muted-foreground">
                                  {process.process_flow2}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-full max-w-[120px]">
                              <Progress value={getProgressPercent(process)} className="h-2" />
                              <span className="text-xs text-muted-foreground">
                                {getProgressPercent(process)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(process.burdening_status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetail(process)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {process.burdening_status === 1 && (
                                <Button size="sm" onClick={() => handleStartProcess(process)}>
                                  <Play className="h-4 w-4 mr-1" />
                                  {t('startWork')}
                                </Button>
                              )}
                              {process.burdening_status === 2 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartProcess(process)}
                                >
                                  <Clock className="h-4 w-4 mr-1" />
                                  {t('reportWork')}
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetail(process)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {tc('detail')}
                                  </DropdownMenuItem>
                                  {process.burdening_status === 2 && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusUpdate(process, 3)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t('completeProduction')}
                                    </DropdownMenuItem>
                                  )}
                                  {process.burdening_status === 3 && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusUpdate(process, 2)}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      {t('redoProduction')}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl" resizable>
            {selectedProcess && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {t('processDetail')}: {selectedProcess.card_no}
                    {getStatusBadge(selectedProcess.burdening_status)}
                  </DialogTitle>
                  <DialogDescription>{t('processDetailDesc')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('processInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('processCardNo')}:</span>
                        <span>{selectedProcess.card_no}</span>
                        <span className="text-muted-foreground">{t('workOrderNo')}:</span>
                        <span>{selectedProcess.work_order_no}</span>
                        <span className="text-muted-foreground">{t('mainLabelNo')}:</span>
                        <span>{selectedProcess.main_label_no || '-'}</span>
                        <span className="text-muted-foreground">{t('scheduleDate')}:</span>
                        <span>{selectedProcess.work_order_date}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('productInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('productName')}:</span>
                        <span>{selectedProcess.product_name}</span>
                        <span className="text-muted-foreground">{t('materialSpec')}:</span>
                        <span>{selectedProcess.material_spec || '-'}</span>
                        <span className="text-muted-foreground">{t('printType')}:</span>
                        <span>{selectedProcess.print_type || '-'}</span>
                        <span className="text-muted-foreground">{t('planQty')}:</span>
                        <span>{parseFloat(String(selectedProcess.plan_qty)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {(selectedProcess.film_manufacturer || selectedProcess.mold_code) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('processInfo2')}
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t('filmManufacturer')}:</span>
                          <span className="ml-2">{selectedProcess.film_manufacturer || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('filmCode')}:</span>
                          <span className="ml-2">{selectedProcess.film_code || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('moldCode')}:</span>
                          <span className="ml-2">{selectedProcess.mold_code || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {t('processFlow')}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getProcessFlow(selectedProcess).map((step, index, arr) => (
                        <div key={index} className="flex items-center">
                          <div
                            className={`px-3 py-1 rounded-full text-sm ${
                              index < currentStep
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : index === currentStep
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {step}
                          </div>
                          {index < arr.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                          )}
                        </div>
                      ))}
                    </div>
                    <Progress value={getProgressPercent(selectedProcess)} className="h-2" />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      {tc('close')}
                    </Button>
                    {selectedProcess.burdening_status === 1 && (
                      <Button
                        onClick={() => {
                          setIsDetailOpen(false);
                          handleStartProcess(selectedProcess);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {t('startProduction')}
                      </Button>
                    )}
                    {selectedProcess.burdening_status === 2 && (
                      <Button
                        onClick={() => {
                          setIsDetailOpen(false);
                          handleStartProcess(selectedProcess);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('completeProduction')}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isProcessOpen} onOpenChange={setIsProcessOpen}>
          <DialogContent className="max-w-2xl" resizable>
            {selectedProcess && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5" />
                    {t('processReport')}: {selectedProcess.card_no}
                  </DialogTitle>
                  <DialogDescription>{t('processReportDesc')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('product')}:</span>
                        <span className="ml-2 font-medium">{selectedProcess.product_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('customer')}:</span>
                        <span className="ml-2">{selectedProcess.customer_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('planQty')}:</span>
                        <span className="ml-2">
                          {parseFloat(String(selectedProcess.plan_qty)).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('currentStatus')}:</span>
                        <span className="ml-2">
                          {getStatusBadge(selectedProcess.burdening_status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>{t('currentProcess')}</Label>
                    <Select
                      value={String(currentStep)}
                      onValueChange={(v) => setCurrentStep(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectCurrentProcess')} />
                      </SelectTrigger>
                      <SelectContent>
                        {getProcessFlow(selectedProcess).map((step, index) => (
                          <SelectItem key={index} value={String(index)}>
                            {index + 1}. {step}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>{t('processProgress')}</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getProcessFlow(selectedProcess).map((step, index, arr) => (
                        <div key={index} className="flex items-center">
                          <button
                            onClick={() => setCurrentStep(index)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${
                              index < currentStep
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : index === currentStep
                                  ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300 dark:bg-orange-900/30 dark:text-orange-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {step}
                          </button>
                          {index < arr.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>{t('reportRemark')}</Label>
                    <Textarea
                      placeholder={t('reportRemarkPlaceholder')}
                      value={processRemark}
                      onChange={(e) => setProcessRemark(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsProcessOpen(false)}>
                      {tc('cancel')}
                    </Button>
                    <Button onClick={handleReportWork}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('confirmReport')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
