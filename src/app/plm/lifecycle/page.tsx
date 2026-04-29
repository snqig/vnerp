'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, GitBranch, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LifecycleRecord {
  id?: number;
  product_id: number;
  product_code: string;
  product_name: string;
  lifecycle_stage: string;
  stage_status: number;
  version: string;
  change_type: string;
  change_reason: string;
  change_desc: string;
  approver: string;
  approve_time: string;
  effective_date: string;
  remark: string;
  create_time: string;
}

const stageMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'concept': { label: '概念', variant: 'outline' },
  'design': { label: '设计', variant: 'secondary' },
  'prototype': { label: '打样', variant: 'default' },
  'pilot': { label: '试产', variant: 'default' },
  'mass': { label: '量产', variant: 'default' },
  'eol': { label: '退市', variant: 'destructive' },
};
const stageOrder = ['concept', 'design', 'prototype', 'pilot', 'mass', 'eol'];

const stageStatusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '进行中', variant: 'default' },
  2: { label: '已完成', variant: 'secondary' },
  3: { label: '暂停', variant: 'outline' },
  4: { label: '取消', variant: 'destructive' },
};

const changeTypeMap: Record<string, string> = {
  'new': '新建', 'revision': '修订', 'upgrade': '升级', 'downgrade': '降级'
};

export default function ProductLifecyclePage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<LifecycleRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchStage, setSearchStage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<LifecycleRecord | null>(null);
  const [form, setForm] = useState<Partial<LifecycleRecord>>({
    product_id: 0, product_code: '', product_name: '',
    lifecycle_stage: 'concept', stage_status: 1, version: 'V1.0',
    change_type: 'new', change_reason: '', change_desc: '', effective_date: '', remark: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchName) params.set('productName', searchName);
      if (searchStage) params.set('lifecycleStage', searchStage);
      const res = await fetch('/api/plm/lifecycle?' + params);
      const data = await res.json();
      if (data.code === 200) { setRecords(data.data.list || []); setTotal(data.data.total || 0); }
    } catch { toast({ title: '获取数据失败', variant: 'destructive' }); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => {
    if (!form.product_name) { toast({ title: '请输入产品名称', variant: 'destructive' }); return; }
    try {
      const url = editRecord ? '/api/plm/lifecycle' : '/api/plm/lifecycle';
      const method = editRecord ? 'PUT' : 'POST';
      const body = editRecord ? { id: editRecord.id, ...form } : form;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.code === 200) { toast({ title: editRecord ? '更新成功' : '创建成功' }); setDialogOpen(false); fetchData(); }
      else { toast({ title: data.message || '操作失败', variant: 'destructive' }); }
    } catch { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除？')) return;
    try {
      const res = await fetch('/api/plm/lifecycle?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) { toast({ title: '删除成功' }); fetchData(); }
    } catch { toast({ title: '删除失败', variant: 'destructive' }); }
  };

  const openEdit = (record: LifecycleRecord) => {
    setEditRecord(record);
    setForm({ ...record });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditRecord(null);
    setForm({ product_id: 0, product_code: '', product_name: '', lifecycle_stage: 'concept', stage_status: 1, version: 'V1.0', change_type: 'new', change_reason: '', change_desc: '', effective_date: '', remark: '' });
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6" />产品生命周期管理</h1>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />新建记录</Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 mb-4">
              <Input placeholder="搜索产品名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" onKeyDown={e => e.key === 'Enter' && fetchData()} />
              <Select value={searchStage} onValueChange={v => { setSearchStage(v); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="生命周期阶段" /></SelectTrigger>
                <SelectContent>
                  {stageOrder.map(s => <SelectItem key={s} value={s}>{stageMap[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}><Search className="h-4 w-4 mr-1" />搜索</Button>
            </div>

            <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
              {stageOrder.map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  <Badge variant={stageMap[s].variant}>{stageMap[s].label}</Badge>
                  {i < stageOrder.length - 1 && <ArrowRight className="h-3 w-3" />}
                </span>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>产品编码</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>生命周期阶段</TableHead>
                  <TableHead>阶段状态</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>变更类型</TableHead>
                  <TableHead>生效日期</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.product_code || '-'}</TableCell>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell><Badge variant={stageMap[r.lifecycle_stage]?.variant || 'outline'}>{stageMap[r.lifecycle_stage]?.label || r.lifecycle_stage}</Badge></TableCell>
                    <TableCell><Badge variant={stageStatusMap[r.stage_status]?.variant || 'outline'}>{stageStatusMap[r.stage_status]?.label || '-'}</Badge></TableCell>
                    <TableCell className="font-mono">{r.version}</TableCell>
                    <TableCell>{changeTypeMap[r.change_type] || '-'}</TableCell>
                    <TableCell>{r.effective_date || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.create_time?.slice(0, 10)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4 text-sm">
              <span>共 {total} 条</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader><DialogTitle>{editRecord ? '编辑生命周期记录' : '新建生命周期记录'}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>产品编码</Label><Input value={form.product_code || ''} onChange={e => setForm({ ...form, product_code: e.target.value })} /></div>
                <div><Label>产品名称 *</Label><Input value={form.product_name || ''} onChange={e => setForm({ ...form, product_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>生命周期阶段</Label>
                  <Select value={form.lifecycle_stage || 'concept'} onValueChange={v => setForm({ ...form, lifecycle_stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{stageOrder.map(s => <SelectItem key={s} value={s}>{stageMap[s].label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>阶段状态</Label>
                  <Select value={String(form.stage_status || 1)} onValueChange={v => setForm({ ...form, stage_status: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">进行中</SelectItem>
                      <SelectItem value="2">已完成</SelectItem>
                      <SelectItem value="3">暂停</SelectItem>
                      <SelectItem value="4">取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>版本号</Label><Input value={form.version || ''} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="V1.0" /></div>
                <div>
                  <Label>变更类型</Label>
                  <Select value={form.change_type || 'new'} onValueChange={v => setForm({ ...form, change_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">新建</SelectItem>
                      <SelectItem value="revision">修订</SelectItem>
                      <SelectItem value="upgrade">升级</SelectItem>
                      <SelectItem value="downgrade">降级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>生效日期</Label><Input type="date" value={form.effective_date || ''} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></div>
              <div><Label>变更原因</Label><Textarea value={form.change_reason || ''} onChange={e => setForm({ ...form, change_reason: e.target.value })} rows={2} /></div>
              <div><Label>变更描述</Label><Textarea value={form.change_desc || ''} onChange={e => setForm({ ...form, change_desc: e.target.value })} rows={2} /></div>
              <div><Label>备注</Label><Textarea value={form.remark || ''} onChange={e => setForm({ ...form, remark: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
