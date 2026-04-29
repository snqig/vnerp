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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Item { id: number; label_no: string; work_order_no: string; material_code: string; material_name: string; quantity: number; unit: string; batch_no: string; qc_result: string; status: number; }
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { 1: { label: '待打印', variant: 'outline' }, 2: { label: '已打印', variant: 'default' }, 3: { label: '已贴标', variant: 'secondary' } };

export default function ProductLabelPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', labelNo: searchNo }); const res = await fetch('/api/production/product-label?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => { try { const res = await fetch('/api/production/product-label', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleStatusChange = async (id: number, status: number) => { try { const res = await fetch('/api/production/product-label', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const result = await res.json(); if (result.success) { toast({ title: '更新成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/production/product-label?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">成品标签</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增标签</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">标签编号</TableHead><TableHead className="text-xs">工单号</TableHead><TableHead className="text-xs">物料编码</TableHead><TableHead className="text-xs">物料名称</TableHead><TableHead className="text-xs">数量</TableHead><TableHead className="text-xs">批次号</TableHead><TableHead className="text-xs">质检结果</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => { const st = statusMap[item.status] || statusMap[1]; return (<TableRow key={item.id}><TableCell className="text-xs font-mono">{item.label_no}</TableCell><TableCell className="text-xs">{item.work_order_no || '-'}</TableCell><TableCell className="text-xs">{item.material_code || '-'}</TableCell><TableCell className="text-xs">{item.material_name || '-'}</TableCell><TableCell className="text-xs">{item.quantity}{item.unit}</TableCell><TableCell className="text-xs">{item.batch_no || '-'}</TableCell><TableCell className="text-xs">{item.qc_result || '-'}</TableCell><TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell><TableCell><div className="flex gap-1">{item.status === 1 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 2)}>打印</Button>}{item.status === 2 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 3)}>已贴标</Button>}<Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>); })}{list.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>新增成品标签</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>工单号</Label><Input value={editItem.work_order_no || ''} onChange={e => setEditItem({ ...editItem, work_order_no: e.target.value })} /></div><div><Label>物料编码</Label><Input value={editItem.material_code || ''} onChange={e => setEditItem({ ...editItem, material_code: e.target.value })} /></div><div><Label>物料名称</Label><Input value={editItem.material_name || ''} onChange={e => setEditItem({ ...editItem, material_name: e.target.value })} /></div><div><Label>数量</Label><Input type="number" value={editItem.quantity || ''} onChange={e => setEditItem({ ...editItem, quantity: Number(e.target.value) })} /></div><div><Label>单位</Label><Input value={editItem.unit || '张'} onChange={e => setEditItem({ ...editItem, unit: e.target.value })} /></div><div><Label>批次号</Label><Input value={editItem.batch_no || ''} onChange={e => setEditItem({ ...editItem, batch_no: e.target.value })} /></div><div><Label>质检结果</Label><Input value={editItem.qc_result || ''} onChange={e => setEditItem({ ...editItem, qc_result: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
