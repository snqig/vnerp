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
import { Plus, Search, Edit, Trash2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FollowRecord {
  id?: number;
  customer_id: number;
  customer_name: string;
  follow_type: string;
  follow_content: string;
  contact_name: string;
  salesman_name: string;
  next_follow_date: string;
  opportunity: string;
  status: number;
  remark: string;
  create_time: string;
}

const followTypeMap: Record<string, string> = {
  'visit': '拜访', 'phone': '电话', 'email': '邮件', 'wechat': '微信', 'other': '其他'
};

const followStatusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待跟进', variant: 'outline' },
  2: { label: '已跟进', variant: 'default' },
  3: { label: '已转化', variant: 'secondary' },
};

export default function CustomerFollowPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<FollowRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchType, setSearchType] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FollowRecord | null>(null);
  const [form, setForm] = useState<Partial<FollowRecord>>({
    customer_id: 0, customer_name: '', follow_type: 'phone',
    follow_content: '', contact_name: '', salesman_name: '',
    next_follow_date: '', opportunity: '', status: 1, remark: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (searchName) params.set('customerName', searchName);
      if (searchType) params.set('followType', searchType);
      const res = await fetch('/api/crm/follow?' + params);
      const data = await res.json();
      if (data.code === 200) { setRecords(data.data.list || []); setTotal(data.data.total || 0); }
    } catch { toast({ title: '获取数据失败', variant: 'destructive' }); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => {
    if (!form.customer_name) { toast({ title: '请输入客户名称', variant: 'destructive' }); return; }
    try {
      const method = editRecord ? 'PUT' : 'POST';
      const body = editRecord ? { id: editRecord.id, ...form } : form;
      const res = await fetch('/api/crm/follow', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.code === 200) { toast({ title: editRecord ? '更新成功' : '创建成功' }); setDialogOpen(false); fetchData(); }
      else { toast({ title: data.message || '操作失败', variant: 'destructive' }); }
    } catch { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除？')) return;
    try {
      const res = await fetch('/api/crm/follow?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) { toast({ title: '删除成功' }); fetchData(); }
    } catch { toast({ title: '删除失败', variant: 'destructive' }); }
  };

  const openEdit = (record: FollowRecord) => { setEditRecord(record); setForm({ ...record }); setDialogOpen(true); };
  const openCreate = () => {
    setEditRecord(null);
    setForm({ customer_id: 0, customer_name: '', follow_type: 'phone', follow_content: '', contact_name: '', salesman_name: '', next_follow_date: '', opportunity: '', status: 1, remark: '' });
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Phone className="h-6 w-6" />客户跟进记录</h1>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />新建跟进</Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 mb-4">
              <Input placeholder="搜索客户名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" onKeyDown={e => e.key === 'Enter' && fetchData()} />
              <Select value={searchType} onValueChange={v => setSearchType(v)}>
                <SelectTrigger className="w-32"><SelectValue placeholder="跟进方式" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(followTypeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}><Search className="h-4 w-4 mr-1" />搜索</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>客户名称</TableHead>
                  <TableHead>跟进方式</TableHead>
                  <TableHead>跟进内容</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>业务员</TableHead>
                  <TableHead>下次跟进</TableHead>
                  <TableHead>商机</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell><Badge variant="outline">{followTypeMap[r.follow_type] || r.follow_type}</Badge></TableCell>
                    <TableCell className="max-w-48 truncate">{r.follow_content || '-'}</TableCell>
                    <TableCell>{r.contact_name || '-'}</TableCell>
                    <TableCell>{r.salesman_name || '-'}</TableCell>
                    <TableCell>{r.next_follow_date || '-'}</TableCell>
                    <TableCell className="max-w-32 truncate">{r.opportunity || '-'}</TableCell>
                    <TableCell><Badge variant={followStatusMap[r.status]?.variant || 'outline'}>{followStatusMap[r.status]?.label || '-'}</Badge></TableCell>
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
            <DialogHeader><DialogTitle>{editRecord ? '编辑跟进记录' : '新建跟进记录'}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>客户名称 *</Label><Input value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div>
                  <Label>跟进方式</Label>
                  <Select value={form.follow_type || 'phone'} onValueChange={v => setForm({ ...form, follow_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(followTypeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>联系人</Label><Input value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div><Label>业务员</Label><Input value={form.salesman_name || ''} onChange={e => setForm({ ...form, salesman_name: e.target.value })} /></div>
              </div>
              <div><Label>跟进内容</Label><Textarea value={form.follow_content || ''} onChange={e => setForm({ ...form, follow_content: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>下次跟进日期</Label><Input type="date" value={form.next_follow_date || ''} onChange={e => setForm({ ...form, next_follow_date: e.target.value })} /></div>
                <div>
                  <Label>状态</Label>
                  <Select value={String(form.status || 1)} onValueChange={v => setForm({ ...form, status: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">待跟进</SelectItem>
                      <SelectItem value="2">已跟进</SelectItem>
                      <SelectItem value="3">已转化</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>商机描述</Label><Input value={form.opportunity || ''} onChange={e => setForm({ ...form, opportunity: e.target.value })} /></div>
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
