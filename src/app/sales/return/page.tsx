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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, RefreshCw, RotateCcw, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnOrder {
  id: number;
  return_no: string;
  order_id: number;
  order_no: string;
  delivery_id: number;
  delivery_no: string;
  customer_id: number;
  customer_name: string;
  return_date: string;
  return_type: number;
  return_reason: string;
  total_qty: number;
  total_amount: number;
  inspection_status: number;
  inspection_result: number;
  warehouse_id: number;
  inbound_status: number;
  status: number;
  remark: string;
  create_time: string;
}

interface ReturnItem {
  id?: number;
  material_id: number;
  material_name: string;
  material_spec: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  batch_no: string;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  2: { label: '已审核', color: 'bg-blue-100 text-blue-800' },
  3: { label: '已退货', color: 'bg-green-100 text-green-800' },
  4: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
};

const RETURN_TYPE_MAP: Record<number, string> = {
  1: '质量退货',
  2: '数量差异',
  3: '规格不符',
  4: '其他',
};

const INSPECTION_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '未质检', color: 'bg-gray-100 text-gray-800' },
  1: { label: '质检中', color: 'bg-yellow-100 text-yellow-800' },
  2: { label: '已质检', color: 'bg-green-100 text-green-800' },
};

export default function ReturnPage() {
  const [list, setList] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState<Partial<ReturnOrder> & { items: ReturnItem[] }>({
    items: [{ material_id: 0, material_name: '', material_spec: '', quantity: 0, unit: '张', unit_price: 0, amount: 0, batch_no: '' }],
    return_type: 1
  });
  const [detailData, setDetailData] = useState<ReturnOrder | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await fetch(`/api/sales/return?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch (e) {
      console.error(e);
      toast.error('获取退货单列表失败');
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

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...(prev.items || []), { material_id: 0, material_name: '', material_spec: '', quantity: 0, unit: '张', unit_price: 0, amount: 0, batch_no: '' }]
    }));
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setForm(prev => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? value : items[index].quantity;
        const price = field === 'unit_price' ? value : items[index].unit_price;
        items[index].amount = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
      }
      return { ...prev, items };
    });
  };

  const saveReturn = async () => {
    if (!form.customer_id) {
      toast.error('请选择客户');
      return;
    }
    if (!form.items || form.items.length === 0) {
      toast.error('请添加退货明细');
      return;
    }
    try {
      const res = await fetch('/api/sales/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (result.success) {
        toast.success('退货单创建成功');
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.message || '创建失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('保存退货单失败');
    }
  };

  const updateStatus = async (id: number, status: number) => {
    try {
      const res = await fetch('/api/sales/return', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('状态更新成功');
        fetchData();
      } else {
        toast.error(result.message || '更新失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('更新状态失败');
    }
  };

  const deleteReturn = async (id: number) => {
    if (!confirm('确定要删除该退货单吗？')) return;
    try {
      const res = await fetch(`/api/sales/return?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast.success('删除成功');
        fetchData();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (e) {
      console.error(e);
      toast.error('删除失败');
    }
  };

  const calcTotal = () => (form.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const calcTotalQty = () => (form.items || []).reduce((sum, item) => sum + (parseFloat(String(item.quantity)) || 0), 0);

  return (
    <MainLayout title="退货单管理">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" />退货单管理</CardTitle>
              <CardDescription>处理客户退货申请，自动关联原销售订单，支持退货质检流程</CardDescription>
            </div>
            <Button onClick={() => {
              setForm({
                items: [{ material_id: 0, material_name: '', material_spec: '', quantity: 0, unit: '张', unit_price: 0, amount: 0, batch_no: '' }],
                return_type: 1,
                return_date: new Date().toISOString().split('T')[0]
              });
              setDialogOpen(true);
            }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />新增退货单
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="搜索退货单号/客户名称/订单号..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
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
              <Card><CardContent className="pt-4"><div className="text-sm text-gray-500">总退货单</div><div className="text-2xl font-bold">{total}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-sm text-gray-500">待审核</div><div className="text-2xl font-bold text-yellow-600">{list.filter(r => r.status === 1).length}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-sm text-gray-500">已审核</div><div className="text-2xl font-bold text-blue-600">{list.filter(r => r.status === 2).length}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-sm text-gray-500">已退货</div><div className="text-2xl font-bold text-green-600">{list.filter(r => r.status === 3).length}</div></CardContent></Card>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>退货单号</TableHead>
                    <TableHead>关联订单</TableHead>
                    <TableHead>客户名称</TableHead>
                    <TableHead>退货日期</TableHead>
                    <TableHead>退货类型</TableHead>
                    <TableHead>退货数量</TableHead>
                    <TableHead>退货金额</TableHead>
                    <TableHead>质检状态</TableHead>
                    <TableHead>单据状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.return_no}</TableCell>
                      <TableCell>{r.order_no || '-'}</TableCell>
                      <TableCell>{r.customer_name || '-'}</TableCell>
                      <TableCell>{r.return_date || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{RETURN_TYPE_MAP[r.return_type] || '其他'}</Badge></TableCell>
                      <TableCell>{parseFloat(String(r.total_qty || 0)).toLocaleString()}</TableCell>
                      <TableCell>¥{parseFloat(String(r.total_amount || 0)).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={INSPECTION_STATUS_MAP[r.inspection_status]?.color || 'bg-gray-100'}>
                          {INSPECTION_STATUS_MAP[r.inspection_status]?.label || '未知'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_MAP[r.status]?.color || 'bg-gray-100'}>
                          {STATUS_MAP[r.status]?.label || '未知'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setDetailData(r); setDetailOpen(true); }}><Eye className="w-4 h-4" /></Button>
                          {r.status === 1 && (
                            <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 2)} title="审核通过">
                              <Badge className="bg-blue-100 text-blue-800 text-xs">审核</Badge>
                            </Button>
                          )}
                          {r.status === 2 && (
                            <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 3)} title="确认退货">
                              <Badge className="bg-green-100 text-green-800 text-xs">退货</Badge>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteReturn(r.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-gray-500">暂无数据</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>新增退货单</DialogTitle>
            <DialogDescription>处理客户退货申请，自动关联原销售订单</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label>退货日期</Label>
                <Input type="date" value={form.return_date || ''} onChange={(e) => setForm(prev => ({ ...prev, return_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>退货类型</Label>
                <Select value={String(form.return_type || 1)} onValueChange={(v) => setForm(prev => ({ ...prev, return_type: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RETURN_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>原销售订单号</Label><Input value={form.order_no || ''} onChange={(e) => setForm(prev => ({ ...prev, order_no: e.target.value }))} placeholder="关联原销售订单" /></div>
              <div className="space-y-2"><Label>原送货单号</Label><Input value={form.delivery_no || ''} onChange={(e) => setForm(prev => ({ ...prev, delivery_no: e.target.value }))} placeholder="关联原送货单" /></div>
            </div>
            <div className="space-y-2">
              <Label>退货原因</Label>
              <Textarea value={form.return_reason || ''} onChange={(e) => setForm(prev => ({ ...prev, return_reason: e.target.value }))} placeholder="请详细描述退货原因" rows={3} />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">退货明细</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" />添加物料</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料名称</TableHead>
                    <TableHead>规格型号</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>单价</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>批次号</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(form.items || []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Input value={item.material_name} onChange={(e) => updateItem(idx, 'material_name', e.target.value)} placeholder="物料名称" className="w-32" /></TableCell>
                      <TableCell><Input value={item.material_spec} onChange={(e) => updateItem(idx, 'material_spec', e.target.value)} placeholder="规格" className="w-28" /></TableCell>
                      <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-24" /></TableCell>
                      <TableCell><Input value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} className="w-16" /></TableCell>
                      <TableCell><Input type="number" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24" /></TableCell>
                      <TableCell className="font-medium">¥{(item.amount || 0).toFixed(2)}</TableCell>
                      <TableCell><Input value={item.batch_no} onChange={(e) => updateItem(idx, 'batch_no', e.target.value)} placeholder="批次" className="w-24" /></TableCell>
                      <TableCell>
                        {(form.items || []).length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-6 mt-3 text-sm">
                <span>总数量: <strong>{calcTotalQty().toLocaleString()}</strong></span>
                <span>总金额: <strong className="text-red-600">¥{calcTotal().toFixed(2)}</strong></span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={saveReturn} className="bg-blue-600 hover:bg-blue-700">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl" resizable>
          <DialogHeader>
            <DialogTitle>退货单详情</DialogTitle>
            <DialogDescription>{detailData?.return_no}</DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">客户名称：</span>{detailData.customer_name}</div>
                <div><span className="text-gray-500">退货日期：</span>{detailData.return_date}</div>
                <div><span className="text-gray-500">原订单号：</span>{detailData.order_no || '-'}</div>
                <div><span className="text-gray-500">原送货单号：</span>{detailData.delivery_no || '-'}</div>
                <div><span className="text-gray-500">退货类型：</span>{RETURN_TYPE_MAP[detailData.return_type] || '其他'}</div>
                <div><span className="text-gray-500">质检状态：</span>{INSPECTION_STATUS_MAP[detailData.inspection_status]?.label}</div>
              </div>
              {detailData.return_reason && (
                <div className="text-sm"><span className="text-gray-500">退货原因：</span>{detailData.return_reason}</div>
              )}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div><div className="text-gray-500 text-sm">退货数量</div><div className="text-xl font-bold">{parseFloat(String(detailData.total_qty || 0)).toLocaleString()}</div></div>
                  <div><div className="text-gray-500 text-sm">退货金额</div><div className="text-xl font-bold text-red-600">¥{parseFloat(String(detailData.total_amount || 0)).toFixed(2)}</div></div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
