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
import { Plus, Search, Trash2, CheckCircle, XCircle, PackageCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OutsourceReceive {
  id: number; receive_no: string; outsource_order_id: number; outsource_order_no: string;
  warehouse_id: number; warehouse_name: string; receive_date: string; receive_qty: number;
  qualified_qty: number; defective_qty: number; qc_status: number; status: number;
  operator_name: string; remark: string;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待审核', variant: 'outline' }, 2: { label: '已审核', variant: 'default' },
  3: { label: '已入库', variant: 'secondary' }, 9: { label: '已取消', variant: 'destructive' },
};

const qcStatusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待检', variant: 'outline' }, 2: { label: '合格', variant: 'secondary' },
  3: { label: '不合格', variant: 'destructive' },
};

export default function OutsourceReceivePage() {
  const { toast } = useToast();
  const [list, setList] = useState<OutsourceReceive[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<any>({});
  const [outsourceOrders, setOutsourceOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; warehouse_name: string }[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', receiveNo: searchNo });
      const res = await fetch('/api/outsource/receive?' + params);
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

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchOutsourceOrders(); fetchWarehouses(); }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/outsource/receive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); setForm({}); fetchData(); }
      else { toast({ title: '操作失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handlePost = async (id: number) => {
    if (!confirm('确认过账入库？过账后将增加库存并更新委外订单。')) return;
    try {
      const res = await fetch('/api/outsource/receive', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'post' }) });
      const result = await res.json();
      if (result.success) { toast({ title: '入库过账成功' }); fetchData(); }
      else { toast({ title: '过账失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleQc = async (id: number, action: string) => {
    try {
      const res = await fetch('/api/outsource/receive', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const result = await res.json();
      if (result.success) { toast({ title: action === 'qc_pass' ? '质检合格' : '质检不合格' }); fetchData(); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await fetch('/api/outsource/receive?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast({ title: '删除成功' }); fetchData(); }
    } catch (e) { toast({ title: '删除失败', variant: 'destructive' }); }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">委外收货</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" />
              <Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" onClick={() => { setForm({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增收货</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">收货单号</TableHead>
                  <TableHead className="text-xs">委外订单号</TableHead>
                  <TableHead className="text-xs">入库仓库</TableHead>
                  <TableHead className="text-xs">收货日期</TableHead>
                  <TableHead className="text-xs text-right">收货数量</TableHead>
                  <TableHead className="text-xs text-right">合格数量</TableHead>
                  <TableHead className="text-xs text-right">不良数量</TableHead>
                  <TableHead className="text-xs">质检状态</TableHead>
                  <TableHead className="text-xs">状态</TableHead>
                  <TableHead className="text-xs">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(item => {
                  const st = statusMap[item.status] || statusMap[1];
                  const qc = qcStatusMap[item.qc_status] || qcStatusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono">{item.receive_no}</TableCell>
                      <TableCell className="text-xs font-mono">{item.outsource_order_no || '-'}</TableCell>
                      <TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.receive_date || '-'}</TableCell>
                      <TableCell className="text-xs text-right">{item.receive_qty || 0}</TableCell>
                      <TableCell className="text-xs text-right text-green-600">{item.qualified_qty || 0}</TableCell>
                      <TableCell className="text-xs text-right text-red-500">{item.defective_qty || 0}</TableCell>
                      <TableCell><Badge variant={qc.variant} className="text-xs">{qc.label}</Badge></TableCell>
                      <TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.qc_status === 1 && (
                            <>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={() => handleQc(item.id, 'qc_pass')} title="质检合格"><CheckCircle className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleQc(item.id, 'qc_fail')} title="质检不合格"><XCircle className="h-3 w-3" /></Button>
                            </>
                          )}
                          {item.status < 3 && item.qc_status !== 3 && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-blue-600" onClick={() => handlePost(item.id)}>
                              <PackageCheck className="h-3 w-3 mr-1" />入库
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
                {list.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">暂无收货记录</TableCell></TableRow>}
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
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader><DialogTitle>新增委外收货</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>委外订单 <span className="text-red-500">*</span></Label>
                <Select value={String(form.outsource_order_id || '')} onValueChange={v => {
                  const o = outsourceOrders.find(x => x.id === Number(v));
                  setForm({ ...form, outsource_order_id: Number(v), outsource_order_no: o?.order_no });
                }}>
                  <SelectTrigger><SelectValue placeholder="选择委外订单" /></SelectTrigger>
                  <SelectContent>{outsourceOrders.filter(o => o.status >= 2 && o.status < 9).map(o => <SelectItem key={o.id} value={String(o.id)}>{o.order_no} - {o.product_name || ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>入库仓库 <span className="text-red-500">*</span></Label>
                <Select value={String(form.warehouse_id || '')} onValueChange={v => setForm({ ...form, warehouse_id: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>收货日期</Label><Input type="date" value={form.receive_date || ''} onChange={e => setForm({ ...form, receive_date: e.target.value })} /></div>
              <div><Label>收货数量 <span className="text-red-500">*</span></Label><Input type="number" value={form.receive_qty || ''} onChange={e => setForm({ ...form, receive_qty: Number(e.target.value) })} /></div>
              <div><Label>合格数量</Label><Input type="number" value={form.qualified_qty || ''} onChange={e => setForm({ ...form, qualified_qty: Number(e.target.value) })} /></div>
              <div><Label>不良数量</Label><Input type="number" value={form.defective_qty || ''} onChange={e => setForm({ ...form, defective_qty: Number(e.target.value) })} /></div>
              <div><Label>操作人</Label><Input value={form.operator_name || ''} onChange={e => setForm({ ...form, operator_name: e.target.value })} /></div>
              <div><Label>备注</Label><Input value={form.remark || ''} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
