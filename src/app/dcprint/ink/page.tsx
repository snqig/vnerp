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

interface Item { id: number; ink_code: string; ink_name: string; ink_type: number; color_name: string; color_code: string; brand: string; unit: string; stock_qty: number; safety_stock: number; status: number; }
const typeMap: Record<number, string> = { 1: '水性油墨', 2: '溶剂油墨', 3: 'UV油墨', 4: '丝印油墨', 5: '特种油墨' };
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { 1: { label: '启用', variant: 'default' }, 0: { label: '禁用', variant: 'destructive' } };

export default function InkManagementPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', inkCode: searchCode, inkName: searchName }); const res = await fetch('/api/prepress/ink?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => { try { const method = editItem.id ? 'PUT' : 'POST'; const res = await fetch('/api/prepress/ink', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: editItem.id ? '更新成功' : '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/prepress/ink?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">油墨管理</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="编码" value={searchCode} onChange={e => setSearchCode(e.target.value)} className="w-28 h-8 text-sm" /><Input placeholder="名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-28 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增油墨</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">油墨编码</TableHead><TableHead className="text-xs">油墨名称</TableHead><TableHead className="text-xs">类型</TableHead><TableHead className="text-xs">颜色</TableHead><TableHead className="text-xs">色号</TableHead><TableHead className="text-xs">品牌</TableHead><TableHead className="text-xs">单位</TableHead><TableHead className="text-xs">库存</TableHead><TableHead className="text-xs">安全库存</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => { const st = statusMap[item.status] ?? statusMap[1]; return (<TableRow key={item.id}><TableCell className="text-xs font-mono">{item.ink_code}</TableCell><TableCell className="text-xs">{item.ink_name}</TableCell><TableCell className="text-xs">{typeMap[item.ink_type] || '-'}</TableCell><TableCell className="text-xs">{item.color_name || '-'}</TableCell><TableCell className="text-xs">{item.color_code || '-'}</TableCell><TableCell className="text-xs">{item.brand || '-'}</TableCell><TableCell className="text-xs">{item.unit}</TableCell><TableCell className="text-xs">{item.stock_qty ?? 0}{item.stock_qty < item.safety_stock && <span className="text-red-500 ml-1">⚠</span>}</TableCell><TableCell className="text-xs">{item.safety_stock}</TableCell><TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>); })}{list.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>{editItem.id ? '编辑油墨' : '新增油墨'}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>油墨编码</Label><Input value={editItem.ink_code || ''} onChange={e => setEditItem({ ...editItem, ink_code: e.target.value })} /></div><div><Label>油墨名称</Label><Input value={editItem.ink_name || ''} onChange={e => setEditItem({ ...editItem, ink_name: e.target.value })} /></div><div><Label>类型</Label><Select value={String(editItem.ink_type || 4)} onValueChange={v => setEditItem({ ...editItem, ink_type: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">水性油墨</SelectItem><SelectItem value="2">溶剂油墨</SelectItem><SelectItem value="3">UV油墨</SelectItem><SelectItem value="4">丝印油墨</SelectItem><SelectItem value="5">特种油墨</SelectItem></SelectContent></Select></div><div><Label>颜色名称</Label><Input value={editItem.color_name || ''} onChange={e => setEditItem({ ...editItem, color_name: e.target.value })} /></div><div><Label>色号</Label><Input value={editItem.color_code || ''} onChange={e => setEditItem({ ...editItem, color_code: e.target.value })} /></div><div><Label>品牌</Label><Input value={editItem.brand || ''} onChange={e => setEditItem({ ...editItem, brand: e.target.value })} /></div><div><Label>单位</Label><Input value={editItem.unit || 'kg'} onChange={e => setEditItem({ ...editItem, unit: e.target.value })} /></div><div><Label>安全库存</Label><Input type="number" value={editItem.safety_stock ?? ''} onChange={e => setEditItem({ ...editItem, safety_stock: Number(e.target.value) })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
