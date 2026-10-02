'use client';

import { authFetch } from '@/lib/auth-fetch';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { EQUIPMENT_PLAN_STATUS_LABEL } from '@/lib/status-labels';
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRowSelection } from '@/lib/useRowSelection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, RefreshCw, Wrench, ClipboardList, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface MaintenancePlan {
  id: number;
  plan_no: string;
  plan_name: string;
  equipment_id: number;
  equipment_code: string;
  equipment_name: string;
  maintenance_type: string;
  cycle_type: string;
  cycle_value: number;
  next_execute_date: string;
  status: number;
  remark: string;
}

interface EquipmentItem {
  id: number;
  equipment_code: string;
  equipment_name: string;
  equipment_type?: string;
  status?: number;
}

interface MaintenanceForm {
  id?: number;
  plan_id?: number;
  equipment_id?: number;
  equipment_code?: string;
  equipment_name?: string;
  // 记录（record）侧字段
  maintenance_type?: string;
  maintenance_date?: string;
  start_time?: string;
  end_time?: string;
  downtime_hours?: number;
  cost?: number;
  fault_desc?: string;
  maintenance_content?: string;
  result?: string;
  // 计划（plan）侧字段（对齐 /api/equipment/plan 契约）
  plan_name?: string;
  plan_maint_type?: string;
  plan_cycle_type?: string;
  cycle_value?: number;
  status?: number;
  remark?: string;
}

interface MaintenanceRecord {
  id: number;
  record_no: string;
  plan_id: number;
  equipment_id: number;
  equipment_code: string;
  equipment_name: string;
  maintenance_type: string;
  fault_desc: string;
  maintenance_content: string;
  start_time: string;
  end_time: string;
  downtime_hours: number;
  cost: number;
  responsible_id: number;
  result: string;
  remark: string;
}

// 维护记录侧枚举：DB 存的是 varchar 字符串，与 PLAN_MAINT_TYPE 保持一致
const MAINT_TYPE: Record<string, string> = {
  routine: '日常保养',
  periodic: '定期维保',
  major: '大修',
};

// 计划（plan）侧枚举：对齐 /api/equipment/plan 与 eqp_maintenance_plan 的真实 VARCHAR 枚举
const PLAN_MAINT_TYPE: Record<string, string> = {
  routine: '日常保养',
  periodic: '定期维保',
  major: '大修',
};
const PLAN_CYCLE_TYPE: Record<string, string> = {
  daily: '天',
  weekly: '周',
  monthly: '月',
  quarterly: '季',
  yearly: '年',
  custom: '自定义',
};

const PLAN_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: EQUIPMENT_PLAN_STATUS_LABEL[1], color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  2: { label: EQUIPMENT_PLAN_STATUS_LABEL[2], color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  3: { label: EQUIPMENT_PLAN_STATUS_LABEL[3], color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  4: { label: EQUIPMENT_PLAN_STATUS_LABEL[4], color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
};
export default function EquipmentMaintenancePage() {
  const ts = useTranslations('Equipment');
  // 翻译钩子
  const tc = useTranslations('Common');
  const tStd = useTranslations('StandardTable');

  const RECORD_RESULT: Record<string, { label: string; color: string }> = {
    completed: { label: tc('normal'), color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
    partial: { label: ts('k_1uz4mvb'), color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
    failed: { label: ts('k_1qw8bup'), color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  };

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('plan');
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [planTotal, setPlanTotal] = useState(0);
  const [recordTotal, setRecordTotal] = useState(0);
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(20);
  const [planTotalPages, setPlanTotalPages] = useState(0);
  const [planJumpValue, setPlanJumpValue] = useState('');
  const [planJumpError, setPlanJumpError] = useState<string | null>(null);
  const planDoJump = () => {
    const n = Number(planJumpValue);
    if (!planJumpValue || isNaN(n) || n < 1 || n > planTotalPages) {
      setPlanJumpError(tStd('invalidPage', { max: planTotalPages }));
      return;
    }
    setPlanJumpError(null);
    setPlanPage(n);
  };
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(20);
  const [recordTotalPages, setRecordTotalPages] = useState(0);
  const [recordJumpValue, setRecordJumpValue] = useState('');
  const [recordJumpError, setRecordJumpError] = useState<string | null>(null);
  const recordDoJump = () => {
    const n = Number(recordJumpValue);
    if (!recordJumpValue || isNaN(n) || n < 1 || n > recordTotalPages) {
      setRecordJumpError(tStd('invalidPage', { max: recordTotalPages }));
      return;
    }
    setRecordJumpError(null);
    setRecordPage(n);
  };
  const [searchNo, setSearchNo] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    maintaining: 0,
    completed: 0,
    overdue: 0,
    planCount: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'plan' | 'record'>('plan');
  const [form, setForm] = useState<MaintenanceForm>({});
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch('/api/equipment?pageSize=100');
      const result = await res.json();
      if (result.success) {
        setEquipmentList(result.data?.list || []);
      }
    } catch {}
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(planPage), pageSize: String(planPageSize) });
      if (searchNo) params.append('planNo', searchNo);
      const res = await authFetch('/api/equipment/plan?' + params);
      const result = await res.json();
      if (result.success) {
        setPlans(result.data?.list || []);
        setPlanTotal(result.data?.total || 0);
        setPlanTotalPages(Math.ceil((result.data?.total || 0) / planPageSize));
      }
    } catch {
      toast({ title: tc('fetchFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [planPage, planPageSize, searchNo, tc, toast]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(recordPage),
        pageSize: String(recordPageSize),
      });
      const res = await authFetch('/api/equipment/maintenance?' + params);
      const result = await res.json();
      if (result.success) {
        setRecords(result.data?.list || []);
        setRecordTotal(result.data?.total || 0);
        setRecordTotalPages(Math.ceil((result.data?.total || 0) / recordPageSize));
      }
    } catch {
      toast({ title: tc('fetchFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [recordPage, recordPageSize, tc, toast]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);
  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/equipment/maintenance/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'plan') fetchPlans();
    else fetchRecords();
    fetchStats();
  }, [activeTab, fetchPlans, fetchRecords]);

  const rows: Array<MaintenancePlan | MaintenanceRecord> = activeTab === 'plan' ? plans : records;
  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(rows, (r) => String(r.id));

  useEffect(() => {
    clear();
  }, [activeTab, clear]);

  const handleSave = async () => {
    try {
      let url: string;
      let method: string;
      let payload: Loose;

      if (dialogType === 'record') {
        url = '/api/equipment/maintenance';
        method = form.id ? 'PUT' : 'POST';
        payload = {
          ...(form.id ? { id: form.id } : {}),
          plan_id: form.plan_id,
          equipment_id: form.equipment_id,
          maintenance_type: form.maintenance_type || 'routine',
          maintenance_date:
            form.maintenance_date ||
            (form.start_time ? String(form.start_time).slice(0, 10) : null),
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          downtime_hours: Number(form.downtime_hours || 0),
          cost: Number(form.cost || 0),
          fault_desc: form.fault_desc || null,
          maintenance_content: form.maintenance_content || null,
          result: form.result || 'completed',
          remark: form.remark || null,
        };
      } else {
        // 计划：走独立的 /api/equipment/plan，字段对齐 eq_maintenance_plan 契约
        url = '/api/equipment/plan';
        method = form.id ? 'PUT' : 'POST';
        payload = {
          id: form.id,
          plan_name: form.plan_name,
          equipment_id: form.equipment_id,
          maintenance_type: form.plan_maint_type || 'routine',
          cycle_type: form.plan_cycle_type || 'monthly',
          cycle_value: Number(form.cycle_value || 30),
          status: form.status ?? 1,
          remark: form.remark,
        };
      }

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: dialogType === 'plan' ? tc('createPlanSuccess') : tc('createRecordSuccess'),
        });
        setDialogOpen(false);
        if (activeTab === 'plan') fetchPlans();
        else fetchRecords();
      } else {
        toast({ title: result.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };

  const handlePlanStatus = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/equipment/plan', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('statusUpdateSuccess') });
        fetchPlans();
      } else {
        toast({ title: result.message || tc('operationFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number, type: string) => {
    if (!confirm(tc('confirmDeleteMsg'))) return;
    try {
      const base = type === 'plan' ? '/api/equipment/plan' : '/api/equipment/maintenance';
      const res = await authFetch(`${base}?id=${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        if (type === 'plan') fetchPlans();
        else fetchRecords();
      } else {
        toast({ title: result.message || tc('operationFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('operationFailed'), variant: 'destructive' });
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const endpoint = activeTab === 'plan' ? '/api/equipment/plan' : '/api/equipment/maintenance';
    const refresh = activeTab === 'plan' ? fetchPlans : fetchRecords;
    if (!confirm(tc('confirmBatchDelete', { count: ids.length }))) return;
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`${endpoint}?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear(); refresh();
  };

  const openNewPlan = () => {
    setForm({});
    setDialogType('plan');
    setDialogOpen(true);
  };

  const openNewRecord = (plan?: MaintenancePlan) => {
    if (plan) {
      setForm({
        plan_id: plan.id,
        equipment_id: plan.equipment_id,
      });
    } else {
      setForm({});
    }
    setDialogType('record');
    setDialogOpen(true);
  };

  return (
    <MainLayout title={ts('k_1q6ppqq')}>
      <div className="space-y-6">
        <StatsCards
          configs={[
            { key: 'pending', label: '待保养', icon: Clock, ...StatsTheme.orange },
            { key: 'maintaining', label: '保养中', icon: Wrench, ...StatsTheme.blue },
            { key: 'completed', label: '已完成', icon: CheckCircle, ...StatsTheme.green },
            { key: 'overdue', label: '逾期未保养', icon: AlertTriangle, ...StatsTheme.red },
            { key: 'planCount', label: '保养计划数', icon: ClipboardList, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'maintaining', count: stats.maintaining },
            { key: 'completed', count: stats.completed },
            { key: 'overdue', count: stats.overdue },
            { key: 'planCount', count: stats.planCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
          showTrend={false}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="plan" className="gap-1">
                <ClipboardList className="w-4 h-4" />
                {ts('k_lbzvry')}</TabsTrigger>
              <TabsTrigger value="record" className="gap-1">
                <Wrench className="w-4 h-4" />
                {ts('k_153mfl6')}</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={ts('k_1ucphur')}
                  value={searchNo}
                  onChange={(e) => setSearchNo(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => (activeTab === 'plan' ? fetchPlans() : fetchRecords())}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              {activeTab === 'plan' ? (
                <Button onClick={openNewPlan} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  {ts('k_1cc8vv0')}</Button>
              ) : (
                <Button onClick={() => openNewRecord()} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  {ts('k_ftslz8')}</Button>
              )}
            </div>
          </div>

          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>{ts('k_lbzvry')}</CardTitle>
                <CardDescription>{tc('maintenancePlanDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchDeleteBar count={selectedCount} onClear={clear} onDelete={handleBatchDelete} />
                {loading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input ref={selectAllRef} type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={allSelected} onChange={toggleAll} aria-label={tc('selectAll')} />
                        </TableHead>
                        <TableHead>{ts('k_z08fjd')}</TableHead>
                        <TableHead>{ts('k_17s4qyf')}</TableHead>
                        <TableHead>{ts('k_eb1q6f')}</TableHead>
                        <TableHead>{ts('k_iuncnz')}</TableHead>
                        <TableHead>{tc('maintenanceType')}</TableHead>
                        <TableHead>{ts('k_1psceoo')}</TableHead>
                        <TableHead>{ts('k_ur9pka')}</TableHead>
                        <TableHead>{tc('status')}</TableHead>
                        <TableHead className="text-right">{tc('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((p) => {
                        const st = PLAN_STATUS[p.status] || PLAN_STATUS[1];
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <input type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={isSelected(String(p.id))} onChange={() => toggle(String(p.id))} aria-label={tc('selectRow', { id: p.id })} />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{p.plan_no}</TableCell>
                            <TableCell>{p.equipment_code || '-'}</TableCell>
                            <TableCell>{p.equipment_name || '-'}</TableCell>
                            <TableCell className="max-w-40 truncate">{p.plan_name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {PLAN_MAINT_TYPE[p.maintenance_type] || p.maintenance_type || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {p.cycle_value || 0}
                              {PLAN_CYCLE_TYPE[p.cycle_type] || ''}
                            </TableCell>
                            <TableCell>{p.next_execute_date || '-'}</TableCell>
                            <TableCell>
                              <Badge className={st.color}>{st.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {p.status === 1 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => handlePlanStatus(p.id, 2)}
                                  >
                                    {ts('k_16xeupj')}</Button>
                                )}
                                {p.status === 2 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => openNewRecord(p)}
                                  >
                                    {ts('k_vhv7sa')}</Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setForm({
                                      id: p.id,
                                      plan_name: p.plan_name,
                                      equipment_id: p.equipment_id,
                                      equipment_code: p.equipment_code,
                                      equipment_name: p.equipment_name,
                                      plan_maint_type: p.maintenance_type,
                                      plan_cycle_type: p.cycle_type,
                                      cycle_value: p.cycle_value,
                                      status: p.status,
                                      remark: p.remark,
                                    });
                                    setDialogType('plan');
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-500 dark:text-red-400"
                                  onClick={() => handleDelete(p.id, 'plan')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {plans.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                            {ts('k_c2tohs')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
                {planTotal > 0 && (
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">
                      {tStd('paginationSummary', { total: planTotal, pages: planTotalPages })}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={String(planPageSize)} onValueChange={(v) => { setPlanPageSize(Number(v)); setPlanPage(1); }}>
                        <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20{tStd('pageSizeUnit')}</SelectItem>
                          <SelectItem value="50">50{tStd('pageSizeUnit')}</SelectItem>
                          <SelectItem value="100">100{tStd('pageSizeUnit')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => setPlanPage(Math.max(1, planPage - 1))} disabled={planPage <= 1}>{tStd('prevPage')}</Button>
                      <span className="text-sm">{tStd('pageNumber', { page: planPage, pages: planTotalPages })}</span>
                      <Button variant="outline" size="sm" onClick={() => setPlanPage(Math.min(planTotalPages, planPage + 1))} disabled={planPage >= planTotalPages}>{tStd('nextPage')}</Button>
                      <div className="flex items-center gap-1">
                        <Input className="w-[70px]" value={planJumpValue} onChange={(e) => setPlanJumpValue(e.target.value)} placeholder={tStd('pageNumber', { page: planPage, pages: planTotalPages })} onKeyDown={(e) => { if (e.key === 'Enter') planDoJump(); }} />
                        <Button variant="outline" size="sm" onClick={planDoJump}>{tStd('jump')}</Button>
                      </div>
                    </div>
                  </div>
                )}
                {planJumpError && <p className="text-destructive text-sm mt-2">{planJumpError}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="record">
            <Card>
              <CardHeader>
                <CardTitle>{ts('k_153mfl6')}</CardTitle>
                <CardDescription>{tc('recordDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchDeleteBar count={selectedCount} onClear={clear} onDelete={handleBatchDelete} />
                {loading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input ref={selectAllRef} type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={allSelected} onChange={toggleAll} aria-label={tc('selectAll')} />
                        </TableHead>
                        <TableHead>{ts('k_mbiz3h')}</TableHead>
                        <TableHead>{ts('k_17s4qyf')}</TableHead>
                        <TableHead>{ts('k_eb1q6f')}</TableHead>
                        <TableHead>{tc('maintenanceType')}</TableHead>
                        <TableHead>{ts('k_j6x7pa')}</TableHead>
                        <TableHead>{ts('k_9uebcl')}</TableHead>
                        <TableHead>{tc('downtimeHours')}</TableHead>
                        <TableHead>{ts('k_1j4app0')}</TableHead>
                        <TableHead>{tc('maintenanceResult')}</TableHead>
                        <TableHead className="text-right">{tc('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => {
                        const rs = RECORD_RESULT[r.result] || Object.values(RECORD_RESULT)[0];
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <input type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={isSelected(String(r.id))} onChange={() => toggle(String(r.id))} aria-label={tc('selectRow', { id: r.id })} />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{r.record_no}</TableCell>
                            <TableCell>{r.equipment_code || '-'}</TableCell>
                            <TableCell>{r.equipment_name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {MAINT_TYPE[r.maintenance_type] || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{r.start_time || '-'}</TableCell>
                            <TableCell className="text-sm">{r.end_time || '-'}</TableCell>
                            <TableCell>{Number(r.downtime_hours || 0)}h</TableCell>
                            <TableCell>¥{Number(r.cost || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge className={rs.color}>{rs.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setForm(r);
                                    setDialogType('record');
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-500 dark:text-red-400"
                                  onClick={() => handleDelete(r.id, 'record')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {records.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                            {ts('k_1ugxzr4')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
                {recordTotal > 0 && (
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">
                      {tStd('paginationSummary', { total: recordTotal, pages: recordTotalPages })}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={String(recordPageSize)} onValueChange={(v) => { setRecordPageSize(Number(v)); setRecordPage(1); }}>
                        <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20{tStd('pageSizeUnit')}</SelectItem>
                          <SelectItem value="50">50{tStd('pageSizeUnit')}</SelectItem>
                          <SelectItem value="100">100{tStd('pageSizeUnit')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => setRecordPage(Math.max(1, recordPage - 1))} disabled={recordPage <= 1}>{tStd('prevPage')}</Button>
                      <span className="text-sm">{tStd('pageNumber', { page: recordPage, pages: recordTotalPages })}</span>
                      <Button variant="outline" size="sm" onClick={() => setRecordPage(Math.min(recordTotalPages, recordPage + 1))} disabled={recordPage >= recordTotalPages}>{tStd('nextPage')}</Button>
                      <div className="flex items-center gap-1">
                        <Input className="w-[70px]" value={recordJumpValue} onChange={(e) => setRecordJumpValue(e.target.value)} placeholder={tStd('pageNumber', { page: recordPage, pages: recordTotalPages })} onKeyDown={(e) => { if (e.key === 'Enter') recordDoJump(); }} />
                        <Button variant="outline" size="sm" onClick={recordDoJump}>{tStd('jump')}</Button>
                      </div>
                    </div>
                  </div>
                )}
                {recordJumpError && <p className="text-destructive text-sm mt-2">{recordJumpError}</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'plan'
                ? form.id
                  ? ts('k_1ab5x0v')
                  : ts('k_1cc8vv0')
                : form.id
                  ? ts('k_1q31o2r')
                  : ts('k_ftslz8')}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'plan' ? ts('k_mza5xi') : ts('k_1haq8sw')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {dialogType === 'plan' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {ts('k_1kb4ymq')}<span className="text-red-500 dark:text-red-400">*</span>
                    </Label>
                    <Select
                      value={String(form.equipment_id || '')}
                      onValueChange={(v) => {
                        const eq = equipmentList.find((e: Loose) => e.id === Number(v));
                        setForm({
                          ...form,
                          equipment_id: Number(v),
                          equipment_code: eq?.equipment_code,
                          equipment_name: eq?.equipment_name,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ts('k_jvodvo')} />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentList.map((eq: Loose) => (
                          <SelectItem key={eq.id} value={String(eq.id)}>
                            {eq.equipment_code} - {eq.equipment_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {ts('k_iuncnz')}<span className="text-red-500 dark:text-red-400">*</span>
                    </Label>
                    <Input
                      value={form.plan_name || ''}
                      onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                      placeholder={ts('k_1rl759k')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tc('maintenanceType')}</Label>
                    <Select
                      value={String(form.plan_maint_type || 'routine')}
                      onValueChange={(v) => setForm({ ...form, plan_maint_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PLAN_MAINT_TYPE).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{ts('k_1lulsd2')}</Label>
                    <Select
                      value={String(form.plan_cycle_type || 'monthly')}
                      onValueChange={(v) => setForm({ ...form, plan_cycle_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PLAN_CYCLE_TYPE).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tc('cycleValue')}</Label>
                    <Input
                      type="number"
                      value={form.cycle_value || ''}
                      onChange={(e) =>
                        setForm({ ...form, cycle_value: parseInt(e.target.value) || 0 })
                      }
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{tc('remark')}</Label>
                  <Textarea
                    value={form.remark || ''}
                    onChange={(e) => setForm({ ...form, remark: e.target.value })}
                    placeholder={tc('remark')}
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {ts('k_1kb4ymq')}<span className="text-red-500 dark:text-red-400">*</span>
                    </Label>
                    <Select
                      value={String(form.equipment_id || '')}
                      onValueChange={(v) => {
                        const eq = equipmentList.find((e: Loose) => e.id === Number(v));
                        setForm({
                          ...form,
                          equipment_id: Number(v),
                          equipment_code: eq?.equipment_code,
                          equipment_name: eq?.equipment_name,
                        });
                      }}
                      disabled={!!form.plan_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ts('k_jvodvo')} />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentList.map((eq: Loose) => (
                          <SelectItem key={eq.id} value={String(eq.id)}>
                            {eq.equipment_code} - {eq.equipment_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{tc('maintenanceType')}</Label>
                    <Select
                      value={form.maintenance_type || ''}
                      onValueChange={(v) => setForm({ ...form, maintenance_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择保养类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MAINT_TYPE).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    {ts('k_1xkpsc6')}<span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.maintenance_date || ''}
                    onChange={(e) => setForm({ ...form, maintenance_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{ts('k_j6x7pa')}</Label>
                    <Input
                      type="datetime-local"
                      value={form.start_time || ''}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{ts('k_9uebcl')}</Label>
                    <Input
                      type="datetime-local"
                      value={form.end_time || ''}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{tc('downtimeHours')}</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.downtime_hours || ''}
                      onChange={(e) =>
                        setForm({ ...form, downtime_hours: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tc('cost')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.cost || ''}
                      onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tc('maintenanceResult')}</Label>
                    <Select
                      value={form.result || ''}
                      onValueChange={(v) => setForm({ ...form, result: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择结果" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RECORD_RESULT).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{ts('k_784d9f')}</Label>
                  <Textarea
                    value={form.fault_desc || ''}
                    onChange={(e) => setForm({ ...form, fault_desc: e.target.value })}
                    placeholder={ts('k_rhj8q1')}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tc('content')}</Label>
                  <Textarea
                    value={form.maintenance_content || ''}
                    onChange={(e) => setForm({ ...form, maintenance_content: e.target.value })}
                    placeholder={tc('content')}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tc('remark')}</Label>
                  <Input
                    value={form.remark || ''}
                    onChange={(e) => setForm({ ...form, remark: e.target.value })}
                    placeholder={tc('remark')}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {ts('k_1c3mapc')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
