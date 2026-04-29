'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Scan, QrCode, Factory, User, Clock, CheckCircle, AlertTriangle, Play, RotateCcw, LogOut, Plus, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface WorkReport {
  id: number;
  report_no: string;
  work_order_id: number;
  work_order_no: string;
  process_name: string;
  process_seq: number;
  equipment_id: number;
  equipment_name: string;
  operator_id: number;
  operator_name: string;
  plan_qty: number;
  completed_qty: number;
  qualified_qty: number;
  defective_qty: number;
  scrap_qty: number;
  start_time: string;
  end_time: string;
  work_hours: number;
  is_first_piece: number;
  first_piece_status: string;
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

export default function ProductionReportPage() {
  const [list, setList] = useState<WorkReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryStats, setSummaryStats] = useState<any>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [dieTemplateList, setDieTemplateList] = useState<DieTemplate[]>([]);

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanStep, setScanStep] = useState<'employee' | 'equipment' | 'workorder' | 'complete'>('employee');
  const [scannedCodes, setScannedCodes] = useState({ employee: '', equipment: '', workorder: '' });
  const [inputCode, setInputCode] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (keyword) params.append('keyword', keyword);
      const res = await fetch('/api/production/work-report?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
        setSummaryStats(result.data?.summaryStats || {});
      }
    } catch (e) { console.error(e); toast.error('获取报工记录失败'); }
    finally { setLoading(false); }
  }, [page, keyword]);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/workorders?pageSize=50');
      if (!res.ok) {
        console.error('获取工单列表失败: HTTP', res.status);
        return;
      }
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('解析工单列表响应失败:', text.substring(0, 100));
        return;
      }
      if (result.success) setWorkOrders(result.data?.list || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch('/api/equipment?pageSize=100');
      const result = await res.json();
      if (result.success) setEquipmentList(result.data?.list || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchWorkOrders(); fetchEquipment(); fetchDieTemplates(); }, [fetchWorkOrders, fetchEquipment]);

  const fetchDieTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/prepress/die-template?pageSize=100&die_status=available');
      const result = await res.json();
      if (result.success) setDieTemplateList(result.data?.list || []);
    } catch (e) { console.error(e); }
  }, []);

  const handleSave = async () => {
    if (!form.work_order_id) { toast.error('请选择工单'); return; }
    if (!form.process_name) { toast.error('请填写工序名称'); return; }
    try {
      const res = await fetch('/api/production/work-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('报工成功');
        setDialogOpen(false);
        setForm({});
        fetchData();
      } else {
        toast.error(result.message || '报工失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('报工失败');
    }
  };

  const handleScan = (type: 'employee' | 'equipment' | 'workorder' | 'complete', code: string) => {
    setScannedCodes(prev => ({ ...prev, [type]: code }));
    setInputCode('');
    if (type === 'employee') setScanStep('equipment');
    else if (type === 'equipment') setScanStep('workorder');
    else if (type === 'workorder') {
      setScanStep('complete');
      setIsWorking(true);
      setWorkStartTime(new Date());
      setIsScanOpen(false);
      const wo = workOrders.find(w => w.order_no === code);
      setForm({
        ...form,
        operator_name: scannedCodes.employee,
        equipment_id: equipmentList.find(e => e.equipment_code === scannedCodes.equipment)?.id,
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
    setForm({});
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
    if (!confirm('确定删除该报工记录？')) return;
    try {
      const res = await fetch(`/api/production/work-report?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast.success('删除成功'); fetchData(); }
      else { toast.error(result.message || '删除失败'); }
    } catch (e) { toast.error('删除失败'); }
  };

  const getEfficiency = (r: WorkReport) => {
    if (!r.plan_qty || r.plan_qty === 0) return 0;
    return Math.round((r.completed_qty / r.plan_qty) * 100);
  };

  return (
    <MainLayout title="生产报工">
      <div className="space-y-6">
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-blue-100"><Scan className="h-6 w-6 text-blue-600" /></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">上工三扫码</h3>
                  {isWorking && workStartTime && (
                    <Badge className="bg-green-100 text-green-700">
                      <Clock className="h-3 w-3 mr-1" />工作中 - {workStartTime.toLocaleTimeString()}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">按顺序扫描工牌、机台码、工单码完成上工登记</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    { key: 'employee', label: '1. 扫工牌', icon: User, value: scannedCodes.employee },
                    { key: 'equipment', label: '2. 扫机台码', icon: Factory, value: scannedCodes.equipment },
                    { key: 'workorder', label: '3. 扫工单码', icon: QrCode, value: scannedCodes.workorder },
                  ].map((step, i) => (
                    <div key={step.key} className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      step.value ? 'bg-green-50 border-green-300' : i === 0 || (i === 1 && scannedCodes.employee) || (i === 2 && scannedCodes.equipment) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                    }`}>
                      <div className={`p-2 rounded-full ${step.value ? 'bg-green-500' : 'bg-blue-500'}`}>
                        <step.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{step.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{step.value || '待扫描'}</div>
                      </div>
                      {step.value && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  {!isWorking ? (
                    <Button onClick={() => { setScanStep('employee'); setIsScanOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                      <Scan className="h-4 w-4 mr-2" />开始上工扫码
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-2" />重新扫码</Button>
                      <Button variant="destructive" onClick={handleFinishWork}><LogOut className="h-4 w-4 mr-2" />下工报工</Button>
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
              <div className="text-sm text-gray-500">总完成量</div>
              <div className="text-2xl font-bold text-green-600">{Number(summaryStats.total_completed || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-500">合格量</div>
              <div className="text-2xl font-bold text-blue-600">{Number(summaryStats.total_qualified || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-500">不良品</div>
              <div className="text-2xl font-bold text-yellow-600">{Number(summaryStats.total_defective || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-500">报废量</div>
              <div className="text-2xl font-bold text-red-600">{Number(summaryStats.total_scrap || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>报工记录</CardTitle>
              <CardDescription>生产报工数据，效率低于80%自动预警</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="搜索工单/报工号/操作员" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 w-56" />
              </div>
              <Button variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
              <Button onClick={() => { setForm({ start_time: new Date().toISOString().slice(0, 16) }); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />手工报工
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>报工单号</TableHead>
                    <TableHead>工单号</TableHead>
                    <TableHead>工序</TableHead>
                    <TableHead>操作员</TableHead>
                    <TableHead>设备</TableHead>
                    <TableHead className="text-right">计划量</TableHead>
                    <TableHead className="text-right">完成量</TableHead>
                    <TableHead className="text-right">合格量</TableHead>
                    <TableHead className="text-right">报废量</TableHead>
                    <TableHead className="text-right">效率</TableHead>
                    <TableHead>工时</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => {
                    const eff = getEfficiency(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.report_no}</TableCell>
                        <TableCell className="font-mono text-sm">{r.work_order_no || '-'}</TableCell>
                        <TableCell>{r.process_name}</TableCell>
                        <TableCell>{r.operator_name || '-'}</TableCell>
                        <TableCell>{r.equipment_name || '-'}</TableCell>
                        <TableCell className="text-right">{r.plan_qty || 0}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{r.completed_qty || 0}</TableCell>
                        <TableCell className="text-right text-blue-600">{r.qualified_qty || 0}</TableCell>
                        <TableCell className="text-right text-red-500">{r.scrap_qty > 0 ? r.scrap_qty : '-'}</TableCell>
                        <TableCell className="text-right">
                          <span className={eff < 80 ? 'text-red-600 font-bold' : 'text-green-600 font-medium'}>{eff}%</span>
                        </TableCell>
                        <TableCell>{r.work_hours || 0}h</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(r.id)}>
                            <AlertTriangle className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {list.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center text-gray-400 py-8">暂无报工记录</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">共 {total} 条</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
          <DialogContent className="max-w-md" resizable>
            <DialogHeader>
              <DialogTitle>{scanStep === 'employee' ? '扫工牌' : scanStep === 'equipment' ? '扫机台码' : '扫工单码'}</DialogTitle>
              <DialogDescription>使用PDA扫描或手动输入编码，按回车确认</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2 mb-4">
                <div className={`flex-1 h-2 rounded-full ${scannedCodes.employee ? 'bg-green-500' : scanStep === 'employee' ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-2 rounded-full ${scannedCodes.equipment ? 'bg-green-500' : scanStep === 'equipment' ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-2 rounded-full ${scannedCodes.workorder ? 'bg-green-500' : scanStep === 'workorder' ? 'bg-blue-500' : 'bg-gray-200'}`} />
              </div>
              <div className="space-y-2">
                <Label>{scanStep === 'employee' ? '工牌编码' : scanStep === 'equipment' ? '机台编码' : '工单编码'}</Label>
                <div className="flex gap-2">
                  <Input placeholder="扫描或输入编码..." value={inputCode} onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && inputCode.trim()) handleScan(scanStep, inputCode.trim()); }} autoFocus />
                  <Button variant="outline" size="icon" onClick={() => inputCode.trim() && handleScan(scanStep, inputCode.trim())}>
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">快速选择</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {scanStep === 'employee' && ['张三', '李四', '王五', '赵六'].map(name => (
                    <Button key={name} variant="outline" size="sm" onClick={() => handleScan('employee', name)} className="justify-start">
                      <User className="h-3 w-3 mr-2" />{name}
                    </Button>
                  ))}
                  {scanStep === 'equipment' && equipmentList.map(eq => (
                    <Button key={eq.id} variant="outline" size="sm" onClick={() => handleScan('equipment', eq.equipment_code)} className="justify-start">
                      <Factory className="h-3 w-3 mr-2" />{eq.equipment_name}
                    </Button>
                  ))}
                  {scanStep === 'workorder' && workOrders.map(wo => (
                    <Button key={wo.id} variant="outline" size="sm" onClick={() => handleScan('workorder', wo.order_no)} className="justify-start">
                      <QrCode className="h-3 w-3 mr-2" />{wo.order_no}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsScanOpen(false)}>取消</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>手工报工</DialogTitle>
              <DialogDescription>填写报工信息提交</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>工单 <span className="text-red-500">*</span></Label>
                  <Select value={String(form.work_order_id || '')} onValueChange={(v) => {
                    const wo = workOrders.find(w => w.id === Number(v));
                    setForm({ ...form, work_order_id: Number(v), work_order_no: wo?.order_no, plan_qty: wo?.plan_qty });
                  }}>
                    <SelectTrigger><SelectValue placeholder="选择工单" /></SelectTrigger>
                    <SelectContent>
                      {workOrders.map(wo => (
                        <SelectItem key={wo.id} value={String(wo.id)}>{wo.order_no} - {wo.product_name || ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>工序 <span className="text-red-500">*</span></Label>
                  <Select value={form.process_name || ''} onValueChange={(v) => setForm({ ...form, process_name: v })}>
                    <SelectTrigger><SelectValue placeholder="选择工序" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="印刷">印刷</SelectItem>
                      <SelectItem value="覆膜">覆膜</SelectItem>
                      <SelectItem value="模切">模切</SelectItem>
                      <SelectItem value="分切">分切</SelectItem>
                      <SelectItem value="检验">检验</SelectItem>
                      <SelectItem value="包装">包装</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>设备</Label>
                  <Select value={String(form.equipment_id || '')} onValueChange={(v) => {
                    const eq = equipmentList.find(e => e.id === Number(v));
                    setForm({ ...form, equipment_id: Number(v), equipment_name: eq?.equipment_name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="选择设备" /></SelectTrigger>
                    <SelectContent>
                      {equipmentList.map(eq => (
                        <SelectItem key={eq.id} value={String(eq.id)}>{eq.equipment_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>操作员</Label>
                  <Input value={form.operator_name || ''} onChange={(e) => setForm({ ...form, operator_name: e.target.value })} placeholder="操作员姓名" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>关联刀模/网版</Label>
                <Select value={String(form.die_template_id || '')} onValueChange={(v) => {
                  const die = dieTemplateList.find(d => d.id === Number(v));
                  setForm({ ...form, die_template_id: Number(v) });
                }}>
                  <SelectTrigger><SelectValue placeholder="选择刀模/网版(可选)" /></SelectTrigger>
                  <SelectContent>
                    {dieTemplateList.map(die => {
                      const usagePct = die.max_impressions > 0 ? Math.round((die.cumulative_impressions / die.max_impressions) * 100) : 0;
                      const statusColor = usagePct >= 80 ? '🔴' : usagePct >= 60 ? '🟡' : '🟢';
                      return (
                        <SelectItem key={die.id} value={String(die.id)}>
                          {statusColor} {die.template_code} - {die.template_name} ({usagePct}%)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {form.die_template_id && (() => {
                  const die = dieTemplateList.find(d => d.id === Number(form.die_template_id));
                  if (!die) return null;
                  const usagePct = die.max_impressions > 0 ? Math.round((die.cumulative_impressions / die.max_impressions) * 100) : 0;
                  return (
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>使用率: {usagePct}%</span>
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${usagePct >= 80 ? 'bg-red-500' : usagePct >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${usagePct}%` }} />
                      </div>
                      <span>{die.cumulative_impressions}/{die.max_impressions}</span>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2"><Label>计划量</Label><Input type="number" value={form.plan_qty || ''} onChange={(e) => setForm({ ...form, plan_qty: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>完成量</Label><Input type="number" value={form.completed_qty || ''} onChange={(e) => setForm({ ...form, completed_qty: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>合格量</Label><Input type="number" value={form.qualified_qty || ''} onChange={(e) => setForm({ ...form, qualified_qty: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>报废量</Label><Input type="number" value={form.scrap_qty || ''} onChange={(e) => setForm({ ...form, scrap_qty: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>开始时间</Label><Input type="datetime-local" value={form.start_time || ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                <div className="space-y-2"><Label>结束时间</Label><Input type="datetime-local" value={form.end_time || ''} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                <div className="space-y-2"><Label>工时(h)</Label><Input type="number" step="0.5" value={form.work_hours || ''} onChange={(e) => setForm({ ...form, work_hours: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="备注信息" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">提交报工</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
