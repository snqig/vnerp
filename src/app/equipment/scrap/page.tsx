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

interface Item { id: number; scrap_no: string; equipment_code: string; equipment_name: string; scrap_date: string; scrap_reason: string; original_value: number; net_value: number; approval_person: string; status: number; }
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { 1: { label: '待审批', variant: 'outline' }, 2: { label: '已审批', variant: 'default' }, 3: { label: '已报废', variant: 'destructive' } };

export default function EquipmentScrapPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', scrapNo: searchNo }); const res = await fetch('/api/equipment/scrap?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSave = async () => { try { const res = await fetch('/api/equipment/scrap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleStatusChange = async (id: number, status: number) => { try { const res = await fetch('/api/equipment/scrap', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const result = await res.json(); if (result.success) { toast({ title: '更新成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/equipment/scrap?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">设备报废</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增报废</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">报废单号</TableHead><TableHead className="text-xs">设备编码</TableHead><TableHead className="text-xs">设备名称</TableHead><TableHead className="text-xs">报废日期</TableHead><TableHead className="text-xs">报废原因</TableHead><TableHead className="text-xs">原值</TableHead><TableHead className="text-xs">净值</TableHead><TableHead className="text-xs">审批人</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => { const st = statusMap[item.status] || statusMap[1]; return (<TableRow key={item.id}><TableCell className="text-xs font-mono">{item.scrap_no}</TableCell><TableCell className="text-xs">{item.equipment_code || '-'}</TableCell><TableCell className="text-xs">{item.equipment_name || '-'}</TableCell><TableCell className="text-xs">{item.scrap_date || '-'}</TableCell><TableCell className="text-xs max-w-28 truncate">{item.scrap_reason || '-'}</TableCell><TableCell className="text-xs">¥{Number(item.original_value || 0).toFixed(2)}</TableCell><TableCell className="text-xs">¥{Number(item.net_value || 0).toFixed(2)}</TableCell><TableCell className="text-xs">{item.approval_person || '-'}</TableCell><TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell><TableCell><div className="flex gap-1">{item.status === 1 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 2)}>审批</Button>}{item.status === 2 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 3)}>确认报废</Button>}<Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>); })}{list.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>新增报废单</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>设备编码</Label><Input value={editItem.equipment_code || ''} onChange={e => setEditItem({ ...editItem, equipment_code: e.target.value })} /></div><div><Label>设备名称</Label><Input value={editItem.equipment_name || ''} onChange={e => setEditItem({ ...editItem, equipment_name: e.target.value })} /></div><div><Label>报废日期</Label><Input type="date" value={editItem.scrap_date || ''} onChange={e => setEditItem({ ...editItem, scrap_date: e.target.value })} /></div><div><Label>审批人</Label><Input value={editItem.approval_person || ''} onChange={e => setEditItem({ ...editItem, approval_person: e.target.value })} /></div><div><Label>原值</Label><Input type="number" value={editItem.original_value || ''} onChange={e => setEditItem({ ...editItem, original_value: Number(e.target.value) })} /></div><div><Label>净值</Label><Input type="number" value={editItem.net_value || ''} onChange={e => setEditItem({ ...editItem, net_value: Number(e.target.value) })} /></div><div className="col-span-2"><Label>报废原因</Label><Input value={editItem.scrap_reason || ''} onChange={e => setEditItem({ ...editItem, scrap_reason: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
