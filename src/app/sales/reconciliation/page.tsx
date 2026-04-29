'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, RefreshCw, Calculator, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Reconciliation {
  id: number;
  reconciliation_no: string;
  customer_id: number;
  customer_name: string;
  period_start: string;
  period_end: string;
  delivery_amount: number;
  return_amount: number;
  discount_amount: number;
  net_amount: number;
  received_amount: number;
  balance_amount: number;
  confirm_status: number;
  confirm_person: string;
  confirm_time: string;
  status: number;
  remark: string;
  create_time: string;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  2: { label: '已发送', color: 'bg-blue-100 text-blue-800' },
  3: { label: '已确认', color: 'bg-green-100 text-green-800' },
  4: { label: '已关闭', color: 'bg-gray-100 text-gray-800' },
};

const CONFIRM_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '未确认', color: 'bg-gray-100 text-gray-800' },
  1: { label: '已确认', color: 'bg-green-100 text-green-800' },
  2: { label: '有异议', color: 'bg-red-100 text-red-800' },
};

export default function ReconciliationPage() {
  const [list, setList] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<Reconciliation | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: 0,
    customer_name: '',
    period_start: '',
    period_end: '',
    remark: ''
  });
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalDelivery: 0, totalReturn: 0, totalNet: 0, totalBalance: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await fetch(`/api/sales/reconciliation?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        const data = result.data?.list || [];
        setList(data);
        setTotal(result.data?.total || 0);
        setSummary({
          totalDelivery: data.reduce((s: number, r: any) => s + parseFloat(String(r.delivery_amount || 0)), 0),
          totalReturn: data.reduce((s: number, r: any) => s + parseFloat(String(r.return_amount || 0)), 0),
          totalNet: data.reduce((s: number, r: any) => s + parseFloat(String(r.net_amount || 0)), 0),
          totalBalance: data.reduce((s: number, r: any) => s + parseFloat(String(r.balance_amount || 0)), 0),
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('获取对账单列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers');
      const result = await res.json();
      if (result.success) {
        setCustomers(result.data?.list || result.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { fetchData(); fetchCustomers(); }, [fetchData, fetchCustomers]);

  const createReconciliation = async () => {
    if (!form.customer_id) {
      toast.error('请选择客户');
      return;
    }
    if (!form.period_start || !form.period_end) {
      toast.error('请选择对账期间');
      return;
    }
    try {
      const res = await fetch('/api/sales/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`对账单创建成功，净额: ¥${parseFloat(result.data?.net_amount || 0).toFixed(2)}`);
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.message || '创建失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('创建对账单失败');
    }
  };

  const viewDetail = async (rc: Reconciliation) => {
    setDetailData(rc);
    try {
      const res = await fetch(`/api/sales/reconciliation?id=${rc.id}`);
      const result = await res.json();
      if (result.success) {
        setDetailItems(result.data?.details || []);
      }
    } catch (e) {
      console.error(e);
      setDetailItems([]);
    }
    setDetailOpen(true);
  };

  const exportReconciliation = (rc: Reconciliation) => {
    const csvContent = [
      ['对账单号', '客户名称', '期间', '送货金额', '退货金额', '净额', '已收', '余额'].join(','),
      [rc.reconciliation_no, rc.customer_name, `${rc.period_start} ~ ${rc.period_end}`, rc.delivery_amount, rc.return_amount, rc.net_amount, rc.received_amount, rc.balance_amount].join(',')
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `对账单_${rc.reconciliation_no}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('对账单已导出');
  };

  return (
    <MainLayout title="销售对账">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" />销售对账</CardTitle>
              <CardDescription>自动汇总期间内的送货单、退货单数据，生成对账单，支持在线确认或导出Excel对账</CardDescription>
            </div>
            <Button onClick={() => {
              setForm({ customer_id: 0, customer_name: '', period_start: '', period_end: '', remark: '' });
              setDialogOpen(true);
            }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />生成对账单
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="搜索对账单号/客户名称..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <Card><CardContent className="pt-4"><div className="text-sm text-gray-500">送货总额</div><div className="text-2xl font-bold text-blue-600">¥{summary.totalDelivery.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-sm text-gray-500">退货总额</div><div className="text-2xl font-bold text-red-600">¥{summary.totalReturn.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-sm text-gray-500">对账净额</div><div className="text-2xl font-bold text-green-600">¥{summary.totalNet.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-sm text-gray-500">未收余额</div><div className="text-2xl font-bold text-orange-600">¥{summary.totalBalance.toFixed(2)}</div></CardContent></Card>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>对账单号</TableHead>
                    <TableHead>客户名称</TableHead>
                    <TableHead>对账期间</TableHead>
                    <TableHead>送货金额</TableHead>
                    <TableHead>退货金额</TableHead>
                    <TableHead>净额</TableHead>
                    <TableHead>已收</TableHead>
                    <TableHead>余额</TableHead>
                    <TableHead>客户确认</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.reconciliation_no}</TableCell>
                      <TableCell>{r.customer_name || '-'}</TableCell>
                      <TableCell className="text-xs">{r.period_start} ~ {r.period_end}</TableCell>
                      <TableCell className="text-blue-600">¥{parseFloat(String(r.delivery_amount || 0)).toFixed(2)}</TableCell>
                      <TableCell className="text-red-600">¥{parseFloat(String(r.return_amount || 0)).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">¥{parseFloat(String(r.net_amount || 0)).toFixed(2)}</TableCell>
                      <TableCell>¥{parseFloat(String(r.received_amount || 0)).toFixed(2)}</TableCell>
                      <TableCell className="text-orange-600">¥{parseFloat(String(r.balance_amount || 0)).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={CONFIRM_STATUS_MAP[r.confirm_status]?.color || 'bg-gray-100'}>
                          {CONFIRM_STATUS_MAP[r.confirm_status]?.label || '未知'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_MAP[r.status]?.color || 'bg-gray-100'}>
                          {STATUS_MAP[r.status]?.label || '未知'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewDetail(r)}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => exportReconciliation(r)} title="导出"><Download className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-500">暂无数据</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>生成对账单</DialogTitle>
            <DialogDescription>自动汇总期间内的送货单、退货单数据，生成对账单</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>客户 <span className="text-red-500">*</span></Label>
              <Select value={String(form.customer_id || '')} onValueChange={(v) => {
                const cust = customers.find((c: any) => c.id === parseInt(v));
                setForm(prev => ({ ...prev, customer_id: parseInt(v), customer_name: cust?.customer_name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="选择客户" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.customer_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>期间开始 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.period_start} onChange={(e) => setForm(prev => ({ ...prev, period_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>期间结束 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.period_end} onChange={(e) => setForm(prev => ({ ...prev, period_end: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={form.remark} onChange={(e) => setForm(prev => ({ ...prev, remark: e.target.value }))} placeholder="备注" />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              系统将自动汇总该客户在指定期间内的所有已发货送货单和已审核退货单，计算对账净额。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={createReconciliation} className="bg-blue-600 hover:bg-blue-700">生成对账单</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl" resizable>
          <DialogHeader>
            <DialogTitle>对账单详情</DialogTitle>
            <DialogDescription>{detailData?.reconciliation_no} | {detailData?.customer_name}</DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">对账期间：</span>{detailData.period_start} ~ {detailData.period_end}</div>
                <div><span className="text-gray-500">客户确认：</span>{CONFIRM_STATUS_MAP[detailData.confirm_status]?.label}</div>
              </div>
              <div className="grid grid-cols-5 gap-3 text-center">
                <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-gray-500">送货金额</div><div className="text-lg font-bold text-blue-600">¥{parseFloat(String(detailData.delivery_amount || 0)).toFixed(2)}</div></CardContent></Card>
                <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-gray-500">退货金额</div><div className="text-lg font-bold text-red-600">¥{parseFloat(String(detailData.return_amount || 0)).toFixed(2)}</div></CardContent></Card>
                <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-gray-500">折扣</div><div className="text-lg font-bold">¥{parseFloat(String(detailData.discount_amount || 0)).toFixed(2)}</div></CardContent></Card>
                <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-gray-500">对账净额</div><div className="text-lg font-bold text-green-600">¥{parseFloat(String(detailData.net_amount || 0)).toFixed(2)}</div></CardContent></Card>
                <Card><CardContent className="pt-3 pb-3"><div className="text-xs text-gray-500">未收余额</div><div className="text-lg font-bold text-orange-600">¥{parseFloat(String(detailData.balance_amount || 0)).toFixed(2)}</div></CardContent></Card>
              </div>
              {detailItems.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">对账明细</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>类型</TableHead>
                        <TableHead>单号</TableHead>
                        <TableHead>日期</TableHead>
                        <TableHead>金额</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailItems.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell><Badge variant="outline">{item.source_type === 1 ? '送货' : '退货'}</Badge></TableCell>
                          <TableCell>{item.source_no}</TableCell>
                          <TableCell>{item.source_date}</TableCell>
                          <TableCell className={item.source_type === 1 ? 'text-blue-600' : 'text-red-600'}>¥{parseFloat(String(item.amount || 0)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
            {detailData && (
              <Button onClick={() => exportReconciliation(detailData)} variant="outline">
                <Download className="w-4 h-4 mr-2" />导出
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
