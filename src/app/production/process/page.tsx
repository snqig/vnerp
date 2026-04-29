'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import {
  Card,
  CardContent,
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

const STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '待排产', className: 'bg-gray-100 text-gray-700' },
  1: { label: '已排产', className: 'bg-blue-100 text-blue-700' },
  2: { label: '生产中', className: 'bg-orange-100 text-orange-700' },
  3: { label: '已完成', className: 'bg-green-100 text-green-700' },
};

const getStatusBadge = (status: number) => {
  const config = STATUS_MAP[status] || { label: '未知', className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function ProductionProcessPage() {
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

      const res = await fetch(`/api/production/process?${params}`);
      const data = await res.json();

      if (data.success) {
        setProcesses(Array.isArray(data.data) ? data.data : []);
      } else {
        toast({ title: '错误', description: data.message || '获取流程列表失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '获取流程列表失败', variant: 'destructive' });
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
      const res = await fetch('/api/production/process', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        toast({ title: '成功', description: `状态已更新为${STATUS_MAP[newStatus]?.label || newStatus}` });
        fetchProcesses();
      } else {
        toast({ title: '错误', description: data.message || '更新失败', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' });
    }
  };

  const handleReportWork = async () => {
    if (!selectedProcess) return;
    const newStatus = selectedProcess.burdening_status === 1 ? 2 : 3;
    await handleStatusUpdate(selectedProcess, newStatus);
    setIsProcessOpen(false);
  };

  return (
    <MainLayout title="生产流程">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已排产</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">生产中</CardTitle>
              <Factory className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.producing}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">计划总产量</CardTitle>
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
                  placeholder="搜索流程卡号..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fetchProcesses()}>
                  刷新
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">全部 ({processes.length})</TabsTrigger>
            <TabsTrigger value="scheduled">已排产 ({stats.scheduled})</TabsTrigger>
            <TabsTrigger value="producing">生产中 ({stats.producing})</TabsTrigger>
            <TabsTrigger value="completed">已完成 ({stats.completed})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    加载中...
                  </div>
                ) : processes.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    暂无流程数据
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>流程卡号</TableHead>
                        <TableHead>产品信息</TableHead>
                        <TableHead>客户</TableHead>
                        <TableHead>数量</TableHead>
                        <TableHead>工艺流程</TableHead>
                        <TableHead>进度</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processes.map((process) => (
                        <TableRow key={process.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{process.card_no}</span>
                              <span className="text-xs text-muted-foreground">{process.work_order_no}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{process.product_name}</span>
                              <span className="text-xs text-muted-foreground">{process.material_spec}</span>
                              {process.print_type && (
                                <span className="text-xs text-muted-foreground">{process.print_type}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{process.customer_name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{parseFloat(String(process.plan_qty)).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="text-xs">{process.process_flow1 || '-'}</div>
                              {process.process_flow2 && (
                                <div className="text-xs text-muted-foreground">{process.process_flow2}</div>
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
                                <Button
                                  size="sm"
                                  onClick={() => handleStartProcess(process)}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  开工
                                </Button>
                              )}
                              {process.burdening_status === 2 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartProcess(process)}
                                >
                                  <Clock className="h-4 w-4 mr-1" />
                                  报工
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
                                    查看详情
                                  </DropdownMenuItem>
                                  {process.burdening_status === 2 && (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(process, 3)}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      完成生产
                                    </DropdownMenuItem>
                                  )}
                                  {process.burdening_status === 3 && (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(process, 2)}>
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      重新生产
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
                    生产流程详情: {selectedProcess.card_no}
                    {getStatusBadge(selectedProcess.burdening_status)}
                  </DialogTitle>
                  <DialogDescription>查看生产流程详细信息</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">流程信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">流程卡号:</span>
                        <span>{selectedProcess.card_no}</span>
                        <span className="text-muted-foreground">工单号:</span>
                        <span>{selectedProcess.work_order_no}</span>
                        <span className="text-muted-foreground">主标编号:</span>
                        <span>{selectedProcess.main_label_no || '-'}</span>
                        <span className="text-muted-foreground">排产日期:</span>
                        <span>{selectedProcess.work_order_date}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">产品信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">产品名称:</span>
                        <span>{selectedProcess.product_name}</span>
                        <span className="text-muted-foreground">物料规格:</span>
                        <span>{selectedProcess.material_spec || '-'}</span>
                        <span className="text-muted-foreground">印刷方式:</span>
                        <span>{selectedProcess.print_type || '-'}</span>
                        <span className="text-muted-foreground">计划数量:</span>
                        <span>{parseFloat(String(selectedProcess.plan_qty)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {(selectedProcess.film_manufacturer || selectedProcess.mold_code) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">工艺信息</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">底纸厂商:</span>
                          <span className="ml-2">{selectedProcess.film_manufacturer || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">底纸编号:</span>
                          <span className="ml-2">{selectedProcess.film_code || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">模具编号:</span>
                          <span className="ml-2">{selectedProcess.mold_code || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">工艺流程</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getProcessFlow(selectedProcess).map((step, index, arr) => (
                        <div key={index} className="flex items-center">
                          <div className={`px-3 py-1 rounded-full text-sm ${
                            index < currentStep
                              ? 'bg-green-100 text-green-700'
                              : index === currentStep
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
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
                      关闭
                    </Button>
                    {selectedProcess.burdening_status === 1 && (
                      <Button onClick={() => {
                        setIsDetailOpen(false);
                        handleStartProcess(selectedProcess);
                      }}>
                        <Play className="h-4 w-4 mr-2" />
                        开始生产
                      </Button>
                    )}
                    {selectedProcess.burdening_status === 2 && (
                      <Button onClick={() => {
                        setIsDetailOpen(false);
                        handleStartProcess(selectedProcess);
                      }}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        完成生产
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
                    工序报工: {selectedProcess.card_no}
                  </DialogTitle>
                  <DialogDescription>记录生产工序完成情况</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">产品:</span>
                        <span className="ml-2 font-medium">{selectedProcess.product_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">客户:</span>
                        <span className="ml-2">{selectedProcess.customer_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">计划数量:</span>
                        <span className="ml-2">{parseFloat(String(selectedProcess.plan_qty)).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">当前状态:</span>
                        <span className="ml-2">{getStatusBadge(selectedProcess.burdening_status)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>当前工序</Label>
                    <Select value={String(currentStep)} onValueChange={(v) => setCurrentStep(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择当前工序" />
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
                    <Label>工序进度</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getProcessFlow(selectedProcess).map((step, index, arr) => (
                        <div key={index} className="flex items-center">
                          <button
                            onClick={() => setCurrentStep(index)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${
                              index < currentStep
                                ? 'bg-green-100 text-green-700'
                                : index === currentStep
                                  ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300'
                                  : 'bg-gray-100 text-gray-700'
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
                    <Label>报工备注</Label>
                    <Textarea
                      placeholder="输入报工备注信息..."
                      value={processRemark}
                      onChange={(e) => setProcessRemark(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsProcessOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleReportWork}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      确认报工
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
