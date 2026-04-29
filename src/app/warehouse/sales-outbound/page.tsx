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

interface Item { id: number; outbound_no: string; order_no: string; customer_name: string; warehouse_id?: number; warehouse_name: string; outbound_date: string; delivery_person: string; status: number; remark?: string; }
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { 1: { label: '待出库', variant: 'outline' }, 2: { label: '已出库', variant: 'default' }, 3: { label: '已取消', variant: 'destructive' } };

export default function SalesOutboundPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; code: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: number; customer_name: string; customer_code: string }[]>([]);

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', outboundNo: searchNo }); const res = await fetch('/api/warehouse/sales-outbound?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  const fetchWarehouses = async () => { try { const res = await fetch('/api/warehouse?status=1'); const result = await res.json(); if (result.success) setWarehouses(result.data || []); } catch (e) { console.error(e); } };
  const fetchCustomers = async () => { try { const res = await fetch('/api/customers?pageSize=999'); const result = await res.json(); if (result.success) setCustomers(result.data?.list || result.data || []); } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchWarehouses(); fetchCustomers(); }, []);

  const handleSave = async () => { try { const res = await fetch('/api/warehouse/sales-outbound', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleStatusChange = async (id: number, status: number) => { try { const res = await fetch('/api/warehouse/sales-outbound', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const result = await res.json(); if (result.success) { toast({ title: '更新成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/warehouse/sales-outbound?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">销售出库</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增出库</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead className="text-xs">出库单号</TableHead><TableHead className="text-xs">销售订单</TableHead><TableHead className="text-xs">客户</TableHead><TableHead className="text-xs">仓库</TableHead><TableHead className="text-xs">出库日期</TableHead><TableHead className="text-xs">发货人</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => { const st = statusMap[item.status] || statusMap[1]; return (<TableRow key={item.id}><TableCell className="text-xs font-mono">{item.outbound_no}</TableCell><TableCell className="text-xs">{item.order_no || '-'}</TableCell><TableCell className="text-xs">{item.customer_name || '-'}</TableCell><TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell><TableCell className="text-xs">{item.outbound_date || '-'}</TableCell><TableCell className="text-xs">{item.delivery_person || '-'}</TableCell><TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell><TableCell><div className="flex gap-1">{item.status === 1 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 2)}>确认出库</Button>}<Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>); })}{list.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">暂无记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>新增销售出库单</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>仓库</Label><Select value={String(editItem.warehouse_id || '')} onValueChange={v => { const wh = warehouses.find(w => w.id === Number(v)); setEditItem({ ...editItem, warehouse_id: Number(v), warehouse_name: wh?.name || '' }); }}><SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent></Select></div><div><Label>出库日期</Label><Input type="date" value={editItem.outbound_date || ''} onChange={e => setEditItem({ ...editItem, outbound_date: e.target.value })} /></div><div><Label>销售订单号</Label><Input value={editItem.order_no || ''} onChange={e => setEditItem({ ...editItem, order_no: e.target.value })} /></div><div><Label>客户名称</Label><Select value={editItem.customer_name || ''} onValueChange={v => setEditItem({ ...editItem, customer_name: v })}><SelectTrigger><SelectValue placeholder="选择客户" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.customer_name}>{c.customer_name}</SelectItem>)}</SelectContent></Select></div><div><Label>发货人</Label><Input value={editItem.delivery_person || ''} onChange={e => setEditItem({ ...editItem, delivery_person: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
