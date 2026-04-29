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
import { Plus, Search, Trash2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { TableExportToolbar, printTable, exportTableToPDF, exportTableToXLS, exportTableToWORD } from '@/components/ui/table-export-toolbar';

interface OutsourceIssue {
  id: number; issue_no: string; outsource_order_id: number; outsource_order_no: string;
  warehouse_id: number; warehouse_name: string; issue_date: string; status: number;
  operator_name: string; remark: string; items: OutsourceIssueItem[];
}

interface OutsourceIssueItem {
  id: number; issue_id: number; material_id: number; material_code: string;
  material_name: string; quantity: number; unit: string; batch_no: string;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待审核', variant: 'outline' }, 2: { label: '已审核', variant: 'default' },
  3: { label: '已发料', variant: 'secondary' }, 9: { label: '已取消', variant: 'destructive' },
};

export default function OutsourceIssuePage() {
  const { toast } = useToast();
  const [list, setList] = useState<OutsourceIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<any>({ items: [] });
  const [outsourceOrders, setOutsourceOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; warehouse_name: string }[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const exportColumns = [
    { key: '发料单号', header: '发料单号' }, { key: '委外订单号', header: '委外订单号' },
    { key: '仓库', header: '仓库' }, { key: '发料日期', header: '发料日期' },
    { key: '物料明细', header: '物料明细' }, { key: '操作人', header: '操作人' },
    { key: '状态', header: '状态' },
  ];
  const getExportData = () => list.map(item => ({
    发料单号: item.issue_no, 委外订单号: item.outsource_order_no || '-',
    仓库: item.warehouse_name || '-', 发料日期: item.issue_date || '-',
    物料明细: (item.items || []).map((i: any) => `${i.material_name || '-'}×${i.quantity}`).join(', ') || '-',
    操作人: item.operator_name || '-', 状态: statusMap[item.status]?.label || '-',
  }));

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', issueNo: searchNo });
      const res = await fetch('/api/outsource/issue?' + params);
      const result = await res.json();
      if (result.success) { setList(result.data.list || []); setTotal(result.data.total || 0); }
    } catch (e) { console.error(e); }
  };

  const fetchOutsourceOrders = async () => {
    try {
      const res = await fetch('/api/outsource/order?pageSize=100');
      const result = await res.json();
      if (result.success) setOutsourceOrders(result.data?.list || []);
    } catch (e) { console.error(e); }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouse/categories');
      const result = await res.json();
      if (result.success) setWarehouses(result.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/materials?pageSize=200');
      const result = await res.json();
      if (result.success) setMaterials(result.data?.list || result.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchOutsourceOrders(); fetchWarehouses(); fetchMaterials(); }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/outsource/issue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); setForm({ items: [] }); fetchData(); }
      else { toast({ title: '操作失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handlePost = async (id: number) => {
    if (!confirm('确认过账发料？过账后将扣减库存。')) return;
    try {
      const res = await fetch('/api/outsource/issue', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'post' }) });
      const result = await res.json();
      if (result.success) { toast({ title: '发料过账成功，库存已扣减' }); fetchData(); }
      else { toast({ title: '过账失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await fetch('/api/outsource/issue?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast({ title: '删除成功' }); fetchData(); }
    } catch (e) { toast({ title: '删除失败', variant: 'destructive' }); }
  };

  const addItem = () => {
    setForm({ ...form, items: [...(form.items || []), { material_id: '', quantity: 0, unit: '', batch_no: '' }] });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...(form.items || [])];
    items[index] = { ...items[index], [field]: value };
    if (field === 'material_id') {
      const mat = materials.find((m: any) => m.id === Number(value));
      if (mat) { items[index].material_code = mat.material_code; items[index].material_name = mat.material_name; items[index].unit = mat.unit; }
    }
    setForm({ ...form, items });
  };

  const removeItem = (index: number) => {
    const items = [...(form.items || [])];
    items.splice(index, 1);
    setForm({ ...form, items });
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">委外发料</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" />
              <Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button>
            </div>
            <TableExportToolbar
              selectedCount={selectedIds.size}
              totalCount={list.length}
              onSelectAll={() => setSelectedIds(new Set(list.map(i => i.id)))}
              onDeselectAll={() => setSelectedIds(new Set())}
              onPrint={() => printTable(getExportData(), exportColumns, '委外发料')}
              onExportPDF={() => exportTableToPDF(getExportData(), '委外发料', exportColumns, '委外发料')}
              onExportXLS={() => exportTableToXLS(getExportData(), '委外发料', exportColumns)}
              onExportWORD={() => exportTableToWORD(getExportData(), '委外发料', exportColumns, '委外发料')}
            />
            <Button size="sm" onClick={() => { setForm({ items: [] }); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增发料</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === list.length}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds(new Set(list.map(i => i.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-xs">发料单号</TableHead>
                  <TableHead className="text-xs">委外订单号</TableHead>
                  <TableHead className="text-xs">仓库</TableHead>
                  <TableHead className="text-xs">发料日期</TableHead>
                  <TableHead className="text-xs">物料明细</TableHead>
                  <TableHead className="text-xs">操作人</TableHead>
                  <TableHead className="text-xs">状态</TableHead>
                  <TableHead className="text-xs">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(item => {
                  const st = statusMap[item.status] || statusMap[1];
                  const itemSummary = (item.items || []).map((i: any) => `${i.material_name || '-'}×${i.quantity}`).join(', ');
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedIds);
                            if (checked) next.add(item.id); else next.delete(item.id);
                            setSelectedIds(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.issue_no}</TableCell>
                      <TableCell className="text-xs font-mono">{item.outsource_order_no || '-'}</TableCell>
                      <TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.issue_date || '-'}</TableCell>
                      <TableCell className="text-xs max-w-48 truncate" title={itemSummary}>{itemSummary || '-'}</TableCell>
                      <TableCell className="text-xs">{item.operator_name || '-'}</TableCell>
                      <TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status < 3 && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-blue-600" onClick={() => handlePost(item.id)}>
                              <Send className="h-3 w-3 mr-1" />过账
                            </Button>
                          )}
                          {item.status === 1 && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">暂无发料记录</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader><DialogTitle>新增委外发料</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>委外订单 <span className="text-red-500">*</span></Label>
                  <Select value={String(form.outsource_order_id || '')} onValueChange={v => {
                    const o = outsourceOrders.find(x => x.id === Number(v));
                    setForm({ ...form, outsource_order_id: Number(v), outsource_order_no: o?.order_no });
                  }}>
                    <SelectTrigger><SelectValue placeholder="选择委外订单" /></SelectTrigger>
                    <SelectContent>{outsourceOrders.filter(o => o.status < 9).map(o => <SelectItem key={o.id} value={String(o.id)}>{o.order_no} - {o.product_name || ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>发料仓库 <span className="text-red-500">*</span></Label>
                  <Select value={String(form.warehouse_id || '')} onValueChange={v => setForm({ ...form, warehouse_id: Number(v) })}>
                    <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>发料日期</Label><Input type="date" value={form.issue_date || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>发料明细</Label>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />添加物料</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">物料</TableHead>
                      <TableHead className="text-xs">数量</TableHead>
                      <TableHead className="text-xs">单位</TableHead>
                      <TableHead className="text-xs">批次号</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(form.items || []).map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select value={String(item.material_id || '')} onValueChange={v => updateItem(idx, 'material_id', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择物料" /></SelectTrigger>
                            <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.material_name || m.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" className="h-8 text-xs w-20" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} /></TableCell>
                        <TableCell><Input className="h-8 text-xs w-16" value={item.unit || ''} onChange={e => updateItem(idx, 'unit', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-xs w-24" value={item.batch_no || ''} onChange={e => updateItem(idx, 'batch_no', e.target.value)} /></TableCell>
                        <TableCell><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {(form.items || []).length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-4 text-xs">点击"添加物料"添加发料明细</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>操作人</Label><Input value={form.operator_name || ''} onChange={e => setForm({ ...form, operator_name: e.target.value })} /></div>
                <div><Label>备注</Label><Input value={form.remark || ''} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
