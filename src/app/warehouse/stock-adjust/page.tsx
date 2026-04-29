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
import { Checkbox } from '@/components/ui/checkbox';
import { TableExportToolbar, printTable, exportTableToPDF, exportTableToXLS, exportTableToWORD } from '@/components/ui/table-export-toolbar';

interface Item { id: number; adjust_no: string; warehouse_id?: number; warehouse_name: string; adjust_date: string; adjust_type: number; status: number; operator_name: string; remark: string; }
const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { 1: { label: '待审核', variant: 'outline' }, 2: { label: '已审核', variant: 'default' }, 3: { label: '已完成', variant: 'secondary' }, 4: { label: '已取消', variant: 'destructive' } };
const typeMap: Record<number, string> = { 1: '盘盈', 2: '盘亏', 3: '其他调整' };

export default function StockAdjustPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>({});
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; code: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const exportColumns = [
    { key: '调整单号', header: '调整单号' }, { key: '仓库', header: '仓库' },
    { key: '调整日期', header: '调整日期' }, { key: '调整类型', header: '调整类型' },
    { key: '操作人', header: '操作人' }, { key: '状态', header: '状态' },
  ];
  const getExportData = () => list.map(item => ({
    调整单号: item.adjust_no, 仓库: item.warehouse_name || '-',
    调整日期: item.adjust_date || '-', 调整类型: typeMap[item.adjust_type] || '-',
    操作人: item.operator_name || '-', 状态: statusMap[item.status]?.label || '-',
  }));

  const fetchData = async () => { try { const params = new URLSearchParams({ page: String(page), pageSize: '20', adjustNo: searchNo }); const res = await fetch('/api/warehouse/stock-adjust?' + params); const result = await res.json(); if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); } } catch (e) { console.error(e); } };
  const fetchWarehouses = async () => { try { const res = await fetch('/api/warehouse?status=1'); const result = await res.json(); if (result.success) setWarehouses(result.data || []); } catch (e) { console.error(e); } };
  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchWarehouses(); }, []);

  const handleSave = async () => { try { const res = await fetch('/api/warehouse/stock-adjust', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) }); const result = await res.json(); if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); fetchData(); } else { toast({ title: '失败', description: result.message, variant: 'destructive' }); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleStatusChange = async (id: number, status: number) => { try { const res = await fetch('/api/warehouse/stock-adjust', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const result = await res.json(); if (result.success) { toast({ title: '更新成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };
  const handleDelete = async (id: number) => { if (!confirm('确定删除？')) return; try { const res = await fetch('/api/warehouse/stock-adjust?id=' + id, { method: 'DELETE' }); const result = await res.json(); if (result.success) { toast({ title: '删除成功' }); fetchData(); } } catch (e) { toast({ title: '失败', variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">库存调整</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2"><Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" /><Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button></div>
            <TableExportToolbar
              selectedCount={selectedIds.size}
              totalCount={list.length}
              onSelectAll={() => setSelectedIds(new Set(list.map(i => i.id)))}
              onDeselectAll={() => setSelectedIds(new Set())}
              onPrint={() => printTable(getExportData(), exportColumns, '库存调整')}
              onExportPDF={() => exportTableToPDF(getExportData(), '库存调整', exportColumns, '库存调整')}
              onExportXLS={() => exportTableToXLS(getExportData(), '库存调整', exportColumns)}
              onExportWORD={() => exportTableToWORD(getExportData(), '库存调整', exportColumns, '库存调整')}
            />
            <Button size="sm" onClick={() => { setEditItem({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增调整</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={selectedIds.size > 0 && selectedIds.size === list.length}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedIds(new Set(list.map(i => i.id)));
                  else setSelectedIds(new Set());
                }}
              />
            </TableHead>
            <TableHead className="text-xs">调整单号</TableHead><TableHead className="text-xs">仓库</TableHead><TableHead className="text-xs">调整日期</TableHead><TableHead className="text-xs">调整类型</TableHead><TableHead className="text-xs">操作人</TableHead><TableHead className="text-xs">状态</TableHead><TableHead className="text-xs">操作</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(item => { const st = statusMap[item.status] || statusMap[1]; return (<TableRow key={item.id}><TableCell>
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={(checked) => {
                  const next = new Set(selectedIds);
                  if (checked) next.add(item.id); else next.delete(item.id);
                  setSelectedIds(next);
                }}
              />
            </TableCell><TableCell className="text-xs font-mono">{item.adjust_no}</TableCell><TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell><TableCell className="text-xs">{item.adjust_date || '-'}</TableCell><TableCell className="text-xs">{typeMap[item.adjust_type] || '-'}</TableCell><TableCell className="text-xs">{item.operator_name || '-'}</TableCell><TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell><TableCell><div className="flex gap-1">{item.status === 1 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 2)}>审核</Button>}{item.status === 2 && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => handleStatusChange(item.id, 3)}>完成</Button>}<Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditItem(item); setShowDialog(true); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>); })}{list.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">暂无调整记录</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
        <div className="flex items-center justify-between"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button></div></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg" resizable><DialogHeader><DialogTitle>新增调整单</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div><Label>仓库</Label><Select value={String(editItem.warehouse_id || '')} onValueChange={v => { const wh = warehouses.find(w => w.id === Number(v)); setEditItem({ ...editItem, warehouse_id: Number(v), warehouse_name: wh?.name || '' }); }}><SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent></Select></div><div><Label>调整日期</Label><Input type="date" value={editItem.adjust_date || ''} onChange={e => setEditItem({ ...editItem, adjust_date: e.target.value })} /></div><div><Label>调整类型</Label><Select value={String(editItem.adjust_type || 1)} onValueChange={v => setEditItem({ ...editItem, adjust_type: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">盘盈</SelectItem><SelectItem value="2">盘亏</SelectItem><SelectItem value="3">其他调整</SelectItem></SelectContent></Select></div><div><Label>操作人</Label><Input value={editItem.operator_name || ''} onChange={e => setEditItem({ ...editItem, operator_name: e.target.value })} /></div><div className="col-span-2"><Label>备注</Label><Input value={editItem.remark || ''} onChange={e => setEditItem({ ...editItem, remark: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </MainLayout>
  );
}
