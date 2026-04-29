'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Plus, Search, RefreshCw, Clock, AlertTriangle, Droplets, Eye, Trash2, Timer } from 'lucide-react';
import { toast } from 'sonner';

interface InkOpeningRecord {
  id: number;
  record_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  batch_no: string;
  label_id: number;
  ink_type: string;
  open_time: string;
  expire_hours: number;
  expire_time: string;
  remaining_qty: number;
  unit: string;
  status: number;
  operator_id: number;
  operator_name: string;
  remark: string;
  create_time: string;
}

const INK_TYPE_MAP: Record<string, { label: string; color: string }> = {
  solvent: { label: '溶剂型', color: 'bg-orange-100 text-orange-800' },
  uv: { label: 'UV型', color: 'bg-purple-100 text-purple-800' },
  water: { label: '水性', color: 'bg-blue-100 text-blue-800' },
};

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '使用中', color: 'bg-green-100 text-green-800' },
  2: { label: '已过期', color: 'bg-red-100 text-red-800' },
  3: { label: '已报废', color: 'bg-gray-100 text-gray-800' },
};

const EXPIRE_HOURS_OPTIONS = [
  { value: 24, label: '24小时' },
  { value: 48, label: '48小时' },
  { value: 72, label: '72小时' },
  { value: 96, label: '96小时' },
  { value: 120, label: '120小时' },
  { value: 168, label: '168小时(7天)' },
  { value: 336, label: '336小时(14天)' },
  { value: 720, label: '720小时(30天)' },
];

export default function InkOpeningPage() {
  const [records, setRecords] = useState<InkOpeningRecord[]>([]);
  const [overdueList, setOverdueList] = useState<InkOpeningRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inkTypeFilter, setInkTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<InkOpeningRecord | null>(null);
  const [summary, setSummary] = useState({
    total_count: 0,
    using_count: 0,
    expired_count: 0,
    scrapped_count: 0,
    overdue_using_count: 0,
  });

  const [form, setForm] = useState({
    material_id: '',
    material_code: '',
    material_name: '',
    batch_no: '',
    ink_type: 'solvent',
    open_time: new Date().toISOString().slice(0, 16),
    expire_hours: 48,
    remaining_qty: '',
    unit: 'kg',
    operator_name: '',
    remark: '',
  });

  const [materials, setMaterials] = useState<any[]>([]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (inkTypeFilter !== 'all') params.set('ink_type', inkTypeFilter);
      params.set('pageSize', '50');
      const res = await fetch(`/api/dcprint/ink-opening?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data?.list || []);
        if (data.data?.summary) setSummary(data.data.summary);
        if (data.data?.overdue_list) setOverdueList(data.data.overdue_list);
      }
    } catch (e) {
      toast.error('获取油墨开罐记录失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, inkTypeFilter]);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/inventory/materials?category=ink&pageSize=100');
      const data = await res.json();
      if (data.success) {
        setMaterials(data.data?.list || data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchMaterials();
  }, [fetchRecords]);

  const handleCreate = async () => {
    if (!form.material_id || !form.open_time || !form.expire_hours) {
      toast.error('请填写必填字段');
      return;
    }
    try {
      const res = await fetch('/api/dcprint/ink-opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: parseInt(form.material_id),
          material_code: form.material_code,
          material_name: form.material_name,
          batch_no: form.batch_no,
          ink_type: form.ink_type,
          open_time: form.open_time,
          expire_hours: form.expire_hours,
          remaining_qty: form.remaining_qty ? parseFloat(form.remaining_qty) : null,
          unit: form.unit,
          operator_name: form.operator_name,
          remark: form.remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('油墨开罐记录创建成功');
        setDialogOpen(false);
        setForm({
          material_id: '',
          material_code: '',
          material_name: '',
          batch_no: '',
          ink_type: 'solvent',
          open_time: new Date().toISOString().slice(0, 16),
          expire_hours: 48,
          remaining_qty: '',
          unit: 'kg',
          operator_name: '',
          remark: '',
        });
        fetchRecords();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (e) {
      toast.error('创建油墨开罐记录失败');
    }
  };

  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await fetch('/api/dcprint/ink-opening', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('状态更新成功');
        fetchRecords();
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch (e) {
      toast.error('更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此记录？')) return;
    try {
      const res = await fetch(`/api/dcprint/ink-opening?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        fetchRecords();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const getTimeRemaining = (expireTime: string) => {
    const now = new Date().getTime();
    const expire = new Date(expireTime).getTime();
    const diff = expire - now;
    if (diff <= 0) return { text: '已过期', isOverdue: true, isWarning: false };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours < 4) return { text: `${hours}时${minutes}分`, isOverdue: false, isWarning: true };
    return { text: `${hours}时${minutes}分`, isOverdue: false, isWarning: false };
  };

  const handleViewDetail = (record: InkOpeningRecord) => {
    setDetailData(record);
    setDetailOpen(true);
  };

  return (
    <MainLayout title="油墨开罐计时管理">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">使用中</CardTitle>
              <Droplets className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.using_count}</div>
              <p className="text-xs text-muted-foreground mt-1">当前正在使用的油墨</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已过期</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.expired_count}</div>
              <p className="text-xs text-muted-foreground mt-1">已过期的油墨记录</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">即将过期</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.overdue_using_count}</div>
              <p className="text-xs text-muted-foreground mt-1">使用中但已超时</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已报废</CardTitle>
              <Trash2 className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{summary.scrapped_count}</div>
              <p className="text-xs text-muted-foreground mt-1">已报废处理的油墨</p>
            </CardContent>
          </Card>
        </div>

        {overdueList.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                过期预警
              </CardTitle>
              <CardDescription className="text-red-600">
                以下油墨已超过有效使用时间，请及时处理！
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>记录单号</TableHead>
                    <TableHead>油墨名称</TableHead>
                    <TableHead>油墨类型</TableHead>
                    <TableHead>开罐时间</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueList.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.record_no}</TableCell>
                      <TableCell>{r.material_name}</TableCell>
                      <TableCell>
                        <Badge className={INK_TYPE_MAP[r.ink_type]?.color || 'bg-gray-100'}>
                          {INK_TYPE_MAP[r.ink_type]?.label || r.ink_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.open_time}</TableCell>
                      <TableCell className="text-red-600 font-medium">{r.expire_time}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 2)}>
                          标记过期
                        </Button>
                        <Button size="sm" variant="outline" className="ml-1" onClick={() => handleStatusChange(r.id, 3)}>
                          标记报废
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>油墨开罐记录</CardTitle>
                <CardDescription>管理所有油墨开罐计时记录</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索物料编码/名称/批号..."
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="1">使用中</SelectItem>
                    <SelectItem value="2">已过期</SelectItem>
                    <SelectItem value="3">已报废</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={inkTypeFilter} onValueChange={setInkTypeFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="油墨类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="solvent">溶剂型</SelectItem>
                    <SelectItem value="uv">UV型</SelectItem>
                    <SelectItem value="water">水性</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchRecords}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增开罐
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>记录单号</TableHead>
                  <TableHead>油墨名称</TableHead>
                  <TableHead>油墨类型</TableHead>
                  <TableHead>批号</TableHead>
                  <TableHead>开罐时间</TableHead>
                  <TableHead>有效时长</TableHead>
                  <TableHead>过期时间</TableHead>
                  <TableHead>剩余时间</TableHead>
                  <TableHead>剩余数量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      暂无油墨开罐记录
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const timeRemaining = r.status === 1 ? getTimeRemaining(r.expire_time) : null;
                    return (
                      <TableRow key={r.id} className={timeRemaining?.isOverdue ? 'bg-red-50' : timeRemaining?.isWarning ? 'bg-yellow-50' : ''}>
                        <TableCell className="font-mono">{r.record_no}</TableCell>
                        <TableCell className="font-medium">{r.material_name || r.material_code}</TableCell>
                        <TableCell>
                          <Badge className={INK_TYPE_MAP[r.ink_type]?.color || 'bg-gray-100'}>
                            {INK_TYPE_MAP[r.ink_type]?.label || r.ink_type || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{r.batch_no || '-'}</TableCell>
                        <TableCell>{r.open_time}</TableCell>
                        <TableCell>{r.expire_hours}小时</TableCell>
                        <TableCell>{r.expire_time}</TableCell>
                        <TableCell>
                          {timeRemaining ? (
                            <span className={`flex items-center gap-1 font-medium ${timeRemaining.isOverdue ? 'text-red-600' : timeRemaining.isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
                              {timeRemaining.isOverdue && <AlertTriangle className="h-3 w-3" />}
                              {timeRemaining.isWarning && <Clock className="h-3 w-3" />}
                              {!timeRemaining.isOverdue && !timeRemaining.isWarning && <Timer className="h-3 w-3" />}
                              {timeRemaining.text}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{r.remaining_qty ? `${r.remaining_qty} ${r.unit || ''}` : '-'}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_MAP[r.status]?.color || 'bg-gray-100'}>
                            {STATUS_MAP[r.status]?.label || r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(r)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {r.status === 1 && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, 2)} title="标记过期">
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, 3)} title="标记报废">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            {r.status === 2 && (
                              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, 3)} title="标记报废">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[550px]" resizable>
            <DialogHeader>
              <DialogTitle>新增油墨开罐记录</DialogTitle>
              <DialogDescription>记录油墨开罐信息，系统将自动计算过期时间</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>物料编码</Label>
                  <Input value={form.material_code} onChange={(e) => setForm(prev => ({ ...prev, material_code: e.target.value }))} placeholder="如：MAT006" />
                </div>
                <div>
                  <Label>物料名称</Label>
                  <Input value={form.material_name} onChange={(e) => setForm(prev => ({ ...prev, material_name: e.target.value }))} placeholder="如：丝印油墨-黑色" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>油墨类型</Label>
                  <Select value={form.ink_type} onValueChange={(v) => setForm(prev => ({ ...prev, ink_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solvent">溶剂型</SelectItem>
                      <SelectItem value="uv">UV型</SelectItem>
                      <SelectItem value="water">水性</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>批号</Label>
                  <Input value={form.batch_no} onChange={(e) => setForm(prev => ({ ...prev, batch_no: e.target.value }))} placeholder="批次号" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>开罐时间 *</Label>
                  <Input type="datetime-local" value={form.open_time} onChange={(e) => setForm(prev => ({ ...prev, open_time: e.target.value }))} />
                </div>
                <div>
                  <Label>有效时长 *</Label>
                  <Select value={String(form.expire_hours)} onValueChange={(v) => setForm(prev => ({ ...prev, expire_hours: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPIRE_HOURS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>剩余数量</Label>
                  <Input type="number" step="0.01" value={form.remaining_qty} onChange={(e) => setForm(prev => ({ ...prev, remaining_qty: e.target.value }))} placeholder="剩余数量" />
                </div>
                <div>
                  <Label>单位</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm(prev => ({ ...prev, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="罐">罐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>操作员</Label>
                <Input value={form.operator_name} onChange={(e) => setForm(prev => ({ ...prev, operator_name: e.target.value }))} placeholder="操作员姓名" />
              </div>
              <div>
                <Label>备注</Label>
                <Textarea value={form.remark} onChange={(e) => setForm(prev => ({ ...prev, remark: e.target.value }))} placeholder="备注信息" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreate}>确认开罐</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-[500px]" resizable>
            <DialogHeader>
              <DialogTitle>油墨开罐详情</DialogTitle>
            </DialogHeader>
            {detailData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">记录单号：</span>{detailData.record_no}</div>
                  <div><span className="text-muted-foreground">物料编码：</span>{detailData.material_code}</div>
                  <div><span className="text-muted-foreground">物料名称：</span>{detailData.material_name}</div>
                  <div><span className="text-muted-foreground">油墨类型：</span>
                    <Badge className={INK_TYPE_MAP[detailData.ink_type]?.color || 'bg-gray-100'}>
                      {INK_TYPE_MAP[detailData.ink_type]?.label || detailData.ink_type}
                    </Badge>
                  </div>
                  <div><span className="text-muted-foreground">批号：</span>{detailData.batch_no || '-'}</div>
                  <div><span className="text-muted-foreground">有效时长：</span>{detailData.expire_hours}小时</div>
                  <div><span className="text-muted-foreground">开罐时间：</span>{detailData.open_time}</div>
                  <div><span className="text-muted-foreground">过期时间：</span>{detailData.expire_time}</div>
                  <div><span className="text-muted-foreground">剩余数量：</span>{detailData.remaining_qty ? `${detailData.remaining_qty} ${detailData.unit}` : '-'}</div>
                  <div><span className="text-muted-foreground">操作员：</span>{detailData.operator_name || '-'}</div>
                  <div><span className="text-muted-foreground">状态：</span>
                    <Badge className={STATUS_MAP[detailData.status]?.color || 'bg-gray-100'}>
                      {STATUS_MAP[detailData.status]?.label || detailData.status}
                    </Badge>
                  </div>
                </div>
                {detailData.remark && (
                  <div className="text-sm"><span className="text-muted-foreground">备注：</span>{detailData.remark}</div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
