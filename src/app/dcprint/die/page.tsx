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

interface Item { id: number; die_code: string; die_name: string; die_type: number; size_spec: string; product_name: string; max_use_count: number; used_count: number; remaining_count: number; status: number; }
const typeMap: Record<number, string> = { 1: '模切刀', 2: '分切刀', 3: '压痕刀', 4: '冲孔刀' };
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { 1: { label: '在用', variant: 'default' }, 2: { label: '待保养', variant: 'outline' }, 3: { label: '保养中', variant: 'secondary' }, 4: { label: '已报废', variant: 'destructive' } };

export default function DieManagementPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', dieCode: searchCode, dieName: searchName }); const res = await fetch('/api/prepress/die?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => { try { const method = editItem.id ? 'PUT' : 'POST'; const res = await fetch('/api/prepress/die', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: editItem.id ? '更新成功' : '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/prepress/die?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">刀具管理</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="编码" value={searchCode} onChange={e => setSearchCode(e.target.value)} className="w-28 h-8 text-sm" /><Input placeholder="名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-28 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增刀具</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">刀具编码</TableHead><TableHead className="text-xs">刀具名称</TableHead><TableHead className="text-xs">类型</TableHead><TableHead className="text-xs">尺寸规格</TableHead><TableHead className="text-xs">产品</TableHead><TableHead className="text-xs">最大次数</TableHead><TableHead className="text-xs">已用</TableHead><TableHead className="text-xs">剩余</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => { const st = statusMap[item.status] || statusMap[1]; const warn = item.remaining_count <= item.max_use_count * 0.2; return (<TableRow key={item.id}><TableCell className="text-xs font-mono">{item.die_code}</TableCell><TableCell className="text-xs">{item.die_name}</TableCell><TableCell className="text-xs">{typeMap[item.die_type] || '-'}</TableCell><TableCell className="text-xs">{item.size_spec || '-'}</TableCell><TableCell className="text-xs">{item.product_name || '-'}</TableCell><TableCell className="text-xs">{item.max_use_count}</TableCell><TableCell className="text-xs">{item.used_count ?? 0}</TableCell><TableCell className="text-xs">{warn ? <span className="text-red-500 font-bold">{item.remaining_count}</span> : item.remaining_count}</TableCell><TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>); })}{list.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>{editItem.id ? '编辑刀具' : '新增刀具'}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>刀具编码</Label><Input value={editItem.die_code || ''} onChange={e => setEditItem({ ...editItem, die_code: e.target.value })} /></div><div><Label>刀具名称</Label><Input value={editItem.die_name || ''} onChange={e => setEditItem({ ...editItem, die_name: e.target.value })} /></div><div><Label>类型</Label><Select value={String(editItem.die_type || 1)} onValueChange={v => setEditItem({ ...editItem, die_type: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">模切刀</SelectItem><SelectItem value="2">分切刀</SelectItem><SelectItem value="3">压痕刀</SelectItem><SelectItem value="4">冲孔刀</SelectItem></SelectContent></Select></div><div><Label>尺寸规格</Label><Input value={editItem.size_spec || ''} onChange={e => setEditItem({ ...editItem, size_spec: e.target.value })} /></div><div><Label>产品名称</Label><Input value={editItem.product_name || ''} onChange={e => setEditItem({ ...editItem, product_name: e.target.value })} /></div><div><Label>最大使用次数</Label><Input type="number" value={editItem.max_use_count ?? ''} onChange={e => setEditItem({ ...editItem, max_use_count: Number(e.target.value) })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
