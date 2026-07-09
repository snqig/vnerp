'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Scan,
  QrCode,
  Factory,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  LogOut,
  Plus,
  Search,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkReport {
  id: number;
  report_no: string;
  work_order_id: number;
  work_order_no: string;
  report_type: number;
  process_name: string;
  process_seq: number;
  equipment_id: number;
  equipment_name: string;
  operator_id: number;
  operator_name: string;
  plan_qty: number;
  completed_qty: number;
  good_qty: number;
  defect_qty: number;
  scrap_qty: number;
  qualified_qty?: number;
  start_time: string;
  end_time: string;
  work_hours: number;
  is_first_piece: number;
  first_piece_status: number;
  remark: string;
}

interface WorkOrder {
  id: number;
  order_no: string;
  product_name: string;
  plan_qty: number;
  status: number;
}

interface Equipment {
  id: number;
  equipment_code: string;
  equipment_name: string;
}

interface DieTemplate {
  id: number;
  template_code: string;
  template_name: string;
  template_type: number;
  asset_type: string;
  cumulative_impressions: number;
  max_impressions: number;
  die_status: string;
  warning_threshold: number;
}

interface SummaryStats {
  todayCount?: number;
  weekCount?: number;
  monthCount?: number;
  totalHours?: number;
  avgEfficiency?: number;
  total_completed?: number;
  total_qualified?: number;
  total_defective?: number;
  total_scrap?: number;
}

interface WorkReportForm {
  work_order_id?: number;
  work_order_no?: string;
  equipment_id?: number;
  equipment_name?: string;
  employee_id?: number;
  operator_name?: string;
  die_template_id?: number;
  process_name?: string;
  report_date: string;
  start_time: string;
  end_time: string;
  output_qty: number;
  qualified_qty: number;
  scrap_qty: number;
  work_hours: number;
  plan_qty?: number;
  completed_qty?: number;
  remark?: string;
}

export default function ProductionReportPage() {
  // 翻译钩子
  const t = useTranslations('Production');
  const tc = useTranslations('Common');

  const [list, setList] = useState<WorkReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<WorkReportForm>({
    report_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    output_qty: 0,
    qualified_qty: 0,
    scrap_qty: 0,
    work_hours: 0,
  });
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [dieTemplateList, setDieTemplateList] = useState<DieTemplate[]>([]);

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanStep, setScanStep] = useState<'employee' | 'equipment' | 'workorder' | 'complete'>(
    'employee'
  );
  const [scannedCodes, setScannedCodes] = useState({ employee: '', equipment: '', workorder: '' });
  const [inputCode, setInputCode] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (keyword) params.append('keyword', keyword);
      const res = await authFetch('/api/production/work-report?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
        setSummaryStats(result.data?.summaryStats || {});
      }
    } catch {
      toast.error(t('fetchReportFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/workorders?pageSize=50');
      if (!res.ok) {
        return;
      }
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        return;
      }
      if (result.success) setWorkOrders(result.data?.list || []);
    } catch {}
  }, []);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await authFetch('/api/equipment?pageSize=100');
      const result = await res.json();
      if (result.success) setEquipmentList(result.data?.list || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    fetchWorkOrders();
    fetchEquipment();
    fetchDieTemplates();
  }, [fetchWorkOrders, fetchEquipment]);

  const fetchDieTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/prepress/die-template?pageSize=100&die_status=available');
      const result = await res.json();
      if (result.success) setDieTemplateList(result.data?.list || []);
    } catch {}
  }, []);

  const handleSave = async () => {
    if (!form.work_order_id) {
      toast.error(t('selectWorkOrderFirst'));
      return;
    }
    if (!form.process_name) {
      toast.error(t('fillProcessName'));
      return;
    }
    try {
      const res = await authFetch('/api/production/work-report', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(t('reportSuccess'));
        setDialogOpen(false);
        setForm({
          report_date: new Date().toISOString().split('T')[0],
          start_time: '',
          end_time: '',
          output_qty: 0,
          qualified_qty: 0,
          scrap_qty: 0,
          work_hours: 0,
        });
        fetchData();
      } else {
        toast.error(result.message || t('reportFailed'));
      }
    } catch {
      toast.error(t('reportFailed'));
    }
  };

  const handleScan = (type: 'employee' | 'equipment' | 'workorder' | 'complete', code: string) => {
    setScannedCodes((prev) => ({ ...prev, [type]: code }));
    setInputCode('');
    if (type === 'employee') setScanStep('equipment');
    else if (type === 'equipment') setScanStep('workorder');
    else if (type === 'workorder') {
      setScanStep('complete');
      setIsWorking(true);
      setWorkStartTime(new Date());
      setIsScanOpen(false);
      const wo = workOrders.find((w) => w.order_no === code);
      setForm({
        ...form,
        operator_name: scannedCodes.employee,
        equipment_id: equipmentList.find((e) => e.equipment_code === scannedCodes.equipment)?.id,
        work_order_id: wo?.id,
        work_order_no: code,
        start_time: new Date().toISOString().slice(0, 16),
      });
    }
  };

  const handleReset = () => {
    setScannedCodes({ employee: '', equipment: '', workorder: '' });
    setScanStep('employee');
    setIsWorking(false);
    setWorkStartTime(null);
    setForm({
      report_date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      output_qty: 0,
      qualified_qty: 0,
      scrap_qty: 0,
      work_hours: 0,
    });
  };

  const handleFinishWork = () => {
    setForm((prev: any) => ({
      ...prev,
      end_time: new Date().toISOString().slice(0, 16),
    }));
    setDialogOpen(true);
    setIsWorking(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteReport'))) return;
    try {
      const res = await authFetch(`/api/production/work-report?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success(tc('deleteSuccess'));
        fetchData();
      } else {
        toast.error(result.message || tc('deleteFailed'));
      }
    } catch {
      toast.error(tc('deleteFailed'));
    }
  };

  const getEfficiency = (r: WorkReport) => {
    if (!r.plan_qty || r.plan_qty === 0) return 0;
    return Math.round((r.completed_qty / r.plan_qty) * 100);
  };

  return (
    <MainLayout title={t('workReport')}>
      <div className="space-y-6">
        <Card className="border-border bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Scan className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{t('scanToStart')}</h3>
                  {isWorking && workStartTime && (
                    <Badge variant="secondary" className="text-green-700 dark:text-green-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {t('workingLabel')} - {workStartTime.toLocaleTimeString()}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t('scanInstructions')}</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    {
                      key: 'employee',
                      label: t('scanEmployeeCard'),
                      icon: User,
                      value: scannedCodes.employee,
                    },
                    {
                      key: 'equipment',
                      label: t('scanEquipmentCode'),
                      icon: Factory,
                      value: scannedCodes.equipment,
                    },
                    {
                      key: 'workorder',
                      label: t('scanWorkOrderCode'),
                      icon: QrCode,
                      value: scannedCodes.workorder,
                    },
                  ].map((step, i) => (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        step.value
                          ? 'bg-green-50/50 border-green-300 dark:bg-green-950/20 dark:border-green-800'
                          : i === 0 ||
                              (i === 1 && scannedCodes.employee) ||
                              (i === 2 && scannedCodes.equipment)
                            ? 'bg-blue-50/50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-800'
                            : 'bg-background border-border'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-full ${step.value ? 'bg-green-500' : 'bg-primary'}`}
                      >
                        <step.icon className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{step.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {step.value || t('pendingScan')}
                        </div>
                      </div>
                      {step.value && (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  {!isWorking ? (
                    <Button
                      onClick={() => {
                        setScanStep('employee');
                        setIsScanOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Scan className="h-4 w-4 mr-2" />
                      {t('startScan')}
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t('reScan')}
                      </Button>
                      <Button variant="destructive" onClick={handleFinishWork}>
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('finishWorkReport')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{t('totalCompleted')}</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Number(summaryStats.total_completed || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{t('qualifiedQty')}</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Number(summaryStats.total_qualified || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{t('defectiveQty')}</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {Number(summaryStats.total_defective || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{t('scrapQty')}</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {Number(summaryStats.total_scrap || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('reportRecords')}</CardTitle>
              <CardDescription>{t('reportRecordsDesc')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchReportPlaceholder')}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9 w-56"
                />
              </div>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <GlobalExportToolbar
                filename="生产报工记录"
                title="生产报工记录列表"
                columns={
                  [
                    { key: 'report_no', label: '报工单号', width: 18 },
                    { key: 'work_order_no', label: '工单号', width: 18 },
                    { key: 'process_name', label: '工序', width: 15 },
                    { key: 'operator_name', label: '操作员', width: 12 },
                    { key: 'equipment_name', label: '设备', width: 15 },
                    { key: 'plan_qty', label: '计划数量', width: 10 },
                    { key: 'completed_qty', label: '完成数量', width: 10 },
                    { key: 'qualified_qty', label: '合格数量', width: 10 },
                    { key: 'scrap_qty', label: '报废数量', width: 10 },
                    {
                      key: 'efficiency',
                      label: '效率',
                      width: 10,
                      formatter: (v: any) => `${Number(v || 0).toFixed(1)}%`,
                    },
                    {
                      key: 'work_hours',
                      label: '工时',
                      width: 10,
                      formatter: (v: any) => `${Number(v || 0).toFixed(1)}h`,
                    },
                    { key: 'report_time', label: '报工时间', width: 18 },
                  ] as ExportColumn[]
                }
                data={list}
                landscape={true}
              />
              <Button
                onClick={() => {
                  setForm({ ...form, start_time: new Date().toISOString().slice(0, 16) });
                  setDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('manualReport')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reportNo')}</TableHead>
                    <TableHead>{t('workOrderNo')}</TableHead>
                    <TableHead>{t('processName')}</TableHead>
                    <TableHead>{t('operator')}</TableHead>
                    <TableHead>{t('equipment')}</TableHead>
                    <TableHead className="text-right">{t('planQty')}</TableHead>
                    <TableHead className="text-right">{t('completedQty')}</TableHead>
                    <TableHead className="text-right">{t('qualifiedQty')}</TableHead>
                    <TableHead className="text-right">{t('scrapQty')}</TableHead>
                    <TableHead className="text-right">{t('efficiency')}</TableHead>
                    <TableHead>{t('workHours')}</TableHead>
                    <TableHead className="text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => {
                    const eff = getEfficiency(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.report_no}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {r.work_order_no || '-'}
                        </TableCell>
                        <TableCell>{r.process_name}</TableCell>
                        <TableCell>{r.operator_name || '-'}</TableCell>
                        <TableCell>{r.equipment_name || '-'}</TableCell>
                        <TableCell className="text-right">{r.plan_qty || 0}</TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                          {r.completed_qty || 0}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 dark:text-blue-400">
                          {r.qualified_qty || 0}
                        </TableCell>
                        <TableCell className="text-right text-red-500 dark:text-red-400">
                          {r.scrap_qty > 0 ? r.scrap_qty : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              eff < 80
                                ? 'text-red-600 dark:text-red-400 font-bold'
                                : 'text-green-600 dark:text-green-400 font-medium'
                            }
                          >
                            {eff}%
                          </span>
                        </TableCell>
                        <TableCell>{r.work_hours || 0}h</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 dark:text-red-400"
                            onClick={() => handleDelete(r.id)}
                          >
                            <AlertTriangle className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                        {t('noReportRecords')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">{tc('total', { count: total })}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc('prevPage')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('nextPage')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>
                {scanStep === 'employee'
                  ? t('scanEmployeeCard')
                  : scanStep === 'equipment'
                    ? t('scanEquipmentCode')
                    : t('scanWorkOrderCode')}
              </DialogTitle>
              <DialogDescription>{t('scanDialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2 mb-4">
                <div
                  className={`flex-1 h-2 rounded-full ${scannedCodes.employee ? 'bg-green-500' : scanStep === 'employee' ? 'bg-primary' : 'bg-muted'}`}
                />
                <div
                  className={`flex-1 h-2 rounded-full ${scannedCodes.equipment ? 'bg-green-500' : scanStep === 'equipment' ? 'bg-primary' : 'bg-muted'}`}
                />
                <div
                  className={`flex-1 h-2 rounded-full ${scannedCodes.workorder ? 'bg-green-500' : scanStep === 'workorder' ? 'bg-primary' : 'bg-muted'}`}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {scanStep === 'employee'
                    ? t('employeeCode')
                    : scanStep === 'equipment'
                      ? t('equipmentCode')
                      : t('workOrderCode')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('scanInputPlaceholder')}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputCode.trim())
                        handleScan(scanStep, inputCode.trim());
                    }}
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => inputCode.trim() && handleScan(scanStep, inputCode.trim())}
                  >
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('quickSelect')}</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {scanStep === 'employee' &&
                    ['张三', '李四', '王五', '赵六'].map((name) => (
                      <Button
                        key={name}
                        variant="outline"
                        size="sm"
                        onClick={() => handleScan('employee', name)}
                        className="justify-start"
                      >
                        <User className="h-3 w-3 mr-2" />
                        {name}
                      </Button>
                    ))}
                  {scanStep === 'equipment' &&
                    equipmentList.map((eq) => (
                      <Button
                        key={eq.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleScan('equipment', eq.equipment_code)}
                        className="justify-start"
                      >
                        <Factory className="h-3 w-3 mr-2" />
                        {eq.equipment_name}
                      </Button>
                    ))}
                  {scanStep === 'workorder' &&
                    workOrders.map((wo) => (
                      <Button
                        key={wo.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleScan('workorder', wo.order_no)}
                        className="justify-start"
                      >
                        <QrCode className="h-3 w-3 mr-2" />
                        {wo.order_no}
                      </Button>
                    ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScanOpen(false)}>
                {tc('cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('manualReport')}</DialogTitle>
              <DialogDescription>{t('manualReportDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {t('workOrderLabel')} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={String(form.work_order_id || '')}
                    onValueChange={(v) => {
                      const wo = workOrders.find((w) => w.id === Number(v));
                      setForm({
                        ...form,
                        work_order_id: Number(v),
                        work_order_no: wo?.order_no,
                        plan_qty: wo?.plan_qty,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectWorkOrder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {workOrders.map((wo) => (
                        <SelectItem key={wo.id} value={String(wo.id)}>
                          {wo.order_no} - {wo.product_name || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {t('processName')} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.process_name || ''}
                    onValueChange={(v) => setForm({ ...form, process_name: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectProcess')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="印刷">{t('processPrinting')}</SelectItem>
                      <SelectItem value="覆膜">{t('processLaminating')}</SelectItem>
                      <SelectItem value="模切">{t('processDieCut')}</SelectItem>
                      <SelectItem value="分切">{t('processSlitting')}</SelectItem>
                      <SelectItem value="检验">{t('processInspection')}</SelectItem>
                      <SelectItem value="包装">{t('processPackaging')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('equipment')}</Label>
                  <Select
                    value={String(form.equipment_id || '')}
                    onValueChange={(v) => {
                      const eq = equipmentList.find((e) => e.id === Number(v));
                      setForm({
                        ...form,
                        equipment_id: Number(v),
                        equipment_name: eq?.equipment_name,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectEquipment')} />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentList.map((eq) => (
                        <SelectItem key={eq.id} value={String(eq.id)}>
                          {eq.equipment_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('operator')}</Label>
                  <Input
                    value={form.operator_name || ''}
                    onChange={(e) => setForm({ ...form, operator_name: e.target.value })}
                    placeholder={t('operatorName')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('dieScreenLabel')}</Label>
                <Select
                  value={String(form.die_template_id || '')}
                  onValueChange={(v) => {
                    const die = dieTemplateList.find((d) => d.id === Number(v));
                    setForm({ ...form, die_template_id: Number(v) });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectDieScreen')} />
                  </SelectTrigger>
                  <SelectContent>
                    {dieTemplateList.map((die) => {
                      const usagePct =
                        die.max_impressions > 0
                          ? Math.round((die.cumulative_impressions / die.max_impressions) * 100)
                          : 0;
                      const statusColor = usagePct >= 80 ? '🔴' : usagePct >= 60 ? '🟡' : '🟢';
                      return (
                        <SelectItem key={die.id} value={String(die.id)}>
                          {statusColor} {die.template_code} - {die.template_name} ({usagePct}%)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {form.die_template_id &&
                  (() => {
                    const die = dieTemplateList.find((d) => d.id === Number(form.die_template_id));
                    if (!die) return null;
                    const usagePct =
                      die.max_impressions > 0
                        ? Math.round((die.cumulative_impressions / die.max_impressions) * 100)
                        : 0;
                    return (
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>
                          {t('usageRate')}: {usagePct}%
                        </span>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${usagePct >= 80 ? 'bg-red-500' : usagePct >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>
                        <span>
                          {die.cumulative_impressions}/{die.max_impressions}
                        </span>
                      </div>
                    );
                  })()}
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t('planQty')}</Label>
                  <Input
                    type="number"
                    value={form.plan_qty || ''}
                    onChange={(e) =>
                      setForm({ ...form, plan_qty: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('completedQty')}</Label>
                  <Input
                    type="number"
                    value={form.completed_qty || ''}
                    onChange={(e) =>
                      setForm({ ...form, completed_qty: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('qualifiedQty')}</Label>
                  <Input
                    type="number"
                    value={form.qualified_qty || ''}
                    onChange={(e) =>
                      setForm({ ...form, qualified_qty: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('scrapQty')}</Label>
                  <Input
                    type="number"
                    value={form.scrap_qty || ''}
                    onChange={(e) =>
                      setForm({ ...form, scrap_qty: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('startTime')}</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_time || ''}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('endTime')}</Label>
                  <Input
                    type="datetime-local"
                    value={form.end_time || ''}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('workHoursLabel')}</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={form.work_hours || ''}
                    onChange={(e) =>
                      setForm({ ...form, work_hours: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tc('remark')}</Label>
                <Textarea
                  value={form.remark || ''}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder={tc('remark')}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                {t('submitReport')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
