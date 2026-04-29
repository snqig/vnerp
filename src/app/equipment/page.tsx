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
import { Plus, Edit, Trash2, Search, RefreshCw, Cpu } from 'lucide-react';
import { toast } from 'sonner';

interface Equipment {
  id: number;
  equipment_code: string;
  equipment_name: string;
  equipment_type: number;
  brand: string;
  model: string;
  serial_no: string;
  location: string;
  purchase_date: string;
  rated_capacity: number;
  oee: number;
  availability: number;
  performance: number;
  quality_rate: number;
  current_status: number;
  status: number;
  remark: string;
}

const EQUIPMENT_TYPES: Record<number, string> = { 1: '印刷机', 2: '覆膜机', 3: '模切机', 4: '全检机', 5: '其他' };
const CURRENT_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: '运行', color: 'bg-green-100 text-green-800' },
  2: { label: '待机', color: 'bg-yellow-100 text-yellow-800' },
  3: { label: '维修', color: 'bg-red-100 text-red-800' },
  4: { label: '停机', color: 'bg-gray-100 text-gray-800' },
};

export default function EquipmentPage() {
  const [list, setList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Equipment>>({});
  const [typeStats, setTypeStats] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (typeFilter !== 'all') params.append('equipment_type', typeFilter);
      const res = await fetch(`/api/equipment?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTypeStats(result.data?.typeStats || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('获取设备列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveEquipment = async () => {
    if (!form.equipment_code || !form.equipment_name) {
      toast.error('请填写设备编码和名称');
      return;
    }
    try {
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch('/api/equipment', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (result.success) {
        toast.success(editing ? '设备更新成功' : '设备创建成功');
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('保存设备失败');
    }
  };

  const deleteEquipment = async (id: number) => {
    if (!confirm('确定要删除该设备吗？')) return;
    try {
      const res = await fetch(`/api/equipment?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success('设备删除成功');
        fetchData();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('删除设备失败');
    }
  };

  return (
    <MainLayout title="设备管理">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {typeStats.map((s: any) => (
            <Card key={s.equipment_type}>
              <CardContent className="pt-4">
                <div className="text-sm text-gray-500">{EQUIPMENT_TYPES[s.equipment_type] || '其他'}</div>
                <div className="text-2xl font-bold">{s.count}</div>
                <div className="text-xs text-gray-400">平均OEE: {parseFloat(s.avg_oee).toFixed(1)}%</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" />设备台账</CardTitle>
              <CardDescription>管理印刷、覆膜、模切、全检等设备信息</CardDescription>
            </div>
            <Button onClick={() => { setForm({}); setEditing(false); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />新增设备
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="搜索设备编码/名称/品牌..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="设备类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {Object.entries(EQUIPMENT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>设备编码</TableHead>
                    <TableHead>设备名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>品牌/型号</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead>产能</TableHead>
                    <TableHead>OEE</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">{eq.equipment_code}</TableCell>
                      <TableCell>{eq.equipment_name}</TableCell>
                      <TableCell><Badge variant="outline">{EQUIPMENT_TYPES[eq.equipment_type] || '其他'}</Badge></TableCell>
                      <TableCell>{eq.brand} {eq.model}</TableCell>
                      <TableCell>{eq.location || '-'}</TableCell>
                      <TableCell>{eq.rated_capacity || '-'}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${(eq.oee || 0) >= 85 ? 'text-green-600' : (eq.oee || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {eq.oee?.toFixed(1) || 0}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={CURRENT_STATUS[eq.current_status]?.color || 'bg-gray-100'}>
                          {CURRENT_STATUS[eq.current_status]?.label || '未知'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setForm(eq); setEditing(true); setDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteEquipment(eq.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑设备' : '新增设备'}</DialogTitle>
            <DialogDescription>{editing ? '修改设备信息' : '填写设备基本信息'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>设备编码 <span className="text-red-500">*</span></Label>
                <Input value={form.equipment_code || ''} onChange={(e) => setForm({ ...form, equipment_code: e.target.value })} placeholder="如: EQP001" disabled={editing} />
              </div>
              <div className="space-y-2">
                <Label>设备名称 <span className="text-red-500">*</span></Label>
                <Input value={form.equipment_name || ''} onChange={(e) => setForm({ ...form, equipment_name: e.target.value })} placeholder="请输入设备名称" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>设备类型</Label>
                <Select value={String(form.equipment_type ?? 1)} onValueChange={(v) => setForm({ ...form, equipment_type: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EQUIPMENT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>品牌</Label>
                <Input value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="品牌" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>型号</Label><Input value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="型号" /></div>
              <div className="space-y-2"><Label>安装位置</Label><Input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="位置" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>额定产能</Label><Input type="number" value={form.rated_capacity || ''} onChange={(e) => setForm({ ...form, rated_capacity: parseFloat(e.target.value) || 0 })} placeholder="产能/小时" /></div>
              <div className="space-y-2">
                <Label>运行状态</Label>
                <Select value={String(form.current_status ?? 1)} onValueChange={(v) => setForm({ ...form, current_status: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>备注</Label><Textarea value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="备注" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={saveEquipment} className="bg-blue-600 hover:bg-blue-700">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
