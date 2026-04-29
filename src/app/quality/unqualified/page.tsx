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

interface Item { id: number; handle_no: string; material_code: string; material_name: string; unqualified_qty: number; handle_type: number; handle_status: number; responsible_dept: string; responsible_person: string; }
const typeMap: Record<number, string> = { 1: '返工', 2: '返修', 3: '让步接收', 4: '退货', 5: '报废' };
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { 1: { label: '待处理', variant: 'outline' }, 2: { label: '处理中', variant: 'default' }, 3: { label: '已完成', variant: 'secondary' }, 4: { label: '已关闭', variant: 'destructive' } };

export default function UnqualifiedPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', handleNo: searchNo }); const res = await fetch('/api/quality/unqualified?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => { try { const res = await fetch('/api/quality/unqualified', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleStatusChange = async (id: number, handle_status: number) => { try { const res = await fetch('/api/quality/unqualified', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, handle_status }) }); const result = await res.json(); if (result.success) { toast({ title: '更新成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/quality/unqualified?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">不合格品处理</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增处理单</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">处理单号</TableHead><TableHead className="text-xs">物料编码</TableHead><TableHead className="text-xs">物料名称</TableHead><TableHead className="text-xs">不合格数量</TableHead><TableHead className="text-xs">处理方式</TableHead><TableHead className="text-xs">责任部门</TableHead><TableHead className="text-xs">责任人</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => { const st = statusMap[item.handle_status] || statusMap[1]; return (<TableRow key={item.id}><TableCell className="text-xs font-mono">{item.handle_no}</TableCell><TableCell className="text-xs">{item.material_code || '-'}</TableCell><TableCell className="text-xs">{item.material_name || '-'}</TableCell><TableCell className="text-xs">{item.unqualified_qty}</TableCell><TableCell className="text-xs">{typeMap[item.handle_type] || '-'}</TableCell><TableCell className="text-xs">{item.responsible_dept || '-'}</TableCell><TableCell className="text-xs">{item.responsible_person || '-'}</TableCell><TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell><TableCell><div className="flex gap-1">{item.handle_status === 1 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 2)}>开始处理</Button>}{item.handle_status === 2 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 3)}>完成</Button>}<Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>); })}{list.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>新增不合格品处理单</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>物料编码</Label><Input value={editItem.material_code || ''} onChange={e => setEditItem({ ...editItem, material_code: e.target.value })} /></div><div><Label>物料名称</Label><Input value={editItem.material_name || ''} onChange={e => setEditItem({ ...editItem, material_name: e.target.value })} /></div><div><Label>不合格数量</Label><Input type="number" value={editItem.unqualified_qty || ''} onChange={e => setEditItem({ ...editItem, unqualified_qty: Number(e.target.value) })} /></div><div><Label>处理方式</Label><Select value={String(editItem.handle_type || 1)} onValueChange={v => setEditItem({ ...editItem, handle_type: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">返工</SelectItem><SelectItem value="2">返修</SelectItem><SelectItem value="3">让步接收</SelectItem><SelectItem value="4">退货</SelectItem><SelectItem value="5">报废</SelectItem></SelectContent></Select></div><div><Label>责任部门</Label><Input value={editItem.responsible_dept || ''} onChange={e => setEditItem({ ...editItem, responsible_dept: e.target.value })} /></div><div><Label>责任人</Label><Input value={editItem.responsible_person || ''} onChange={e => setEditItem({ ...editItem, responsible_person: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
