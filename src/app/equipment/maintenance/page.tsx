'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, RefreshCw, Wrench, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface MaintenancePlan {
  id: number;
  plan_no: string;
  equipment_id: number;
  equipment_code: string;
  equipment_name: string;
  maintenance_type: number;
  cycle_type: number;
  cycle_value: number;
  plan_date: string;
  responsible_id: number;
  content: string;
  status: number;
  complete_date: string;
  remark: string;
}

interface MaintenanceRecord {
  id: number;
  record_no: string;
  plan_id: number;
  equipment_id: number;
  equipment_code: string;
  equipment_name: string;
  maintenance_type: number;
  fault_desc: string;
  maintenance_content: string;
  start_time: string;
  end_time: string;
  downtime_hours: number;
  cost: number;
  responsible_id: number;
  result: number;
  remark: string;
}

const MAINT_TYPE: Record<number, string> = { 1: '日常保养', 2: '一级保养', 3: '二级保养', 4: '三级保养' };
const CYCLE_TYPE: Record<number, string> = { 1: '天', 2: '周', 3: '月', 4: '季', 5: '年' };
const PLAN_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: '待执行', color: 'bg-yellow-100 text-yellow-800' },
  2: { label: '执行中', color: 'bg-blue-100 text-blue-800' },
  3: { label: '已完成', color: 'bg-green-100 text-green-800' },
  4: { label: '已逾期', color: 'bg-red-100 text-red-800' },
};
const RECORD_RESULT: Record<number, { label: string; color: string }> = {
  1: { label: '正常', color: 'bg-green-100 text-green-800' },
  2: { label: '异常', color: 'bg-red-100 text-red-800' },
  3: { label: '需跟进', color: 'bg-yellow-100 text-yellow-800' },
};

export default function EquipmentMaintenancePage() {
  const [activeTab, setActiveTab] = useState('plan');
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [planTotal, setPlanTotal] = useState(0);
  const [recordTotal, setRecordTotal] = useState(0);
  const [planPage, setPlanPage] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'plan' | 'record'>('plan');
  const [form, setForm] = useState<any>({});
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch('/api/equipment?pageSize=100');
      const result = await res.json();
      if (result.success) {
        setEquipmentList(result.data?.list || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(planPage), pageSize: '20', type: 'plan' });
      if (searchNo) params.append('planNo', searchNo);
      const res = await fetch('/api/equipment/maintenance?' + params);
      const result = await res.json();
      if (result.success) {
        setPlans(result.data?.list || []);
        setPlanTotal(result.data?.total || 0);
      }
    } catch (e) { console.error(e); toast.error('获取保养计划失败'); }
    finally { setLoading(false); }
  }, [planPage, searchNo]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(recordPage), pageSize: '20', type: 'record' });
      if (searchNo) params.append('recordNo', searchNo);
      const res = await fetch('/api/equipment/maintenance?' + params);
      const result = await res.json();
      if (result.success) {
        setRecords(result.data?.list || []);
        setRecordTotal(result.data?.total || 0);
      }
    } catch (e) { console.error(e); toast.error('获取保养记录失败'); }
    finally { setLoading(false); }
  }, [recordPage, searchNo]);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);
  useEffect(() => { if (activeTab === 'plan') fetchPlans(); else fetchRecords(); }, [activeTab, fetchPlans, fetchRecords]);

  const handleSave = async () => {
    try {
      const payload = { ...form, type: dialogType };
      const res = await fetch('/api/equipment/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(dialogType === 'plan' ? '保养计划创建成功' : '保养记录创建成功');
        setDialogOpen(false);
        if (activeTab === 'plan') fetchPlans(); else fetchRecords();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('保存失败');
    }
  };

  const handlePlanStatus = async (id: number, status: number) => {
    try {
      const res = await fetch('/api/equipment/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'plan', id, status }),
      });
      const result = await res.json();
      if (result.success) { toast.success('状态更新成功'); fetchPlans(); }
      else { toast.error(result.message || '更新失败'); }
    } catch (e) { toast.error('更新失败'); }
  };

  const handleDelete = async (id: number, type: string) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await fetch(`/api/equipment/maintenance?id=${id}&type=${type}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast.success('删除成功'); if (type === 'plan') fetchPlans(); else fetchRecords(); }
      else { toast.error(result.message || '删除失败'); }
    } catch (e) { toast.error('删除失败'); }
  };

  const openNewPlan = () => {
    setForm({});
    setDialogType('plan');
    setDialogOpen(true);
  };

  const openNewRecord = (plan?: MaintenancePlan) => {
    if (plan) {
      setForm({ plan_id: plan.id, equipment_id: plan.equipment_id, maintenance_type: plan.maintenance_type });
    } else {
      setForm({});
    }
    setDialogType('record');
    setDialogOpen(true);
  };

  return (
    <MainLayout title="设备保养">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="plan" className="gap-1"><ClipboardList className="w-4 h-4" />保养计划</TabsTrigger>
              <TabsTrigger value="record" className="gap-1"><Wrench className="w-4 h-4" />保养记录</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="搜索单号..." value={searchNo} onChange={(e) => setSearchNo(e.target.value)} className="pl-9 w-48" />
              </div>
              <Button variant="outline" onClick={() => activeTab === 'plan' ? fetchPlans() : fetchRecords()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              {activeTab === 'plan' ? (
                <Button onClick={openNewPlan} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />新增保养计划
                </Button>
              ) : (
                <Button onClick={() => openNewRecord()} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />新增保养记录
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>保养计划</CardTitle>
                <CardDescription>设备定期保养计划管理，支持按周期自动生成</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>计划编号</TableHead>
                        <TableHead>设备编码</TableHead>
                        <TableHead>设备名称</TableHead>
                        <TableHead>保养类型</TableHead>
                        <TableHead>保养周期</TableHead>
                        <TableHead>计划日期</TableHead>
                        <TableHead>保养内容</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((p) => {
                        const st = PLAN_STATUS[p.status] || PLAN_STATUS[1];
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-sm">{p.plan_no}</TableCell>
                            <TableCell>{p.equipment_code || '-'}</TableCell>
                            <TableCell>{p.equipment_name || '-'}</TableCell>
                            <TableCell><Badge variant="outline">{MAINT_TYPE[p.maintenance_type] || '-'}</Badge></TableCell>
                            <TableCell>{p.cycle_value}{CYCLE_TYPE[p.cycle_type] || ''}</TableCell>
                            <TableCell>{p.plan_date || '-'}</TableCell>
                            <TableCell className="max-w-40 truncate">{p.content || '-'}</TableCell>
                            <TableCell><Badge className={st.color}>{st.label}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {p.status === 1 && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handlePlanStatus(p.id, 2)}>开始执行</Button>
                                )}
                                {p.status === 2 && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openNewRecord(p)}>填写记录</Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setForm(p); setDialogType('plan'); setDialogOpen(true); }}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(p.id, 'plan')}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {plans.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">暂无保养计划</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-500">共 {planTotal} 条</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={planPage <= 1} onClick={() => setPlanPage(p => p - 1)}>上一页</Button>
                    <Button size="sm" variant="outline" disabled={planPage * 20 >= planTotal} onClick={() => setPlanPage(p => p + 1)}>下一页</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="record">
            <Card>
              <CardHeader>
                <CardTitle>保养记录</CardTitle>
                <CardDescription>设备保养执行记录，关联保养计划</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>记录编号</TableHead>
                        <TableHead>设备编码</TableHead>
                        <TableHead>设备名称</TableHead>
                        <TableHead>保养类型</TableHead>
                        <TableHead>开始时间</TableHead>
                        <TableHead>结束时间</TableHead>
                        <TableHead>停机时长</TableHead>
                        <TableHead>费用</TableHead>
                        <TableHead>结果</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => {
                        const rs = RECORD_RESULT[r.result] || RECORD_RESULT[1];
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-sm">{r.record_no}</TableCell>
                            <TableCell>{r.equipment_code || '-'}</TableCell>
                            <TableCell>{r.equipment_name || '-'}</TableCell>
                            <TableCell><Badge variant="outline">{MAINT_TYPE[r.maintenance_type] || '-'}</Badge></TableCell>
                            <TableCell className="text-sm">{r.start_time || '-'}</TableCell>
                            <TableCell className="text-sm">{r.end_time || '-'}</TableCell>
                            <TableCell>{r.downtime_hours || 0}h</TableCell>
                            <TableCell>¥{Number(r.cost || 0).toFixed(2)}</TableCell>
                            <TableCell><Badge className={rs.color}>{rs.label}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setForm(r); setDialogType('record'); setDialogOpen(true); }}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(r.id, 'record')}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {records.length === 0 && (
                        <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">暂无保养记录</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-500">共 {recordTotal} 条</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={recordPage <= 1} onClick={() => setRecordPage(p => p - 1)}>上一页</Button>
                    <Button size="sm" variant="outline" disabled={recordPage * 20 >= recordTotal} onClick={() => setRecordPage(p => p + 1)}>下一页</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>{dialogType === 'plan' ? (form.id ? '编辑保养计划' : '新增保养计划') : (form.id ? '编辑保养记录' : '新增保养记录')}</DialogTitle>
            <DialogDescription>
              {dialogType === 'plan' ? '设置设备定期保养计划' : '记录设备保养执行情况'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {dialogType === 'plan' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>设备 <span className="text-red-500">*</span></Label>
                    <Select value={String(form.equipment_id || '')} onValueChange={(v) => {
                      const eq = equipmentList.find((e: any) => e.id === Number(v));
                      setForm({ ...form, equipment_id: Number(v), equipment_code: eq?.equipment_code, equipment_name: eq?.equipment_name });
                    }}>
                      <SelectTrigger><SelectValue placeholder="选择设备" /></SelectTrigger>
                      <SelectContent>
                        {equipmentList.map((eq: any) => (
                          <SelectItem key={eq.id} value={String(eq.id)}>{eq.equipment_code} - {eq.equipment_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>保养类型</Label>
                    <Select value={String(form.maintenance_type ?? 1)} onValueChange={(v) => setForm({ ...form, maintenance_type: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MAINT_TYPE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>周期值</Label>
                    <Input type="number" value={form.cycle_value || ''} onChange={(e) => setForm({ ...form, cycle_value: parseInt(e.target.value) || 0 })} placeholder="30" />
                  </div>
                  <div className="space-y-2">
                    <Label>周期单位</Label>
                    <Select value={String(form.cycle_type ?? 3)} onValueChange={(v) => setForm({ ...form, cycle_type: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CYCLE_TYPE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>计划日期</Label>
                    <Input type="date" value={form.plan_date || ''} onChange={(e) => setForm({ ...form, plan_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>保养内容</Label>
                  <Textarea value={form.content || ''} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="描述保养内容..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Input value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="备注" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>设备 <span className="text-red-500">*</span></Label>
                    <Select value={String(form.equipment_id || '')} onValueChange={(v) => {
                      const eq = equipmentList.find((e: any) => e.id === Number(v));
                      setForm({ ...form, equipment_id: Number(v), equipment_code: eq?.equipment_code, equipment_name: eq?.equipment_name });
                    }} disabled={!!form.plan_id}>
                      <SelectTrigger><SelectValue placeholder="选择设备" /></SelectTrigger>
                      <SelectContent>
                        {equipmentList.map((eq: any) => (
                          <SelectItem key={eq.id} value={String(eq.id)}>{eq.equipment_code} - {eq.equipment_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>保养类型</Label>
                    <Select value={String(form.maintenance_type ?? 1)} onValueChange={(v) => setForm({ ...form, maintenance_type: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MAINT_TYPE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>开始时间</Label>
                    <Input type="datetime-local" value={form.start_time || ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>结束时间</Label>
                    <Input type="datetime-local" value={form.end_time || ''} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>停机时长(h)</Label>
                    <Input type="number" step="0.5" value={form.downtime_hours || ''} onChange={(e) => setForm({ ...form, downtime_hours: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>费用(元)</Label>
                    <Input type="number" step="0.01" value={form.cost || ''} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>保养结果</Label>
                    <Select value={String(form.result ?? 1)} onValueChange={(v) => setForm({ ...form, result: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RECORD_RESULT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>故障描述</Label>
                  <Textarea value={form.fault_desc || ''} onChange={(e) => setForm({ ...form, fault_desc: e.target.value })} placeholder="描述故障情况..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>保养内容</Label>
                  <Textarea value={form.maintenance_content || ''} onChange={(e) => setForm({ ...form, maintenance_content: e.target.value })} placeholder="描述保养执行内容..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Input value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="备注" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
