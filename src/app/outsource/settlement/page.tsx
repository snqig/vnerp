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
import { Plus, Search, Trash2, CheckCircle, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OutsourceSettlement {
  id: number; settlement_no: string; outsource_order_id: number; outsource_order_no: string;
  supplier_id: number; supplier_name: string; settlement_date: string; settlement_qty: number;
  unit_price: number; settlement_amount: number; deduct_amount: number; actual_amount: number;
  payment_status: number; payment_date: string; status: number; remark: string;
}

const statusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '待审核', variant: 'outline' }, 2: { label: '已审核', variant: 'default' },
  3: { label: '已完成', variant: 'secondary' }, 9: { label: '已取消', variant: 'destructive' },
};

const paymentStatusMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '未付款', variant: 'destructive' }, 2: { label: '部分付款', variant: 'outline' },
  3: { label: '已付款', variant: 'secondary' },
};

export default function OutsourceSettlementPage() {
  const { toast } = useToast();
  const [list, setList] = useState<OutsourceSettlement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<any>({});
  const [outsourceOrders, setOutsourceOrders] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', settlementNo: searchNo });
      const res = await fetch('/api/outsource/settlement?' + params);
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

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchOutsourceOrders(); }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/outsource/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (result.success) { toast({ title: '创建成功' }); setShowDialog(false); setForm({}); fetchData(); }
      else { toast({ title: '操作失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleConfirm = async (id: number) => {
    if (!confirm('确认结算？确认后将更新委外订单结算金额。')) return;
    try {
      const res = await fetch('/api/outsource/settlement', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'confirm' }) });
      const result = await res.json();
      if (result.success) { toast({ title: '结算确认成功' }); fetchData(); }
      else { toast({ title: '确认失败', description: result.message, variant: 'destructive' }); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handlePayment = async (id: number) => {
    if (!confirm('确认已付款？')) return;
    try {
      const res = await fetch('/api/outsource/settlement', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'payment' }) });
      const result = await res.json();
      if (result.success) { toast({ title: '付款确认成功' }); fetchData(); }
    } catch (e) { toast({ title: '操作失败', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await fetch('/api/outsource/settlement?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast({ title: '删除成功' }); fetchData(); }
    } catch (e) { toast({ title: '删除失败', variant: 'destructive' }); }
  };

  const formatAmount = (amount: number) => {
    return ((amount || 0) / 100).toFixed(2);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">委外结算</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="搜索单号" value={searchNo} onChange={e => setSearchNo(e.target.value)} className="w-36 h-8 text-sm" />
              <Button size="sm" variant="outline" onClick={fetchData}><Search className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" onClick={() => { setForm({}); setShowDialog(true); }}><Plus className="h-3 w-3 mr-1" />新增结算</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">结算单号</TableHead>
                  <TableHead className="text-xs">委外订单号</TableHead>
                  <TableHead className="text-xs">供应商</TableHead>
                  <TableHead className="text-xs">结算日期</TableHead>
                  <TableHead className="text-xs text-right">结算数量</TableHead>
                  <TableHead className="text-xs text-right">结算金额</TableHead>
                  <TableHead className="text-xs text-right">扣款金额</TableHead>
                  <TableHead className="text-xs text-right">实付金额</TableHead>
                  <TableHead className="text-xs">付款状态</TableHead>
                  <TableHead className="text-xs">状态</TableHead>
                  <TableHead className="text-xs">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(item => {
                  const st = statusMap[item.status] || statusMap[1];
                  const ps = paymentStatusMap[item.payment_status] || paymentStatusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono">{item.settlement_no}</TableCell>
                      <TableCell className="text-xs font-mono">{item.outsource_order_no || '-'}</TableCell>
                      <TableCell className="text-xs">{item.supplier_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.settlement_date || '-'}</TableCell>
                      <TableCell className="text-xs text-right">{item.settlement_qty || 0}</TableCell>
                      <TableCell className="text-xs text-right">{formatAmount(item.settlement_amount)}</TableCell>
                      <TableCell className="text-xs text-right text-red-500">{formatAmount(item.deduct_amount)}</TableCell>
                      <TableCell className="text-xs text-right font-medium text-green-600">{formatAmount(item.actual_amount)}</TableCell>
                      <TableCell><Badge variant={ps.variant} className="text-xs">{ps.label}</Badge></TableCell>
                      <TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status < 3 && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-blue-600" onClick={() => handleConfirm(item.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" />确认
                            </Button>
                          )}
                          {item.status === 3 && item.payment_status < 3 && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-green-600" onClick={() => handlePayment(item.id)}>
                              <DollarSign className="h-3 w-3 mr-1" />付款
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
                {list.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-gray-400 py-8">暂无结算记录</TableCell></TableRow>}
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
            <DialogHeader><DialogTitle>新增委外结算</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>委外订单 <span className="text-red-500">*</span></Label>
                <Select value={String(form.outsource_order_id || '')} onValueChange={v => {
                  const o = outsourceOrders.find(x => x.id === Number(v));
                  setForm({ ...form, outsource_order_id: Number(v), outsource_order_no: o?.order_no, supplier_id: o?.supplier_id, supplier_name: o?.supplier_name, unit_price: o?.unit_price, settlement_qty: o?.qualified_qty });
                }}>
                  <SelectTrigger><SelectValue placeholder="选择委外订单" /></SelectTrigger>
                  <SelectContent>{outsourceOrders.filter(o => o.status >= 3 && o.status < 9).map(o => <SelectItem key={o.id} value={String(o.id)}>{o.order_no} - {o.supplier_name || ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>结算日期</Label><Input type="date" value={form.settlement_date || ''} onChange={e => setForm({ ...form, settlement_date: e.target.value })} /></div>
              <div><Label>结算数量</Label><Input type="number" value={form.settlement_qty || ''} onChange={e => setForm({ ...form, settlement_qty: Number(e.target.value) })} /></div>
              <div><Label>单价(元)</Label><Input type="number" step="0.01" value={form.unit_price ? (form.unit_price / 100) : ''} onChange={e => setForm({ ...form, unit_price: Math.round(Number(e.target.value) * 100) })} /></div>
              <div><Label>扣款金额(元)</Label><Input type="number" step="0.01" value={form.deduct_amount ? (form.deduct_amount / 100) : ''} onChange={e => setForm({ ...form, deduct_amount: Math.round(Number(e.target.value) * 100) })} /></div>
              <div className="col-span-2"><Label>备注</Label><Input value={form.remark || ''} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
