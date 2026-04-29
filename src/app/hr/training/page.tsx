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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Item { id: number; training_no: string; training_name: string; training_type: number; training_date: string; training_hours: number; trainer: string; training_place: string; status: number; }
const typeMap: Record<number, string> = { 1: '安全培训', 2: '技能培训', 3: '质量培训', 4: '管理培训', 5: '新员工培训' };
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { 1: { label: '计划中', variant: 'outline' }, 2: { label: '进行中', variant: 'default' }, 3: { label: '已完成', variant: 'secondary' }, 4: { label: '已取消', variant: 'destructive' } };

export default function TrainingPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', trainingName: searchName }); const res = await fetch('/api/hr/training?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => { try { const res = await fetch('/api/hr/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleStatusChange = async (id: number, status: number) => { try { const res = await fetch('/api/hr/training', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const result = await res.json(); if (result.success) { toast({ title: '更新成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/hr/training?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">培训管理</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索培训名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增培训</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">培训编号</TableHead><TableHead className="text-xs">培训名称</TableHead><TableHead className="text-xs">培训类型</TableHead><TableHead className="text-xs">培训日期</TableHead><TableHead className="text-xs">学时</TableHead><TableHead className="text-xs">讲师</TableHead><TableHead className="text-xs">地点</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => { const st = statusMap[item.status] || statusMap[1]; return (<TableRow key={item.id}><TableCell className="text-xs font-mono">{item.training_no}</TableCell><TableCell className="text-xs">{item.training_name}</TableCell><TableCell className="text-xs">{typeMap[item.training_type] || '-'}</TableCell><TableCell className="text-xs">{item.training_date || '-'}</TableCell><TableCell className="text-xs">{item.training_hours || '-'}h</TableCell><TableCell className="text-xs">{item.trainer || '-'}</TableCell><TableCell className="text-xs">{item.training_place || '-'}</TableCell><TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell><TableCell><div className="flex gap-1">{item.status === 1 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 2)}>开始</Button>}{item.status === 2 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 3)}>完成</Button>}<Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>); })}{list.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>新增培训</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>培训名称</Label><Input value={editItem.training_name || ''} onChange={e => setEditItem({ ...editItem, training_name: e.target.value })} /></div><div><Label>培训类型</Label><Select value={String(editItem.training_type || 1)} onValueChange={v => setEditItem({ ...editItem, training_type: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">安全培训</SelectItem><SelectItem value="2">技能培训</SelectItem><SelectItem value="3">质量培训</SelectItem><SelectItem value="4">管理培训</SelectItem><SelectItem value="5">新员工培训</SelectItem></SelectContent></Select></div><div><Label>培训日期</Label><Input type="date" value={editItem.training_date || ''} onChange={e => setEditItem({ ...editItem, training_date: e.target.value })} /></div><div><Label>学时</Label><Input type="number" value={editItem.training_hours ?? ''} onChange={e => setEditItem({ ...editItem, training_hours: Number(e.target.value) })} /></div><div><Label>讲师</Label><Input value={editItem.trainer || ''} onChange={e => setEditItem({ ...editItem, trainer: e.target.value })} /></div><div><Label>地点</Label><Input value={editItem.training_place || ''} onChange={e => setEditItem({ ...editItem, training_place: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
